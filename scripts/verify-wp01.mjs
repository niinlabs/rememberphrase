#!/usr/bin/env node
// WP01 verifier: WP00 still holds, the copy fixtures pass, the Prepare browser fixtures pass in every
// browser, and a real-device offline exercise is recorded. Prints PASS, FAIL or BLOCKED per check;
// exits non-zero unless all pass.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const COPY_FIXTURE = 'tests/unit/copy.test.ts';
const BROWSER_FIXTURE = 'tests/e2e/prepare.e2e.ts';
const BROWSERS = ['chromium', 'firefox', 'webkit'];
const MIN_PASSED_PER_BROWSER = 10;
const MANUAL_RECORD = 'docs/evidence/wp01-manual-offline.md';
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
const tempFile = (name) => join(mkdtempSync(join(tmpdir(), 'verify-wp01-')), name);

check('WP00 still passes', () => {
  const wp00 = run(join(root, 'scripts/verify-wp00.mjs'), []);
  if (wp00.error) return ['BLOCKED', `could not run verify-wp00 (${wp00.error.message})`];
  if (wp00.status !== 0) return 'verify-wp00.mjs did not pass';
});

check('copy fixtures pass', () => {
  if (!existsSync(join(root, COPY_FIXTURE))) return `missing ${COPY_FIXTURE}`;
  const out = tempFile('vitest.json');
  const tests = run('pnpm', ['exec', 'vitest', 'run', COPY_FIXTURE, '--reporter=json', `--outputFile=${out}`]);
  if (tests.error || !existsSync(out)) return ['BLOCKED', 'the unit tests could not run'];
  const file = JSON.parse(readFileSync(out, 'utf8')).testResults.find((t) => t.name.endsWith(COPY_FIXTURE));
  const passed = file?.assertionResults.filter((a) => a.status === 'passed').length ?? 0;
  if (file?.status !== 'passed' || passed === 0) return `${COPY_FIXTURE} did not run and pass`;
});

check(`Prepare browser fixtures pass in ${BROWSERS.join(', ')}`, () => {
  if (!existsSync(join(root, BROWSER_FIXTURE))) return `missing ${BROWSER_FIXTURE}`;
  const out = tempFile('playwright.json');
  const e2e = run('pnpm', ['exec', 'playwright', 'test', BROWSER_FIXTURE, '--reporter=json'], {
    PLAYWRIGHT_JSON_OUTPUT_FILE: out,
    PLAYWRIGHT_JSON_OUTPUT_NAME: out,
  });
  if (e2e.error || !existsSync(out)) return ['BLOCKED', 'the browser tests could not run'];
  const tests = [];
  const collect = (suite) => {
    for (const spec of suite.specs ?? []) if (spec.file.endsWith('prepare.e2e.ts')) tests.push(...spec.tests);
    for (const child of suite.suites ?? []) collect(child);
  };
  JSON.parse(readFileSync(out, 'utf8')).suites.forEach(collect);
  const failed = tests.filter((t) => t.status !== 'expected' && t.status !== 'skipped');
  if (failed.length) return `${failed.length} test(s) failed; run pnpm test:e2e for details`;
  const thin = BROWSERS.filter(
    (b) => tests.filter((t) => t.projectName === b && t.status === 'expected').length < MIN_PASSED_PER_BROWSER,
  );
  if (thin.length) return `fewer than ${MIN_PASSED_PER_BROWSER} passing tests in ${thin.join(', ')}`;
});

check('real-device offline exercise is recorded', () => {
  if (!existsSync(join(root, MANUAL_RECORD))) return `missing ${MANUAL_RECORD}`;
  const record = readFileSync(join(root, MANUAL_RECORD), 'utf8');
  if (!/^- Date: \d{4}-\d{2}-\d{2}\s*$/m.test(record) || !/^- Result: PASS\s*$/m.test(record)) {
    return ['BLOCKED', `run the steps in ${MANUAL_RECORD} on a real device and record a dated PASS`];
  }
});

for (const [result, name] of results) console.log(`${result.padEnd(7)} ${name}`);
const overall = results.some(([r]) => r === 'FAIL') ? 'FAIL' : results.some(([r]) => r === 'BLOCKED') ? 'BLOCKED' : 'PASS';
console.log(`WP01 ${overall}`);
process.exit(overall === 'PASS' ? 0 : 1);
