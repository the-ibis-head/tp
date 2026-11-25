import fs from 'node:fs';
import { IS_TTY, PREFIX, COMMAND_NAME } from './config.js';
import { run as runCommand, commandExists } from './subprocess.js';

const ANSI = /\u001b\[[0-9;]*m/g;

export function color(text, code) {
  return IS_TTY ? `\u001b[${code}m${text}\u001b[0m` : String(text);
}
export const yellow = (t) => color(t, '33');
export const green = (t) => color(t, '32');
export const magenta = (t) => color(t, '35');
export const blue = (t) => color(t, '34');
export const red = (t) => color(t, '31');
export const cyan = (t) => color(t, '36');
export const bold = (t) => color(t, '1');
export const underline = (t) => color(t, '4');
export const dim = (t) => color(t, '2');

export function visibleLen(s) {
  return String(s).replace(ANSI, '').length;
}

export function displayWarn(message) {
  console.error(`${yellow('WARNING:')} ${message}`);
}
export function displayError(message) {
  console.error(`${red('ERROR:')} ${message}`);
}
export function displayInfo(message) {
  console.log(`${blue(PREFIX)} ${message}`);
}
export function displaySuccess(message) {
  console.log(`${green(PREFIX)} ${message}`);
}

export function displaySection(title) {
  console.log('─────────────────────────────────────────────');
  console.log(` ${title}`);
  console.log('─────────────────────────────────────────────');
  console.log();
}

export function clearScreen() {
  if (IS_TTY) process.stdout.write('\u001b[2J\u001b[H');
}

export function displayBanner(text = COMMAND_NAME, font = 'slant') {
  if (!IS_TTY || !commandExists('figlet')) return;
  const result = runCommand(['figlet', '-f', font, text]);
  if (result.returncode === 0 && result.stdout) {
    console.log();
    console.log(result.stdout);
  }
}

export function printTable(headers, rows, { maxColWidth = 68 } = {}) {
  const heads = headers.map(String);
  const body = rows.map((row) => row.map((cell) => {
    const s = String(cell ?? '');
    if (visibleLen(s) <= maxColWidth) return s;
    const truncated = s.slice(0, Math.max(0, maxColWidth - 1)) + '…';
    return s.includes('\u001b[') ? truncated + '\u001b[0m' : truncated;
  }));
  const widths = heads.map((h, i) => {
    let w = visibleLen(h);
    for (const row of body) if (i < row.length) w = Math.max(w, visibleLen(row[i]));
    return w;
  });
  const format = (cols) =>
    '  ' + cols.map((c, i) => String(c) + ' '.repeat(Math.max(0, widths[i] - visibleLen(String(c))))).join('  ');
  console.log(format(heads));
  console.log(format(widths.map((w) => '-'.repeat(w))));
  for (const row of body) console.log(format(row));
}

/** Synchronous yes/no confirmation (keeps command handlers simple). */
export function confirm(prompt) {
  process.stdout.write(`  ${prompt} Type ${green('yes')} to confirm: `);
  try {
    const buffer = Buffer.alloc(1024);
    const bytes = fs.readSync(0, buffer, 0, buffer.length, null);
    return buffer.toString('utf8', 0, bytes).trim().toLowerCase() === 'yes';
  } catch {
    console.log();
    return false;
  }
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Run a task while rendering an animated spinner/progress bar (TTY only).
 * `fn` receives a `report(done, total)` callback; await yields let it animate.
 * Non-TTY runs skip the animation and return the task result unchanged.
 */
export function withSpinner(message, fn, { total = 0 } = {}) {
  const noop = () => {};
  if (!IS_TTY) return fn(noop);

  let done = 0;
  let frame = 0;
  const render = () => {
    const spinner = SPINNER_FRAMES[frame++ % SPINNER_FRAMES.length];
    const width = 20;
    const filled = total ? Math.min(width, Math.round((done / total) * width)) : 0;
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    const pct = total ? `${String(Math.round((done / total) * 100)).padStart(3)}%` : '';
    process.stdout.write(`\r\u001b[2K  ${spinner} ${message} [${bar}] ${pct}`);
  };
  const clear = () => process.stdout.write('\r\u001b[2K');
  const report = (value) => { done = value; render(); };

  render();
  const timer = setInterval(render, 80);
  const finish = () => { clearInterval(timer); clear(); };
  try {
    const result = fn(report);
    if (result && typeof result.then === 'function') return result.then((value) => { finish(); return value; }, (error) => { finish(); throw error; });
    finish();
    return result;
  } catch (error) {
    finish();
    throw error;
  }
}

export function firstLine(s) {
  return String(s ?? '').trim().split(/\r?\n/)[0]?.trim() || '';
}

export function pluralize(n, singular, plural) {
  return n === 1 ? singular : (plural || `${singular}s`);
}

export function formatUnit(n, singular, plural) {
  return `${n} ${pluralize(n, singular, plural)}`;
}

export function formatDuration(totalSeconds) {
  let seconds = Math.max(0, Math.trunc(totalSeconds));
  const days = Math.floor(seconds / 86400); seconds %= 86400;
  const hours = Math.floor(seconds / 3600); seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  return `${formatUnit(days, 'day')}, ${formatUnit(hours, 'hour')}, ${formatUnit(minutes, 'minute')}`;
}

export function formatKvValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function printKv(label, value, { indent = 2 } = {}) {
  console.log(`${' '.repeat(indent)}${label}: ${formatKvValue(value)}`);
}

export function commandCombined(cp) {
  const out = cp.stdout || '';
  const err = cp.stderr || '';
  if (out && err) return `${out.trimEnd()}\n${err.trimStart()}`.trim();
  return (out || err).trim();
}

export function displayTally(done, doneLabel, { skipped = 0, failed = 0 } = {}) {
  const parts = [`${green(String(done))} ${doneLabel.toLowerCase()}`];
  if (skipped) parts.push(`${dim(String(skipped))} skipped`);
  if (failed) parts.push(`${red(String(failed))} failed`);
  displayInfo(parts.join(', '));
}

export function generatedFileHeader(displayName) {
  return [`# Generated by tp - ${displayName}`, ''];
}

export function writeGeneratedLines(path, lines, { label } = {}) {
  fs.writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
  displaySuccess(`Wrote ${green(path)}`);
}
