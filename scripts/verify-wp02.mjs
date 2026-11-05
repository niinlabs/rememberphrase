#!/usr/bin/env node
// WP02 verifier: WP01 still holds, the phrase-state and sampling fixtures pass, the Generate and
// Make it Yours browser fixtures pass in every browser, and a device and copy-review check is
// recorded. Prints PASS, FAIL or BLOCKED per check; exits non-zero unless all pass.
import { browserFixtures, check, finish, manualRecord, unitFixtures, upstream } from './verify-lib.mjs';

const BROWSERS = ['chromium', 'firefox', 'webkit'];

check('WP01 holds', () => upstream('scripts/verify-wp01.mjs', 'WP01'));
// Minimum passing tests per file (per browser for browser tests): fewer means fixtures were lost.
check('phrase-state and sampling fixtures pass', () =>
  unitFixtures({ 'tests/unit/phrase.test.ts': 40, 'tests/unit/random.test.ts': 4 }),
);
check(`Generate and Make it Yours browser fixtures pass in ${BROWSERS.join(', ')}`, () =>
  browserFixtures({ 'tests/e2e/generate.e2e.ts': 12, 'tests/e2e/compose.e2e.ts': 29 }, BROWSERS),
);
check('device, screen-reader and copy-review check is recorded', () => manualRecord('docs/evidence/wp02-manual.md'));

finish('WP02');
