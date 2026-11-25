import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { DEFAULT_TIMEOUT } from './config.js';
import { displayWarn } from './terminal.js';

/**
 * Wrapper around spawnSync that returns
 * { returncode, stdout, stderr, error }.
 */
export function run(cmd, {
  timeout = DEFAULT_TIMEOUT,
  input,
  cwd,
  env,
  capture = true,
  check = false,
} = {}) {
  try {
    const result = spawnSync(cmd[0], cmd.slice(1), {
      encoding: 'utf8',
      timeout: timeout ?? undefined,
      cwd,
      env,
      input,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.error && result.error.code === 'ETIMEDOUT') {
      console.log(`Command timed out after ${timeout}ms: ${cmd.join(' ')}`);
      return { returncode: 124, stdout: '', stderr: String(result.error), error: result.error };
    }
    if (result.error && result.error.code === 'ENOENT') {
      console.log(`Command failed: ${cmd.join(' ')} (${result.error.message})`);
      return { returncode: 127, stdout: '', stderr: result.error.message, error: result.error };
    }
    const returncode = result.status === null ? 1 : result.status;
    return {
      returncode,
      status: returncode,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error || null,
    };
  } catch (error) {
    console.log(`Command failed: ${cmd.join(' ')} (${error.message})`);
    return { returncode: 1, stdout: '', stderr: error.message, error };
  }
}

export function commandExists(command) {
  if (!command) return false;
  if (command.includes('/')) {
    try {
      fs.accessSync(command);
      return true;
    } catch { return false; }
  }
  return run(['which', command], { timeout: 2000 }).returncode === 0;
}

export function requireTool(tool, installHint) {
  if (commandExists(tool)) return true;
  displayWarn(`${tool} is not installed. Install it with: ${installHint}`);
  return false;
}
