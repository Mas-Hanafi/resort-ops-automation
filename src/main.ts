import { pathToFileURL } from 'node:url';
import { DummyDataSource } from './data/dummy.ts';
import { formatReport } from './format.ts';
import { computeReport } from './metrics.ts';
import { sendTelegram } from './telegram.ts';

const PROPERTY_NAME = 'Villa Senja';

type Send = (token: string, chatId: string, text: string) => Promise<void>;

/** Jalankan satu siklus laporan. Mengembalikan exit code (0 = sukses). */
export async function run(
  env: Record<string, string | undefined>,
  now: Date,
  send: Send = sendTelegram,
  log: (message: string) => void = console.log,
): Promise<number> {
  const source = new DummyDataSource(now);
  const [bookings, roomCount] = await Promise.all([source.getBookings(), source.getRoomCount()]);
  const text = formatReport(computeReport(bookings, roomCount, now), PROPERTY_NAME);

  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    if (env.GITHUB_ACTIONS === 'true') {
      // Secret kosong/salah nama di Actions: gagal keras, jangan hijau tanpa laporan.
      log('Gagal: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi di GitHub Secrets.');
      return 1;
    }
    log('[dry-run] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi, pesan tidak dikirim:\n');
    log(text);
    return 0;
  }

  try {
    await send(token, chatId, text);
    log('Laporan terkirim.');
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'kesalahan tidak dikenal';
    log(`Gagal mengirim laporan: ${message.replaceAll(token, '***')}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.env, new Date());
}
