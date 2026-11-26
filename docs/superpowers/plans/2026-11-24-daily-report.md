# Automated Daily Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A TypeScript script that GitHub Actions runs every day at 07:00 WIB to send a resort operations summary to Telegram.

**Architecture:** `main.ts` calls the `DataSource` (an adapter, dummy at first) → `computeReport` (a pure function) → `formatReport` (a pure function) → `sendTelegram`. Without a token, the result is printed to the console (dry-run).

**Tech Stack:** Node 20, TypeScript, `tsx`, `node:test`, built-in `fetch`. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-24-daily-report-design.md`

## Global Constraints

- Repo `resort-ops-automation`, MIT license, fictional property "Villa Senja" (24 rooms).
- No real data or credentials from a real property; the token only comes from the env vars `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- Cron `0 0 * * *` UTC (= 07:00 WIB) + `workflow_dispatch`.
- The report is in Indonesian, with amounts formatted in Rp.
- Every "date" is computed in WIB (UTC+7).
- Only one dev dependency: `tsx` (plus `typescript`, `@types/node`).

## Review Focus

- Room count 0 → 0% occupancy, not NaN/Infinity.
- Last week's revenue 0 → the delta shows "–", not NaN/Infinity.
- No bookings at all → the report still builds, with zeros.
- No token → dry-run prints to the console, exits 0, does not crash.
- Telegram replies with an error (e.g. 401) → the process exits non-zero so the GitHub Actions run turns red.
- A booking that checks in exactly on the WIB day boundary (17:00 UTC the day before) counts toward the right WIB date.

---

### Task 1: Project scaffold + types

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `LICENSE`, `src/types.ts`

**Interfaces:**
- Produces (`src/types.ts`):
  - `type Booking = { id: string; roomId: string; checkIn: string; checkOut: string; totalIdr: number; status: 'paid' | 'pending'; createdAt: string }`, where `checkIn`/`checkOut` use the `YYYY-MM-DD` format (WIB) and `createdAt` is an ISO datetime in UTC.
  - `interface DataSource { getRoomCount(): Promise<number>; getBookings(): Promise<Booking[]> }`
  - `type DailyReport = { date: string; roomCount: number; occupied: number; occupancyPct: number; checkIns: number; checkOuts: number; revenueYesterday: number; revenueLastWeek: number; revenueDeltaPct: number | null; newBookings: number; newUnpaid: number; overduePayments: number }`

- [ ] **Step 1:** `git init` in the project folder. Fill in `package.json` (type `module`, scripts `start: tsx src/main.ts`, `test: tsx --test test/*.test.ts`, engines node >=20), `tsconfig.json` (strict, ESNext, a bundler/node16 moduleResolution that works with tsx), `.gitignore` (`node_modules`, `.env`), `.env.example` (variable names only, no values), and an MIT `LICENSE` in the repo owner's name.
- [ ] **Step 2:** Write `src/types.ts` exactly as in Interfaces above. Run `npm install`.
- [ ] **Step 3:** Run `npx tsc --noEmit`. Expected: no errors.
- [ ] **Step 4: Commit** `chore: scaffold project and shared types`.

### Task 2: DummyDataSource (deterministic)

**Files:**
- Create: `src/data/dummy.ts`
- Test: `test/dummy.test.ts`

**Interfaces:**
- Consumes: `DataSource`, `Booking` from `src/types.ts`.
- Produces: `class DummyDataSource implements DataSource { constructor(now: Date, seed?: number) }`; `getRoomCount()` always returns 24; `getBookings()` returns bookings for a window of roughly 21 days back to 7 days ahead of `now`.

- [ ] **Step 1: Failing tests** in `test/dummy.test.ts`:
  - `returns identical bookings for same now and seed` (two instances, `deepEqual`).
  - `returns different bookings for different dates`.
  - `every booking has checkOut after checkIn and totalIdr > 0`.
  - `includes both paid and pending bookings`.
  - `room count is 24`.
- [ ] **Step 2:** Run `npx tsx --test test/dummy.test.ts`. Expected: FAIL (module does not exist yet).
- [ ] **Step 3:** Implement `DummyDataSource`: a seeded PRNG (mulberry32) seeded from `seed` + the WIB date of `now`; nightly rates of 600,000–1,800,000; about 70% of bookings `paid`; some `pending` with `createdAt` spread over the last 3 days (so some are pending for more than 24 hours).
- [ ] **Step 4:** Run the tests again. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add deterministic dummy data source`.

### Task 3: computeReport (pure function)

**Files:**
- Create: `src/metrics.ts`
- Test: `test/metrics.test.ts`

**Interfaces:**
- Consumes: `Booking`, `DailyReport`.
- Produces: `toWibDate(d: Date): string` (`YYYY-MM-DD` in WIB) and `computeReport(bookings: Booking[], roomCount: number, now: Date): DailyReport`.
- Definitions (my calls): `occupied` = bookings with `checkIn <= today < checkOut`; `checkIns`/`checkOuts` = bookings with `checkIn === today` / `checkOut === today`; `revenueYesterday` = the sum of `totalIdr` for `paid` bookings whose `createdAt` WIB date is yesterday; `revenueLastWeek` = the same for 8 days ago (the same weekday last week, counted from yesterday); `newBookings` = bookings created yesterday; `newUnpaid` = the `pending` ones among them; `overduePayments` = `pending` bookings with `createdAt` more than 24 hours before `now`; `revenueDeltaPct` = `null` when `revenueLastWeek` is 0; `occupancyPct` is rounded, and 0 when `roomCount` is 0.

- [ ] **Step 1: Failing tests** in `test/metrics.test.ts`:
  - `toWibDate maps 2026-11-24T17:00:00Z to 2026-11-25`.
  - `counts occupied rooms and occupancy percentage` (e.g. 18 of 24 → 75).
  - `counts check-ins and check-outs for today`.
  - `sums paid revenue created yesterday and computes delta vs last week`.
  - `delta is null when last week revenue is zero`.
  - `occupancy is 0 when roomCount is 0`.
  - `counts overdue pending payments older than 24 hours`.
  - `returns zeros for empty bookings`.
- [ ] **Step 2:** Run, Expected: FAIL.
- [ ] **Step 3:** Implement `toWibDate` and `computeReport` per the definitions above.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: compute daily report metrics`.

### Task 4: formatReport (pure function)

**Files:**
- Create: `src/format.ts`
- Test: `test/format.test.ts`

**Interfaces:**
- Consumes: `DailyReport`.
- Produces: `formatReport(r: DailyReport, propertyName: string): string` and `formatRupiah(n: number): string`.
- Format: as in the approved sketch (title `📊 Laporan Harian · Sen, 25 Nov`, the occupancy line `18/24 kamar (75%)`, check-ins/outs, revenue `Rp 14,2 jt (↑ 8% vs minggu lalu)`, new bookings + unpaid, a warning line). A `null` delta → `(– vs minggu lalu)`; a ↓ arrow when negative. `overduePayments` 0 → the line `✅ Tidak ada pembayaran tertunda` (no pending payments), otherwise `⚠️ Perlu perhatian : N pembayaran tertunda >24 jam` (needs attention: N payments pending for more than 24 hours). `formatRupiah`: ≥ 1,000,000 → `Rp 14,2 jt`; below that → `Rp 850.000`.

- [ ] **Step 1: Failing tests** in `test/format.test.ts`:
  - `formats millions as "Rp 14,2 jt"` and `formats under a million as "Rp 850.000"`.
  - `includes up-arrow and percent when delta positive`, `down-arrow when negative`, `dash when delta is null`.
  - `shows warning line when overdue > 0` and `shows all-clear line when overdue is 0`.
  - `header contains Indonesian weekday and month` (e.g. the date 2026-11-25 → `Sel, 25 Nov`).
- [ ] **Step 2:** Run, Expected: FAIL.
- [ ] **Step 3:** Implement without a library; day and month names from an Indonesian array.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: format report message in Indonesian`.

### Task 5: Telegram sender + main (dry-run)

**Files:**
- Create: `src/telegram.ts`, `src/main.ts`
- Test: `test/telegram.test.ts`

**Interfaces:**
- Consumes: `DummyDataSource`, `computeReport`, `formatReport`.
- Produces: `sendTelegram(token: string, chatId: string, text: string, fetchImpl?: typeof fetch): Promise<void>`, which POSTs to `https://api.telegram.org/bot<token>/sendMessage` and throws an `Error` when the response is `!ok` (the error message must not contain the token).

- [ ] **Step 1: Failing tests** in `test/telegram.test.ts` with a fake `fetchImpl`:
  - `posts chat_id and text to sendMessage`.
  - `throws when response is not ok`.
  - `error message does not contain the token`.
- [ ] **Step 2:** Run, Expected: FAIL.
- [ ] **Step 3:** Implement `sendTelegram`. Then `src/main.ts`: build `DummyDataSource(new Date())`, compute + format the report ("Villa Senja"); if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set → send, otherwise `console.log` the message with a dry-run note and exit 0. An error while sending → print a safe message and `process.exit(1)`.
- [ ] **Step 4:** Run `npm test` (Expected: all PASS), then `npm start` without env (Expected: the report is printed to the console, exit 0).
- [ ] **Step 5: Commit** `feat: send report to Telegram with dry-run mode`.

### Task 6: GitHub Actions workflow + README

**Files:**
- Create: `.github/workflows/daily-report.yml`, `.github/workflows/test.yml`, `README.md`

- [ ] **Step 1:** `daily-report.yml`: triggers on a `schedule` cron of `0 0 * * *` and on `workflow_dispatch`; steps: checkout, setup-node 20, `npm ci`, `npm start` with env from `secrets.TELEGRAM_BOT_TOKEN` and `secrets.TELEGRAM_CHAT_ID`. `test.yml`: run `npm test` on push and pull request.
- [ ] **Step 2:** `README.md` (Indonesian + a short English summary): purpose, a sample message, a one-line flow diagram, how to fork + create a bot with BotFather + fill in the secrets, how to swap the data source by implementing `DataSource`, a note that the data is dummy, MIT license.
- [ ] **Step 3:** Validate the YAML (e.g. reread it and make sure the indentation is right) and check that `npm test` still passes.
- [ ] **Step 4: Commit** `ci: add scheduled workflow and README`.

### Task 7: Publishing (done together with the owner)

- [ ] **Step 1:** The owner creates an empty public `resort-ops-automation` repo on GitHub. I run `git remote add` and `git push` after the owner confirms.
- [ ] **Step 2:** The owner creates the bot in BotFather and fills in `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` under Settings → Secrets. The token is never sent to the chat.
- [ ] **Step 3:** Run the workflow by hand (`workflow_dispatch`). Expected: a green run and a message in Telegram. Take a screenshot of the message for the README.
