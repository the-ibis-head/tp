import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { handleDuti } from '../src/commands/duti.js';
import { handleGit } from '../src/commands/git.js';
import { handleVscode } from '../src/commands/vscode.js';
import { handleZsh } from '../src/commands/zsh.js';

const generators = [
  ['duti', handleDuti, ['duti', 'formats.txt']],
  ['git', handleGit, ['git', 'config']],
  ['zsh', handleZsh, ['zsh', 'config']],
  ['vscode', handleVscode, ['vscode', 'settings.json']],
];

function withEnv(value, fn) {
  const original = process.env.DROPBOX_PATH;
  if (value === null) delete process.env.DROPBOX_PATH;
  else process.env.DROPBOX_PATH = value;
  try {
    return fn();
  } finally {
    if (original === undefined) delete process.env.DROPBOX_PATH;
    else process.env.DROPBOX_PATH = original;
  }
}

function capture(fn) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...parts) => logs.push(parts.join(' '));
  console.error = (...parts) => errors.push(parts.join(' '));
  try {
    return { result: fn(), errors: errors.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

for (const [name, handler] of generators) {
  test(`${name} generate errors when DROPBOX_PATH is unset`, () => {
    const { result, errors } = withEnv(null, () => capture(() => handler({ subcommand: 'generate' })));
    assert.equal(result, 1, `${name} should fail without DROPBOX_PATH`);
    assert.match(errors, /DROPBOX_PATH environment variable is not set/);
  });
}

for (const [name, handler, expected] of generators) {
  test(`${name} generate writes under DROPBOX_PATH/Projects/dotfiles`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `tp-${name}-`));
    try {
      const { result } = withEnv(dir, () => capture(() => handler({ subcommand: 'generate' })));
      assert.equal(result, 0, `${name} generate should succeed`);
      const target = path.join(dir, 'Projects', 'dotfiles', ...expected);
      assert.ok(fs.existsSync(target), `expected ${target}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
