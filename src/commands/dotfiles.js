import fs from 'node:fs';
import path from 'node:path';
import {
  bold, command, configuredDropboxPath, DEPLOY_FLAG, displayError, displayInfo,
  displaySection, displayWarn, FORCE_FLAG, githubUsername, readmeFooterLine,
  scaffoldProject,
} from '../core/index.js';

const DOTFILES_PROJECT_DESCRIPTION = 'My personal macOS dotfiles and configuration scripts';
const DOTFILE_DIRS = ['zsh', 'git', 'vscode'];

/** Copy the project image from the generated dotfiles source tree. */
export function copyDotfilesImage(sourceDir, projectDir) {
  const imageSrc = path.join(sourceDir, 'dotfiles.png');
  const imageDst = path.join(projectDir, 'dotfiles.png');
  if (!fs.existsSync(imageSrc)) {
    displayWarn(`  dotfiles.png not found in dotfiles source dir, skipping: ${imageSrc}`);
    return 1;
  }
  try {
    fs.copyFileSync(imageSrc, imageDst);
    displayInfo(`  Copied ${bold('dotfiles.png')}`);
    return 0;
  } catch (error) {
    displayWarn(`  Failed to copy dotfiles.png: ${error.message}`);
    return 1;
  }
}

export function handleDotfiles(args) {
  const dropbox = configuredDropboxPath();
  if (!dropbox) {
    displayError('DROPBOX_PATH environment variable is not set. '
      + 'Set it to your Dropbox directory to build the dotfiles project.');
    return 1;
  }
  const sourceDir = path.join(dropbox, 'Projects', 'dotfiles');
  if (!fs.existsSync(sourceDir)) {
    displayWarn(`Dotfiles source directory not found: ${sourceDir}`);
    return 1;
  }

  function buildBody(projectDir) {
    displaySection('Copy directories');
    let anyCopyError = false;
    for (const dirName of DOTFILE_DIRS) {
      const src = path.join(sourceDir, dirName);
      const dst = path.join(projectDir, dirName);
      if (!fs.existsSync(src)) {
        displayWarn(`  Source directory not found, skipping: ${src}`);
        anyCopyError = true;
        continue;
      }
      if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
      try {
        fs.cpSync(src, dst, { recursive: true });
        displayInfo(`  Copied ${bold(dirName)}/`);
      } catch (error) {
        displayWarn(`  Failed to copy ${dirName}/: ${error.message}`);
        anyCopyError = true;
      }
    }
    const makefileSrc = path.join(sourceDir, 'Makefile');
    const makefileDst = path.join(projectDir, 'Makefile');
    if (fs.existsSync(makefileSrc)) {
      try {
        fs.cpSync(makefileSrc, makefileDst);
        displayInfo(`  Copied ${bold('Makefile')}`);
      } catch (error) {
        displayWarn(`  Failed to copy Makefile: ${error.message}`);
        anyCopyError = true;
      }
    } else {
      displayWarn(`  Makefile not found in dotfiles source dir, skipping: ${makefileSrc}`);
    }
    console.log();
    if (anyCopyError) {
      displayWarn('One or more directories could not be copied — continuing anyway');
      console.log();
    }
    displayInfo('Copy project files');
    if (copyDotfilesImage(sourceDir, projectDir) !== 0) return 1;

    const username = githubUsername();
    const contentsLines = [];
    for (const dirName of DOTFILE_DIRS) {
      const dst = path.join(projectDir, dirName);
      if (fs.existsSync(dst)) {
        contentsLines.push(`- **\`${dirName}/\`** — ${dirName.charAt(0).toUpperCase()}${dirName.slice(1)} configuration`);
      }
    }
    if (fs.existsSync(makefileDst)) {
      contentsLines.push('- **`Makefile`** — Automation targets');
    }
    const contentsBlock = contentsLines.join('\n');
    const cloneLine = username
      ? `git clone https://github.com/${username}/dotfiles.git`
      : 'git clone https://github.com/<username>/dotfiles.git';
    const footerLine = readmeFooterLine();
    const readmeContent = `# dotfiles

My personal macOS configuration and setup scripts.

<p align="center">
  <img src="dotfiles.png" width="98%"><br>
  <em>Help screen</em>
</p>

## Contents

${contentsBlock}

## Usage

Clone the repository and run the relevant scripts to apply settings:

\`\`\`sh
${cloneLine}
cd dotfiles
\`\`\`

---

${footerLine}
`;
    fs.writeFileSync(path.join(projectDir, 'readme.md'), readmeContent, 'utf8');
    displayInfo(`Wrote ${bold('readme.md')} (${readmeContent.length} bytes)`);
    return undefined;
  }

  return scaffoldProject({
    projectName: 'dotfiles',
    sectionTitle: 'Generate dotfiles project',
    repoDescription: DOTFILES_PROJECT_DESCRIPTION,
    deploy: Boolean(args?.deploy),
    force: Boolean(args?.force),
    pushConfirmPrompt: 'Push dotfiles to GitHub?',
    buildBody,
  });
}

export const COMMAND = command({
  name: 'dotfiles',
  desc: 'Generate dotfiles project',
  handler: handleDotfiles,
  flags: [FORCE_FLAG, DEPLOY_FLAG],
  visibility: 'public',
});
