import { addDays, toWibDate } from '../date.ts';
import type { Booking, DataSource } from '../types.ts';

const ROOM_COUNT = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG berbiji (mulberry32): hasil sama untuk biji yang sama. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Data booking fiktif "Villa Senja" untuk demo. Deterministik per tanggal WIB + seed.
 * Ganti dengan implementasi DataSource lain untuk menyambung ke backend asli.
 */
export class DummyDataSource implements DataSource {
  constructor(
    private readonly now: Date,
    private readonly seed: number = 42,
  ) {}

  async getRoomCount(): Promise<number> {
    return ROOM_COUNT;
  }

  async getBookings(): Promise<Booking[]> {
    const today = toWibDate(this.now);
    const rand = mulberry32(hashString(`${this.seed}:${today}`));
    const roomFreeFrom: Record<string, string> = {};
    const bookings: Booking[] = [];

    for (let offset = -21; offset <= 7; offset++) {
      const checkIn = addDays(today, offset);
      const arrivals = 4 + Math.floor(rand() * 4);
      for (let i = 0; i < arrivals; i++) {
        const free = Array.from({ length: ROOM_COUNT }, (_, r) => `R${String(r + 1).padStart(2, '0')}`).filter(
          (room) => (roomFreeFrom[room] ?? '') <= checkIn,
        );
        if (free.length === 0) continue;
        const roomId = free[Math.floor(rand() * free.length)];
        const nights = 1 + Math.floor(rand() * 4);
        const checkOut = addDays(checkIn, nights);
        roomFreeFrom[roomId] = checkOut;

        const rate = 600_000 + Math.floor(rand() * 25) * 50_000;
        const created =
          offset >= 0
            ? new Date(this.now.getTime() - Math.floor(rand() * 14 * DAY_MS))
            : new Date(Date.parse(`${checkIn}T00:00:00Z`) - Math.floor(rand() * 10 * DAY_MS));
        const recent = this.now.getTime() - created.getTime() < 3 * DAY_MS;
        const status = offset >= 0 && recent && rand() < 0.35 ? 'pending' : 'paid';

        bookings.push({
          id: `B${String(bookings.length + 1).padStart(4, '0')}`,
          roomId,
          checkIn,
          checkOut,
          totalIdr: rate * nights,
          status,
          createdAt: created.toISOString(),
        });
      }
    }
    return bookings;
  }
}
