import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { effLargeList } from '../../src/wordlists';

test('manifest matches the bundled list', () => {
  const bytes = readFileSync(`public${effLargeList.file}`);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(effLargeList.sha256);
  const words = bytes.toString('utf8').split('\n').filter(Boolean);
  expect(words).toHaveLength(effLargeList.count);
  expect(new Set(words).size).toBe(words.length);
});
