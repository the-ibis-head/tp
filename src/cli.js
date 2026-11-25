/** Command-line front end: help rendering, parsing, and dispatch. */
import { COMMAND_NAME, COMMAND_DESCRIPTION } from './core/config.js';
import {
  bold, clearScreen, displayBanner, displayWarn, green, magenta, underline, yellow,
} from './core/terminal.js';
import { discover } from './discovery.js';
import { parseArgs } from './core/parser.js';

const SHARED_FLAGS = [
  ['--filter', 'TERM', 'Filter listed items by one or more terms'],
  ['--force', '', 'Force regeneration'],
  ['--deploy', '', 'Deploy after generating'],
];

function flagSummary(flags) {
  return flags.map((flag) => {
    const name = flag.flags[0];
    const meta = flag.metavar ? ` ${flag.metavar} …` : '';
    return `[${name}${meta}]`;
  }).join('  ');
}

export function displayHelp(args, specs) {
  const colCmd = Math.max(0, ...specs.map((s) => s.name.length)) + 2;
  const colDesc = 36;
  const row = (cmd, desc, opts = '') => {
    const name = green(`    ${cmd.padEnd(colCmd)}`);
    const text = String(desc).padEnd(colDesc);
    console.log(`${name}  ${text}  ${opts ? yellow(opts) : ''}`.trimEnd());
  };

  console.log(`  ${bold(magenta(COMMAND_NAME))} - ${COMMAND_DESCRIPTION}`);
  console.log();
  console.log(`  Usage: tp ${green('<command>')} [options]`);
  console.log();

  const sections = [['Commands', specs.filter((s) => s.visibility === 'public')]];
  if (args.private) sections.push(['Private Commands', specs.filter((s) => s.visibility === 'private')]);
  for (const [title, sectionSpecs] of sections) {
    if (!sectionSpecs.length) continue;
    console.log(`  ${underline(bold(title))}`);
    console.log();
    for (const spec of sectionSpecs) row(spec.name, spec.desc, flagSummary(spec.flags));
    console.log();
  }

  console.log(`  ${underline(bold('Shared Options'))}`);
  console.log();
  for (const [name, meta, desc] of SHARED_FLAGS) row(name, desc, meta ? `${meta} […]` : '');
  console.log();
  return 0;
}

export function displayUsageHelp(specs) {
  console.log(`usage: tp [-h] [--private] {${specs.map((s) => s.name).join(',')}} ...`);
  console.log();
  console.log(COMMAND_NAME);
  console.log();
  console.log('positional arguments:');
  for (const spec of specs) console.log(`  ${spec.name.padEnd(14)} ${spec.desc}`);
  console.log();
  console.log('options:');
  console.log('  -h, --help     show this help message and exit');
  console.log('  --private      Also show private commands in help output');
  return 0;
}

export function displayCommandHelp(spec) {
  console.log(`usage: tp ${spec.name} [options]`);
  console.log();
  console.log(`  ${spec.desc}`);
  console.log();
  if (spec.flags.length) {
    console.log('options:');
    for (const flag of spec.flags) {
      const names = flag.flags.join(', ');
      console.log(`  ${names.padEnd(22)} ${flag.help || ''}`);
    }
    console.log();
  }
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  const specs = await discover();
  const args = parseArgs(specs, argv);
  const spec = specs.find((s) => s.name === args.command);

  clearScreen();
  displayBanner();

  if (args.help) {
    return spec ? displayCommandHelp(spec) : displayUsageHelp(specs);
  }

  if (!spec) return displayHelp(args, specs);

  args.specs = specs;
  args.spec = spec;
  try {
    const result = await spec.handler(args);
    return Number.isInteger(result) ? result : 0;
  } catch (error) {
    displayWarn(`Unexpected error: ${error.message}`);
    if (process.env.TP_DEBUG) console.error(error.stack);
    return 1;
  }
}
