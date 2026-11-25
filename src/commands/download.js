import {
  DOWNLOAD_FORMAT_FLAG, DOWNLOAD_TITLE_FLAG, DOWNLOAD_URL_ARG,
  command, displayInfo, displaySection, displayWarn, green, requireTool, run,
} from '../core/index.js';

const RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
]);

function sanitizeDownloadTitle(title) {
  let safe = String(title).normalize('NFKC');
  safe = safe.replace(/[\x00-\x1f\x7f\/\\<>:"|?*]/g, '_');
  safe = safe.replace(/\s+/g, ' ').replace(/^[ .]+|[ .]+$/g, '');
  if (RESERVED_NAMES.has(safe.toUpperCase().split('.')[0])) safe = `_${safe}`;
  return safe.slice(0, 200).replace(/[ .]+$/, '');
}

function inlineArg(args, name) {
  const prefix = `--${name}=`;
  const found = (Array.isArray(args.extraArgs) ? args.extraArgs : [])
    .find((token) => typeof token === 'string' && token.startsWith(prefix));
  return found === undefined ? null : found.slice(prefix.length);
}

export function handleDownload(args) {
  const fmt = inlineArg(args, 'format') || args.format || 'mp4';
  let url = args.url || null;
  const requestedTitle = inlineArg(args, 'title') ?? args.title;
  displaySection(`Download ${String(fmt).toUpperCase()}`);
  if (url) url = String(url).replace(/\\/g, '');
  if (!url) {
    displayWarn('No URL provided. Usage: tp download [--format=mp3|mp4] [--title TITLE] <url>');
    return 1;
  }
  if (!requireTool('yt-dlp', 'brew install yt-dlp')) return 1;
  displayInfo(`URL:    ${green(url)}`);
  displayInfo(`Format: ${green(fmt)}`);
  let safeTitle = null;
  if (requestedTitle !== null && requestedTitle !== undefined) {
    safeTitle = sanitizeDownloadTitle(requestedTitle);
    if (!safeTitle) {
      displayWarn('Title must contain at least one valid filename character');
      return 1;
    }
    displayInfo(`Title:  ${green(safeTitle)}`);
  }
  console.log();
  let cmd;
  if (fmt === 'mp3') {
    cmd = [
      'yt-dlp',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      url,
    ];
  } else {
    cmd = [
      'yt-dlp',
      '-f',
      'bv*[vcodec^=avc1]+ba[acodec^=mp4a]/b[ext=mp4]',
      '--merge-output-format',
      'mp4',
      '--cookies-from-browser', 'brave',
      url,
    ];
  }
  if (safeTitle !== null) {
    cmd.splice(1, 0, '--output', `${safeTitle}.%(ext)s`, '--force-overwrites');
  }
  const result = run(cmd, { timeout: null, capture: false });
  if (result.returncode !== 0) {
    displayWarn(`yt-dlp exited with code ${result.returncode}`);
    return result.returncode;
  }
  console.log();
  displayInfo('Download complete');
  return 0;
}

export const COMMAND = command({
  name: 'download',
  desc: 'Download media files',
  handler: handleDownload,
  flags: [DOWNLOAD_FORMAT_FLAG, DOWNLOAD_TITLE_FLAG, DOWNLOAD_URL_ARG],
  visibility: 'private',
});
