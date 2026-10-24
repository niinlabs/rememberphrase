export const REACHABILITY_URL = '/reachability.txt';
export const REACHABILITY_MARKER = 'rememberphrase-reachable';
// shortcut: placeholder value, replace with the timeout WP00 settles.
export const REACHABILITY_TIMEOUT_MS = 5000;

export type ProbeResult = 'reachable' | 'unreachable' | 'skipped';

// Disclosed preparation check, run before any real phrase exists. Only a fresh, uncached,
// credential-free response carrying the exact marker counts as reachable; failure,
// timeout and skip are inconclusive and never prove the device is offline.
export async function checkReachability(
  skip: AbortSignal,
  timeoutMs = REACHABILITY_TIMEOUT_MS,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  skip.addEventListener('abort', abort);
  try {
    const res = await fetch(`${REACHABILITY_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      signal: controller.signal,
    });
    return res.ok && (await res.text()).trim() === REACHABILITY_MARKER ? 'reachable' : 'unreachable';
  } catch {
    return skip.aborted ? 'skipped' : 'unreachable';
  } finally {
    clearTimeout(timer);
    skip.removeEventListener('abort', abort);
  }
}
