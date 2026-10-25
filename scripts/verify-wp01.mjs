#!/usr/bin/env node
// WP01 verifier: WP00 still holds, the copy fixtures pass, the Prepare browser fixtures pass in every
// browser, and a real-device offline exercise is recorded. Prints PASS, FAIL or BLOCKED per check;
// exits non-zero unless all pass.
import { browserFixtures, check, finish, manualRecord, unitFixtures, upstream } from './verify-lib.mjs';

const BROWSERS = ['chromium', 'firefox', 'webkit'];

check('WP00 still passes', () => upstream('scripts/verify-wp00.mjs', 'WP00'));
check('copy fixtures pass', () => unitFixtures({ 'tests/unit/copy.test.ts': 1 }));
check(`Prepare browser fixtures pass in ${BROWSERS.join(', ')}`, () =>
  browserFixtures({ 'tests/e2e/prepare.e2e.ts': 10 }, BROWSERS),
);
check('real-device offline exercise is recorded', () => manualRecord('docs/evidence/wp01-manual-offline.md'));

finish('WP01');
