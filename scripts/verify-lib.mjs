// Shared by the verify-wpNN.mjs scripts. A check returns nothing to pass, a string to fail, or
// ['BLOCKED', reason]; finish() prints every result and exits non-zero unless all pass.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const read = (path) => readFileSync(join(root, path), 'utf8');
const results = [];

export function check(name, fn) {
  try {
    const problem = fn();
    if (!problem) results.push(['PASS', name]);
    else if (Array.isArray(problem)) results.push([problem[0], `${name}: ${problem[1]}`]);
    else results.push(['FAIL', `${name}: ${problem}`]);
  } catch (e) {
    results.push(['FAIL', `${name}: ${e.message}`]);
  }
}

export function finish(label) {
  for (const [result, name] of results) console.log(`${result.padEnd(7)} ${name}`);
  const overall = results.some(([r]) => r === 'FAIL') ? 'FAIL' : results.some(([r]) => r === 'BLOCKED') ? 'BLOCKED' : 'PASS';
  console.log(`${label} ${overall}`);
  process.exit(overall === 'PASS' ? 0 : 1);
}

const run = (cmd, args, env = {}) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
const tempFile = (name) => join(mkdtempSync(join(tmpdir(), 'verify-')), name);
const missing = (files) => files.filter((f) => !existsSync(join(root, f)));

// An earlier package's verifier, its verdict passed through: a BLOCKED dependency blocks this one.
export function upstream(script, label) {
  const result = run(join(root, script), []);
  if (result.error) return ['BLOCKED', `could not run ${script} (${result.error.message})`];
  const verdict = result.stdout.trim().split('\n').pop();
  if (verdict === `${label} PASS`) return;
  if (verdict === `${label} BLOCKED`) return ['BLOCKED', `${script} is BLOCKED`];
  const failed = result.stdout.split('\n').find((line) => line.startsWith('FAIL'));
  return `${script} failed${failed ? ` (${failed.replace(/^FAIL\s+/, '')})` : ''}`;
}

// Each fixture file must run and pass at least `min` tests, so an emptied or skipped file fails.
// With all, the whole unit suite runs and must pass too.
export function unitFixtures(fixtures, { all = false } = {}) {
  const files = Object.keys(fixtures);
  if (missing(files).length) return `missing ${missing(files).join(', ')}`;
  const out = tempFile('vitest.json');
  const tests = run('pnpm', ['exec', 'vitest', 'run', ...(all ? [] : files), '--reporter=json', `--outputFile=${out}`]);
  if (tests.error || !existsSync(out)) return ['BLOCKED', 'the unit tests could not run'];
  const { testResults } = JSON.parse(readFileSync(out, 'utf8'));
  for (const [fixture, min] of Object.entries(fixtures)) {
    const file = testResults.find((t) => t.name.endsWith(fixture));
    const passed = file?.status === 'passed' ? file.assertionResults.filter((a) => a.status === 'passed').length : 0;
    if (passed < min) return `${fixture}: ${passed} passing, at least ${min} required`;
  }
  if (tests.status !== 0) return 'unit tests failed; run pnpm test for details';
}

// No browser test may fail, and each fixture file must pass at least `min` tests in every browser.
export function browserFixtures(fixtures, browsers) {
  const files = Object.keys(fixtures);
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
  for (const [fixture, min] of Object.entries(fixtures))
    for (const browser of browsers) {
      const passed = tests.filter((t) => fixture.endsWith(t.file) && t.projectName === browser && t.status === 'expected').length;
      if (passed < min) return `${fixture} in ${browser}: ${passed} passing, at least ${min} required`;
    }
}

// A human check counts only once its record has a date and Result: PASS.
export function manualRecord(path) {
  if (missing([path]).length) return `missing ${path}`;
  const record = read(path);
  if (!/^- Date: \d{4}-\d{2}-\d{2}\s*$/m.test(record) || !/^- Result: PASS\s*$/m.test(record)) {
    return ['BLOCKED', `run the steps in ${path} and record a dated PASS`];
  }
}
