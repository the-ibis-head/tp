import fs from 'node:fs';
import path from 'node:path';
import { GITHUB_OWNERS } from './config.js';
import { run, commandExists } from './subprocess.js';
import {
  bold, displayInfo, displayWarn, green, commandCombined, confirm,
} from './terminal.js';

export function ghUserField(field) {
  if (!commandExists('gh')) return '';
  const result = run(['gh', 'api', 'user', '--jq', `.${field}`], { timeout: 10000 });
  return (result.stdout || '').trim();
}

export const githubUsername = () => ghUserField('login');
export const githubRepoName = (slug) => String(slug).split('/').pop();

export function fetchGithubRepos(
  owners = GITHUB_OWNERS,
  fields = 'name,visibility,isPrivate,updatedAt,description',
  { report } = {},
) {
  const repos = [];
  for (const [index, owner] of owners.entries()) {
    try {
      const result = run(['gh', 'repo', 'list', owner, '--limit', '200', '--json', fields], { timeout: 30000 });
      if (result.returncode !== 0) {
        displayWarn(`gh repo list failed for '${owner}': ${commandCombined(result)}`);
        continue;
      }
      let parsed;
      try { parsed = JSON.parse(result.stdout || '[]'); } catch (error) {
        displayWarn(`Failed to parse gh output for '${owner}': ${error.message}`);
        continue;
      }
      for (const repo of parsed) repos.push({ ...repo, owner });
    } finally {
      // Report once per attempted owner, including failures, so progress never stalls.
      report?.(index + 1, owners.length);
    }
  }
  return repos;
}

export function repoExists(slug) {
  return run(['gh', 'repo', 'view', slug], { timeout: 10000 }).returncode === 0;
}

export function gitInitAndCommit(projectDir, message = 'created initial commit') {
  if (!fs.existsSync(path.join(projectDir, '.git'))) {
    const init = run(['git', 'init', '-b', 'main'], { cwd: projectDir, timeout: 10000 });
    if (init.returncode !== 0) {
      displayWarn(`git init failed: ${commandCombined(init)}`);
      return 1;
    }
    displayInfo(`Initialised ${green('main')} branch`);
  }
  run(['git', 'add', '--all'], { cwd: projectDir, timeout: 10000 });
  const status = run(['git', 'status', '--porcelain'], { cwd: projectDir, timeout: 10000 });
  if ((status.stdout || '').trim()) {
    const commit = run(['git', 'commit', '-m', message], { cwd: projectDir, timeout: 15000 });
    if (commit.returncode !== 0) {
      displayWarn(`git commit failed: ${commandCombined(commit)}`);
      return 1;
    }
    displayInfo(`Committed ${green(message)}`);
  } else {
    displayInfo('Nothing to commit, working tree clean');
  }
  return 0;
}

export function pushToGithub(projectDir, repoName, description, {
  owner = null, confirmPrompt = 'Push to GitHub?',
} = {}) {
  if (!commandExists('gh')) {
    displayWarn('gh is not installed. Install it with: brew install gh');
    return [1, ''];
  }
  const username = githubUsername();
  if (!username) {
    displayWarn('Could not determine GitHub username, is gh authenticated?');
    return [1, ''];
  }
  const slug = `${owner || username}/${repoName}`;
  if (!repoExists(slug)) {
    displayInfo(`Remote repo ${green(slug)} not found, creating it …`);
    const create = run([
      'gh', 'repo', 'create', slug, '--public', '--description', description,
    ], { timeout: 30000 });
    if (create.returncode !== 0) {
      displayWarn(`Failed to create repo: ${commandCombined(create)}`);
      return [1, username];
    }
    displayInfo(`Created ${green(slug)}`);
  } else {
    displayInfo(`Remote repo ${bold(slug)} already exists`);
  }
  const remoteUrl = `git@github.com:${slug}.git`;
  const remotes = run(['git', 'remote'], { cwd: projectDir, timeout: 10000 });
  if (!(remotes.stdout || '').includes('origin')) {
    run(['git', 'remote', 'add', 'origin', remoteUrl], { cwd: projectDir, timeout: 10000 });
    displayInfo(`Remote set to ${green(remoteUrl)}`);
  }
  console.log();
  if (!confirm(confirmPrompt)) {
    displayWarn('Aborted — nothing was pushed');
    return [1, username];
  }
  console.log();
  displayInfo('Pushing to github');
  const push = run(['git', 'push', '--set-upstream', 'origin', 'main'], {
    cwd: projectDir, timeout: 60000,
  });
  if (push.returncode !== 0) {
    displayWarn(`git push failed: ${commandCombined(push)}`);
    return [1, username];
  }
  displayInfo(`Pushed → ${green(`https://github.com/${slug}`)}`);
  return [0, username];
}

export const repoSlugFor = (name) => `${githubUsername() || 'unknown'}/${name}`;

export function confirmAndDelete(items, { warning, actionLabel, pastTense, runDelete }) {
  displayWarn(warning);
  console.log();
  if (!confirm('Proceed?')) {
    displayWarn('Aborted — nothing was deleted');
    return 1;
  }
  let failed = 0;
  items.forEach((item, index) => {
    displayInfo(`[${index + 1}/${items.length}] ${actionLabel} ${bold(item)} …`);
    const result = runDelete(item);
    if (result.returncode !== 0) {
      displayWarn(`  Failed to ${actionLabel.toLowerCase()} ${item}: ${commandCombined(result)}`);
      failed += 1;
    } else {
      displayInfo(`${green(pastTense)} ${item}`);
    }
  });
  const succeeded = items.length - failed;
  displayInfo(`${green(String(succeeded))} ${pastTense.toLowerCase()}` +
    (failed ? `, ${failed} failed` : ''));
  return failed === 0 ? 0 : 1;
}
