import { addDays, toWibDate } from './date.ts';
import type { Booking, DailyReport } from './types.ts';

export { toWibDate };

const DAY_MS = 24 * 60 * 60 * 1000;

function paidRevenueCreatedOn(bookings: Booking[], date: string): number {
  return bookings
    .filter((b) => b.status === 'paid' && toWibDate(new Date(b.createdAt)) === date)
    .reduce((sum, b) => sum + b.totalIdr, 0);
}

/** Hitung metrik laporan harian. Semua tanggal dalam WIB. */
export function computeReport(bookings: Booking[], roomCount: number, now: Date): DailyReport {
  const today = toWibDate(now);
  const yesterday = addDays(today, -1);
  const sameDayLastWeek = addDays(yesterday, -7);

  const occupied = bookings.filter((b) => b.checkIn <= today && today < b.checkOut).length;
  const createdYesterday = bookings.filter((b) => toWibDate(new Date(b.createdAt)) === yesterday);

  const revenueYesterday = paidRevenueCreatedOn(bookings, yesterday);
  const revenueLastWeek = paidRevenueCreatedOn(bookings, sameDayLastWeek);

  return {
    date: today,
    roomCount,
    occupied,
    occupancyPct: roomCount > 0 ? Math.round((occupied / roomCount) * 100) : 0,
    checkIns: bookings.filter((b) => b.checkIn === today).length,
    checkOuts: bookings.filter((b) => b.checkOut === today).length,
    revenueYesterday,
    revenueLastWeek,
    revenueDeltaPct:
      revenueLastWeek > 0 ? Math.round(((revenueYesterday - revenueLastWeek) / revenueLastWeek) * 100) : null,
    newBookings: createdYesterday.length,
    newUnpaid: createdYesterday.filter((b) => b.status === 'pending').length,
    overduePayments: bookings.filter(
      (b) => b.status === 'pending' && now.getTime() - new Date(b.createdAt).getTime() > DAY_MS,
    ).length,
  };
}
