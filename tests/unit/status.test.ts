import { expect, test } from 'vitest';
import type { ProbeResult } from '../../src/core/reachability';
import { canRunLocalCheck, connectionStatus, type Readiness } from '../../src/core/status';

// Decision-table fixtures for WP00 D7.
const ready: Readiness = {
  listReady: true,
  rngAvailable: true,
  osConfirmed: true,
  probe: 'no-answer',
  localCheckOk: true,
  localCheckFailed: false,
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
  ['no successful local check yet', { localCheckOk: false }, 'amber', false],
  ['check skipped', { probe: 'skipped' }, 'amber', true],
  ['browser still reports online', { browserOnline: true }, 'amber', true],
  ['a missing list outranks an answer', { listReady: false, probe: 'network-answered' }, 'amber', false],
  ['reconnection outranks a skipped check', { probe: 'skipped', reconnected: true }, 'red', false],
  ['reconnection outranks missing confirmation', { osConfirmed: false, reconnected: true }, 'red', false],
  ['Skip does not replace the local check', { probe: 'skipped', localCheckOk: false }, 'amber', false],
  ['a failed local check holds', { localCheckOk: false, localCheckFailed: true }, 'amber', false],
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
          for (const localCheckOk of flags)
            for (const localCheckFailed of flags)
            for (const browserOnline of flags)
              for (const reconnected of flags) {
                const r = { listReady, rngAvailable, osConfirmed, probe, localCheckOk, localCheckFailed, browserOnline, reconnected };
                const status = connectionStatus(r);
                const allClear =
                  listReady && rngAvailable && osConfirmed && probe === 'no-answer' && localCheckOk && !browserOnline && !reconnected;
                expect(status.colour === 'green', JSON.stringify(r)).toBe(allClear);
                if (status.colour === 'red' || !listReady || !rngAvailable) expect(status.canGenerate).toBe(false);
              }
});

test('a failed local check is named, so the page can offer a retry', () => {
  expect(connectionStatus({ ...ready, localCheckOk: false, localCheckFailed: true })).toEqual({
    colour: 'amber',
    canGenerate: false,
    reason: 'local-check-failed',
  });
  expect(connectionStatus({ ...ready, localCheckOk: false })).toMatchObject({ reason: 'local-check' });
});

test('the silent local check runs only on an allowed path', () => {
  const pending = { ...ready, localCheckOk: false };
  expect(canRunLocalCheck(pending)).toBe(true);
  expect(canRunLocalCheck({ ...pending, probe: 'skipped' })).toBe(true);
  expect(canRunLocalCheck({ ...pending, browserOnline: true })).toBe(true);
  expect(canRunLocalCheck({ ...pending, localCheckFailed: true })).toBe(true); // a failed check may be retried
  for (const blocked of [
    { probe: 'network-answered' },
    { probe: 'site-answered' },
    { reconnected: true },
    { osConfirmed: false },
    { probe: null },
    { listReady: false },
    { rngAvailable: false },
  ] as Partial<Readiness>[])
    expect(canRunLocalCheck({ ...pending, ...blocked }), JSON.stringify(blocked)).toBe(false);
});
