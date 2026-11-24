const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Tanggal kalender (YYYY-MM-DD) pada zona WIB (UTC+7). */
export function toWibDate(d: Date): string {
  return new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Geser tanggal YYYY-MM-DD sebanyak n hari (boleh negatif). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
