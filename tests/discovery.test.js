import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { discover, COMMANDS_DIR } from '../src/discovery.js';
import { main } from '../src/cli.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('all command modules load and have unique names', async () => {
  const specs = await discover({ strict: true });
  const names = specs.map((s) => s.name);
  assert.equal(new Set(names).size, names.length, 'duplicate command names');
  assert.ok(names.includes('system'));
  assert.ok(names.includes('commands'));
  assert.ok(names.includes('paths'));
});

test('dropping in a new module registers it with no registry edits', async () => {
  const file = path.join(COMMANDS_DIR, 'ping.js');
  fs.writeFileSync(file, [
    "import { command } from '../core/index.js';",
    "import { displayInfo } from '../core/terminal.js';",
    'export function handlePing() { displayInfo("pong"); return 0; }',
    'export const COMMAND = command({ name: "ping", desc: "Reply with pong", handler: handlePing });',
    '',
  ].join('\n'), 'utf8');
  try {
    const names = (await discover({ strict: true })).map((s) => s.name);
    assert.ok(names.includes('ping'));
    assert.equal(await main(['ping']), 0);
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test('CLI help exits successfully', async () => {
  const specs = await discover({ strict: true });
  const captured = [];
  const original = console.log;
  console.log = (...parts) => captured.push(parts.join(' '));
  try {
    const rc = await main([]);
    assert.equal(rc, 0);
  } finally {
    console.log = original;
  }
  const output = captured.join('\n');
  assert.match(output, /Usage: tp/);
  assert.match(output, /system/);
});

test('all 56 commands are present', async () => {
  const expected = [
    'base64', 'binary', 'blog', 'bookmarks', 'budget', 'business', 'clipboard',
    'coinflip', 'commands', 'defaults', 'donations', 'dotfiles', 'download',
    'duti', 'git', 'github', 'goals', 'homebrew', 'hostname', 'inventory',
    'jobs', 'journal', 'keychain', 'learning', 'metric', 'music', 'nato',
    'next', 'passwords', 'paths', 'phaser', 'podcasts', 'ports', 'profile',
    'projects', 'pwgen', 'quote', 'react', 'research', 'resources', 'resumes',
    'screenshots', 'skills', 'ssh', 'system', 'tap', 'test', 'tp', 'vercel',
    'vocabulary', 'vscode', 'website', 'wordpress', 'workout', 'zip', 'zsh',
  ];
  const names = new Set((await discover()).map((s) => s.name));
  const missing = expected.filter((name) => !names.has(name));
  assert.deepEqual(missing, [], `missing commands: ${missing.join(', ')}`);
});

test('module count matches command count', async () => {
  const specs = await discover();
  const files = fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  assert.equal(files.length, specs.length);
});
