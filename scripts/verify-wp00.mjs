#!/usr/bin/env node
// WP00 verifier: approved decision record, word-list evidence, and the decision-table and
// offline-check fixtures. Prints PASS, FAIL or BLOCKED per check; exits non-zero unless all pass.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { effLargeList } from '../src/wordlists.ts';
import { check, finish, read, root, unitFixtures } from './verify-lib.mjs';

check('decision record is approved and complete', () => {
  const text = read('docs/decisions/wp00.md');
  if (!/\*\*Status: Approved \d{4}-\d{2}-\d{2}\.\*\*/.test(text)) return 'no approval status';
  const missing = Array.from({ length: 16 }, (_, i) => `D${i + 1}`).filter((d) => !text.includes(`## ${d} — `));
  if (missing.length) return `missing ${missing.join(', ')}`;
});

check('word list matches its manifest', () => {
  const bytes = readFileSync(join(root, `public${effLargeList.file}`));
  if (createHash('sha256').update(bytes).digest('hex') !== effLargeList.sha256) return 'hash mismatch';
  const words = bytes.toString('utf8').split('\n').filter(Boolean);
  if (words.length !== effLargeList.count) return `${words.length} words, expected ${effLargeList.count}`;
  if (new Set(words).size !== words.length) return 'duplicate words';
});

check('word list is attributed', () => {
  const text = read('ATTRIBUTION.md');
  const missing = [effLargeList.licence, effLargeList.source, effLargeList.sourceSha256].filter((s) => !text.includes(s));
  if (missing.length) return `ATTRIBUTION.md lacks ${missing.join(', ')}`;
});

check('decision-table and offline-check fixtures pass', () =>
  unitFixtures({ 'tests/unit/status.test.ts': 1, 'tests/unit/reachability.test.ts': 1 }, { all: true }),
);

finish('WP00');
