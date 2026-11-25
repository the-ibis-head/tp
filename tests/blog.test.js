import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { handleBlog } from '../src/commands/blog.js';
import { API_USER_AGENT } from '../src/core/config.js';

async function capture(fn) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...parts) => logs.push(parts.join(' '));
  console.error = (...parts) => errors.push(parts.join(' '));
  try {
    const result = await fn();
    return { result, output: logs.join('\n'), errors: errors.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

/** Give handleBlog a deterministic Dev.to key without touching the real Keychain. */
async function withFakeKeychain(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-security-'));
  fs.writeFileSync(path.join(dir, 'security'), '#!/bin/sh\necho fake-devto-key\n', { mode: 0o755 });
  const originalPath = process.env.PATH;
  process.env.PATH = `${dir}${path.delimiter}${originalPath || ''}`;
  try {
    return await fn();
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('blog generate writes articles under DROPBOX_PATH/Projects/blog', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-blog-'));
  const original = process.env.DROPBOX_PATH;
  process.env.DROPBOX_PATH = dir;
  try {
    const { result, output } = await capture(() => handleBlog({ subcommand: ['generate'] }));
    assert.equal(result, 0);
    assert.match(output, /Generate blog article files/);

    const articlesDir = path.join(dir, 'Projects', 'blog');
    const files = fs.readdirSync(articlesDir);
    assert.equal(files.length, 2);
    assert.ok(files.every((file) => file.endsWith('.md')));
    assert.ok(!fs.existsSync(path.join(dir, 'Gists')), 'old Gists location must not be used');
  } finally {
    if (original === undefined) delete process.env.DROPBOX_PATH;
    else process.env.DROPBOX_PATH = original;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('blog generate reports a missing DROPBOX_PATH', async () => {
  const original = process.env.DROPBOX_PATH;
  delete process.env.DROPBOX_PATH;
  try {
    const { result, errors } = await capture(() => handleBlog({ subcommand: ['generate'] }));
    assert.equal(result, 1);
    assert.match(errors, /DROPBOX_PATH environment variable is not set/);
  } finally {
    if (original !== undefined) process.env.DROPBOX_PATH = original;
  }
});

test('Dev.to requests use a CLI user agent and omit Content-Type on GET', async () => {
  await withFakeKeychain(async () => {
    let request;
    const fetchMock = mock.method(globalThis, 'fetch', async (_url, init) => {
      request = init;
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    try {
      const { result } = await capture(() => handleBlog({ subcommand: ['list'] }));
      assert.equal(result, 0);
      assert.ok(request, 'expected a Dev.to fetch call');
      assert.equal(request.method, 'GET');
      assert.equal(request.headers['User-Agent'], API_USER_AGENT);
      assert.match(request.headers.Accept, /vnd\.forem\.api/);
      assert.equal(request.headers['Content-Type'], undefined);
    } finally {
      fetchMock.mock.restore();
    }
  });
});

test('HTML error pages are summarised instead of printed in full', async () => {
  await withFakeKeychain(async () => {
    const html = '<!DOCTYPE html><html><head><title>403 Forbidden</title></head>'
      + '<body><h1>Error 403 Forbidden</h1><p>Details: cache-nyc 1795548295 773978522</p></body></html>';
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(html, {
      status: 403, headers: { 'content-type': 'text/html' },
    }));
    try {
      const { result, errors } = await capture(() => handleBlog({ subcommand: ['list'] }));
      assert.equal(result, 0);
      assert.match(errors, /403 Forbidden \(HTTP 403\)/);
      assert.doesNotMatch(errors, /<!DOCTYPE html>/);
      assert.ok(errors.length < 300, `warning should stay short, got ${errors.length} chars`);
    } finally {
      fetchMock.mock.restore();
    }
  });
});

test('local and remote articles share a row with combined statuses', async () => {
  await withFakeKeychain(async () => {
    const remote = [
      {
        id: 101,
        title: 'Building Custom Post Types and REST Endpoints in WordPress',
        published: true,
        published_at: '2026-11-02T12:00:00Z',
        tag_list: ['wordpress', 'api'],
        body_markdown: '<!-- tp-id: 20261101_building-custom-post-types-and-rest-endpoints-in-wordpress -->\nBody',
      },
      {
        id: 102,
        title: 'Loading, Validating, and Querying JSON in Node',
        published: false,
        created_at: '2026-11-03T12:00:00Z',
        tag_list: [],
        body_markdown: '<!-- tp-id: 20261101_loading-validating-and-querying-json-in-node -->\nBody',
      },
      {
        id: 103,
        title: 'Remote-only notes',
        published: true,
        created_at: '2026-11-04T12:00:00Z',
        tag_list: ['notes'],
        body_markdown: 'No tp-id marker',
      },
    ];
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(remote), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    try {
      const { result, output } = await capture(() => handleBlog({ subcommand: ['list'] }));
      assert.equal(result, 0);
      assert.match(output, /local, published/);
      assert.match(output, /local, draft/);
      assert.match(output, /remote, published/);
      assert.match(output, /3 article\(s\) total/);
      assert.match(output, /\b101\b/);
      for (const article of remote) {
        const occurrences = output.split(article.title).length - 1;
        assert.equal(occurrences, 1, `${article.title} should appear once`);
      }
    } finally {
      fetchMock.mock.restore();
    }
  });
});

test('blog github writes a readme listing the copied articles', async () => {
  const dropbox = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-blog-dropbox-'));
  const projects = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-blog-projects-'));
  const filenames = [
    '20261101_building-custom-post-types-and-rest-endpoints-in-wordpress.md',
    '20261101_loading-validating-and-querying-json-in-node.md',
  ];
  const articlesDir = path.join(dropbox, 'Projects', 'blog');
  fs.mkdirSync(articlesDir, { recursive: true });
  for (const file of filenames) {
    fs.writeFileSync(path.join(articlesDir, file), `<!-- tp-id: ${file.slice(0, -3)} -->\n\nBody\n`, 'utf8');
  }

  const originals = {
    DROPBOX_PATH: process.env.DROPBOX_PATH,
    PROJECTS_PATH: process.env.PROJECTS_PATH,
    GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME,
    GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL,
    GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME,
    GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL,
  };
  process.env.DROPBOX_PATH = dropbox;
  process.env.PROJECTS_PATH = projects;
  process.env.GIT_AUTHOR_NAME = 'tp test';
  process.env.GIT_AUTHOR_EMAIL = 'tp@example.test';
  process.env.GIT_COMMITTER_NAME = 'tp test';
  process.env.GIT_COMMITTER_EMAIL = 'tp@example.test';

  try {
    await withFakeKeychain(async () => {
      const { result, output } = await capture(() => handleBlog({ subcommand: ['github'] }));
      assert.equal(result, 0);
      assert.match(output, /Wrote .*readme\.md/);

      const projectDir = path.join(projects, 'blog');
      const readme = fs.readFileSync(path.join(projectDir, 'readme.md'), 'utf8');
      assert.match(readme, /^# blog\n/);
      assert.match(readme, /My personal blog articles/);
      assert.match(readme, /Building Custom Post Types and REST Endpoints in WordPress/);
      assert.match(readme, /Loading, Validating, and Querying JSON in Node/);
      for (const file of filenames) {
        assert.match(readme, new RegExp(`\\]\\(\\./${file.replaceAll('.', '\\.')}\\)`));
        assert.ok(fs.existsSync(path.join(projectDir, file)), `${file} should be copied`);
      }
      assert.match(readme, /## Usage/);
      assert.match(readme, /Generated by/);
    });
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(dropbox, { recursive: true, force: true });
    fs.rmSync(projects, { recursive: true, force: true });
  }
});

test('filters still match the remote status of a merged article', async () => {
  await withFakeKeychain(async () => {
    const remote = [{
      id: 102,
      title: 'Loading, Validating, and Querying JSON in Node',
      published: false,
      body_markdown: '<!-- tp-id: 20261101_loading-validating-and-querying-json-in-node -->\nBody',
    }];
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(remote), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    try {
      const { result, output } = await capture(() => handleBlog({
        subcommand: ['list'], filter: ['draft'],
      }));
      assert.equal(result, 0);
      assert.match(output, /Loading, Validating, and Querying JSON in Node/);
      assert.doesNotMatch(output, /Building Custom Post Types/);
      assert.match(output, /1 article\(s\) total/);
    } finally {
      fetchMock.mock.restore();
    }
  });
});
