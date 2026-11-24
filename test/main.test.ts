import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/main.ts';

const NOW = new Date('2026-11-24T00:00:00Z');

test('dry-run prints the report and exits 0 when token is missing', async () => {
  const out: string[] = [];
  let sent = false;
  const code = await run({}, NOW, async () => { sent = true; }, (m) => out.push(m));
  assert.equal(code, 0);
  assert.equal(sent, false);
  assert.match(out.join('\n'), /dry-run/i);
  assert.match(out.join('\n'), /Laporan Harian/);
});

test('sends the formatted report when token and chat id are set', async () => {
  let sentText = '';
  const code = await run(
    { TELEGRAM_BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '42' },
    NOW,
    async (_token, chatId, text) => {
      assert.equal(chatId, '42');
      sentText = text;
    },
    () => {},
  );
  assert.equal(code, 0);
  assert.match(sentText, /Laporan Harian/);
  assert.match(sentText, /Villa Senja/);
});

test('returns exit code 1 and hides the token when sending fails', async () => {
  const out: string[] = [];
  const code = await run(
    { TELEGRAM_BOT_TOKEN: 'SECRET-TOKEN-VALUE', TELEGRAM_CHAT_ID: '42' },
    NOW,
    async () => {
      throw new Error('Telegram API error: HTTP 401');
    },
    (m) => out.push(m),
  );
  assert.equal(code, 1);
  assert.match(out.join('\n'), /401/);
  assert.doesNotMatch(out.join('\n'), /SECRET-TOKEN-VALUE/);
});
