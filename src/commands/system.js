import os from 'node:os';
import fs from 'node:fs';
import { command } from '../core/index.js';
import { commandExists, run } from '../core/subprocess.js';
import {
  commandCombined, displaySection, formatDuration, formatKvValue, green,
  underline, visibleLen, withSpinner,
} from '../core/terminal.js';
import { extractVersion, firstLine } from '../core/utils.js';
import { TECHNOLOGIES } from '../core/config.js';

/** Print one colored label/value field with aligned labels. */
function printField(label, value) {
  const padded = `${label}:`.padEnd(8);
  console.log(`  ${padded} ${green(formatKvValue(value))}`);
}

function sysctlValue(key) {
  if (process.platform !== 'darwin' || !commandExists('sysctl')) return null;
  const result = run(['sysctl', '-n', key]);
  if (result.returncode !== 0) return null;
  return firstLine(result.stdout) || null;
}

function getOs() {
  if (process.platform === 'darwin') {
    const result = run(['sw_vers', '-productVersion']);
    return ['macOS', firstLine(result.stdout) || os.release()];
  }
  return [os.type(), os.release()];
}

function getMemory() {
  const asGb = (bytes) => {
    const value = bytes / (1024 ** 3);
    return `${Number.isInteger(value) ? value : value.toFixed(1)} GB`;
  };
  try {
    if (process.platform === 'darwin') {
      const raw = sysctlValue('hw.memsize');
      if (raw) return asGb(Number(raw));
    }
    if (process.platform === 'linux') {
      const text = fs.readFileSync('/proc/meminfo', 'utf8');
      const match = text.match(/MemTotal:\s+(\d+)/);
      if (match) return asGb(Number(match[1]) * 1024);
    }
  } catch { /* ignore */ }
  return asGb(os.totalmem());
}

function getUptime() {
  try {
    const boot = Math.round(Date.now() / 1000 - os.uptime());
    return formatDuration(Math.max(0, Math.round(Date.now() / 1000) - boot));
  } catch { return 'Unavailable'; }
}

function elapsedThisYear() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const delta = now - start;
  const months = now.getUTCMonth();
  const days = Math.max(1, Math.floor(delta / 86400000) - daysBeforeMonth(now.getUTCFullYear(), months));
  const unit = (n, word) => `${underline(formatKvValue(n))} ${n === 1 ? word : `${word}s`}`;
  console.log(`  ${unit(months, 'month')}, ${unit(days, 'day')}, ` +
    `${unit(now.getUTCHours(), 'hour')}, ${unit(now.getUTCMinutes(), 'minute')}`);
  console.log();
}

function daysBeforeMonth(year, months) {
  let total = 0;
  for (let m = 0; m < months; m += 1) total += new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
  return total;
}

function technologyVersion(cmd) {
  if (!cmd || !cmd.length) return 'Unknown';
  const exe = cmd[0];
  if (!commandExists(exe)) return 'Not Installed';
  const result = run(cmd);
  if (result.returncode === 124) return 'Timed Out';
  const output = commandCombined(result);
  if (!output) return result.returncode === 0 ? 'Unknown' : `Error (rc=${result.returncode})`;
  return extractVersion(exe, output) || firstLine(output) || 'Unknown';
}

async function collectTechnologyVersions(report) {
  const entries = [];
  for (let i = 0; i < TECHNOLOGIES.length; i += 1) {
    const [name, cmd] = TECHNOLOGIES[i];
    entries.push(`${name}: ${green(technologyVersion(cmd))}`);
    report(i + 1, TECHNOLOGIES.length);
    await new Promise((resolve) => setImmediate(resolve));
  }
  return entries;
}

async function displayTechnologies() {
  console.log(`  ${underline('Technology versions')}`);
  console.log();
  const entries = await withSpinner(
    'Loading technology versions',
    collectTechnologyVersions,
    { total: TECHNOLOGIES.length },
  );
  const width = Math.max(0, ...entries.map(visibleLen)) + 2;
  const pad = (cell) => cell + ' '.repeat(Math.max(0, width - visibleLen(cell)));
  const rows = Math.ceil(entries.length / 3);

  for (let row = 0; row < rows; row += 1) {
    const cells = [0, 1, 2].map((column) => entries[row + column * rows] || '');
    console.log(`    ${cells.map(pad).join('').trimEnd()}`);
  }
}

export async function handleSystem() {
  displaySection('Display system information');
  elapsedThisYear();
  const [osName, osVersion] = getOs();
  printField('User', process.env.USER || process.env.USERNAME || 'Unknown');
  printField('OS', `${osName} ${osVersion}`);
  printField('Kernel', os.release());
  printField('CPU', sysctlValue('machdep.cpu.brand_string') || os.cpus()[0]?.model || 'Unknown');
  printField('Memory', getMemory());
  printField('Host', os.hostname());
  printField('Shell', process.env.SHELL || 'Unknown');
  printField('Uptime', getUptime());
  console.log();
  await displayTechnologies();
  return 0;
}

export const COMMAND = command({
  name: 'system',
  desc: 'Show system information',
  handler: handleSystem,
  flags: [],
  visibility: 'public',
});
