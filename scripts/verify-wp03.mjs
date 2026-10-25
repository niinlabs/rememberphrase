#!/usr/bin/env node
// WP03 verifier: WP02 still holds, the policy, decoration and copy fixtures pass, the Remember and
// login-requirements browser fixtures pass in every browser, and the device, screen-reader, copy and
// security reviews are recorded. Prints PASS, FAIL or BLOCKED per check; exits non-zero unless all pass.
import { browserFixtures, check, finish, manualRecord, unitFixtures, upstream } from './verify-lib.mjs';

const BROWSERS = ['chromium', 'firefox', 'webkit'];

check('WP02 holds', () => upstream('scripts/verify-wp02.mjs', 'WP02'));
// Minimum passing tests per file (per browser for browser tests): fewer means fixtures were lost.
check('policy, decoration and copy fixtures pass', () =>
  unitFixtures({ 'tests/unit/policy.test.ts': 6, 'tests/unit/phrase.test.ts': 33, 'tests/unit/copy.test.ts': 16 }),
);
check(`Remember and login-requirements browser fixtures pass in ${BROWSERS.join(', ')}`, () =>
  browserFixtures({ 'tests/e2e/remember.e2e.ts': 14, 'tests/e2e/requirements.e2e.ts': 7 }, BROWSERS),
);
check('device, screen-reader, copy and security reviews are recorded', () => manualRecord('docs/evidence/wp03-manual.md'));

finish('WP03');
