export * from './flags.js';

/** Helper for declaring a command in a command module. */
export function command({ name, desc, handler, flags = [], visibility = 'public' }) {
  return { name, desc, handler, flags, visibility };
}

/** Destination key for a flag definition. */
export function destOf(def) {
  const positional = def.flags.find((name) => !name.startsWith('-'));
  if (positional) return positional;
  return def.flags[0].replace(/^-+/, '').replace(/-/g, '_');
}
