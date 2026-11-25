# resort-ops-automation

Laporan harian otomatis untuk resort: setiap pagi pukul 07:00 WIB, ringkasan operasional terkirim ke Telegram manajer tanpa ada yang menyusunnya manual.

*English: a small TypeScript job that runs on GitHub Actions every morning (07:00 WIB) and posts a resort daily report to Telegram. Data is dummy; the data source is a swappable adapter.*

## Contoh pesan

![Contoh laporan harian di Telegram](docs/images/report-sample.png)

Semua data di repo ini **dummy** (properti fiktif "Villa Senja"). Tidak ada data tamu atau kredensial asli.

## Cara kerja

```
GitHub Actions (cron) → DataSource → computeReport → formatReport → Telegram
```

- Gratis: tanpa server, dijalankan GitHub Actions.
- Tanpa token, skrip berjalan dalam mode dry-run dan mencetak laporan ke konsol.

## Coba sendiri

1. **Fork** repo ini.
2. Buat bot di Telegram lewat [@BotFather](https://t.me/BotFather), simpan token-nya. Kirim satu pesan ke bot, lalu cari `chat_id` kamu.
3. Di repo hasil fork: **Settings → Secrets and variables → Actions**, tambahkan:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Buka tab **Actions → Daily report → Run workflow** untuk uji manual. Selanjutnya jalan otomatis tiap pagi.

Jangan pernah menaruh token di kode atau meng-commit file `.env`.

> Catatan: GitHub menonaktifkan workflow terjadwal pada repo yang tidak aktif 60 hari. Aktifkan lagi dari tab Actions bila itu terjadi. Jadwal juga bisa meleset beberapa menit.

## Jalankan lokal

```bash
npm install
npm test
npm start          # dry-run, cetak ke konsol
```

Untuk mengirim sungguhan dari komputer sendiri, salin `.env.example` dan isi nilainya, lalu jalankan dengan variabel itu terpasang di environment.

## Sambungkan ke data asli

Data dibaca lewat interface `DataSource` di [`src/types.ts`](src/types.ts):

```ts
interface DataSource {
  getRoomCount(): Promise<number>;
  getBookings(): Promise<Booking[]>;
}
```

Buat kelas baru yang memenuhi interface itu (misalnya memanggil API backend booking kamu), lalu pakai di `src/main.ts` sebagai pengganti `DummyDataSource`. Bagian lain tidak perlu berubah.

## Lisensi

MIT. Lihat [LICENSE](LICENSE).
