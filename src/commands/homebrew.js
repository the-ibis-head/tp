import fs from 'node:fs';
import path from 'node:path';
import {
  command, _HOMEBREW_SUBCOMMAND_ARG, _FILTER_FLAG, configuredDropboxPath,
  filterTerms, getField, loadData, matchFilter, recordType, singleSubcommand,
  parseBool, parseKeyValueFlags, displayError, displayInfo, displaySection,
  displayWarn, bold, green, printTable, generatedFileHeader, writeGeneratedLines,
} from '../core/index.js';

function parseFlags(parts) {
  const tokens = [];
  for (const part of parts || []) tokens.push(...String(part).split(','));
  const parsed = parseKeyValueFlags(tokens);
  const flags = {};
  for (const [key, value] of Object.entries(parsed)) {
    flags[key.trim().toLowerCase()] = String(value).trim();
  }
  return flags;
}

function loadFormulae(records, recordTypeWanted) {
  const formulae = [];
  for (const record of records) {
    if (recordType(record).trim().toLowerCase() !== recordTypeWanted) continue;
    const fields = record.fields;
    if (!Array.isArray(fields) || fields.length < 2) continue;
    const name = getField(fields, 0);
    const formula = getField(fields, 1);
    if (!name || !formula) continue;
    const flags = parseFlags(fields.slice(2));
    const isCask = parseBool(flags.is_cask ?? 'false');
    const url = fields.length > 3 ? getField(fields, 3) : '';
    formulae.push({ name, formula, isCask, url });
  }
  return formulae;
}

export function handleHomebrew(args) {
  const subcommand = singleSubcommand(args, 'list');
  const formulae = loadFormulae(loadData(), 'homebrew_formulae');
  if (!formulae.length) {
    console.log();
    displayWarn('No homebrew formulaes found');
    return 1;
  }
  if (subcommand === 'generate') {
    const dropbox = configuredDropboxPath();
    if (!dropbox) {
      displayError('DROPBOX_PATH environment variable is not set. '
        + 'Set it to your Dropbox directory to generate the Brewfile.');
      return 1;
    }
    displaySection('Generate brewfile');
    const brewfilePath = path.join(dropbox, 'Projects', 'dotfiles', 'homebrew', 'Brewfile');
    fs.mkdirSync(path.dirname(brewfilePath), { recursive: true });
    const lines = generatedFileHeader('Brewfile');
    for (const f of formulae) {
      const entry = f.isCask ? 'cask' : 'brew';
      lines.push(`${entry} "${f.formula}"`);
    }
    writeGeneratedLines(brewfilePath, lines, { label: 'Brewfile' });
    return 0;
  }
  const terms = filterTerms(args);
  const filtered = formulae.filter((f) => matchFilter(terms,
    [f.name, f.formula, f.isCask ? 'cask' : 'formula', f.url]));
  displaySection('List homebrew formulaes');
  const rows = filtered.map((f) => [
    bold(f.name), f.formula, f.isCask ? green('cask') : 'formula', f.url,
  ]);
  printTable(['Name', 'Formula', 'Type', 'URL'], rows);
  console.log();
  displayInfo(`${green(String(filtered.length))} formulae listed`);
  return 0;
}

export const COMMAND = command({
  name: 'homebrew',
  desc: 'Manage homebrew formulaes',
  handler: handleHomebrew,
  flags: [_HOMEBREW_SUBCOMMAND_ARG, _FILTER_FLAG],
  visibility: 'public',
});
