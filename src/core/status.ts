import type { ProbeResult } from './reachability';

export type Readiness = {
  listReady: boolean;
  rngAvailable: boolean;
  osConfirmed: boolean;
  probe: ProbeResult | null; // null until the check has finished
  sampleOk: boolean;
  browserOnline: boolean; // navigator.onLine: a hint only
  reconnected: boolean; // the browser reported coming online after the user confirmed offline
};

export type Status =
  | { colour: 'red'; canGenerate: false; reason: 'site-answered' | 'network-answered' | 'reconnected' }
  | { colour: 'amber'; canGenerate: false; reason: 'list' | 'rng' | 'unconfirmed' | 'sample' }
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
  if (!r.sampleOk) return { colour: 'amber', canGenerate: false, reason: 'sample' };
  if (r.probe === 'skipped') return { colour: 'amber', canGenerate: true, reason: 'skipped' };
  if (r.browserOnline) return { colour: 'amber', canGenerate: true, reason: 'browser-online' };
  return { colour: 'green', canGenerate: true };
}

// The disposable sample needs everything except a previous sample.
export const canRunSample = (r: Readiness) => connectionStatus({ ...r, sampleOk: true }).canGenerate;
