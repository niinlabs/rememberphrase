#!/usr/bin/env node
// WP00 verifier: approved decision record, word-list evidence, and the decision-table and
// offline-check fixtures. Prints PASS, FAIL or BLOCKED per check; exits non-zero unless all pass.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { effLargeList } from '../src/wordlists.ts';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
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

check('decision record is approved and complete', () => {
  const text = read('docs/decisions/wp00.md').toString('utf8');
  if (!/\*\*Status: Approved \d{4}-\d{2}-\d{2}\.\*\*/.test(text)) return 'no approval status';
  const missing = Array.from({ length: 16 }, (_, i) => `D${i + 1}`).filter((d) => !text.includes(`## ${d} — `));
  if (missing.length) return `missing ${missing.join(', ')}`;
});

check('word list matches its manifest', () => {
  const bytes = read(`public${effLargeList.file}`);
  if (createHash('sha256').update(bytes).digest('hex') !== effLargeList.sha256) return 'hash mismatch';
  const words = bytes.toString('utf8').split('\n').filter(Boolean);
  if (words.length !== effLargeList.count) return `${words.length} words, expected ${effLargeList.count}`;
  if (new Set(words).size !== words.length) return 'duplicate words';
});

check('word list is attributed', () => {
  const text = read('ATTRIBUTION.md').toString('utf8');
  const missing = [effLargeList.licence, effLargeList.source, effLargeList.sourceSha256].filter((s) => !text.includes(s));
  if (missing.length) return `ATTRIBUTION.md lacks ${missing.join(', ')}`;
});

check('decision-table and offline-check fixtures pass', () => {
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run'], { cwd: fileURLToPath(root), encoding: 'utf8' });
  if (run.error) return ['BLOCKED', `could not run the tests (${run.error.message})`];
  if (run.status !== 0) return 'unit tests failed; run pnpm test for details';
});

for (const [result, name] of results) console.log(`${result.padEnd(7)} ${name}`);
const overall = results.some(([r]) => r === 'FAIL') ? 'FAIL' : results.some(([r]) => r === 'BLOCKED') ? 'BLOCKED' : 'PASS';
console.log(`WP00 ${overall}`);
process.exit(overall === 'PASS' ? 0 : 1);
