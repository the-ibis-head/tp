import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { copyDotfilesImage, handleDotfiles } from '../src/commands/dotfiles.js';

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
  const errors = [];
  const originalError = console.error;
  console.error = (...parts) => errors.push(parts.join(' '));
  try {
    return { result: fn(), errors: errors.join('\n') };
  } finally {
    console.error = originalError;
  }
}

test('errors when DROPBOX_PATH is unset', () => {
  const { result, errors } = withEnv(null, () => capture(() => handleDotfiles({})));
  assert.equal(result, 1);
  assert.match(errors, /DROPBOX_PATH environment variable is not set/);
});

test('errors when the dotfiles source directory is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-dotfiles-src-'));
  try {
    const { result, errors } = withEnv(dir, () => capture(() => handleDotfiles({})));
    assert.equal(result, 1);
    assert.match(errors, /Dotfiles source directory not found/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('copies dotfiles.png from the dotfiles source directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-dotfiles-image-'));
  const src = path.join(root, 'src');
  const dst = path.join(root, 'dst');
  fs.mkdirSync(src);
  fs.mkdirSync(dst);
  fs.writeFileSync(path.join(src, 'dotfiles.png'), 'png-data');
  try {
    assert.equal(copyDotfilesImage(src, dst), 0);
    assert.equal(fs.readFileSync(path.join(dst, 'dotfiles.png'), 'utf8'), 'png-data');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fails when dotfiles.png is missing from the source directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-dotfiles-image-'));
  try {
    const { result, errors } = capture(() => copyDotfilesImage(path.join(root, 'src'), root));
    assert.equal(result, 1);
    assert.match(errors, /dotfiles.png not found/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
