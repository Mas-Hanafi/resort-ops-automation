import type { DailyReport } from './types.ts';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** 14_200_000 -> "Rp 14,2 jt"; 850_000 -> "Rp 850.000". */
export function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function formatDelta(pct: number | null): string {
  if (pct === null) return '–';
  if (pct > 0) return `↑ ${pct}%`;
  if (pct < 0) return `↓ ${Math.abs(pct)}%`;
  return '→ 0%';
}

export function formatReport(r: DailyReport, propertyName: string): string {
  const attention =
    r.overduePayments > 0
      ? `⚠️ Perlu perhatian  : ${r.overduePayments} pembayaran tertunda >24 jam`
      : '✅ Tidak ada pembayaran tertunda';

  return [
    `📊 Laporan Harian · ${formatDate(r.date)}`,
    `🏡 ${propertyName}`,
    `Okupansi hari ini   : ${r.occupied}/${r.roomCount} kamar (${r.occupancyPct}%)`,
    `Check-in / out      : ${r.checkIns} masuk · ${r.checkOuts} keluar`,
    `Pendapatan kemarin  : ${formatRupiah(r.revenueYesterday)} (${formatDelta(r.revenueDeltaPct)} vs minggu lalu)`,
    `Booking baru        : ${r.newBookings} (${r.newUnpaid} belum bayar)`,
    attention,
  ].join('\n');
}
