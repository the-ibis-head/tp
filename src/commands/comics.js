import {
  command, FILTER_FLAG, filterTerms, getField, matchFilter, parseMeta, recordsOfType,
} from '../core/index.js';
import {
  dim, displayInfo, displaySection, displayWarn, green, printTable,
} from '../core/terminal.js';

export function handleComics(args) {
  displaySection('Comics');
  const terms = filterTerms(args);

  const comics = recordsOfType('comic')
    .map((record) => {
      const meta = parseMeta(getField(record.fields, 2));
      return {
        title: getField(record.fields, 0),
        writer: getField(record.fields, 1),
        year: meta.get('year') || '',
        issues: meta.get('issues') || '',
        url: getField(record.fields, 3),
      };
    })
    .filter((comic) => matchFilter(terms, [
      comic.title, comic.writer, comic.year, comic.issues, comic.url,
    ]));

  if (!comics.length) {
    displayWarn(terms.length ? 'No comics matched the filter.' : 'No comics found in the data file.');
    return 1;
  }

  const rows = comics.map(({ title, writer, year, issues }) => [
    green(title), writer || dim('-'), year || dim('-'), issues || dim('-'),
  ]);
  printTable(['Comic', 'Writer', 'Year', 'Issues'], rows);
  console.log();
  displayInfo(`${green(String(comics.length))} comic(s) found`);
  return 0;
}

export const COMMAND = command({
  name: 'comics',
  desc: 'List or filter comics from the data file',
  handler: handleComics,
  flags: [FILTER_FLAG],
  visibility: 'private',
});
