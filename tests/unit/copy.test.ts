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

// WP03 copy fixtures: strength (D4, D8), login requirements (D9) and practice and recovery (D13).
test('the D4 guidance and the D8 caveat use the approved wording', () => {
  expect(copy.generate.guidance).toEqual({
    tooFew: 'Too few random words for an important password.',
    short: 'Shorter than we recommend for a master password or computer login.',
    recommended: 'The length we recommend for a master password or computer login.',
  });
  expect(copy.remember.strengthCaveat).toBe(
    'Based on how these words were generated. You chose which words to keep and their order; we do not count that as extra strength.',
  );
  expect(copy.remember.strengthNone).toBe('We cannot estimate the strength of words you wrote yourself.');
});

test('strength copy counts words and characters, never combinations or time', () => {
  const text = [copy.remember.strengthDraws(5, 6, '7,776'), copy.remember.strengthTyped(6, 5, 40), ...copy.remember.strengthRules].join(' ');
  expect(text).not.toMatch(/\b(combinations?|possibilit\w+|years?|days?|seconds?|guess\w*)\b|\d[\d,]* ?(x|×) ?\d/i);
  expect(copy.remember.strengthRules.join(' ')).toMatch(/do not add strength/);
  // Hand edits do change the guidance (an edited word stops counting), so only the D9 options may be named.
  const unchanged = copy.remember.strengthRules.find((r) => r.includes('do not change the guidance'))!;
  expect(unchanged).toContain('the Capitalise, Add a number and Add a symbol options');
  expect(unchanged).not.toMatch(/\b(capitals|digits|symbols)\b/);
});

test('login requirements default to not specified and never promise acceptance', () => {
  expect(copy.requirements.notSpecified).toBe('Requirements not specified');
  const text = strings(copy.requirements).join(' ');
  expect(text).not.toMatch(/\b(will (be )?accept\w*|accepted|approved|compliant|guaranteed)\b/i);
  expect(copy.requirements.otherRules).toContain('may have other rules');
  expect(copy.requirements.fitNote).toContain("don't change how many random words count");
});

test('practice copy says the attempt stays in the tab and names what is outside the page', () => {
  expect(copy.remember.practiceIntro).toContain('not sent or saved');
  expect(copy.remember.practiceLimits).toMatch(/browser.*extensions.*screen/);
  expect(copy.remember.mismatch).not.toMatch(/should be|correct phrase is/i);
  expect(copy.remember.cleared).toContain('may still keep its own records');
});

test('recovery copy follows D13: paper, never digital copies, and the manager kit', () => {
  const text = copy.remember.recovery.join(' ');
  expect(text).toContain('on paper');
  expect(text).toMatch(/Never keep it as a photo, a cloud note, a chat message or a file/);
  expect(text).toContain('emergency kit');
});

test('optional reading never presents Rememberphrase as a vault', () => {
  expect(copy.remember.managers.join(' ')).toContain('Rememberphrase is not a password manager');
  expect(strings(copy).join(' ')).not.toMatch(/\b(vault|stored safely|we keep)\b/i);
});
