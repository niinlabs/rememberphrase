export const REACHABILITY_URL = '/reachability.txt';
export const REACHABILITY_MARKER = 'rememberphrase-reachable';
export const REACHABILITY_TIMEOUT_MS = 5000;

// site-answered and network-answered both mean a network is reachable; the marker only picks the copy.
export type ProbeResult = 'site-answered' | 'network-answered' | 'no-answer' | 'skipped';

// Disclosed preparation check, run before any real phrase exists (WP00 D6). Any HTTP response,
// including a redirect, error status or captive-portal page, counts as an answer once its headers
// arrive; only a network error or the timeout is inconclusive. Redirects are never followed.
export async function checkReachability(
  skip: AbortSignal,
  timeoutMs = REACHABILITY_TIMEOUT_MS,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  skip.addEventListener('abort', abort);
  try {
    let res: Response;
    try {
      res = await fetch(`${REACHABILITY_URL}?t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch {
      return skip.aborted ? 'skipped' : 'no-answer';
    }
    // Headers arrived, so the answer stands even if Skip or the timeout interrupts the body.
    try {
      return res.ok && (await res.text()).trim() === REACHABILITY_MARKER ? 'site-answered' : 'network-answered';
    } catch {
      return 'network-answered';
    }
  } finally {
    clearTimeout(timer);
    skip.removeEventListener('abort', abort);
  }
}
