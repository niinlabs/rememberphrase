import type { ProbeResult } from './reachability';

export type Readiness = {
  listReady: boolean;
  rngAvailable: boolean;
  osConfirmed: boolean;
  probe: ProbeResult | null; // null until the check has finished
  localCheckOk: boolean; // a silent draw from the loaded list succeeded in this tab (WP00 D7 as amended)
  localCheckFailed: boolean; // the last silent draw threw; it can be retried
  browserOnline: boolean; // navigator.onLine: a hint only
  reconnected: boolean; // the browser reported coming online after the user confirmed offline
};

export type Status =
  | { colour: 'red'; canGenerate: false; reason: 'site-answered' | 'network-answered' | 'reconnected' }
  | { colour: 'amber'; canGenerate: false; reason: 'list' | 'rng' | 'unconfirmed' | 'local-check' | 'local-check-failed' }
  | { colour: 'amber'; canGenerate: true; reason: 'skipped' | 'browser-online' }
  | { colour: 'green'; canGenerate: true };

// The approved red/amber/green table (WP00 D7). Rows are checked in order; the first match wins.
export function connectionStatus(r: Readiness): Status {
  if (!r.listReady) return { colour: 'amber', canGenerate: false, reason: 'list' };
  if (!r.rngAvailable) return { colour: 'amber', canGenerate: false, reason: 'rng' };
  if (r.probe === 'site-answered' || r.probe === 'network-answered') {
    return { colour: 'red', canGenerate: false, reason: r.probe };
  }
  if (r.reconnected) return { colour: 'red', canGenerate: false, reason: 'reconnected' };
  if (!r.osConfirmed || r.probe === null) return { colour: 'amber', canGenerate: false, reason: 'unconfirmed' };
  if (!r.localCheckOk) {
    return { colour: 'amber', canGenerate: false, reason: r.localCheckFailed ? 'local-check-failed' : 'local-check' };
  }
  if (r.probe === 'skipped') return { colour: 'amber', canGenerate: true, reason: 'skipped' };
  if (r.browserOnline) return { colour: 'amber', canGenerate: true, reason: 'browser-online' };
  return { colour: 'green', canGenerate: true };
}

// The silent local check may run once everything else allows generation.
export const canRunLocalCheck = (r: Readiness) => connectionStatus({ ...r, localCheckOk: true }).canGenerate;
