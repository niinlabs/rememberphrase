#!/usr/bin/env node
// WP02 verifier: WP01 still holds, the phrase-state and sampling fixtures pass, the Generate and
// Make it Yours browser fixtures pass in every browser, and a device and copy-review check is
// recorded. Prints PASS, FAIL or BLOCKED per check; exits non-zero unless all pass.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
// Minimum passing tests per file (per browser for browser tests): fewer means fixtures were lost.
const UNIT_FIXTURES = { 'tests/unit/phrase.test.ts': 29, 'tests/unit/random.test.ts': 4 };
const BROWSER_FIXTURES = { 'tests/e2e/generate.e2e.ts': 12, 'tests/e2e/compose.e2e.ts': 23 };
const BROWSERS = ['chromium', 'firefox', 'webkit'];
const MANUAL_RECORD = 'docs/evidence/wp02-manual.md';
const results = [];

// A check returns nothing to pass, a string to fail, or ['BLOCKED', reason].
function check(name, fn) {
  try {
    const problem = fn();
    if (!problem) results.push(['PASS', name]);
    else if (Array.isArray(problem)) results.push([problem[0], `${name}: ${problem[1]}`]);
    else results.push(['FAIL', `${name}: ${problem}`]);
  } catch (e) {
    results.push(['FAIL', `${name}: ${e.message}`]);
  }
}

const run = (cmd, args, env = {}) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
const tempFile = (name) => join(mkdtempSync(join(tmpdir(), 'verify-wp02-')), name);
const missing = (files) => files.filter((f) => !existsSync(join(root, f)));

check('WP01 holds', () => {
  const wp01 = run(join(root, 'scripts/verify-wp01.mjs'), []);
  if (wp01.error) return ['BLOCKED', `could not run verify-wp01 (${wp01.error.message})`];
  const verdict = wp01.stdout.trim().split('\n').pop();
  if (verdict === 'WP01 PASS') return;
  if (verdict === 'WP01 BLOCKED') return ['BLOCKED', 'verify-wp01.mjs is BLOCKED (its real-device record is not a dated PASS)'];
  return 'verify-wp01.mjs failed';
});

check('phrase-state and sampling fixtures pass', () => {
  const files = Object.keys(UNIT_FIXTURES);
  if (missing(files).length) return `missing ${missing(files).join(', ')}`;
  const out = tempFile('vitest.json');
  const tests = run('pnpm', ['exec', 'vitest', 'run', ...files, '--reporter=json', `--outputFile=${out}`]);
  if (tests.error || !existsSync(out)) return ['BLOCKED', 'the unit tests could not run'];
  const { testResults } = JSON.parse(readFileSync(out, 'utf8'));
  for (const [fixture, min] of Object.entries(UNIT_FIXTURES)) {
    const file = testResults.find((t) => t.name.endsWith(fixture));
    const passed = file?.assertionResults.filter((a) => a.status === 'passed').length ?? 0;
    if (file?.status !== 'passed' || passed < min) return `${fixture}: ${passed} passing, at least ${min} required`;
  }
});

check(`Generate and Make it Yours browser fixtures pass in ${BROWSERS.join(', ')}`, () => {
  const files = Object.keys(BROWSER_FIXTURES);
  if (missing(files).length) return `missing ${missing(files).join(', ')}`;
  const out = tempFile('playwright.json');
  const e2e = run('pnpm', ['exec', 'playwright', 'test', ...files, '--reporter=json'], {
    PLAYWRIGHT_JSON_OUTPUT_FILE: out,
    PLAYWRIGHT_JSON_OUTPUT_NAME: out,
  });
  if (e2e.error || !existsSync(out)) return ['BLOCKED', 'the browser tests could not run'];
  const tests = [];
  const collect = (suite) => {
    for (const spec of suite.specs ?? []) tests.push(...spec.tests.map((t) => ({ ...t, file: spec.file })));
    for (const child of suite.suites ?? []) collect(child);
  };
  JSON.parse(readFileSync(out, 'utf8')).suites.forEach(collect);
  const failed = tests.filter((t) => t.status !== 'expected' && t.status !== 'skipped');
  if (failed.length) return `${failed.length} test(s) failed; run pnpm test:e2e for details`;
  for (const [fixture, min] of Object.entries(BROWSER_FIXTURES))
    for (const browser of BROWSERS) {
      const passed = tests.filter((t) => fixture.endsWith(t.file) && t.projectName === browser && t.status === 'expected').length;
      if (passed < min) return `${fixture} in ${browser}: ${passed} passing, at least ${min} required`;
    }
});

check('device, screen-reader and copy-review check is recorded', () => {
  if (missing([MANUAL_RECORD]).length) return `missing ${MANUAL_RECORD}`;
  const record = readFileSync(join(root, MANUAL_RECORD), 'utf8');
  if (!/^- Date: \d{4}-\d{2}-\d{2}\s*$/m.test(record) || !/^- Result: PASS\s*$/m.test(record)) {
    return ['BLOCKED', `run the steps in ${MANUAL_RECORD} and record a dated PASS`];
  }
});

for (const [result, name] of results) console.log(`${result.padEnd(7)} ${name}`);
const overall = results.some(([r]) => r === 'FAIL') ? 'FAIL' : results.some(([r]) => r === 'BLOCKED') ? 'BLOCKED' : 'PASS';
console.log(`WP02 ${overall}`);
process.exit(overall === 'PASS' ? 0 : 1);
