import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DummyDataSource } from '../src/data/dummy.ts';

const NOW = new Date('2026-11-24T00:00:00Z');

test('returns identical bookings for same now and seed', async () => {
  const a = await new DummyDataSource(NOW, 42).getBookings();
  const b = await new DummyDataSource(NOW, 42).getBookings();
  assert.deepEqual(a, b);
  assert.ok(a.length > 0);
});

test('returns different bookings for different dates', async () => {
  const a = await new DummyDataSource(NOW, 42).getBookings();
  const b = await new DummyDataSource(new Date('2026-11-25T00:00:00Z'), 42).getBookings();
  assert.notDeepEqual(a, b);
});

test('every booking has checkOut after checkIn and totalIdr > 0', async () => {
  const bookings = await new DummyDataSource(NOW).getBookings();
  for (const b of bookings) {
    assert.ok(b.checkOut > b.checkIn, `${b.id} checkOut must be after checkIn`);
    assert.ok(b.totalIdr > 0, `${b.id} totalIdr must be positive`);
  }
});

test('includes both paid and pending bookings', async () => {
  const bookings = await new DummyDataSource(NOW).getBookings();
  assert.ok(bookings.some((b) => b.status === 'paid'));
  assert.ok(bookings.some((b) => b.status === 'pending'));
});

test('room count is 24', async () => {
  assert.equal(await new DummyDataSource(NOW).getRoomCount(), 24);
});
