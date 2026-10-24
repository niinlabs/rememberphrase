import { afterEach, expect, test, vi } from 'vitest';
import { checkReachability, REACHABILITY_MARKER } from '../../src/core/reachability';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const abortError = () => new DOMException('', 'AbortError');
// Like a real fetch: rejects when its signal aborts.
const onAbort = (signal: AbortSignal) => new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(abortError())));

function stubResponse(response: Partial<Response>) {
  vi.stubGlobal('fetch', async () => response);
}

test('the expected marker means Rememberphrase answered', async () => {
  stubResponse({ ok: true, text: async () => `${REACHABILITY_MARKER}\n` });
  expect(await checkReachability(new AbortController().signal)).toBe('site-answered');
});

test.each<[string, Partial<Response>]>([
  ['a redirect', { ok: false, type: 'opaqueredirect', text: async () => '' }],
  ['an error status', { ok: false, status: 503, text: async () => 'Service unavailable' }],
  ['a captive-portal page', { ok: true, text: async () => '<html>Log in to Wi-Fi</html>' }],
])('%s still means a network answered', async (_name, response) => {
  stubResponse(response);
  expect(await checkReachability(new AbortController().signal)).toBe('network-answered');
});

test('the redirect is not followed', async () => {
  const fetch = vi.fn(async () => ({ ok: false, text: async () => '' }));
  vi.stubGlobal('fetch', fetch);
  await checkReachability(new AbortController().signal);
  expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: 'manual', cache: 'no-store' }));
});

test('a check that never answers times out as no answer', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', (_url: string, { signal }: RequestInit) => onAbort(signal!));
  const result = checkReachability(new AbortController().signal, 1000);
  await vi.advanceTimersByTimeAsync(1000);
  expect(await result).toBe('no-answer');
});

test('Skip before any response cancels the check', async () => {
  vi.stubGlobal('fetch', (_url: string, { signal }: RequestInit) => onAbort(signal!));
  const skip = new AbortController();
  const result = checkReachability(skip.signal);
  skip.abort();
  expect(await result).toBe('skipped');
});

test('Skip after the response headers cannot erase the answer', async () => {
  let readingBody!: () => void;
  const bodyStarted = new Promise<void>((resolve) => (readingBody = resolve));
  vi.stubGlobal('fetch', async (_url: string, { signal }: RequestInit) => ({
    ok: true,
    text: () => {
      readingBody();
      return onAbort(signal!);
    },
  }));
  const skip = new AbortController();
  const result = checkReachability(skip.signal);
  await bodyStarted;
  skip.abort();
  expect(await result).toBe('network-answered');
});
