import {
  command, FILTER_FLAG, filterTerms, getField, matchFilter, parseMeta, recordsOfType,
} from '../core/index.js';
import {
  dim, displayInfo, displaySection, displayWarn, green, printTable,
} from '../core/terminal.js';

export function handleGames(args) {
  displaySection('Games');
  const terms = filterTerms(args);

  const games = recordsOfType('game')
    .map((record) => {
      const meta = parseMeta(getField(record.fields, 2));
      return {
        name: getField(record.fields, 0),
        developer: getField(record.fields, 1),
        release: meta.get('release') || '',
        engine: meta.get('engine') || '',
        url: getField(record.fields, 3),
      };
    })
    .filter((game) => matchFilter(terms, [
      game.name, game.developer, game.release, game.engine, game.url,
    ]));

  if (!games.length) {
    displayWarn(terms.length ? 'No games matched the filter.' : 'No games found in the data file.');
    return 1;
  }

  const rows = games.map(({ name, developer, release, engine }) => [
    green(name), developer || dim('-'), release || dim('-'), engine || dim('-'),
  ]);
  printTable(['Game', 'Developer', 'Release', 'Engine'], rows);
  console.log();
  displayInfo(`${green(String(games.length))} game(s) found`);
  return 0;
}

export const COMMAND = command({
  name: 'games',
  desc: 'List or filter games from the data file',
  handler: handleGames,
  flags: [FILTER_FLAG],
  visibility: 'private',
});
