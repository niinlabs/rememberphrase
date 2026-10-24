import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { fixtureList } from '../../src/wordlists';

test('manifest matches the bundled list', () => {
  const bytes = readFileSync(`public${fixtureList.file}`);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixtureList.sha256);
  expect(bytes.toString('utf8').split('\n').filter(Boolean)).toHaveLength(fixtureList.count);
});
