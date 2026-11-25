# tp

Personal macOS automation CLI for **ThothProcess**, built as a modular,
auto-discovering **Node.js** package.

## Layout

```
src/
  index.js        # node src/index.js entry point
  cli.js          # help rendering, parsing, and dispatch
  discovery.js    # scans src/commands/ and validates COMMAND specs
  core/           # shared helpers (data, terminal, subprocess, gitops, ...)
  commands/       # one self-contained ESM module per command
bin/tp.js         # installed `tp` console script
data.txt          # pipe-delimited data source (type|field|...)
```

## Usage

Run it from inside the project with the executable wrapper or the `start` script:

```sh
./bin/tp.js                       # custom help (public commands)
./bin/tp.js --private             # include private commands
./bin/tp.js commands --type public
./bin/tp.js system
./bin/tp.js paths --filter python
./bin/tp.js games --filter control       # filter game| records from data.txt
./bin/tp.js comics --filter batman       # filter comic| records from data.txt
./bin/tp.js defaults generate            # write $DROPBOX_PATH/Projects/dotfiles/macos/defaults.txt
./bin/tp.js homebrew generate            # write $DROPBOX_PATH/Projects/dotfiles/homebrew/Brewfile
./bin/tp.js duti generate                # write $DROPBOX_PATH/Projects/dotfiles/duti/formats.txt
./bin/tp.js git generate                 # write $DROPBOX_PATH/Projects/dotfiles/git/{config,ignore}
./bin/tp.js zsh generate                 # write $DROPBOX_PATH/Projects/dotfiles/zsh/config
./bin/tp.js vscode generate              # write $DROPBOX_PATH/Projects/dotfiles/vscode/*.json / extensions.txt
./bin/tp.js dotfiles                     # build project from $DROPBOX_PATH/Projects/dotfiles
./bin/tp.js dotfiles --deploy            # build, then push the generated project

npm start -- system               # equivalent to node src/index.js system
```

The same examples work with `node src/index.js` if you prefer.

To get a bare `tp` command, link the package globally (changes in this checkout
are reflected immediately):

```sh
npm link
tp --help
```

`npm install -g .` also works if you want a fixed global copy instead.

## Adding a command

Drop a new file into `src/commands/`. No registry, import list, or dispatch
table needs editing — `discovery.js` finds it automatically. The filename must
match `COMMAND.name`.

```js
// src/commands/ping.js
import { command } from '../core/index.js';
import { displayInfo, green } from '../core/terminal.js';

export function handlePing() {
  displayInfo(green('pong'));
  return 0;
}

export const COMMAND = command({
  name: 'ping',             // must equal the filename
  desc: 'Reply with pong',
  handler: handlePing,
  flags: [],                // flag definitions
  visibility: 'public',     // or 'private'
});
```

Then `node src/index.js ping` works. Broken modules produce a warning and are
skipped; `discover({ strict: true })` throws instead (useful in tests).

## Tests

```sh
npm test
```

## Notes

- Command modules own their handler, flags, and command-specific helpers.
  Truly shared code lives in `src/core/`.
- `data.txt` holds sample records for data-driven commands. It is protected by
  `opencode.jsonc`: coding agents are denied edit and shell mutations of it, so
  change records outside OpenCode (or by editing that config intentionally).
- Both `FILTER_FLAG` and `_FILTER_FLAG` spellings work. Import from
  `../core/index.js`.
- `linkedin.txt` previously contained plaintext session cookies; it is
  gitignored and is never read by this project. Credentials come from the
  macOS Keychain via `getKeychainSecret`.
- Many commands require macOS tools (`gh`, `git`, `security`, `trash`, `figlet`,
  `vercel`, `wp`). Missing tools are reported with install hints.
- All `generate` commands require `DROPBOX_PATH` and write under
  `$DROPBOX_PATH/Projects/dotfiles/<command>/` (for example `macos/defaults.txt`,
  `homebrew/Brewfile`, `duti/formats.txt`, `git/config`, `zsh/config`, and
  `vscode/settings.json`). They error when the variable is unset.
- `dotfiles` also requires `DROPBOX_PATH`: it copies `zsh/`, `git/`, `vscode/`,
  `Makefile` and `dotfiles.png` from `$DROPBOX_PATH/Projects/dotfiles` into the
  generated project (and pushes it with `--deploy`). It no longer reads the
  image from the Gists folder.
