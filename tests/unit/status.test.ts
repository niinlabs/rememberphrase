import { expect, test } from 'vitest';
import type { ProbeResult } from '../../src/core/reachability';
import { canRunSample, connectionStatus, type Readiness } from '../../src/core/status';

// Decision-table fixtures for WP00 D7.
const ready: Readiness = {
  listReady: true,
  rngAvailable: true,
  osConfirmed: true,
  probe: 'no-answer',
  sampleOk: true,
  browserOnline: false,
  reconnected: false,
};

test.each([
  ['everything ready and the check got no answer', {}, 'green', true],
  ['word list not ready', { listReady: false }, 'amber', false],
  ['secure random numbers unavailable', { rngAvailable: false }, 'amber', false],
  ['Rememberphrase answered', { probe: 'site-answered' }, 'red', false],
  ['another network answered', { probe: 'network-answered' }, 'red', false],
  ['browser reconnected after confirmation', { reconnected: true }, 'red', false],
  ['offline not confirmed', { osConfirmed: false }, 'amber', false],
  ['check not finished', { probe: null }, 'amber', false],
  ['no successful disposable sample yet', { sampleOk: false }, 'amber', false],
  ['check skipped', { probe: 'skipped' }, 'amber', true],
  ['browser still reports online', { browserOnline: true }, 'amber', true],
  ['a missing list outranks an answer', { listReady: false, probe: 'network-answered' }, 'amber', false],
  ['reconnection outranks a skipped check', { probe: 'skipped', reconnected: true }, 'red', false],
  ['reconnection outranks missing confirmation', { osConfirmed: false, reconnected: true }, 'red', false],
  ['Skip does not replace the sample', { probe: 'skipped', sampleOk: false }, 'amber', false],
] as const)('%s', (_name, change, colour, canGenerate) => {
  const status = connectionStatus({ ...ready, ...(change as Partial<Readiness>) });
  expect(status.colour).toBe(colour);
  expect(status.canGenerate).toBe(canGenerate);
});

test('green only when every condition holds (no false green in any combination)', () => {
  const probes: (ProbeResult | null)[] = [null, 'site-answered', 'network-answered', 'no-answer', 'skipped'];
  const flags = [true, false];
  for (const listReady of flags)
    for (const rngAvailable of flags)
      for (const osConfirmed of flags)
        for (const probe of probes)
          for (const sampleOk of flags)
            for (const browserOnline of flags)
              for (const reconnected of flags) {
                const r = { listReady, rngAvailable, osConfirmed, probe, sampleOk, browserOnline, reconnected };
                const status = connectionStatus(r);
                const allClear =
                  listReady && rngAvailable && osConfirmed && probe === 'no-answer' && sampleOk && !browserOnline && !reconnected;
                expect(status.colour === 'green', JSON.stringify(r)).toBe(allClear);
                if (status.colour === 'red' || !listReady || !rngAvailable) expect(status.canGenerate).toBe(false);
              }
});

test('the disposable sample needs everything except a previous sample', () => {
  expect(canRunSample({ ...ready, sampleOk: false })).toBe(true);
  expect(canRunSample({ ...ready, sampleOk: false, probe: 'skipped' })).toBe(true);
  expect(canRunSample({ ...ready, sampleOk: false, probe: 'network-answered' })).toBe(false);
  expect(canRunSample({ ...ready, sampleOk: false, osConfirmed: false })).toBe(false);
});
