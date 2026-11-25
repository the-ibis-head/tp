import fs from 'node:fs';
import { command, filterTerms, matchFilter, FILTER_FLAG } from '../core/index.js';
import {
  dim, displayInfo, displaySection, displayWarn, green,
} from '../core/terminal.js';

export function handlePaths(args) {
  displaySection('List system path entries');
  const terms = filterTerms(args);
  const seen = new Set();
  const unique = [];
  for (const entry of String(process.env.PATH || '').split(':')) {
    const value = entry.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }
  if (!unique.length) {
    displayWarn('No PATH entries found.');
    return 1;
  }
  const filtered = unique.sort().filter((entry) => matchFilter(terms, [entry]));
  if (!filtered.length) {
    displayWarn('No PATH entries matched the filter.');
    return 1;
  }
  for (const entry of filtered) {
    console.log(`  ${fs.existsSync(entry) ? green(entry) : dim(entry)}`);
  }
  console.log();
  displayInfo(`${green(String(filtered.length))} unique path entries`);
  return 0;
}

export const COMMAND = command({
  name: 'paths',
  desc: 'Display all unique system paths',
  handler: handlePaths,
  flags: [FILTER_FLAG],
  visibility: 'public',
});
