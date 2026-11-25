import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(here, '../..');
export const COMMAND_NAME = 'thothprocess';
export const COMMAND_DESCRIPTION = 'Command line automation';
export const PREFIX = '==>';
export const DEFAULT_TIMEOUT = 5000;
export const IS_TTY = Boolean(process.stdout.isTTY);
export const NO_TIMEOUT = null;

export const DATA_FILE_PATH = path.join(ROOT, 'data.txt');
export const SSH_DIR = path.join(process.env.HOME || '', '.ssh');
export const HOME = process.env.HOME || '';

export const GITHUB_ORG_OWNER = 'thothprocess';
export const GITHUB_PERSONAL_OWNER = 'the-ibis-head';
export const GITHUB_OWNERS = [GITHUB_PERSONAL_OWNER, GITHUB_ORG_OWNER];

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
/** Identify API clients honestly; Dev.to/Fastly blocks browser-like UAs on /api. */
export const API_USER_AGENT = 'tp-cli/2.0.0';

export const WP_ENV = { ...process.env, WP_CLI_PHP_ARGS: '-d memory_limit=-1' };

export const TECHNOLOGIES = [
  ['Opencode', ['opencode', '--version']],
  ['AWS', ['aws', '--version']],
  ['Nginx', ['/Applications/Herd.app/Contents/Resources/nginx-x86', '-v']],
  ['MySQL', ['mysql', '--version']],
  ['PostgreSQL', ['psql', '--version']],
  ['Redis', ['redis-cli', '--version']],
  ['Docker', ['docker', '--version']],
  ['Zsh', ['zsh', '--version']],
  ['Git', ['git', '--version']],
  ['GitHub', ['gh', 'version']],
  ['Node', ['node', '--version']],
  ['Npm', ['npm', '--version']],
  ['Vite+', ['vp', '--version']],
  ['Vercel', ['vercel', '--version']],
  ['PHP', ['php', '--version']],
  ['WP-CLI', ['wp', '--version']],
  ['Laravel', ['laravel', '--version']],
  ['Symfony', ['symfony', 'version']],
  ['Pyenv', ['pyenv', '--version']],
  ['Python', ['python3', '--version']],
  ['Java', ['java', '-version']],
  ['Spring Boot', ['spring', '--version']],
  ['Rust', ['rustc', '--version']],
  ['Go', ['go', 'version']],
  ['Swift', ['swift', '--version']],
  ['Mailpit', ['mailpit', 'version']],
];

export const RESUME_SECTIONS = [
  'summary', 'skills', 'experience', 'education', 'professional_development',
];

export function projectsPath() {
  const configured = (process.env.PROJECTS_PATH || '').trim();
  return path.resolve(configured || path.join(HOME, 'Projects'));
}

/** Return the configured Dropbox path, or null when DROPBOX_PATH is unset. */
export function configuredDropboxPath() {
  return (process.env.DROPBOX_PATH || '').trim() || null;
}

export function dropboxPath() {
  return path.resolve(configuredDropboxPath()
    || path.join(HOME, 'Library', 'CloudStorage', 'Dropbox'));
}

// Backwards-compatible aliases
export const SCRIPT_DIR = ROOT;
export const _SCRIPT_DIR = ROOT;
export const _COMMAND_NAME = COMMAND_NAME;
export const _COMMAND_DESCRIPTION = COMMAND_DESCRIPTION;
export const _PREFIX = PREFIX;
export const _DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;
export const _NO_TIMEOUT = NO_TIMEOUT;
export const _IS_TTY = IS_TTY;
export const _DATA_FILE_PATH = DATA_FILE_PATH;
export const _SSH_DIR = SSH_DIR;
export const _HOME = HOME;
export const _BROWSER_USER_AGENT = BROWSER_USER_AGENT;
export const _API_USER_AGENT = API_USER_AGENT;
export const _GITHUB_ORG_OWNER = GITHUB_ORG_OWNER;
export const _GITHUB_PERSONAL_OWNER = GITHUB_PERSONAL_OWNER;
export const _GITHUB_OWNERS = GITHUB_OWNERS;
export const _TECHNOLOGIES = TECHNOLOGIES;
export const _RESUME_SECTIONS = RESUME_SECTIONS;
export const _WP_ENV = WP_ENV;
