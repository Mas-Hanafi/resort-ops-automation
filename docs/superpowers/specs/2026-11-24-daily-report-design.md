# Laporan Harian Otomatis — Design

Tanggal: 2026-11-24 · Status: menunggu persetujuan

## Tujuan dan alasan
Portofolio open source milik pemilik (vibe coder, bukan programmer) dengan tema hospitality. Modul pertama dari repo `resort-ops-automation`: laporan harian otomatis ke Telegram. Alasan: menunjukkan automasi nyata yang bisa didemokan, berangkat dari pengalaman operasional resort.

## Goals
- Setiap pagi 07:00 WIB, pesan ringkasan terkirim ke Telegram manajer tanpa kerja manual.
- Isi laporan sesuai sketsa yang sudah disetujui (okupansi, check-in/out, pendapatan vs minggu lalu, booking baru + belum bayar, peringatan pembayaran tertunda).
- Siapa pun bisa fork repo, isi token bot sendiri, dan menjalankannya.
- Sumber data bisa diganti ke backend DPR tanpa mengubah bagian lain.

## Non-goals
- Bot interaktif / penjawab tamu (itu alur lain, nanti).
- Layanan yang selalu aktif, dashboard web, aplikasi mobile.
- Integrasi data asli DPR sekarang.

## Anti-goals (dianggap gagal walau jalan)
- Ada data tamu, harga internal, atau kredensial asli di repo publik.
- Token bot ter-commit.
- Hanya pemilik yang bisa menjalankannya (tidak bisa direproduksi).

## Constraints
- Repo publik, lisensi MIT, nama properti fiktif.
- Gratis: tanpa server berbayar.
- Pemilik membuat sendiri bot Telegram lewat BotFather dan mengisi secrets GitHub; token tidak pernah masuk chat atau kode.

## Approaches
| | Cara | Catatan |
|---|---|---|
| A | Layanan jalan terus di VPS | Ada biaya, sulit direproduksi |
| **B (dipilih)** | Skrip dijalankan GitHub Actions terjadwal | Gratis, riwayat run jadi bukti, mudah di-fork. Ceiling: jadwal bisa meleset beberapa menit |
| C | n8n | Ditolak: kurang meyakinkan sebagai portofolio |

Dipilih B oleh pemilik. Layanan selalu-aktif baru dibutuhkan di tahap Guest Companion.

## Keputusan (calls saya, bisa diubah)
- Bahasa: TypeScript, Node 20, dijalankan dengan `tsx`.
- Telegram dipanggil langsung lewat `fetch` ke Bot API, tanpa library tambahan.
- Sumber data lewat satu interface `DataSource`; implementasi awal `DummyDataSource` menghasilkan data realistis dan deterministik per tanggal (properti fiktif "Villa Senja").
- Mode dry-run: tanpa token, laporan dicetak ke konsol (untuk demo dan tes).
- Jadwal: cron `0 0 * * *` UTC (= 07:00 WIB) + `workflow_dispatch` untuk demo manual.
- Tes: satu berkas `node:test` untuk perhitungan metrik dan format pesan.
- Laporan berbahasa Indonesia, nominal format Rp.
- README: tujuan, screenshot pesan, cara fork + setup bot, cara ganti sumber data.

## Diserahkan ke builder
Pembangkitan angka dummy, tata letak pesan persis, struktur folder, isi workflow YAML, dan alur `.gitignore`/`.env.example`.
