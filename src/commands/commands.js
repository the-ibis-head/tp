import { command, COMMAND_TYPE_FLAG, FILTER_FLAG, filterTerms, matchFilter } from '../core/index.js';
import { dim, displayInfo, displaySection, displayWarn, green, printTable } from '../core/terminal.js';
import { discover } from '../discovery.js';

export async function handleCommands(args) {
  let specs = args.specs || [];
  if (!specs.length) specs = await discover();
  const typeFilter = String(args.type || '').toLowerCase();
  const terms = filterTerms(args);
  const rows = specs
    .filter((spec) => !typeFilter || spec.visibility.toLowerCase() === typeFilter)
    .filter((spec) => matchFilter(terms, [spec.name, spec.desc, spec.visibility, spec.module]))
    .map((spec) => [green(spec.name), spec.desc, spec.visibility, dim(spec.module)]);

  displaySection('Discovered commands');
  if (!rows.length) {
    displayWarn('No commands match the filter');
    return 1;
  }
  printTable(['Name', 'Description', 'Type', 'Module'], rows);
  console.log();
  displayInfo(`${green(String(rows.length))} command(s) found`);
  return 0;
}

export const COMMAND = command({
  name: 'commands',
  desc: 'List auto-discovered commands',
  handler: handleCommands,
  flags: [COMMAND_TYPE_FLAG, FILTER_FLAG],
  visibility: 'public',
});
