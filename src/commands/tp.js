import {
  command, copyProjectDirectories, copyProjectFiles, DEPLOY_FLAG, displayInfo,
  FORCE_FLAG, ROOT, scaffoldProject,
} from '../core/index.js';

const TP_PROJECT_DESCRIPTION = 'ThothProcess automation CLI';
const TP_FILES = [
  'readme.md',
  'package.json',
  '.gitignore',
  'tp.png',
  'tp-system.png',
];
const TP_DIRECTORIES = ['bin', 'src', 'tests'];

export function copyTpProjectFiles(projectDir, sourceDir = ROOT) {
  displayInfo('Copy project files');
  const files = TP_FILES.map((name) => [name, name]);
  const rc = copyProjectFiles(sourceDir, projectDir, files);
  if (rc) return rc;
  return copyProjectDirectories(sourceDir, projectDir, TP_DIRECTORIES);
}

export function handleTp(args) {
  return scaffoldProject({
    projectName: 'tp',
    sectionTitle: 'Generate tp project',
    repoDescription: TP_PROJECT_DESCRIPTION,
    deploy: Boolean(args?.deploy),
    force: Boolean(args?.force),
    pushConfirmPrompt: 'Push tp to github?',
    buildBody: copyTpProjectFiles,
  });
}

export const COMMAND = command({
  name: 'tp',
  desc: 'Generate tp project',
  handler: handleTp,
  flags: [FORCE_FLAG, DEPLOY_FLAG],
  visibility: 'public',
});
