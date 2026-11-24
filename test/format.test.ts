import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport, formatRupiah } from '../src/format.ts';
import type { DailyReport } from '../src/types.ts';

function report(p: Partial<DailyReport> = {}): DailyReport {
  return {
    date: '2026-11-25',
    roomCount: 24,
    occupied: 18,
    occupancyPct: 75,
    checkIns: 6,
    checkOuts: 4,
    revenueYesterday: 14_200_000,
    revenueLastWeek: 13_148_148,
    revenueDeltaPct: 8,
    newBookings: 5,
    newUnpaid: 2,
    overduePayments: 2,
    ...p,
  };
}

test('formats millions as "Rp 14,2 jt"', () => {
  assert.equal(formatRupiah(14_200_000), 'Rp 14,2 jt');
});

test('formats under a million as "Rp 850.000"', () => {
  assert.equal(formatRupiah(850_000), 'Rp 850.000');
});

test('formats zero as "Rp 0"', () => {
  assert.equal(formatRupiah(0), 'Rp 0');
});

test('includes up-arrow and percent when delta positive', () => {
  assert.match(formatReport(report({ revenueDeltaPct: 8 }), 'Villa Senja'), /Rp 14,2 jt \(↑ 8% vs minggu lalu\)/);
});

test('uses down-arrow when delta negative', () => {
  assert.match(formatReport(report({ revenueDeltaPct: -5 }), 'Villa Senja'), /\(↓ 5% vs minggu lalu\)/);
});

test('uses a dash when delta is null', () => {
  assert.match(formatReport(report({ revenueDeltaPct: null }), 'Villa Senja'), /\(– vs minggu lalu\)/);
});

test('shows warning line when overdue > 0', () => {
  assert.match(
    formatReport(report({ overduePayments: 2 }), 'Villa Senja'),
    /⚠️ Perlu perhatian\s*: 2 pembayaran tertunda >24 jam/,
  );
});

test('shows all-clear line when overdue is 0', () => {
  const text = formatReport(report({ overduePayments: 0 }), 'Villa Senja');
  assert.match(text, /✅ Tidak ada pembayaran tertunda/);
  assert.doesNotMatch(text, /⚠️/);
});

test('header has Indonesian weekday and month', () => {
  assert.match(formatReport(report({ date: '2026-11-25' }), 'Villa Senja'), /Laporan Harian · Rab, 25 Nov/);
  assert.match(formatReport(report({ date: '2026-11-24' }), 'Villa Senja'), /Laporan Harian · Sel, 24 Nov/);
});

test('shows occupancy, check-in/out, and new bookings lines', () => {
  const text = formatReport(report(), 'Villa Senja');
  assert.match(text, /18\/24 kamar \(75%\)/);
  assert.match(text, /6 masuk · 4 keluar/);
  assert.match(text, /5 \(2 belum bayar\)/);
  assert.match(text, /Villa Senja/);
});
