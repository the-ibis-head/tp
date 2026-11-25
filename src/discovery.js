/**
 * Auto-discovery of command modules.
 *
 * Drop a new file into src/commands/ that exports `COMMAND` and it becomes a
 * command automatically — no registry edits required.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { displayWarn } from './core/terminal.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const COMMANDS_DIR = path.join(here, 'commands');

function validate(spec, filename, strict) {
  const fail = (message) => {
    if (strict) throw new Error(message);
    displayWarn(message);
    return null;
  };
  if (!spec) return fail(`${filename} does not export COMMAND — skipping`);
  if (typeof spec.name !== 'string' || !spec.name) return fail(`${filename}: COMMAND.name is required`);
  if (typeof spec.handler !== 'function') return fail(`${filename}: COMMAND.handler must be a function`);
  if (spec.name !== filename) {
    return fail(`${filename}: COMMAND.name is '${spec.name}', expected '${filename}'`);
  }
  return spec;
}

/** Load every command module and return validated specs, sorted public-first. */
export async function discover({ strict = false } = {}) {
  const specs = [];
  const seen = new Set();
  const files = fs.readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
    .sort();

  for (const filename of files) {
    const name = filename.replace(/\.js$/, '');
    const url = pathToFileURL(path.join(COMMANDS_DIR, filename)).href;
    let module;
    try {
      module = await import(url);
    } catch (error) {
      if (strict) throw new Error(`Failed to load command module ${name}: ${error.message}`);
      displayWarn(`Failed to load command module ${name}: ${error.message}`);
      continue;
    }
    const spec = validate(module.COMMAND, name, strict);
    if (!spec) continue;
    if (seen.has(spec.name)) {
      const message = `Duplicate command name '${spec.name}' in ${name} — skipping`;
      if (strict) throw new Error(message);
      displayWarn(message);
      continue;
    }
    seen.add(spec.name);
    specs.push({ ...spec, flags: spec.flags || [], visibility: spec.visibility || 'public', module: name });
  }

  return specs.sort((a, b) => {
    if ((a.visibility === 'public') !== (b.visibility === 'public')) {
      return a.visibility === 'public' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
