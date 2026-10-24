import { afterEach, expect, test, vi } from 'vitest';
import { checkReachability } from '../../src/core/reachability';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('a check that never answers times out as inconclusive', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    (_url: string, { signal }: RequestInit) =>
      new Promise((_, reject) => signal!.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))),
  );
  const result = checkReachability(new AbortController().signal, 1000);
  await vi.advanceTimersByTimeAsync(1000);
  expect(await result).toBe('unreachable');
});
