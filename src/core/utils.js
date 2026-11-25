export const TECH_NEXTJS = 'next-js';
export const TECH_WORDPRESS = 'wordpress';
export const WORDPRESS_BOILERPLATE_PROJECT_DIR = 'wp-boilerplate';
export const PROJECT_TEMPLATE_FILES = {
  [TECH_NEXTJS]: ['package.json', 'readme.md'],
};
export const PROJECT_TEMPLATE_FILES_DEFAULT = ['readme.md'];

export function singleSubcommand(args, fallback = 'list') {
  const value = args?.subcommand ?? fallback;
  return String(value || fallback).trim().toLowerCase();
}

export function firstLine(s) {
  return String(s ?? '').trim().split(/\r?\n/)[0]?.trim() || '';
}

export function slugify(value) {
  return String(value ?? '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function parseBool(value) {
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value ?? '').toLowerCase());
}

export function parseKeyValueFlags(parts) {
  const out = {};
  for (const raw of parts || []) {
    const text = String(raw);
    const idx = text.indexOf('=');
    if (idx > 0) out[text.slice(0, idx).trim()] = text.slice(idx + 1).trim();
  }
  return out;
}

export function parseSemverish(output) {
  const match = String(output ?? '').match(/\bv?(\d+(?:\.\d+)+)\b/);
  return match ? match[1] : null;
}

export function extractVersion(exe, output) {
  const cleaned = String(output ?? '').trim();
  if (exe === 'java') return cleaned.match(/version "(.*?)"/)?.[1] || null;
  if (exe === 'go') return cleaned.match(/\bgo version go(\d+(?:\.\d+)+)\b/)?.[1] || null;
  if (exe === 'symfony') {
    return cleaned.match(/Symfony CLI version\s+v?(\d+(?:\.\d+)+)/i)?.[1] || parseSemverish(cleaned);
  }
  if (exe === 'spring') {
    return cleaned.match(/Spring CLI\s+v?(\d+(?:\.\d+)+)/i)?.[1] || parseSemverish(cleaned);
  }
  return parseSemverish(cleaned) || firstLine(cleaned) || null;
}

export function isDarwin() {
  return process.platform === 'darwin';
}

export function formatDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : raw;
}

export function formatDateRange(dates) {
  return String(dates ?? '').replace(/\|/g, ' – ');
}

export function categoryTerms(args) {
  return (args?.category || []).map(String);
}

export function parseSubcommand(args, fallback = 'list') {
  const words = Array.isArray(args?.subcommand) ? args.subcommand : [];
  if (!words.length) return [fallback, []];
  if (typeof words[0] === 'string') return [words[0], words.slice(1)];
  return [fallback, words];
}

export function warnUnknownSubcommand(subcommand, valid) {
  displayWarnLocal(`Unknown subcommand: ${subcommand}`);
  displayWarnLocal(`Usage: tp <command> {${valid.join(', ')}}`);
  return 1;
}

function displayWarnLocal(message) {
  console.error(`WARNING: ${message}`);
}

export function formatCountCell(total, downloaded, dim) {
  if (!total) return dim('0');
  return downloaded ? `${total}/${downloaded}` : String(total);
}
