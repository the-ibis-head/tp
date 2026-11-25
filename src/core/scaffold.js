import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { dropboxPath, projectsPath } from './config.js';
import { run, commandExists } from './subprocess.js';
import {
  bold, dim, displayInfo, displaySection, displaySuccess, displayWarn,
  commandCombined, confirm, green,
} from './terminal.js';
import {
  githubRepoName, githubUsername, gitInitAndCommit, pushToGithub, repoExists, repoSlugFor,
} from './gitops.js';
import { loadData, recordType, getField } from './data.js';
import {
  PROJECT_TEMPLATE_FILES, PROJECT_TEMPLATE_FILES_DEFAULT,
  TECH_NEXTJS, TECH_WORDPRESS, WORDPRESS_BOILERPLATE_PROJECT_DIR,
} from './utils.js';

export function requireProjectsPath() {
  const dir = projectsPath();
  try {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch (error) {
    displayWarn(`Unable to create projects directory ${dir}: ${error.message}`);
    return null;
  }
}

export function trashPath(target, { label = 'Local dir' } = {}) {
  if (!fs.existsSync(target)) {
    displayInfo(`  ${label} ${dim(target)} does not exist — skipping trash`);
    return 0;
  }
  const result = run(['trash', target], { timeout: 10000 });
  if (result.returncode !== 0) {
    displayWarn(`Failed to trash ${target}: ${commandCombined(result)}`);
    return 1;
  }
  displayInfo(`Trashed ${green(target)}`);
  return 0;
}

function deleteIfExists({ label, name, exists, deleteCmd, timeout }) {
  if (!exists) {
    displayInfo(`  ${label} ${green(name)} does not exist — skipping delete`);
    return 0;
  }
  const result = run(deleteCmd, { timeout });
  if (result.returncode !== 0) {
    displayWarn(`Failed to delete ${label.toLowerCase()} ${name}: ${commandCombined(result)}`);
    return 1;
  }
  displayInfo(`Deleted ${label} ${green(name)}`);
  return 0;
}

export function forceResetProject(projectDir, slug, deploy, { isNext = false } = {}) {
  const parts = ['trash local project dir'];
  if (deploy) {
    parts.push(`delete github repo ${green(slug)}`);
    if (isNext) parts.push(`delete vercel project ${bold(githubRepoName(slug))}`);
  }
  if (!confirm(`--force will ${parts.join(' and ')}.`)) {
    displayWarn('Aborted — nothing was changed');
    return 1;
  }
  if (!commandExists('trash')) {
    displayWarn('trash is not installed. Install it with: brew install trash-cli');
    return 1;
  }
  if (trashPath(projectDir) !== 0) return 1;
  if (deploy) {
    if (!commandExists('gh')) {
      displayWarn('gh is not installed. Install it with: brew install gh');
      return 1;
    }
    let rc = deleteIfExists({
      label: 'github repo', name: slug, exists: repoExists(slug),
      deleteCmd: ['gh', 'repo', 'delete', slug, '--yes'], timeout: 30000,
    });
    if (rc !== 0) return rc;
    if (isNext) {
      if (!commandExists('vercel')) {
        displayWarn('vercel is not installed. Install it with: brew install vercel-cli');
        return 1;
      }
      const name = githubRepoName(slug);
      const listing = run(['vercel', 'project', 'ls'], { timeout: 15000 });
      rc = deleteIfExists({
        label: 'vercel project', name,
        exists: `${listing.stdout || ''}${listing.stderr || ''}`.includes(name),
        deleteCmd: ['vercel', 'remove', name, '--yes'], timeout: 30000,
      });
      if (rc !== 0) return rc;
    }
  }
  return 0;
}

export function scaffoldProject({
  projectName, sectionTitle, repoDescription, deploy, force,
  pushConfirmPrompt = 'Push to GitHub?', buildBody, isNext = false,
}) {
  if (!commandExists('git')) {
    displayWarn('git is not installed. Install it with: brew install git');
    return 1;
  }
  const base = requireProjectsPath();
  if (!base) return 1;
  const projectDir = path.join(base, projectName);
  displaySection(sectionTitle);
  displayInfo(`Project dir: ${green(projectDir)}`);
  console.log();
  if (force && forceResetProject(projectDir, repoSlugFor(projectName), deploy, { isNext }) !== 0) return 1;
  fs.mkdirSync(projectDir, { recursive: true });
  const rc = buildBody(projectDir);
  if (rc) return rc;
  console.log();
  if (gitInitAndCommit(projectDir, 'created initial commit') !== 0) return 1;
  console.log();
  if (!deploy) {
    displayInfo(`Skipping deploy, use ${green('--deploy')} to push to GitHub`);
    return 0;
  }
  const [pushRc] = pushToGithub(projectDir, projectName, repoDescription, {
    confirmPrompt: pushConfirmPrompt,
  });
  return pushRc;
}

export function requireGistsPath() {
  const base = dropboxPath();
  if (!fs.existsSync(base)) {
    displayWarn(`Dropbox directory does not exist: ${base}`);
    return null;
  }
  const gists = path.join(base, 'Gists');
  if (!fs.existsSync(gists)) {
    displayWarn(`Gists directory does not exist: ${gists}`);
    return null;
  }
  return path.resolve(gists);
}

export function applyProjectVariables(filePath, variables) {
  if (!variables || !Object.keys(variables).length) return;
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { return; }
  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

export function copyGistFile(src, dest, { variables = null, required = false } = {}) {
  if (!fs.existsSync(src)) {
    const message = `No gist found at ${green(src)} — skipping ${path.basename(src)}`;
    if (required) displayWarn(message); else displayInfo(message);
    return !required;
  }
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    displayInfo(`Copied ${green(src)} → ${green(dest)}`);
  } catch (error) {
    displayWarn(`Failed to copy ${path.basename(src)}: ${error.message}`);
    return false;
  }
  if (variables) applyProjectVariables(dest, variables);
  return true;
}

export function copyProjectFiles(sourceDir, projectDir, files) {
  for (const [sourceName, destName] of files) {
    if (!copyGistFile(path.join(sourceDir, sourceName), path.join(projectDir, destName), { required: true })) return 1;
  }
  return 0;
}

/** Copy whole directories (recursively) from a source tree into a project. */
export function copyProjectDirectories(sourceDir, projectDir, dirs) {
  for (const name of dirs) {
    const src = path.join(sourceDir, name);
    const dest = path.join(projectDir, name);
    if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
      displayWarn(`No directory found at ${green(src)} — skipping ${name}`);
      return 1;
    }
    try {
      fs.cpSync(src, dest, { recursive: true });
      displayInfo(`Copied ${green(src)} → ${green(dest)}`);
    } catch (error) {
      displayWarn(`Failed to copy directory ${name}: ${error.message}`);
      return 1;
    }
  }
  return 0;
}

// Backwards-compatible alias (the helper is no longer Gists-specific).
export const copyGistFiles = copyProjectFiles;

export function readmeFooterLine() {
  const username = githubUsername();
  return username && username !== 'unknown'
    ? `*Generated by [tp](https://github.com/${username}/tp)*`
    : '*Generated by tp*';
}

export function deployToVercel(projectDir) {
  if (!commandExists('vercel')) {
    displayWarn('vercel is not installed. Install it with: brew install vercel-cli');
    return 1;
  }
  const result = spawnSync('vercel', ['--yes', '--prod'], { cwd: projectDir, stdio: 'inherit' });
  return result.status === 0 ? 0 : 1;
}

export function extractBoilerplateZip(zipFile, projectDir) {
  if (!fs.existsSync(zipFile)) {
    displayWarn(`  Boilerplate not found: ${zipFile} — starting empty`);
    return false;
  }
  try {
    const unzip = run(['unzip', '-q', '-o', zipFile, '-d', projectDir], { timeout: 30000 });
    if (unzip.returncode !== 0) {
      displayWarn(`Failed to extract boilerplate: ${commandCombined(unzip)}`);
      return false;
    }
    return true;
  } catch (error) {
    displayWarn(`Failed to extract boilerplate: ${error.message}`);
    return false;
  }
}

export function updatePackageJson(projectDir, name) {
  const file = path.join(projectDir, 'package.json');
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.name = name;
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } catch { /* no package.json */ }
}

export function renderTemplateFile(filePath, name, slug, desc, tech) {
  if (!fs.existsSync(filePath)) return;
  let text = fs.readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries({
    name, slug, desc, tech, description: desc,
  })) {
    text = text.replaceAll(`{{${key}}}`, value);
  }
  fs.writeFileSync(filePath, text, 'utf8');
}

export function requireDropboxPath() {
  const base = dropboxPath();
  if (!fs.existsSync(base)) {
    displayWarn(`Dropbox directory does not exist: ${base}`);
    return null;
  }
  return base;
}

export function requireGistsPathForProjects() {
  const base = requireDropboxPath();
  return base ? path.join(base, 'Gists') : null;
}

export function loadProjectGists(projectName) {
  const gists = [];
  for (const record of loadData()) {
    if (recordType(record) !== 'project_gist') continue;
    const fields = record.fields || [];
    const name = getField(fields, 0);
    const gistFile = getField(fields, 1);
    const destination = getField(fields, 2);
    if (name.toLowerCase() !== projectName.toLowerCase() || !gistFile) continue;
    gists.push([gistFile, destination || gistFile]);
  }
  return gists;
}

export function loadProjectVariables(projectName) {
  const variables = {};
  for (const record of loadData()) {
    if (recordType(record) !== 'project_variable') continue;
    const fields = record.fields || [];
    const name = getField(fields, 0);
    const key = getField(fields, 1);
    const value = getField(fields, 2);
    if (name.toLowerCase() !== projectName.toLowerCase() || !key) continue;
    variables[key] = value;
  }
  return variables;
}

export function copyProjectGists(projectDir, gistsPath, projectName) {
  const gists = loadProjectGists(projectName);
  if (!gists.length) return;
  const variables = loadProjectVariables(projectName);
  displaySection('Copying gists');
  for (const [gistFile, destination] of gists) {
    copyGistFile(path.join(gistsPath, gistFile), path.join(projectDir, destination), { variables });
  }
  console.log();
}

export function updateNextjsLayoutMetadata(projectDir, name, desc) {
  const layout = path.join(projectDir, 'app', 'layout.tsx');
  if (!fs.existsSync(layout)) {
    displayWarn('  app/layout.tsx not found — skipping metadata update');
    return;
  }
  let content;
  try { content = fs.readFileSync(layout, 'utf8'); } catch (error) {
    displayWarn(`  Failed to read app/layout.tsx: ${error.message}`);
    return;
  }
  content = content.replace(/(title\s*:\s*)["']([^"']*)["']/, (_m, p1) => `${p1}"${name}"`);
  content = content.replace(/(description\s*:\s*)["']([^"']*)["']/, (_m, p1) => `${p1}"${desc}"`);
  fs.writeFileSync(layout, content, 'utf8');
  displayInfo(`  Updated   : ${green('app/layout.tsx')} metadata title/description`);
}

export function symlinkWordpressPlugin(projectsPathValue, projectDir, pluginName) {
  const wpBoilerplate = path.join(projectsPathValue, WORDPRESS_BOILERPLATE_PROJECT_DIR);
  if (!fs.existsSync(wpBoilerplate)) {
    displayWarn(`  WordPress boilerplate not found at ${wpBoilerplate} — generate it first ` +
      '(see the WordPress boilerplate command) before linking plugins.');
    return false;
  }
  const pluginsDir = path.join(wpBoilerplate, 'wp-content', 'plugins');
  try {
    fs.mkdirSync(pluginsDir, { recursive: true });
  } catch (error) {
    displayWarn(`  Failed to create plugins directory: ${error.message}`);
    return false;
  }
  const link = path.join(pluginsDir, pluginName);
  if (fs.existsSync(link) || fs.lstatSync(link, { throwIfNoEntry: false })) {
    displayWarn(`  Symlink target already exists — skipping: ${link}`);
    return false;
  }
  try {
    fs.symlinkSync(projectDir, link, 'dir');
    displayInfo(`  Symlinked : ${green(link)} → ${projectDir}`);
    return true;
  } catch (error) {
    displayWarn(`  Failed to create symlink: ${error.message}`);
    return false;
  }
}

export function generateSingleProject(name, slug, desc, tech, { deploy, index, total }) {
  const projectsBase = requireProjectsPath();
  if (!projectsBase) return 1;
  const dropbox = requireDropboxPath();
  if (!dropbox) return 1;
  const gistsPath = path.join(dropbox, 'Gists');
  const boilerplatesPath = path.join(gistsPath, 'boilerplates');
  const label = `[${index}/${total}] ${bold(name)}`;
  const projectDir = path.join(projectsBase, slug);
  const techKey = String(tech).trim().toLowerCase();
  const boilerplateZip = path.join(boilerplatesPath, `${techKey}-boilerplate.zip`);
  const templateFiles = PROJECT_TEMPLATE_FILES[techKey] || PROJECT_TEMPLATE_FILES_DEFAULT;
  displaySection(label);
  displayInfo(`  Directory:   ${green(projectDir)}`);
  displayInfo(`  Boilerplate: ${green(boilerplateZip)}`);
  displayInfo(`  Tech:        ${green(tech)}`);
  console.log();
  if (fs.existsSync(projectDir)) {
    displayWarn(`  Directory already exists — skipping: ${projectDir}`);
    return 1;
  }
  try {
    fs.mkdirSync(projectDir, { recursive: false });
  } catch (error) {
    displayWarn(`  Failed to create directory: ${error.message}`);
    return 1;
  }
  extractBoilerplateZip(boilerplateZip, projectDir);
  const readmeExists = fs.existsSync(path.join(projectDir, 'readme.md'))
    || fs.existsSync(path.join(projectDir, 'README.md'));
  for (const rel of templateFiles) {
    const isReadme = rel.toLowerCase() === 'readme.md';
    let tplPath = path.join(projectDir, rel);
    if (fs.existsSync(tplPath)) {
      renderTemplateFile(tplPath, name, slug, desc, tech);
      displayInfo(`  Rendered  : ${green(rel)}`);
      continue;
    }
    if (isReadme && readmeExists) {
      tplPath = path.join(projectDir, fs.existsSync(path.join(projectDir, 'README.md'))
        ? 'README.md' : 'readme.md');
      renderTemplateFile(tplPath, name, slug, desc, tech);
      displayInfo(`  Rendered  : ${green(path.basename(tplPath))} (from boilerplate)`);
    } else if (isReadme) {
      fs.writeFileSync(tplPath, `# ${name}\n\n${desc}\n\n**Tech:** ${tech}\n`, 'utf8');
      displayInfo(`  Created   : ${green(rel)} (stub)`);
    } else {
      displayWarn(`  Missing template file (skipped): ${rel}`);
    }
  }
  if (techKey === TECH_NEXTJS) {
    updatePackageJson(projectDir, name);
    updateNextjsLayoutMetadata(projectDir, name, desc);
  }
  copyProjectGists(projectDir, gistsPath, name);
  if (techKey === TECH_WORDPRESS) {
    symlinkWordpressPlugin(projectsBase, projectDir, slug);
  }
  displayInfo('  Initialising git …');
  if (gitInitAndCommit(projectDir) !== 0) return 1;
  if (deploy) {
    const [rc] = pushToGithub(projectDir, slug.split('/').pop(), desc, {
      confirmPrompt: `Push ${name} to GitHub?`,
    });
    if (rc !== 0) return rc;
    if (techKey === TECH_NEXTJS) {
      const vercelRc = deployToVercel(projectDir);
      if (vercelRc !== 0) return vercelRc;
    }
  }
  displaySuccess(`  Project ready: ${name}`);
  return 0;
}

export function displayGenerated(message) {
  displaySuccess(message);
}
