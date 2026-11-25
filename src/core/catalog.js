import fs from 'node:fs';
import path from 'node:path';
import {
  loadData, recordType, getField, filterTerms, matchFilter,
} from './data.js';
import {
  cyan, dim, displayInfo, displaySection, displaySuccess, displayWarn,
  green, printTable, red, yellow,
} from './terminal.js';
import { singleSubcommand } from './utils.js';

export const RESOURCE_TYPES = [
  'article', 'audiobook', 'book', 'course', 'magazine', 'podcast', 'video',
];

export const RESOURCE_TYPES_PLURAL = {
  articles: 'article',
  audiobooks: 'audiobook',
  books: 'book',
  courses: 'course',
  magazines: 'magazine',
  podcasts: 'podcast',
  videos: 'video',
};

export const RESOURCE_TYPE_MAP = {
  article: 'article',
  book: 'book',
  course: 'course',
  video: 'video',
  audiobook: 'audiobook',
  'audio-book': 'audiobook',
  audio_book: 'audiobook',
  magazine: 'magazine',
  magazine_article: 'magazine',
  podcast: 'podcast',
  podcasts: 'podcast',
  podcast_episode: 'podcast',
};

export function requireDataDrive() {
  const base = String(process.env.DATA_DRIVE || '').trim();
  if (!base) {
    displayWarn('DATA_DRIVE environment variable is not set.');
    return null;
  }
  return path.resolve(base.replace(/^~/, process.env.HOME || ''));
}

export function collectNamedItems(records, targetType) {
  const t = String(targetType || '').trim().toLowerCase();
  const items = {};
  for (const record of records) {
    if (recordType(record) !== t) continue;
    const fields = record.fields;
    if (!Array.isArray(fields) || !fields.length) continue;
    const name = getField(fields, 0);
    if (!name) continue;
    items[name] = getField(fields, 1);
  }
  return items;
}

export function generateDirectories(args) {
  const dataDrive = requireDataDrive();
  if (!dataDrive) return 1;
  const commandType = String(args.commandType || '');
  let folder;
  let targetType;
  let label;
  if (commandType.toLowerCase() === 'skill') {
    folder = 'Skills'; targetType = 'skill'; label = 'skill(s)';
  } else {
    displayWarn(`Unknown type '${commandType}'. Use 'skill'.`);
    return 1;
  }
  const items = collectNamedItems(loadData(), targetType);
  displaySection('Generate directories');
  if (!Object.keys(items).length) {
    displayWarn(`No ${label} found in data file.`);
    return 1;
  }
  const base = path.join(dataDrive, folder);
  let created = 0;
  let skipped = 0;
  let failed = 0;
  for (const name of Object.keys(items).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))) {
    const target = path.join(base, name);
    if (fs.existsSync(target)) {
      displayInfo(`Already exists: ${target}`);
      skipped += 1;
      continue;
    }
    try {
      fs.mkdirSync(target, { recursive: false });
      displaySuccess(`Created: ${target}`);
      created += 1;
    } catch (error) {
      displayWarn(`Failed: ${target} (${error.message})`);
      failed += 1;
    }
  }
  console.log();
  displayInfo(`${green(String(created))} created, ${yellow(String(skipped))} skipped, ` +
    `${failed ? red(String(failed)) : String(failed)} failed`);
  return failed === 0 ? 0 : 1;
}

export function handleNamedItems(args, { commandType, listFn, usage }) {
  const subcommand = singleSubcommand(args);
  if (subcommand === 'generate') {
    return generateDirectories({ ...args, commandType });
  }
  if (subcommand !== 'list') {
    displayWarn(`Unknown ${commandType} subcommand: ${subcommand}`);
    displayInfo(usage);
    return 1;
  }
  const terms = filterTerms(args);
  return listFn({ ...args, filter: terms.length ? terms : null });
}

export function filterNameCategory(items, terms) {
  const out = {};
  for (const [name, category] of Object.entries(items)) {
    if (matchFilter(terms, [name, category || ''])) out[name] = category;
  }
  return out;
}

export function resourceExistsOnDisk(dataDrive, resourceType, targetType, itemName, source, title) {
  const folder = targetType === 'skill' ? 'Skills' : 'Research';
  const stem = source ? `${source} — ${title}` : title;
  const base = path.join(dataDrive, folder, itemName);
  let candidates;
  if (['article', 'book', 'audiobook', 'magazine'].includes(resourceType)) {
    candidates = [path.join(base, `${stem}.pdf`)];
  } else if (resourceType === 'course') {
    candidates = [path.join(base, stem)];
  } else if (['video', 'podcast'].includes(resourceType)) {
    candidates = [path.join(base, `${stem}.mp4`)];
  } else {
    candidates = [path.join(base, `${stem}.pdf`), path.join(base, stem)];
  }
  return candidates.some((p) => fs.existsSync(p));
}

export function countResourcesByItem(records, itemNames, { targetType = null, dataDrive = null } = {}) {
  const stats = {};
  const downloads = {};
  for (const name of itemNames) {
    stats[name] = Object.fromEntries(RESOURCE_TYPES.map((t) => [t, 0]));
    downloads[name] = Object.fromEntries(RESOURCE_TYPES.map((t) => [t, 0]));
  }
  const names = new Set(itemNames.filter(Boolean));
  for (const record of records) {
    const rtype = RESOURCE_TYPE_MAP[String(record.type ?? '').trim().toLowerCase()];
    if (!rtype || !Array.isArray(record.fields) || !record.fields.length) continue;
    const name = getField(record.fields, 0);
    if (!name || !names.has(name)) continue;
    stats[name][rtype] += 1;
    if (dataDrive && targetType) {
      const source = getField(record.fields, 1);
      const title = getField(record.fields, 2);
      if (title && resourceExistsOnDisk(dataDrive, rtype, targetType, name, source, title)) {
        downloads[name][rtype] += 1;
      }
    }
  }
  return [stats, downloads];
}

export function formatCountCell(total, downloaded) {
  if (!total) return dim('0');
  return `${total}/${cyan(String(downloaded))}`;
}

export function listNamedItemsWithResources(args, {
  targetType, sectionTitle, header, label,
}) {
  const records = loadData();
  displaySection(sectionTitle);
  let items = collectNamedItems(records, targetType);
  items = filterNameCategory(items, filterTerms(args));
  if (!Object.keys(items).length) {
    displayWarn(`No ${label} found`);
    return 1;
  }
  const dataDrive = requireDataDrive();
  const [stats, downloads] = countResourcesByItem(records, Object.keys(items), {
    targetType, dataDrive,
  });
  const headers = [header, 'Articles', 'Audiobooks', 'Books', 'Courses', 'Magazines', 'Podcasts', 'Videos', 'Total'];
  const rows = Object.keys(items)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((name) => {
      const counts = stats[name];
      const dl = downloads[name];
      const cells = RESOURCE_TYPES.map((t) => formatCountCell(counts[t], dl[t]));
      const total = RESOURCE_TYPES.reduce((sum, t) => sum + counts[t], 0);
      const totalDl = RESOURCE_TYPES.reduce((sum, t) => sum + dl[t], 0);
      return [name, ...cells, formatCountCell(total, totalDl)];
    });
  printTable(headers, rows);
  console.log();
  displayInfo(`${green(String(Object.keys(items).length))} ${label}`);
  return 0;
}

export function categoryTerms(args) {
  const terms = Array.isArray(args?.category) ? args.category : [];
  return terms.map((c) => String(c).trim()).filter(Boolean);
}

/** --category (exact match on item name or category) supersedes --filter. */
export function matchResource(args, itemName, category, source, title) {
  const categories = categoryTerms(args);
  if (categories.length) {
    const wanted = new Set(categories.map((c) => c.toLowerCase()));
    return wanted.has(String(itemName || '').trim().toLowerCase())
      || wanted.has(String(category || '').trim().toLowerCase());
  }
  return matchFilter(filterTerms(args), [itemName, category, source, title]);
}
