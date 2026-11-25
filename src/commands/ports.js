import os from 'node:os';
import {
  command, _FILTER_FLAG, filterTerms, matchFilter,
  displayInfo, displaySection, displayWarn, dim, green, printTable, yellow,
  commandCombined, run,
} from '../core/index.js';

export function handlePorts(args) {
  displaySection('List open system ports');
  const system = os.type();
  if (system !== 'Darwin') {
    displayWarn(`The ports command is only supported on macOS (detected: ${system})`);
    return 1;
  }
  const result = run(['lsof', '-iTCP', '-iUDP', '-n', '-P'], { timeout: 10000 });
  if (result.returncode !== 0) {
    displayWarn(`Failed to retrieve open ports: ${commandCombined(result)}`);
    return 1;
  }
  const lines = String(result.stdout || '').split(/\r?\n/);
  if (lines.length < 2) {
    displayInfo('No open ports found.');
    return 0;
  }
  const seen = new Set();
  const rows = [];
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) continue;
    const processName = parts[0];
    const pid = parts[1];
    const proto = parts[7];
    const name = parts[8];
    const key = `${pid}|${proto}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([processName, pid, proto, name]);
  }
  if (!rows.length) {
    displayInfo('No open ports found.');
    return 0;
  }
  const terms = filterTerms(args);
  const filtered = rows.filter((r) => matchFilter(terms, r));
  if (!filtered.length) {
    displayWarn('No open ports matched the filter.');
    return 1;
  }
  filtered.sort((a, b) => {
    if (a[2] < b[2]) return -1;
    if (a[2] > b[2]) return 1;
    if (a[3] < b[3]) return -1;
    if (a[3] > b[3]) return 1;
    return 0;
  });
  const colored = filtered.map(([processName, pid, proto, name]) =>
    [green(processName), dim(pid), yellow(proto), name]);
  printTable(['Process', 'PID', 'Protocol', 'Address / Port'], colored);
  console.log();
  displayInfo(`${green(String(filtered.length))} open port entries`);
  return 0;
}

export const COMMAND = command({
  name: 'ports',
  desc: 'Display all open system ports',
  handler: handlePorts,
  flags: [_FILTER_FLAG],
  visibility: 'public',
});
