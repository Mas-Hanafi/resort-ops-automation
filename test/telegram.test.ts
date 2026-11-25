import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendTelegram } from '../src/telegram.ts';

const TOKEN = '123456:SECRET-TOKEN-VALUE';

function fakeFetch(status: number, calls: { url: string; init: RequestInit }[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ ok: status === 200 }), { status });
  }) as typeof fetch;
}

test('posts chat_id and text to sendMessage', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  await sendTelegram(TOKEN, '999', 'halo', fakeFetch(200, calls));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.telegram.org/bot${TOKEN}/sendMessage`);
  assert.equal(calls[0].init.method, 'POST');
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.chat_id, '999');
  assert.equal(body.text, 'halo');
});

test('passes an abort signal so a hung connection cannot block the job', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  await sendTelegram(TOKEN, '999', 'halo', fakeFetch(200, calls));
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('throws when response is not ok', async () => {
  await assert.rejects(() => sendTelegram(TOKEN, '999', 'halo', fakeFetch(401)), /401/);
});

test('includes the Telegram description in the error so the cause is visible', async () => {
  const withDescription = (async () =>
    new Response(JSON.stringify({ ok: false, description: "Forbidden: bot can't send messages to bots" }), {
      status: 403,
    })) as typeof fetch;
  await assert.rejects(
    () => sendTelegram(TOKEN, '999', 'halo', withDescription),
    /HTTP 403.*bot can't send messages to bots/,
  );
});

test('scrubs the token if Telegram echoes it in the description', async () => {
  const echo = (async () =>
    new Response(JSON.stringify({ ok: false, description: `bad token ${TOKEN}` }), { status: 401 })) as typeof fetch;
  await assert.rejects(
    () => sendTelegram(TOKEN, '999', 'halo', echo),
    (err: unknown) => err instanceof Error && !err.message.includes('SECRET-TOKEN-VALUE'),
  );
});

test('error message does not contain the token', async () => {
  await assert.rejects(
    () => sendTelegram(TOKEN, '999', 'halo', fakeFetch(401)),
    (err: unknown) => err instanceof Error && !err.message.includes('SECRET-TOKEN-VALUE'),
  );
});

test('network failure error does not contain the token', async () => {
  const failing = (async () => {
    throw new Error(`connect failed for https://api.telegram.org/bot${TOKEN}/sendMessage`);
  }) as typeof fetch;
  await assert.rejects(
    () => sendTelegram(TOKEN, '999', 'halo', failing),
    (err: unknown) => err instanceof Error && !err.message.includes('SECRET-TOKEN-VALUE'),
  );
});
