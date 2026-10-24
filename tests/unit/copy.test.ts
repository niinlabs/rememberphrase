import { expect, test } from 'vitest';
import { copy } from '../../src/copy';
import { languages } from '../../src/wordlists';

// Copy fixtures moved from WP00: no false precision or false safety claims, no unsupported locale.
const strings = (value: unknown): string[] =>
  typeof value === 'string'
    ? [value]
    : typeof value === 'function'
      ? strings(value('7,776'))
      : value && typeof value === 'object'
        ? Object.values(value).flatMap(strings)
        : [];

const overclaim =
  /\b(secure|securely|safe|safely|safety|verified|guarantee[sd]?|uncrackable|unbreakable|impossible|military-grade|bits|entropy|crack\w*)\b|100 ?%|airplane mode detected/i;

test('copy makes no false precision or false safety claims', () => {
  const all = strings(copy);
  expect(all.length).toBeGreaterThan(40);
  expect(all.filter((s) => overclaim.test(s))).toEqual([]);
});

test('the fixture catches overclaims', () => {
  for (const bad of ['Verified offline', 'You are safe now', 'Takes 300 years to crack', '77 bits', 'Airplane mode detected'])
    expect(overclaim.test(bad), bad).toBe(true);
});

test('green copy says the site cannot verify Airplane mode', () => {
  expect(copy.band.green).toContain('The site cannot verify Airplane mode.');
});

test('a failed check is never presented as proof of being offline', () => {
  expect(copy.offline.noAnswer).toContain('does not prove');
  expect(copy.dialog.note).toContain('does not prove');
});

test('only approved languages are offered, each with a reviewed and attributed list (WP00 D2, D3)', () => {
  expect(languages.map((l) => l.code)).toEqual(['en']);
  for (const { list } of languages) {
    expect(list.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(list.source).toMatch(/^https:\/\//);
    expect(list.licence).not.toBe('');
  }
});
