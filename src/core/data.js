import fs from 'node:fs';
import { DATA_FILE_PATH } from './config.js';
import { displayWarn } from './terminal.js';

let cache = { path: null, mtime: 0, records: [] };

/** Load the pipe-delimited data file, cached by mtime. */
export function loadData() {
  let mtime;
  try {
    mtime = fs.statSync(DATA_FILE_PATH).mtimeMs;
  } catch {
    displayWarn(`Data file not found: ${DATA_FILE_PATH}`);
    cache = { path: DATA_FILE_PATH, mtime: 0, records: [] };
    return [];
  }
  if (cache.path === DATA_FILE_PATH && cache.mtime === mtime) return cache.records;

  const records = [];
  try {
    const raw = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split('|').map((p) => p.trim());
      records.push({ type: parts[0], fields: parts.slice(1), raw: trimmed });
    }
  } catch (error) {
    displayWarn(`Error reading data file: ${DATA_FILE_PATH} (${error.message})`);
  }
  cache = { path: DATA_FILE_PATH, mtime, records };
  return records;
}

export const recordType = (record) => String(record?.type ?? '');
export const getField = (fields, i) => String(fields?.[i] ?? '').trim();
export const filterTerms = (args) => (args?.filter || []).map(String);

/** Parse a `key=value,key=value` metadata field into a lookup Map. */
export function parseMeta(value) {
  const meta = new Map();
  for (const part of String(value || '').split(',')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    meta.set(part.slice(0, separator).trim().toLowerCase(), part.slice(separator + 1).trim());
  }
  return meta;
}

export function matchFilter(terms, values) {
  if (!terms || terms.length === 0) return true;
  const haystack = values.map((v) => String(v ?? '').toLowerCase()).join(' ');
  return terms.every((term) => haystack.includes(String(term).toLowerCase()));
}

export function recordsOfType(type) {
  const wanted = String(type).toLowerCase();
  return loadData().filter((r) => recordType(r).toLowerCase() === wanted);
}
