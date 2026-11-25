import {
  GITHUB_OWNERS, GITHUB_PERSONAL_OWNER, GITHUB_SUBCOMMAND_ARG,
  command, confirmAndDelete, displayInfo, displaySection, displayWarn, fetchGithubRepos,
  green, parseSubcommand, printTable, requireTool, run, withSpinner, yellow,
} from '../core/index.js';

function githubList() {
  displaySection('List github repositories');
  const repos = withSpinner(
    `Fetching repositories from ${GITHUB_OWNERS.length} GitHub owners`,
    (report) => fetchGithubRepos(
      GITHUB_OWNERS,
      'name,visibility,isPrivate,updatedAt,description',
      { report },
    ),
    { total: GITHUB_OWNERS.length },
  );
  if (!repos.length) {
    displayWarn('No repositories found');
    return 0;
  }
  const rows = repos.map((repo) => [
    repo.owner || '',
    repo.name || '',
    String(repo.visibility || '').toLowerCase(),
    String(repo.updatedAt || '').slice(0, 10),
    repo.description || '',
  ]);
  printTable(['Owner', 'Name', 'Visibility', 'Updated', 'Description'], rows);
  console.log();
  displayInfo(`${green(String(repos.length))} repository(ies) found`);
  return 0;
}

function githubDelete(targets) {
  if (!targets.length) {
    displayWarn('Usage: tp github delete <owner/repo> [owner/repo …]  OR  tp github delete all');
    return 1;
  }
  const repos = fetchGithubRepos(GITHUB_OWNERS, 'name,nameWithOwner');
  const byNwo = new Map(
    repos.map((repo) => [String(repo.nameWithOwner || '').toLowerCase(), repo.nameWithOwner]),
  );
  let toDelete;
  if (targets.length === 1 && targets[0] === 'all') {
    toDelete = repos
      .filter((repo) => repo.owner === GITHUB_PERSONAL_OWNER)
      .map((repo) => repo.nameWithOwner);
  } else {
    toDelete = [];
    for (const target of targets) {
      if (String(target).toLowerCase() === 'all') {
        displayWarn(
          `'${target}' deletes only your personal repos and must be used alone — skipping`,
        );
        continue;
      }
      if (!String(target).includes('/')) {
        displayWarn(`'${target}' is ambiguous — specify owner/repo (e.g. thothprocess/${target}) — skipping`);
        continue;
      }
      const nwo = byNwo.get(String(target).toLowerCase());
      if (nwo) {
        toDelete.push(nwo);
      } else {
        displayWarn(`Repository not found: '${target}' — skipping`);
      }
    }
  }
  if (!toDelete.length) {
    displayWarn('No matching repositories to delete');
    return 1;
  }
  displaySection('Repositories to delete');
  printTable(
    ['#', 'Repository'],
    toDelete.map((nwo, i) => [String(i + 1), nwo]),
  );
  console.log();
  return confirmAndDelete(toDelete, {
    warning: `This will permanently delete ${yellow(String(toDelete.length))} repository(ies). This CANNOT be undone.`,
    actionLabel: 'Deleting',
    pastTense: 'Deleted',
    runDelete: (nwo) => run(['gh', 'repo', 'delete', nwo, '--yes'], { timeout: 30000 }),
  });
}

export function handleGithub(args) {
  if (!requireTool('gh', 'brew install gh')) return 1;
  const [rawSubcommand, rest] = parseSubcommand(args, 'list');
  const subcommand = String(rawSubcommand).trim().toLowerCase();
  if (subcommand === 'list') return githubList();
  if (subcommand === 'delete') return githubDelete(rest);
  displayWarn(`Unknown subcommand: '${subcommand}'. Available: list, delete`);
  return 1;
}

export const COMMAND = command({
  name: 'github',
  desc: 'Manage github repositories',
  handler: handleGithub,
  flags: [GITHUB_SUBCOMMAND_ARG],
  visibility: 'public',
});
