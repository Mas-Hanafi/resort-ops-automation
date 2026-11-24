import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toWibDate, addDays } from '../src/date.ts';

test('toWibDate maps 2026-11-24T17:00:00Z to 2026-11-25', () => {
  assert.equal(toWibDate(new Date('2026-11-24T17:00:00Z')), '2026-11-25');
});

test('toWibDate keeps 2026-11-24T16:59:59Z on 2026-11-24', () => {
  assert.equal(toWibDate(new Date('2026-11-24T16:59:59Z')), '2026-11-24');
});

test('addDays crosses month boundaries in both directions', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});
