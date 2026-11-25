import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleComics } from '../src/commands/comics.js';

function capture(fn) {
  const logs = [];
  const original = console.log;
  console.log = (...parts) => logs.push(parts.join(' '));
  try {
    return { result: fn(), output: logs.join('\n') };
  } finally {
    console.log = original;
  }
}

test('lists comic records from the data file', () => {
  const { result, output } = capture(() => handleComics({}));
  assert.equal(result, 0);
  assert.match(output, /Absolute Batman/);
  assert.match(output, /Scott Snyder/);
  assert.doesNotMatch(output, /Assassins Creed Shadows/, 'non-comic records must not appear');
});

test('filters comics by one or more terms', () => {
  const { result, output } = capture(() => handleComics({ filter: ['wonder woman'] }));
  assert.equal(result, 0);
  assert.match(output, /Absolute Wonder Woman/);
  assert.doesNotMatch(output, /Absolute Batman/);
  assert.match(output, /1 comic\(s\) found/);
});

test('returns 1 when no comics match the filter', () => {
  const { result } = capture(() => handleComics({ filter: ['no-such-comic'] }));
  assert.equal(result, 1);
});
