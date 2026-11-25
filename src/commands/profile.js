import fs from 'node:fs';
import path from 'node:path';
import {
  command, DEPLOY_FLAG, FORCE_FLAG, PROFILE_SUBCOMMAND_ARG,
  GITHUB_ORG_OWNER, getField, ghUserField, gitInitAndCommit, githubUsername,
  loadData, parseSubcommand, pushToGithub, recordType, requireProjectsPath,
  requireTool, forceResetProject, readmeFooterLine,
} from '../core/index.js';
import { bold, displayInfo, displaySection, displayWarn, green } from '../core/terminal.js';

const META_SUFFIXES = new Set(['name', 'about', 'email', 'mission', 'kofi', 'toptal']);

function loadProfileData(prefix) {
  const profileMeta = {};
  const skills = [];
  const projects = [];
  const services = [];
  const links = [];
  const goalsOpen = [];
  for (const record of loadData()) {
    const rtype = recordType(record);
    const fields = record.fields || [];
    if (!rtype.startsWith(prefix)) continue;
    const suffix = rtype.slice(prefix.length);
    if (META_SUFFIXES.has(suffix)) {
      const value = getField(fields, 0);
      if (value) profileMeta[suffix] = value;
    } else if (suffix === 'skill') {
      const name = getField(fields, 0);
      if (name) skills.push(name);
    } else if (suffix === 'project') {
      const name = getField(fields, 0);
      const url = getField(fields, 1);
      const desc = getField(fields, 2);
      if (name) projects.push({ name, url, desc });
    } else if (suffix === 'service') {
      const name = getField(fields, 0);
      const desc = getField(fields, 1);
      if (name) services.push({ name, desc });
    } else if (suffix === 'link') {
      const label = getField(fields, 0);
      const url = getField(fields, 1);
      if (label && url) links.push({ label, url });
    } else if (suffix === 'working_on') {
      const item = getField(fields, 0);
      if (item) goalsOpen.push(item);
    }
  }
  return { profileMeta, skills, projects, services, links, goalsOpen };
}

function renderProfileReadme({
  isOrg, authorName, about, kofiUrl, toptalUrl, email,
  services, skills, projects, goalsOpen, links,
}) {
  const lines = [];
  lines.push(isOrg ? `👋 **Hi, we're ${authorName}!**` : '👋 **Hi there!**', '');
  if (about) lines.push(about, '');
  if (kofiUrl) lines.push(`- If you find my work useful, consider [supporting me on Ko-fi](${kofiUrl}).`);
  if (toptalUrl) lines.push(`- I'm available for freelance work — [hire me on Toptal](${toptalUrl}).`, '');
  if (email) lines.push(`✉️ [${email}](mailto:${email})`, '');
  if (isOrg && services.length) {
    lines.push('## Services', '');
    for (const svc of services) {
      const descMd = svc.desc ? ` — ${svc.desc}` : '';
      lines.push(`- **${svc.name}**${descMd}`);
    }
    lines.push('');
  }
  if (skills.length) {
    lines.push('## Skills', '');
    lines.push(skills.map((s) => `\`${s}\``).join(' '));
    lines.push('');
  }
  if (projects.length) {
    lines.push('## Projects', '');
    for (const proj of projects) {
      const titleMd = proj.url ? `[${proj.name}](${proj.url})` : proj.name;
      const descMd = proj.desc ? ` — ${proj.desc}` : '';
      lines.push(`- **${titleMd}**${descMd}`);
    }
    lines.push('');
  }
  if (goalsOpen.length) {
    lines.push('## Currently Working On', '');
    for (const goal of goalsOpen) lines.push(`- ${goal}`);
    lines.push('');
  }
  if (links.length) {
    lines.push('## Connect', '');
    for (const link of links) lines.push(`- [${link.label}](${link.url})`);
    lines.push('');
  }
  lines.push('---', '', readmeFooterLine(), '');
  return lines.join('\n');
}

function warnUnknownSubcommand(subcommand, valid) {
  displayWarn(`Unknown subcommand: '${subcommand}'. Available: ${valid.join(', ')}`);
  return 1;
}

export function handleProfile(args) {
  if (!requireTool('gh', 'brew install gh')) return 1;
  if (!requireTool('git', 'brew install git')) return 1;
  const [subcmd] = parseSubcommand(args, 'personal');
  if (!['personal', 'organization', 'org'].includes(subcmd)) {
    return warnUnknownSubcommand(subcmd, ['personal', 'organization']);
  }
  const isOrg = subcmd === 'organization' || subcmd === 'org';
  const prefix = isOrg ? 'github_org_profile_' : 'github_profile_';
  const {
    profileMeta, skills, projects, services, links, goalsOpen,
  } = loadProfileData(prefix);
  const ghDisplayName = ghUserField('name');
  const username = githubUsername();
  if (!username) {
    displayWarn('Could not determine GitHub username — is gh authenticated?');
    return 1;
  }
  const defaultName = isOrg ? GITHUB_ORG_OWNER : ((ghDisplayName || '').trim() || username);
  const authorName = profileMeta.name ?? defaultName;
  const about = profileMeta.about || '';
  const kofiUrl = profileMeta.kofi || '';
  const toptalUrl = profileMeta.toptal || '';
  const email = profileMeta.email || '';
  const deploy = Boolean(args?.deploy);
  const force = Boolean(args?.force);
  displaySection(`Generate github ${isOrg ? 'organization ' : ''}profile`);
  const targetLabel = isOrg ? `organization: ${GITHUB_ORG_OWNER}` : `personal: ${username}`;
  displayInfo(`Target:   ${green(targetLabel)}`);
  displayInfo(`Name:     ${green(authorName)}`);
  displayInfo(`Skills:   ${green(String(skills.length))} found`);
  displayInfo(`Projects: ${green(String(projects.length))} found`);
  if (isOrg) displayInfo(`Services: ${green(String(services.length))} found`);
  displayInfo(`Links:    ${green(String(links.length))} found`);
  displayInfo(`Working:  ${green(String(goalsOpen.length))} item(s)`);
  console.log();
  const repoSlug = isOrg
    ? `${GITHUB_ORG_OWNER}/.github`
    : `${username}/${username}`;
  const repoOwner = isOrg ? GITHUB_ORG_OWNER : null;
  const repoName = isOrg ? '.github' : username;
  const projectsBase = requireProjectsPath();
  if (!projectsBase) return 1;
  const projectDir = path.join(projectsBase, isOrg ? 'github-org-profile' : 'github-profile');
  if (force && forceResetProject(projectDir, repoSlug, deploy) !== 0) return 1;
  displayInfo(`Project dir: ${green(projectDir)}`);
  fs.mkdirSync(projectDir, { recursive: true });
  console.log();
  const readmeContent = renderProfileReadme({
    isOrg, authorName, about, kofiUrl, toptalUrl, email,
    services, skills, projects, goalsOpen, links,
  });
  const readmePath = isOrg
    ? path.join(projectDir, 'profile', 'README.md')
    : path.join(projectDir, 'README.md');
  if (isOrg) fs.mkdirSync(path.dirname(readmePath), { recursive: true });
  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  displayInfo(`Wrote ${bold(path.relative(projectDir, readmePath))} (${readmeContent.length} bytes)`);
  console.log();
  if (gitInitAndCommit(projectDir, 'created initial commit') !== 0) return 1;
  console.log();
  if (!deploy) {
    displayInfo(`Skipping deploy — use ${bold('--deploy')} to push to GitHub`);
    return 0;
  }
  const [rc] = pushToGithub(projectDir, repoName,
    isOrg ? `${GITHUB_ORG_OWNER} profile` : 'GitHub profile', {
      owner: repoOwner,
      confirmPrompt: isOrg
        ? `Push organization profile README to ${repoSlug}?`
        : 'Push profile README to GitHub?',
    });
  return rc;
}

export const COMMAND = command({
  name: 'profile',
  desc: 'Generate github profile',
  handler: handleProfile,
  flags: [PROFILE_SUBCOMMAND_ARG, FORCE_FLAG, DEPLOY_FLAG],
  visibility: 'public',
});
