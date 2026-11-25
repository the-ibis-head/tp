import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleGames } from '../src/commands/games.js';

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

test('lists game records from the data file', () => {
  const { result, output } = capture(() => handleGames({}));
  assert.equal(result, 0);
  assert.match(output, /Assassins Creed Shadows/);
  assert.match(output, /Northlight/);
  assert.doesNotMatch(output, /gaLap0x/, 'non-game records must not appear');
});

test('filters games by one or more terms', () => {
  const { result, output } = capture(() => handleGames({ filter: ['control'] }));
  assert.equal(result, 0);
  assert.match(output, /Control Resonant/);
  assert.doesNotMatch(output, /Black Myth Wukong/);
  assert.match(output, /2 game\(s\) found/);
});

test('returns 1 when no games match the filter', () => {
  const { result } = capture(() => handleGames({ filter: ['no-such-game'] }));
  assert.equal(result, 1);
});
