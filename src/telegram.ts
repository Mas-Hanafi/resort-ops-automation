/**
 * Kirim pesan teks lewat Telegram Bot API.
 * Pesan error sengaja tidak memuat token (URL API mengandung token).
 */
export async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    throw new Error('Telegram API tidak bisa dihubungi (kesalahan jaringan)');
  }
  if (!res.ok) {
    throw new Error(`Telegram API error: HTTP ${res.status}`);
  }
}
