#!/usr/bin/env node
// WP04 verifier: WP02 still holds, the landing copy fixtures pass, the landing browser fixtures pass in
// every browser, and the device, screen-reader, copy and newcomer checks are recorded. Prints PASS,
// FAIL or BLOCKED per check; exits non-zero unless all pass.
import { browserFixtures, check, finish, manualRecord, unitFixtures, upstream } from './verify-lib.mjs';

const BROWSERS = ['chromium', 'firefox', 'webkit'];

check('WP02 holds', () => upstream('scripts/verify-wp02.mjs', 'WP02'));
// Minimum passing tests per file (per browser for browser tests): fewer means fixtures were lost.
check('landing copy fixtures pass', () => unitFixtures({ 'tests/unit/copy.test.ts': 20 }));
check(`landing browser fixtures pass in ${BROWSERS.join(', ')}`, () =>
  browserFixtures({ 'tests/e2e/landing.e2e.ts': 9 }, BROWSERS),
);
check('device, screen-reader, copy and newcomer checks are recorded', () => manualRecord('docs/evidence/wp04-manual.md'));

finish('WP04');
