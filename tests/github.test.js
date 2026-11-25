import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { handleGithub } from '../src/commands/github.js';
import { fetchGithubRepos } from '../src/core/gitops.js';
import { GITHUB_OWNERS } from '../src/core/config.js';

/** Run `fn` with a fake `gh` on PATH so no network calls are made. */
function withFakeGh(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-gh-'));
  const gh = path.join(dir, 'gh');
  fs.writeFileSync(gh, `#!/bin/sh
if [ "$1 $2" = "repo list" ] && [ "$3" = "broken" ]; then
  echo "simulated gh failure" >&2
  exit 1
fi
if [ "$1 $2" = "repo list" ]; then
  owner="$3"
  printf '[{"name":"%s-one","nameWithOwner":"%s/%s-one","visibility":"PUBLIC","updatedAt":"2026-01-01T00:00:00Z","description":"first"},{"name":"%s-two","nameWithOwner":"%s/%s-two","visibility":"PRIVATE","updatedAt":"2026-02-01T00:00:00Z","description":"second"}]\\n' "$owner" "$owner" "$owner" "$owner" "$owner" "$owner"
  exit 0
fi
if [ "$1 $2" = "api user" ]; then
  echo tester
  exit 0
fi
exit 1
`, { mode: 0o755 });

  const originalPath = process.env.PATH;
  process.env.PATH = `${dir}${path.delimiter}${originalPath || ''}`;
  try {
    return fn();
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function capture(fn) {
  const logs = [];
  const original = console.log;
  console.log = (...parts) => logs.push(parts.join(' '));
  try {
    return { result: fn(), output: logs.join('\n') };
  } finally {
    console.log = original;
  }
}

test('fetchGithubRepos reports progress once per owner', () => {
  withFakeGh(() => {
    const progress = [];
    const repos = fetchGithubRepos(['alice', 'org'], 'name,nameWithOwner', {
      report: (done, total) => progress.push([done, total]),
    });
    assert.equal(repos.length, 4);
    assert.deepEqual(progress, [[1, 2], [2, 2]]);
    assert.deepEqual([...new Set(repos.map((repo) => repo.owner))], ['alice', 'org']);
  });
});

test('progress still advances when an owner fetch fails', () => {
  withFakeGh(() => {
    const progress = [];
    const errors = [];
    const original = console.error;
    console.error = (...parts) => errors.push(parts.join(' '));
    try {
      const repos = fetchGithubRepos(['broken', 'org'], 'name,nameWithOwner', {
        report: (done, total) => progress.push([done, total]),
      });
      assert.equal(repos.length, 2);
      assert.deepEqual(progress, [[1, 2], [2, 2]]);
      assert.match(errors.join('\n'), /gh repo list failed for 'broken'/);
    } finally {
      console.error = original;
    }
  });
});

test('github list renders the repository table and total', () => {
  withFakeGh(() => {
    const { result, output } = capture(() => handleGithub({ subcommand: [] }));
    assert.equal(result, 0);
    assert.match(output, /List github repositories/);
    assert.match(output, new RegExp(`${GITHUB_OWNERS[0]}-one`));
    assert.match(output, new RegExp(`${GITHUB_OWNERS[1]}-two`));
    assert.match(output, /4 repository\(ies\) found/);
  });
});
