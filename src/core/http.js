import { API_USER_AGENT, BROWSER_USER_AGENT, DEFAULT_TIMEOUT } from './config.js';
import { displayWarn } from './terminal.js';

export async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });
    if (!response.ok) {
      displayWarn(`HTTP Error ${response.status}: ${url}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    displayWarn(`URL Error: ${error.message}`);
    return null;
  }
}

/** Unique (title, url) pairs from JSON-LD ItemList blocks, in page order. */
export function extractLinkedinCourses(html) {
  const blocks = String(html ?? '').match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  ) || [];
  const courses = [];
  for (const block of blocks) {
    let data;
    try {
      data = JSON.parse(block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim());
    } catch { continue; }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (!item || item['@type'] !== 'ItemList') continue;
      for (const element of item.itemListElement || []) {
        const course = element.item || {};
        const title = String(course.name || course.headline || '').trim();
        const url = String(course.url || '').trim();
        if (title && url) courses.push([title, url]);
      }
    }
  }
  return [...new Map(courses.map((pair) => [pair.join('\u0000'), pair])).values()];
}

export function devtoError(status, data) {
  const raw = typeof data === 'object' && data
    ? String(data.error || data.message || data.raw || '')
    : String(data || '');
  const heading = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    || raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    || raw.split(/\r?\n/)[0];
  const text = String(heading || '').replace(/\s+/g, ' ').trim();
  const detail = text.length > 160 ? `${text.slice(0, 157)}…` : text;
  return `Dev.to API error ${status}: ${detail || 'no details'}`;
}

export function devtoIsRateLimited(status, data) {
  return status === 429 || /rate.?limit/i.test(String(data?.error || data?.message || ''));
}

export async function devtoApiRequest(apiKey, method, endpoint, body) {
  const headers = {
    'api-key': apiKey,
    Accept: 'application/vnd.forem.api.v1+json; version=1',
    'User-Agent': API_USER_AGENT,
  };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`https://dev.to/api${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
  return { status: response.status, data };
}

export async function devtoApiRequestWithRetry(apiKey, method, endpoint, body, attempts = 3) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await devtoApiRequest(apiKey, method, endpoint, body);
    if (!devtoIsRateLimited(last.status, last.data)) return last;
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  return last;
}
