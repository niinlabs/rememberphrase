import { expect, test } from 'vitest';
import { copy } from '../../src/copy';
import { languages } from '../../src/wordlists';

// Copy fixtures moved from WP00: no false precision or false safety claims, no unsupported locale.
const strings = (value: unknown): string[] =>
  typeof value === 'string'
    ? [value]
    : typeof value === 'function'
      ? strings(value('English', '7,776'))
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

test('green comes with an informational note that the site cannot see Airplane mode', () => {
  expect(copy.band.greenNote).toMatch(/^Good to know: websites can't see your device's Airplane mode setting/);
  expect(copy.band.greenNote).toContain('relies on your own check');
});

test('the no-storage claim covers only what the site controls', () => {
  expect(copy.panel.noStorage).toContain('This site stores nothing in your browser');
  expect(copy.panel.noStorage).toContain('may still keep its own records');
});

test('the red interruption asks for a fresh check rather than dismissing the hold', () => {
  expect(copy.interruption.next).toContain('run a new check');
});

test('random-source guidance points to HTTPS and a current browser, not to fetching again', () => {
  expect(copy.band.rng).toContain('https://');
  expect(copy.band.rng).not.toMatch(/fetch/i);
});

test('before fetching, the panel describes what Fetch words will do, not what has happened', () => {
  const text = copy.panel.fetch.body.join(' ');
  expect(text).toContain('Fetch words loads the list');
  expect(text).not.toMatch(/\b(is|has been|was) (now )?loaded\b/);
});

test('a failed local check names its recovery', () => {
  expect(copy.band['local-check-failed']).toContain('Try the check again');
  expect(copy.offline.retryCheck).toBe('Try the check again');
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
