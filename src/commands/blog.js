import fs from 'node:fs';
import path from 'node:path';
import {
  command, BLOG_SUBCOMMAND_ARG, DEPLOY_FLAG, FILTER_FLAG, FORCE_FLAG,
  API_USER_AGENT, configuredDropboxPath, displayTally, filterTerms, getField,
  getKeychainSecret, githubUsername, loadData, matchFilter, parseSubcommand,
  readmeFooterLine, recordType, scaffoldProject, withSpinner,
} from '../core/index.js';
import {
  bold, dim, displayError, displayInfo, displaySection, displaySuccess,
  displayWarn, green, printTable, red, underline, yellow,
} from '../core/terminal.js';

const BLOG_PROJECT_DESCRIPTION = 'My personal blog articles';
const TP_ID_RE = /<!--\s*tp-id:\s*(\S+)\s*-->/g;

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function blogArticlesFromData() {
  const articles = [];
  for (const record of loadData()) {
    if (recordType(record) !== 'blog_article') continue;
    const fields = record.fields || [];
    if (fields.length < 2) continue;
    const date = getField(fields, 0);
    const title = getField(fields, 1);
    const tags = getField(fields, 2);
    const status = getField(fields, 3) || 'local';
    const notes = getField(fields, 4);
    const slug = slugify(title);
    if (!date || !title) continue;
    articles.push({
      date, slug, title, tags, status, notes,
      get filename() { return `${this.date}_${this.slug}.md`; },
      searchValues() { return [this.title, this.slug, this.tags, this.status, this.notes]; },
    });
  }
  return articles;
}

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

async function devtoApiRequest(method, endpoint, { apiKey, jsonBody = null, params = null }) {
  let fullPath = `/api${endpoint}`;
  if (params) {
    const query = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
    fullPath = `${fullPath}?${query}`;
  }
  const headers = {
    'api-key': apiKey,
    Accept: 'application/vnd.forem.api.v1+json; version=1',
    'User-Agent': API_USER_AGENT,
  };
  if (jsonBody !== null) headers['Content-Type'] = 'application/json';
  try {
    const response = await fetch(`https://dev.to${fullPath}`, {
      method: String(method).toUpperCase(),
      headers,
      body: jsonBody === null ? undefined : JSON.stringify(jsonBody),
      signal: AbortSignal.timeout(30000),
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    return [response.status, data];
  } catch (error) {
    displayWarn(`Dev.to API request failed: ${error.message}`);
    return [0, null];
  }
}

function devtoError(status, data) {
  if (!data || typeof data !== 'object') return `HTTP ${status}`;
  if (data.error) return String(data.error);
  const raw = String(data.raw || '').trim();
  if (!raw) return `HTTP ${status}`;
  // Upstream errors (e.g. Fastly 403) return HTML — summarise it instead of dumping the page.
  const heading = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    || raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    || raw.split(/\r?\n/)[0];
  const text = String(heading || '').replace(/\s+/g, ' ').trim();
  const summary = text.length > 160 ? `${text.slice(0, 157)}…` : text;
  return summary ? `${summary} (HTTP ${status})` : `HTTP ${status}`;
}

function devtoIsRateLimited(status, data) {
  if (status === 429) return true;
  const message = String(data?.error || '').trim().toLowerCase();
  return message.includes('retry') || message.includes('throttle');
}

async function devtoApiRequestWithRetry(method, endpoint, options) {
  let delay = 3.0;
  let last = [0, null];
  for (let attempt = 0; attempt <= 4; attempt += 1) {
    last = await devtoApiRequest(method, endpoint, options);
    if (!devtoIsRateLimited(last[0], last[1])) return last;
    if (attempt === 4) return last;
    displayWarn(`  Rate limited by Dev.to — retrying in ${Math.round(delay)}s…`);
    await sleep(delay * 1000);
    delay *= 2;
  }
  return last;
}

function formatDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{8}$/.test(raw)) {
    const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const parsed = new Date(`${iso}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return iso;
    return raw;
  }
  return raw;
}

function tpIdFor(article) {
  return `${article.date}_${article.slug}`;
}

async function fetchRemoteByTpId(apiKey) {
  const [status, data] = await devtoApiRequest('GET', '/articles/me/all', {
    apiKey, params: { per_page: 1000 },
  });
  if (status !== 200 || !Array.isArray(data)) return {};
  const remoteMap = {};
  for (let article of data) {
    let body = article.body_markdown;
    if (!body) {
      const [, fetched] = await devtoApiRequest('GET', `/articles/${article.id}`, { apiKey });
      body = fetched?.body_markdown || '';
      article = { ...article, body_markdown: body };
    }
    const match = String(body || '').match(/<!--\s*tp-id:\s*(\S+)\s*-->/);
    if (match) remoteMap[match[1]] = article;
  }
  return remoteMap;
}

function remoteStatus(article) {
  return article.published ? green('published') : yellow('draft');
}

function remoteDate(article, fallback = '') {
  return String(article.published_at || article.created_at || fallback).slice(0, 10);
}

async function blogList(terms) {
  const localArticles = blogArticlesFromData();
  displaySection('List blog articles');
  let remoteArticles = [];
  if (apiKeyValue) {
    const [status, data] = await withSpinner('Fetching articles from Dev.to…',
      () => devtoApiRequest('GET', '/articles/me/all', { apiKey: apiKeyValue, params: { per_page: 1000 } }));
    if (status === 200 && Array.isArray(data)) {
      remoteArticles = data.map((article) => {
        const match = String(article.body_markdown || '').match(/<!--\s*tp-id:\s*(\S+)\s*-->/);
        return { ...article, tpId: match ? match[1] : '' };
      });
    } else {
      displayWarn(`Could not fetch Dev.to articles: ${devtoError(status, data)}`);
    }
  } else {
    displayWarn('DEVTO_API_KEY not set — showing local articles only.');
  }

  // Prefer the tp-id marker written by `blog deploy`; fall back to the title slug.
  const byTpId = new Map();
  const bySlug = new Map();
  for (const article of remoteArticles) {
    if (article.tpId) byTpId.set(article.tpId, article);
    const slug = slugify(article.title);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, article);
  }

  const combinedRows = [];
  const matched = new Set();
  for (const article of localArticles) {
    const remote = byTpId.get(tpIdFor(article)) || bySlug.get(article.slug);
    if (remote) matched.add(remote);
    const plainStatus = remote ? (remote.published ? 'published' : 'draft') : '';
    const remoteTags = remote ? (remote.tag_list || []).join(', ') : '';
    const values = [...article.searchValues(), plainStatus, remoteTags];
    if (!matchFilter(terms, values)) continue;
    const tags = [...new Set([article.tags, remoteTags].filter(Boolean))].join(', ');
    const statuses = [dim(article.status || 'local')];
    if (remote) statuses.push(remoteStatus(remote));
    combinedRows.push([
      remote ? String(remote.id ?? '') : dim(''),
      remote ? remoteDate(remote, formatDate(article.date)) : formatDate(article.date),
      bold(article.title), tags ? dim(tags) : '', statuses.join(', '),
    ]);
  }
  for (const article of remoteArticles) {
    if (matched.has(article)) continue;
    const title = String(article.title || '');
    const tagList = (article.tag_list || []).join(', ');
    const plainStatus = article.published ? 'published' : 'draft';
    if (!matchFilter(terms, [title, tagList, plainStatus, 'remote'])) continue;
    combinedRows.push([
      String(article.id ?? ''), remoteDate(article),
      bold(title), tagList, `${dim('remote')}, ${remoteStatus(article)}`,
    ]);
  }
  if (!combinedRows.length) {
    displayWarn('No articles matched the filter.');
    return 0;
  }
  printTable(['ID', 'Date', 'Title', 'Tags', 'Status'], combinedRows);
  console.log();
  displayInfo(`${green(String(combinedRows.length))} article(s) total`);
  return 0;
}

let apiKeyValue = '';

function requireDevtoKey(key) {
  if (!key) displayWarn('Dev.to API key not available — check Keychain (devto/api_key).');
  return Boolean(key);
}

function requireBlogArticlesDir({ create = false } = {}) {
  const dropbox = configuredDropboxPath();
  if (!dropbox) {
    displayError('DROPBOX_PATH environment variable is not set. '
      + 'Set it to your Dropbox directory to locate blog articles.');
    return null;
  }
  const articlesDir = path.join(dropbox, 'Projects', 'blog');
  if (create) fs.mkdirSync(articlesDir, { recursive: true });
  return articlesDir;
}

async function blogUnpublish(targets, apiKey) {
  if (!requireDevtoKey(apiKey)) return 1;
  if (!targets.length) {
    displayWarn('Usage: tp blog unpublish <id1> [id2 …]');
    return 1;
  }
  displaySection('Set Dev.to articles to draft');
  let succeeded = 0;
  let failed = 0;
  for (const articleId of targets) {
    const [status, data] = await devtoApiRequest('PUT', `/articles/${articleId}`, {
      apiKey, jsonBody: { article: { published: false } },
    });
    if (status !== 200) {
      displayWarn(`  Failed to set ${articleId} to draft: ${devtoError(status, data)}`);
      failed += 1;
      continue;
    }
    displayInfo(`  ${green('Draft')} ${articleId}`);
    succeeded += 1;
  }
  console.log();
  displayTally(succeeded, 'set to draft', { failed });
  return failed === 0 ? 0 : 1;
}

function blogGenerate() {
  const outDir = requireBlogArticlesDir({ create: true });
  if (!outDir) return 1;
  displaySection('Generate blog article files');
  let created = 0;
  let skipped = 0;
  for (const article of blogArticlesFromData()) {
    const filePath = path.join(outDir, article.filename);
    if (fs.existsSync(filePath)) {
      skipped += 1;
      continue;
    }
    const frontMatter = `---\ntitle: "${article.title}"\ndate: ${article.date}\ntags: ${article.tags}\nstatus: ${article.status}\n---\n\n`;
    try {
      fs.writeFileSync(filePath, frontMatter, 'utf8');
    } catch (error) {
      displayWarn(`Could not write ${filePath}: ${error}`);
      continue;
    }
    displayInfo(`  ${green('Created')} ${filePath}`);
    created += 1;
  }
  console.log();
  displayInfo(`${green(String(created))} created, ${dim(String(skipped))} skipped (already existed)`);
  return 0;
}

function blogBodyFromMarkdown(raw) {
  let lines = String(raw).split(/\r?\n/);
  if (lines.length && lines[0].trim() === '---') {
    const closing = lines.indexOf('---', 1);
    if (closing !== -1) lines = lines.slice(closing + 1);
  }
  return lines.filter((line) => !line.trim().startsWith('# ')).join('\n').trim();
}

async function blogDeploy(rest, terms, apiKey) {
  if (!requireDevtoKey(apiKey)) return 1;
  const articlesDir = requireBlogArticlesDir();
  if (!articlesDir) return 1;
  const forcePublish = rest.includes('--publish');
  displaySection('Sync blog articles to Dev.to');
  const remoteMap = await withSpinner('Fetching current Dev.to articles…',
    () => fetchRemoteByTpId(apiKey));
  const localArticles = blogArticlesFromData().filter((a) => matchFilter(terms, a.searchValues()));
  if (!localArticles.length) {
    displayWarn('No local articles matched the filter.');
    return 1;
  }
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;
  for (const article of localArticles) {
    const bodyPath = path.join(articlesDir, article.filename);
    if (!fs.existsSync(bodyPath)) {
      displayWarn(`  Skipping ${bold(article.title)} — file not found: ${bodyPath}`);
      skipped += 1;
      continue;
    }
    let rawBody;
    try {
      rawBody = fs.readFileSync(bodyPath, 'utf8');
    } catch (error) {
      displayWarn(`  Skipping ${bold(article.title)} — could not read file: ${error}`);
      skipped += 1;
      continue;
    }
    const tpId = tpIdFor(article);
    const bodyWithMarker = `<!-- tp-id: ${tpId} -->\n\n${blogBodyFromMarkdown(rawBody)}`;
    const remote = remoteMap[tpId];
    if (remote) {
      const sameBody = String(remote.body_markdown || '').trim() === bodyWithMarker.trim();
      const sameTitle = remote.title === article.title;
      const sameTags = (remote.tag_list || []).join(', ') === (article.tags || '');
      const wantsPublish = forcePublish && !remote.published;
      if (sameBody && sameTitle && sameTags && !wantsPublish) {
        unchanged += 1;
        continue;
      }
      const payload = { article: { title: article.title, body_markdown: bodyWithMarker, tags: article.tags } };
      if (forcePublish) payload.article.published = true;
      const [status, data] = await withSpinner(`Updating ${article.title}…`,
        () => devtoApiRequestWithRetry('PUT', `/articles/${remote.id}`, { apiKey, jsonBody: payload }));
      await sleep(1500);
      if (status !== 200) {
        displayWarn(`  Failed to update ${bold(article.title)}: ${devtoError(status, data)}`);
        failed += 1;
        continue;
      }
      const artUrl = data?.url || '';
      displaySuccess(`  ${green('Updated')} ${bold(article.title)} (id ${remote.id})`);
      if (artUrl) displayInfo(`  URL: ${underline(artUrl)}`);
      updated += 1;
    } else {
      const payload = {
        article: {
          title: article.title,
          body_markdown: bodyWithMarker,
          published: forcePublish,
          tags: article.tags,
        },
      };
      const [status, data] = await withSpinner(`Creating ${article.title}…`,
        () => devtoApiRequestWithRetry('POST', '/articles', { apiKey, jsonBody: payload }));
      await sleep(1500);
      if (status !== 201 || !data || typeof data !== 'object') {
        displayWarn(`  Failed to create ${bold(article.title)}: ${devtoError(status, data)}`);
        failed += 1;
        continue;
      }
      const artUrl = data.url || '';
      displaySuccess(`  ${green('Created')} ${bold(article.title)} (id ${data.id ?? '?'})`);
      if (artUrl) displayInfo(`  URL: ${underline(artUrl)}`);
      created += 1;
    }
  }
  console.log();
  let summary = `${green(String(created))} created, ${green(String(updated))} updated, ${dim(String(unchanged))} unchanged`;
  if (skipped) summary += `, ${yellow(String(skipped))} skipped`;
  if (failed) summary += `, ${red(String(failed))} failed`;
  displayInfo(summary);
  return failed === 0 ? 0 : 1;
}

async function blogPublish(targets, apiKey) {
  if (!requireDevtoKey(apiKey)) return 1;
  if (!targets.length) {
    displayWarn('Usage: tp blog publish <id1> [id2 …]');
    return 1;
  }
  const articlesDir = requireBlogArticlesDir();
  if (!articlesDir) return 1;
  displaySection('Publish Dev.to articles');
  const [status, unpublished] = await withSpinner('Fetching your drafts…', () => devtoApiRequest(
    'GET', '/articles/me/unpublished', { apiKey, params: { per_page: 1000 } },
  ));
  if (status !== 200 || !Array.isArray(unpublished)) {
    displayWarn(`Could not fetch drafts: ${devtoError(status, unpublished)}`);
    return 1;
  }
  const draftsById = {};
  for (const article of unpublished) draftsById[String(article.id)] = article;
  const localArticles = blogArticlesFromData();
  let succeeded = 0;
  let failed = 0;
  for (const articleId of targets) {
    const remote = draftsById[articleId];
    if (!remote) {
      displayWarn(`  Skipping ${articleId} — not found among your drafts`);
      failed += 1;
      continue;
    }
    const title = remote.title || '';
    const slug = slugify(title);
    const local = localArticles.find((a) => a.slug === slug);
    if (!local) {
      displayWarn(`  Skipping ${articleId} — no local data entry found for '${bold(title)}'`);
      failed += 1;
      continue;
    }
    const bodyPath = path.join(articlesDir, local.filename);
    if (!fs.existsSync(bodyPath)) {
      displayWarn(`  Skipping ${articleId} — local file not found: ${bodyPath}`);
      failed += 1;
      continue;
    }
    let raw;
    try {
      raw = fs.readFileSync(bodyPath, 'utf8');
    } catch (error) {
      displayWarn(`  Skipping ${articleId} — could not read file: ${error}`);
      failed += 1;
      continue;
    }
    const tagList = remote.tag_list || remote.tags || '';
    const payload = {
      article: {
        title,
        body_markdown: blogBodyFromMarkdown(raw),
        tags: Array.isArray(tagList) ? tagList.join(', ') : String(tagList),
        published: true,
      },
    };
    const [putStatus, data] = await devtoApiRequest('PUT', `/articles/${articleId}`, {
      apiKey, jsonBody: payload,
    });
    if (putStatus !== 200) {
      const article = payload.article;
      displayWarn(`  Failed to publish ${articleId}: status=${putStatus}`);
      displayWarn(`  Response: ${devtoError(putStatus, data)}`);
      displayWarn(`  Payload title: '${article.title}'`);
      displayWarn(`  Payload tags: '${article.tags}'`);
      displayWarn(`  Body length: ${article.body_markdown.length} chars`);
      displayWarn(`  Body preview: '${article.body_markdown.slice(0, 200)}'`);
      failed += 1;
      continue;
    }
    const artUrl = data?.url || '';
    displayInfo(`  ${green('Published')} ${articleId} — ${bold(title)}`);
    if (artUrl) displayInfo(`  ${underline(artUrl)}`);
    succeeded += 1;
  }
  console.log();
  displayTally(succeeded, 'published', { failed });
  return failed === 0 ? 0 : 1;
}

function blogGithub(args, terms) {
  function build(projectDir) {
    const articlesDir = requireBlogArticlesDir();
    if (!articlesDir) return 1;
    displayInfo('Copy blog article files');
    const localArticles = blogArticlesFromData().filter((a) => matchFilter(terms, a.searchValues()));
    if (!localArticles.length) {
      displayWarn('No local articles matched the filter.');
      return 1;
    }
    let copied = 0;
    let skipped = 0;
    const copiedArticles = [];
    for (const article of localArticles) {
      const src = path.join(articlesDir, article.filename);
      if (!fs.existsSync(src)) {
        displayWarn(`  Skipping ${bold(article.title)} — file not found: ${src}`);
        skipped += 1;
        continue;
      }
      let raw;
      try {
        raw = fs.readFileSync(src, 'utf8');
      } catch (error) {
        displayWarn(`  Skipping ${bold(article.title)} — could not read file: ${error}`);
        skipped += 1;
        continue;
      }
      const cleaned = `${raw.replace(TP_ID_RE, '').trim()}\n`;
      const dst = path.join(projectDir, article.filename);
      try {
        fs.writeFileSync(dst, cleaned, 'utf8');
      } catch (error) {
        displayWarn(`  Skipping ${bold(article.title)} — could not write file: ${error}`);
        skipped += 1;
        continue;
      }
      displayInfo(`  Copied ${green(article.filename)}`);
      copiedArticles.push(article);
      copied += 1;
    }
    console.log();
    displayTally(copied, 'copied', { skipped });

    const contentsBlock = copiedArticles
      .map((article) => `- [${article.title}](./${article.filename}) — ${formatDate(article.date)}`)
      .join('\n');
    const username = githubUsername();
    const cloneLine = username
      ? `git clone https://github.com/${username}/blog.git`
      : 'git clone https://github.com/<username>/blog.git';
    const readmeContent = `# blog

${BLOG_PROJECT_DESCRIPTION}.

## Contents

${contentsBlock}

## Usage

Clone the repository and edit the Markdown files (one article per file):

\`\`\`sh
${cloneLine}
cd blog
\`\`\`

---

${readmeFooterLine()}
`;
    fs.writeFileSync(path.join(projectDir, 'readme.md'), readmeContent, 'utf8');
    displayInfo(`Wrote ${bold('readme.md')} (${readmeContent.length} bytes)`);
    return copied > 0 ? 0 : 1;
  }
  return scaffoldProject({
    projectName: 'blog',
    sectionTitle: 'Generate blog project',
    repoDescription: BLOG_PROJECT_DESCRIPTION,
    deploy: Boolean(args?.deploy),
    force: Boolean(args?.force),
    pushConfirmPrompt: 'Push blog to github?',
    buildBody: build,
  });
}

function warnUnknownSubcommand(subcommand, valid) {
  displayWarn(`Unknown subcommand: '${subcommand}'. Available: ${valid.join(', ')}`);
  return 1;
}

export async function handleBlog(args) {
  try {
    apiKeyValue = getKeychainSecret('devto', 'api_key');
  } catch (error) {
    apiKeyValue = '';
    displayWarn(error.message);
  }
  const [subcmd, rest] = parseSubcommand(args, 'list');
  const terms = filterTerms(args);
  if (subcmd === 'list') return blogList(terms);
  if (subcmd === 'deploy') return blogDeploy(rest, terms, apiKeyValue);
  if (subcmd === 'unpublish') return blogUnpublish(rest, apiKeyValue);
  if (subcmd === 'generate') return blogGenerate();
  if (subcmd === 'publish') return blogPublish(rest, apiKeyValue);
  if (subcmd === 'github') return blogGithub(args, terms);
  return warnUnknownSubcommand(subcmd, ['list', 'generate', 'deploy', 'publish', 'unpublish', 'github']);
}

export const COMMAND = command({
  name: 'blog',
  desc: 'Manage blog articles',
  handler: handleBlog,
  flags: [BLOG_SUBCOMMAND_ARG, FILTER_FLAG, FORCE_FLAG, DEPLOY_FLAG],
  visibility: 'public',
});
