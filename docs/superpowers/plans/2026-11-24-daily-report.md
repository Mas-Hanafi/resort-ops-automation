# Laporan Harian Otomatis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skrip TypeScript yang dijalankan GitHub Actions setiap 07:00 WIB dan mengirim ringkasan operasional resort ke Telegram.

**Architecture:** `main.ts` memanggil `DataSource` (adapter, awalnya dummy) → `computeReport` (fungsi murni) → `formatReport` (fungsi murni) → `sendTelegram`. Tanpa token, hasil dicetak ke konsol (dry-run).

**Tech Stack:** Node 20, TypeScript, `tsx`, `node:test`, `fetch` bawaan. Tanpa dependency runtime.

**Spec:** `docs/superpowers/specs/2026-11-24-daily-report-design.md`

## Global Constraints

- Repo `resort-ops-automation`, lisensi MIT, properti fiktif "Villa Senja" (24 kamar).
- Tanpa data/kredensial asli DPR; token hanya dari env `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Cron `0 0 * * *` UTC (= 07:00 WIB) + `workflow_dispatch`.
- Laporan berbahasa Indonesia, nominal format Rp.
- Semua "tanggal" dihitung dalam WIB (UTC+7).
- Satu dependency dev saja: `tsx` (plus `typescript`, `@types/node`).

## Review Focus

- Jumlah kamar 0 → okupansi 0%, tidak NaN/Infinity.
- Pendapatan minggu lalu 0 → delta tampil "–", bukan NaN/Infinity.
- Tidak ada booking sama sekali → laporan tetap terbentuk dengan angka 0.
- Token tidak ada → dry-run cetak ke konsol, exit 0, tidak crash.
- Telegram membalas error (mis. 401) → proses exit non-zero supaya run GitHub Actions merah.
- Booking check-in tepat pada batas hari WIB (UTC 17:00 hari sebelumnya) dihitung ke tanggal WIB yang benar.

---

### Task 1: Scaffold proyek + tipe

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `LICENSE`, `src/types.ts`

**Interfaces:**
- Produces (`src/types.ts`):
  - `type Booking = { id: string; roomId: string; checkIn: string; checkOut: string; totalIdr: number; status: 'paid' | 'pending'; createdAt: string }` — `checkIn`/`checkOut` format `YYYY-MM-DD` (WIB), `createdAt` ISO datetime UTC.
  - `interface DataSource { getRoomCount(): Promise<number>; getBookings(): Promise<Booking[]> }`
  - `type DailyReport = { date: string; roomCount: number; occupied: number; occupancyPct: number; checkIns: number; checkOuts: number; revenueYesterday: number; revenueLastWeek: number; revenueDeltaPct: number | null; newBookings: number; newUnpaid: number; overduePayments: number }`

- [ ] **Step 1:** `git init` di folder proyek. Isi `package.json` (type `module`, scripts `start: tsx src/main.ts`, `test: tsx --test test/*.test.ts`, engines node >=20), `tsconfig.json` (strict, ESNext, moduleResolution bundler/node16 yang cocok dengan tsx), `.gitignore` (`node_modules`, `.env`), `.env.example` (nama variabel saja, tanpa nilai), `LICENSE` MIT atas nama pemilik repo.
- [ ] **Step 2:** Tulis `src/types.ts` persis sesuai Interfaces di atas. Jalankan `npm install`.
- [ ] **Step 3:** Jalankan `npx tsc --noEmit`. Expected: tanpa error.
- [ ] **Step 4: Commit** `chore: scaffold project and shared types`.

### Task 2: DummyDataSource (deterministik)

**Files:**
- Create: `src/data/dummy.ts`
- Test: `test/dummy.test.ts`

**Interfaces:**
- Consumes: `DataSource`, `Booking` dari `src/types.ts`.
- Produces: `class DummyDataSource implements DataSource { constructor(now: Date, seed?: number) }` — `getRoomCount()` selalu 24; `getBookings()` mengembalikan booking untuk jendela kira-kira 21 hari ke belakang sampai 7 hari ke depan dari `now`.

- [ ] **Step 1: Tes gagal** di `test/dummy.test.ts`:
  - `returns identical bookings for same now and seed` (dua instance, `deepEqual`).
  - `returns different bookings for different dates`.
  - `every booking has checkOut after checkIn and totalIdr > 0`.
  - `includes both paid and pending bookings`.
  - `room count is 24`.
- [ ] **Step 2:** Jalankan `npx tsx --test test/dummy.test.ts`. Expected: FAIL (modul belum ada).
- [ ] **Step 3:** Implementasi `DummyDataSource`: PRNG berbiji (mulberry32) diseed dari `seed` + tanggal WIB `now`; harga per malam 600.000–1.800.000; sekitar 70% booking `paid`; sebagian `pending` dengan `createdAt` bervariasi hingga 3 hari lalu (agar ada yang tertunda >24 jam).
- [ ] **Step 4:** Jalankan tes lagi. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add deterministic dummy data source`.

### Task 3: computeReport (fungsi murni)

**Files:**
- Create: `src/metrics.ts`
- Test: `test/metrics.test.ts`

**Interfaces:**
- Consumes: `Booking`, `DailyReport`.
- Produces: `toWibDate(d: Date): string` (format `YYYY-MM-DD` dalam WIB) dan `computeReport(bookings: Booking[], roomCount: number, now: Date): DailyReport`.
- Definisi (keputusan saya): `occupied` = booking dengan `checkIn <= today < checkOut`; `checkIns`/`checkOuts` = booking dengan `checkIn === today` / `checkOut === today`; `revenueYesterday` = jumlah `totalIdr` booking `paid` dengan tanggal WIB `createdAt` = kemarin; `revenueLastWeek` = hal sama untuk 8 hari lalu (hari yang sama minggu lalu dari kemarin); `newBookings` = booking dengan `createdAt` kemarin; `newUnpaid` = yang `pending` di antaranya; `overduePayments` = booking `pending` dengan `createdAt` lebih dari 24 jam sebelum `now`; `revenueDeltaPct` = `null` bila `revenueLastWeek` 0; `occupancyPct` dibulatkan, 0 bila `roomCount` 0.

- [ ] **Step 1: Tes gagal** di `test/metrics.test.ts`:
  - `toWibDate maps 2026-11-24T17:00:00Z to 2026-11-25`.
  - `counts occupied rooms and occupancy percentage` (mis. 18 dari 24 → 75).
  - `counts check-ins and check-outs for today`.
  - `sums paid revenue created yesterday and computes delta vs last week`.
  - `delta is null when last week revenue is zero`.
  - `occupancy is 0 when roomCount is 0`.
  - `counts overdue pending payments older than 24 hours`.
  - `returns zeros for empty bookings`.
- [ ] **Step 2:** Jalankan, Expected: FAIL.
- [ ] **Step 3:** Implementasi `toWibDate` dan `computeReport` sesuai definisi di atas.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5: Commit** `feat: compute daily report metrics`.

### Task 4: formatReport (fungsi murni)

**Files:**
- Create: `src/format.ts`
- Test: `test/format.test.ts`

**Interfaces:**
- Consumes: `DailyReport`.
- Produces: `formatReport(r: DailyReport, propertyName: string): string` dan `formatRupiah(n: number): string`.
- Format: sesuai sketsa disetujui (judul `📊 Laporan Harian · Sen, 25 Nov`, baris okupansi `18/24 kamar (75%)`, check-in/out, pendapatan `Rp 14,2 jt (↑ 8% vs minggu lalu)`, booking baru + belum bayar, baris peringatan). Delta `null` → `(– vs minggu lalu)`; panah ↓ bila negatif. `overduePayments` 0 → baris `✅ Tidak ada pembayaran tertunda`, selain itu `⚠️ Perlu perhatian : N pembayaran tertunda >24 jam`. `formatRupiah`: ≥ 1.000.000 → `Rp 14,2 jt`; di bawahnya → `Rp 850.000`.

- [ ] **Step 1: Tes gagal** di `test/format.test.ts`:
  - `formats millions as "Rp 14,2 jt"` dan `formats under a million as "Rp 850.000"`.
  - `includes up-arrow and percent when delta positive`, `down-arrow when negative`, `dash when delta is null`.
  - `shows warning line when overdue > 0` dan `shows all-clear line when overdue is 0`.
  - `header contains Indonesian weekday and month` (mis. tanggal 2026-11-25 → `Sel, 25 Nov`).
- [ ] **Step 2:** Jalankan, Expected: FAIL.
- [ ] **Step 3:** Implementasi tanpa library; nama hari/bulan dari array Indonesia.
- [ ] **Step 4:** Jalankan tes. Expected: PASS.
- [ ] **Step 5: Commit** `feat: format report message in Indonesian`.

### Task 5: Telegram sender + main (dry-run)

**Files:**
- Create: `src/telegram.ts`, `src/main.ts`
- Test: `test/telegram.test.ts`

**Interfaces:**
- Consumes: `DummyDataSource`, `computeReport`, `formatReport`.
- Produces: `sendTelegram(token: string, chatId: string, text: string, fetchImpl?: typeof fetch): Promise<void>` — POST ke `https://api.telegram.org/bot<token>/sendMessage`, melempar `Error` bila respons `!ok` (pesan error tidak boleh memuat token).

- [ ] **Step 1: Tes gagal** di `test/telegram.test.ts` dengan `fetchImpl` palsu:
  - `posts chat_id and text to sendMessage`.
  - `throws when response is not ok`.
  - `error message does not contain the token`.
- [ ] **Step 2:** Jalankan, Expected: FAIL.
- [ ] **Step 3:** Implementasi `sendTelegram`. Lalu `src/main.ts`: bangun `DummyDataSource(new Date())`, hitung + format laporan ("Villa Senja"); bila `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` ada → kirim, kalau tidak → `console.log` pesan dengan catatan dry-run dan exit 0. Error saat kirim → cetak pesan aman dan `process.exit(1)`.
- [ ] **Step 4:** Jalankan `npm test` (Expected: semua PASS) lalu `npm start` tanpa env (Expected: laporan tercetak di konsol, exit 0).
- [ ] **Step 5: Commit** `feat: send report to Telegram with dry-run mode`.

### Task 6: Workflow GitHub Actions + README

**Files:**
- Create: `.github/workflows/daily-report.yml`, `.github/workflows/test.yml`, `README.md`

- [ ] **Step 1:** `daily-report.yml`: trigger `schedule` cron `0 0 * * *` dan `workflow_dispatch`; langkah checkout, setup-node 20, `npm ci`, `npm start` dengan env dari `secrets.TELEGRAM_BOT_TOKEN` dan `secrets.TELEGRAM_CHAT_ID`. `test.yml`: jalankan `npm test` pada push dan pull request.
- [ ] **Step 2:** `README.md` (Indonesia + ringkasan Inggris singkat): tujuan, contoh pesan, diagram alur satu baris, cara fork + buat bot via BotFather + isi secrets, cara mengganti sumber data dengan mengimplementasikan `DataSource`, catatan bahwa data adalah dummy, lisensi MIT.
- [ ] **Step 3:** Validasi YAML (mis. baca ulang, pastikan indentasi benar) dan `npm test` masih PASS.
- [ ] **Step 4: Commit** `ci: add scheduled workflow and README`.

### Task 7: Publikasi (dikerjakan bersama pemilik)

- [ ] **Step 1:** Pemilik membuat repo kosong publik `resort-ops-automation` di GitHub. Saya `git remote add` dan `git push` setelah pemilik konfirmasi.
- [ ] **Step 2:** Pemilik membuat bot di BotFather dan mengisi `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` di Settings → Secrets. Token tidak dikirim ke chat.
- [ ] **Step 3:** Jalankan workflow manual (`workflow_dispatch`). Expected: run hijau dan pesan masuk ke Telegram. Ambil screenshot pesan untuk README.
