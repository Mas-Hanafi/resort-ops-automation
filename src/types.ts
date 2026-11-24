/** checkIn/checkOut: YYYY-MM-DD (WIB). createdAt: ISO datetime UTC. */
export type Booking = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  totalIdr: number;
  status: 'paid' | 'pending';
  createdAt: string;
};

/** Adapter sumber data. Ganti implementasinya untuk menyambung ke backend asli. */
export interface DataSource {
  getRoomCount(): Promise<number>;
  getBookings(): Promise<Booking[]>;
}

export type DailyReport = {
  /** Tanggal laporan, YYYY-MM-DD (WIB) */
  date: string;
  roomCount: number;
  occupied: number;
  occupancyPct: number;
  checkIns: number;
  checkOuts: number;
  revenueYesterday: number;
  revenueLastWeek: number;
  /** null bila pendapatan minggu lalu 0 */
  revenueDeltaPct: number | null;
  newBookings: number;
  newUnpaid: number;
  overduePayments: number;
};
