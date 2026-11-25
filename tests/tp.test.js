import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { copyTpProjectFiles } from '../src/commands/tp.js';

const FILES = ['readme.md', 'package.json', '.gitignore', 'tp.png', 'tp-system.png'];
const DIRS = ['bin', 'src', 'tests'];

function quietly(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-project-copy-'));
  const sourceDir = path.join(root, 'source');
  const projectDir = path.join(root, 'tp');
  fs.mkdirSync(sourceDir);
  fs.mkdirSync(projectDir);
  for (const name of FILES) fs.writeFileSync(path.join(sourceDir, name), name);
  for (const name of DIRS) {
    const dir = path.join(sourceDir, name);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'nested.txt'), name);
  }
  return { root, sourceDir, projectDir };
}

test('copies project files and directories from the source directory', () => {
  const { root, sourceDir, projectDir } = createFixture();
  try {
    assert.equal(quietly(() => copyTpProjectFiles(projectDir, sourceDir)), 0);
    for (const name of FILES) {
      assert.equal(fs.readFileSync(path.join(projectDir, name), 'utf8'), name);
    }
    for (const name of DIRS) {
      assert.equal(fs.readFileSync(path.join(projectDir, name, 'nested.txt'), 'utf8'), name);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('fails when a required file or directory is missing', () => {
  const { root, sourceDir, projectDir } = createFixture();
  try {
    fs.rmSync(path.join(sourceDir, '.gitignore'));
    assert.equal(quietly(() => copyTpProjectFiles(projectDir, sourceDir)), 1);
    fs.writeFileSync(path.join(sourceDir, '.gitignore'), '.gitignore');
    fs.rmSync(path.join(sourceDir, 'tests'), { recursive: true });
    assert.equal(quietly(() => copyTpProjectFiles(projectDir, sourceDir)), 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
