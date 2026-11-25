import fs from 'node:fs';
import path from 'node:path';
import {
  command, _DEFAULTS_SUBCOMMAND_ARG, _FILTER_FLAG, configuredDropboxPath,
  filterTerms, getField, loadData, matchFilter, recordType, singleSubcommand,
  displayError, displayInfo, displaySection, displayWarn, bold, dim, green,
  printTable, run, generatedFileHeader, writeGeneratedLines,
} from '../core/index.js';

function loadMacosDefaults(records) {
  const defaults = [];
  for (const record of records) {
    if (recordType(record).trim().toLowerCase() !== 'macos_default') continue;
    const fields = record.fields;
    if (!Array.isArray(fields) || fields.length < 4) continue;
    const category = getField(fields, 0);
    const domainKey = getField(fields, 1);
    const valueType = getField(fields, 2);
    const value = getField(fields, 3);
    if (!category || !domainKey) continue;
    defaults.push({ category, domainKey, valueType, value });
  }
  return defaults;
}

export function handleDefaults(args) {
  const subcommand = singleSubcommand(args, 'list');
  const defaults = loadMacosDefaults(loadData());
  if (!defaults.length) {
    console.log();
    displayWarn('No macos defaults found');
    return 1;
  }
  if (subcommand === 'generate') {
    const dropbox = configuredDropboxPath();
    if (!dropbox) {
      displayError('DROPBOX_PATH environment variable is not set. '
        + 'Set it to your Dropbox directory to generate defaults.txt.');
      return 1;
    }
    displaySection('Generate defaults.txt');
    const outputPath = path.join(dropbox, 'Projects', 'dotfiles', 'macos', 'defaults.txt');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const lines = generatedFileHeader('defaults.txt');
    for (const d of defaults) {
      lines.push(`defaults write ${d.domainKey} -${d.valueType} ${d.value}`);
    }
    writeGeneratedLines(outputPath, lines, { label: 'defaults.txt' });
    return 0;
  }
  const terms = filterTerms(args);
  const filtered = defaults.filter((d) => matchFilter(terms,
    [d.category, d.domainKey, d.valueType, d.value]));
  displaySection('List macos defaults');
  const rows = [];
  for (const d of filtered) {
    const text = d.domainKey.trim();
    const splitAt = text.search(/\s/);
    const domain = splitAt < 0 ? text : text.slice(0, splitAt);
    const key = splitAt < 0 ? '' : text.slice(splitAt).trim();
    const cp = run(['defaults', 'read', domain, key], { capture: true });
    const current = cp.returncode === 0 ? String(cp.stdout || '').trim() : dim('—');
    rows.push([bold(d.category), d.domainKey, dim(d.valueType), green(d.value), current]);
  }
  printTable(['Category', 'Domain / Key', 'Type', 'Value', 'Current'], rows);
  console.log();
  displayInfo(`${green(String(filtered.length))} default(s) listed`);
  return 0;
}

export const COMMAND = command({
  name: 'defaults',
  desc: 'Manage macOS defaults',
  handler: handleDefaults,
  flags: [_DEFAULTS_SUBCOMMAND_ARG, _FILTER_FLAG],
  visibility: 'public',
});
