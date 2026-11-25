import { destOf } from './args.js';

function coerce(def, value) {
  if (value === null || value === undefined) return value;
  const converter = def.type === 'int' || def.type === 'number'
    ? Number
    : (typeof def.type === 'function' ? def.type : null);
  if (!converter) return value;
  if (Array.isArray(value)) return value.map((item) => converter(item));
  const converted = converter(value);
  return Number.isNaN(converted) ? value : converted;
}

function defaultValue(def) {
  if (Object.hasOwn(def, 'default')) {
    return Array.isArray(def.default) ? [...def.default] : def.default;
  }
  if (def.action === 'store_true') return false;
  if (def.nargs === '*' || def.nargs === '+') return [];
  return null;
}

function isOption(token) {
  return typeof token === 'string' && token.startsWith('-') && token !== '-';
}

/**
 * Small flag parser driven by the shared flag dictionaries.
 * Returns a namespace-like object.
 */
export function parseArgs(specs, argv) {
  const byName = new Map(specs.map((s) => [s.name, s]));
  const ns = { command: null, private: false, help: false, extraArgs: [] };
  let i = 0;

  for (; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--private') { ns.private = true; continue; }
    if (token === '-h' || token === '--help') { ns.help = true; continue; }
    if (isOption(token)) { ns.extraArgs.push(token); continue; }
    if (byName.has(token)) { ns.command = token; i += 1; break; }
    ns.extraArgs.push(token);
  }

  const spec = byName.get(ns.command);
  if (!spec) return ns;

  const defs = spec.flags || [];
  for (const def of defs) ns[destOf(def)] = defaultValue(def);

  let positional = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token === '--private') { ns.private = true; i += 1; continue; }
    if (token === '-h' || token === '--help') { ns.help = true; i += 1; continue; }
    if (isOption(token)) {
      const def = defs.find((d) => d.flags.includes(token));
      if (!def) { ns.extraArgs.push(token); i += 1; continue; }
      const dest = destOf(def);
      if (def.action === 'store_true') { ns[dest] = true; i += 1; continue; }

      const nargs = def.nargs ?? 1;
      const values = [];
      if (nargs === '+' || nargs === '*' || typeof nargs === 'number') {
        while (i + 1 < argv.length && !isOption(argv[i + 1])) {
          values.push(argv[i + 1]);
          i += 1;
          if (typeof nargs === 'number' && values.length >= nargs) break;
        }
        ns[dest] = coerce(def, values);
      } else {
        if (i + 1 < argv.length && !isOption(argv[i + 1])) {
          values.push(argv[i + 1]);
          i += 1;
        }
        ns[dest] = values.length ? coerce(def, values[0]) : defaultValue(def);
      }
      i += 1;
      continue;
    }

    while (positional < defs.length && defs[positional].flags[0].startsWith('-')) positional += 1;
    const def = defs[positional];
    if (!def) { ns.extraArgs.push(token); i += 1; continue; }
    const dest = destOf(def);
    const nargs = def.nargs ?? 1;
    if (nargs === '*' || nargs === '+') {
      const values = [];
      while (i < argv.length && !isOption(argv[i])) { values.push(argv[i]); i += 1; }
      ns[dest] = values;
    } else {
      ns[dest] = coerce(def, token);
      i += 1;
      positional += 1;
    }
  }
  return ns;
}
