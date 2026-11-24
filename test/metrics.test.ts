import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeReport, toWibDate } from '../src/metrics.ts';
import type { Booking } from '../src/types.ts';

// 2026-11-24T00:00:00Z = 07:00 WIB, 24 Nov 2026
const NOW = new Date('2026-11-24T00:00:00Z');

let seq = 0;
function booking(p: Partial<Booking>): Booking {
  seq += 1;
  return {
    id: `T${seq}`,
    roomId: 'R01',
    checkIn: '2026-11-20',
    checkOut: '2026-11-21',
    totalIdr: 1_000_000,
    status: 'paid',
    createdAt: '2026-11-10T00:00:00Z',
    ...p,
  };
}

test('toWibDate is re-exported for callers of metrics', () => {
  assert.equal(toWibDate(new Date('2026-11-24T17:00:00Z')), '2026-11-25');
});

test('counts occupied rooms and occupancy percentage', () => {
  const stays = Array.from({ length: 18 }, (_, i) =>
    booking({ roomId: `R${i + 1}`, checkIn: '2026-11-22', checkOut: '2026-11-26' }),
  );
  const outside = booking({ checkIn: '2026-11-25', checkOut: '2026-11-27' });
  const r = computeReport([...stays, outside], 24, NOW);
  assert.equal(r.occupied, 18);
  assert.equal(r.occupancyPct, 75);
  assert.equal(r.roomCount, 24);
  assert.equal(r.date, '2026-11-24');
});

test('counts check-ins and check-outs for today', () => {
  const r = computeReport(
    [
      booking({ checkIn: '2026-11-24', checkOut: '2026-11-26' }),
      booking({ checkIn: '2026-11-24', checkOut: '2026-11-25' }),
      booking({ checkIn: '2026-11-21', checkOut: '2026-11-24' }),
    ],
    24,
    NOW,
  );
  assert.equal(r.checkIns, 2);
  assert.equal(r.checkOuts, 1);
});

test('sums paid revenue created yesterday and computes delta vs last week', () => {
  const r = computeReport(
    [
      booking({ createdAt: '2026-11-23T05:00:00Z', totalIdr: 1_000_000 }),
      booking({ createdAt: '2026-11-23T06:00:00Z', totalIdr: 500_000, status: 'pending' }),
      booking({ createdAt: '2026-11-16T05:00:00Z', totalIdr: 800_000 }),
    ],
    24,
    NOW,
  );
  assert.equal(r.revenueYesterday, 1_000_000);
  assert.equal(r.revenueLastWeek, 800_000);
  assert.equal(r.revenueDeltaPct, 25);
});

test('delta is null when last week revenue is zero', () => {
  const r = computeReport([booking({ createdAt: '2026-11-23T05:00:00Z' })], 24, NOW);
  assert.equal(r.revenueLastWeek, 0);
  assert.equal(r.revenueDeltaPct, null);
});

test('occupancy is 0 when roomCount is 0', () => {
  const r = computeReport([booking({ checkIn: '2026-11-23', checkOut: '2026-11-26' })], 0, NOW);
  assert.equal(r.occupancyPct, 0);
});

test('counts new bookings and unpaid ones created yesterday', () => {
  const r = computeReport(
    [
      booking({ createdAt: '2026-11-23T05:00:00Z' }),
      booking({ createdAt: '2026-11-23T08:00:00Z', status: 'pending' }),
      booking({ createdAt: '2026-11-22T05:00:00Z' }),
    ],
    24,
    NOW,
  );
  assert.equal(r.newBookings, 2);
  assert.equal(r.newUnpaid, 1);
});

test('counts overdue pending payments older than 24 hours', () => {
  const r = computeReport(
    [
      booking({ status: 'pending', createdAt: '2026-11-22T20:00:00Z' }), // 28 jam lalu
      booking({ status: 'pending', createdAt: '2026-11-23T20:00:00Z' }), // 4 jam lalu
      booking({ status: 'paid', createdAt: '2026-11-20T00:00:00Z' }),
    ],
    24,
    NOW,
  );
  assert.equal(r.overduePayments, 1);
});

test('booking created at UTC 17:30 counts as the next WIB day', () => {
  // 2026-11-22T17:30Z = 23 Nov 00:30 WIB -> kemarin
  const r = computeReport([booking({ createdAt: '2026-11-22T17:30:00Z' })], 24, NOW);
  assert.equal(r.newBookings, 1);
});

test('uses the WIB date of now as today', () => {
  const lateUtc = new Date('2026-11-24T17:30:00Z'); // 25 Nov 00:30 WIB
  const r = computeReport([booking({ checkIn: '2026-11-25', checkOut: '2026-11-26' })], 24, lateUtc);
  assert.equal(r.date, '2026-11-25');
  assert.equal(r.checkIns, 1);
});

test('returns zeros for empty bookings', () => {
  const r = computeReport([], 24, NOW);
  assert.equal(r.occupied, 0);
  assert.equal(r.occupancyPct, 0);
  assert.equal(r.checkIns, 0);
  assert.equal(r.checkOuts, 0);
  assert.equal(r.revenueYesterday, 0);
  assert.equal(r.revenueDeltaPct, null);
  assert.equal(r.newBookings, 0);
  assert.equal(r.newUnpaid, 0);
  assert.equal(r.overduePayments, 0);
});
