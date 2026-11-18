import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { copy } from '../../src/copy';
import { CONNECTORS } from '../../src/core/phrase';
import { effLargeList, languages } from '../../src/wordlists';

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
test('the D4 guidance and the D8 wording for rewritten phrases are as approved', () => {
  expect(copy.generate.guidance).toEqual({
    tooFew: 'Too few random words for an important password.',
    short: 'Shorter than we recommend for a master password or computer login.',
    recommended: 'The length we recommend for a master password or computer login.',
  });
  expect(copy.compose.strengthNone).toBe('We cannot estimate the strength of words you wrote yourself.');
});

test('strength copy gives one count and one reason, never combinations or time', () => {
  const text = [copy.compose.strengthCount(5, 6), copy.compose.strengthWhy('7,776'), ...copy.compose.counts].join(' ');
  expect(text).not.toMatch(/\b(combinations?|possibilit\w+|years?|days?|seconds?|guess\w*)\b|\d[\d,]* ?(x|×) ?\d/i);
  expect(copy.compose.strengthCount(6, 6)).toBe('6 random words');
  expect(copy.compose.strengthCount(5, 6)).toBe('5 of 6 words still random');
  // D8 as amended 2026-11-18: dressing a word up keeps it random; replacing it or removing letters does not.
  const [counts, doesNot, noStrength] = copy.compose.counts;
  expect(counts).toMatch(/capitals.*look-alike swaps.*added/);
  expect(doesNot).toContain('replaced or removed letters from');
  expect(noStrength).toContain('the Capitalise, Add a number and Add a symbol options');
});

test('login requirements default to not specified and never promise acceptance', () => {
  expect(copy.requirements.notSpecified).toBe('Requirements not specified');
  const text = strings(copy.requirements).join(' ');
  expect(text).not.toMatch(/\b(will (be )?accept\w*|accepted|approved|compliant|guaranteed)\b/i);
  expect(copy.requirements.otherRules).toContain('may have other rules');
  expect(copy.requirements.fitNote).toContain("don't necessarily make a passphrase stronger");
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

// WP04 copy fixtures: the landing examples are fixed public text the tool itself could produce.
test('each landing example is six list words, each used once, arranged with approved connecting words only', () => {
  const list = new Set(readFileSync(`public${effLargeList.file}`, 'utf8').split('\n').filter(Boolean));
  expect(copy.landing.examples.length).toBeGreaterThan(0);
  for (const { words, story } of copy.landing.examples) {
    expect(words).toHaveLength(6);
    for (const w of words) expect(list.has(w), w).toBe(true);
    const tokens = story.split(' ');
    expect(tokens.filter((t) => words.includes(t)).sort()).toEqual([...words].sort());
    for (const t of tokens.filter((t) => !words.includes(t))) expect(CONNECTORS as readonly string[]).toContain(t);
  }
});

test('the landing says what the site is not, labels the examples and makes no resume promise', () => {
  expect(copy.landing.intro.join(' ')).toContain('It is not a password manager');
  expect(copy.landing.examplesOnly).toBe('Examples only. Do not use these as passwords.');
  // The examples were picked by hand, so only words drawn in a visitor's own tab may be tied to strength.
  expect(copy.landing.wordsLabel).not.toMatch(/random/i);
  expect(copy.landing.examplesNote).toContain('picked by hand');
  expect(copy.landing.examplesNote).toContain('drawn at random in your tab');
  expect(copy.landing.examplesNote).not.toMatch(/(six|these) (random )?words count/i);
  expect(copy.landing.tabNote).toContain('Nothing is saved');
  expect(strings(copy.landing).join(' ')).not.toMatch(/\b(resume|continue where|saved progress|we remember)\b/i);
  expect(copy.landing.start).toBe('Start making a passphrase');
  // Step 1 tells Mac users to turn off Wi-Fi and unplug cables, so the landing must not promise Airplane mode.
  expect(strings(copy.landing).concat(copy.panel.landing.body).join(' ')).not.toMatch(/airplane/i);
});

// Wording settled in Niclas's review of 2026-11-05.
test('reviewed panel wording stays as agreed', () => {
  expect(copy.panel.offline.body.join(' ')).toContain('one small test that tries to reach rememberphrase.com');
  expect(copy.panel.compose.body.join(' ')).toContain("They don't necessarily add strength.");
  expect(copy.panel.remember.body.join(' ')).toContain('try as much as you like'); // not "often": nothing is kept to come back to
  expect(copy.panel.remember.body.join(' ')).toContain('until you have noted down a recovery copy'); // the site gives nothing
});

test('live practice feedback never states the phrase, and the cleared page says how to remove browser records', () => {
  expect(Object.values(copy.remember.live)).toEqual(['Wrong passphrase', 'Too short, keep going', 'Too long']);
  expect(copy.remember.clearedTips.join(' ')).toMatch(/saved passwords/);
  expect(copy.remember.clearedTips.join(' ')).toMatch(/browsing history/);
  expect(copy.remember.clearedTips.join(' ')).toMatch(/keyboard.*dictionary/);
});

test('continuing while connected names the risk plainly and never sounds like an all-clear', () => {
  for (const text of [copy.band.continued, copy.warn.connectedBody]) {
    expect(text).toContain("this page doesn't send them");
    expect(text).toMatch(/tampered page or a browser extension could/);
  }
  expect(copy.warn.connectedBody).toContain('try again on a network you can switch off');
  expect(copy.chip.continued).toBe('You chose to continue while connected');
});

test('wording from the review of 2026-11-05, second round', () => {
  expect(copy.tagline).toBe('Random start. Your story. A passphrase you can remember.');
  // Updated with D8 on 2026-11-18: dressing a word up keeps it random.
  expect(copy.landing.edit.at(-1)).toBe(
    'Replacing a word, removing letters from it or removing it makes your phrase less random. Capitals, look-alike swaps like 3 for e and added characters keep a word random. With fewer random words left, the phrase may be easier to guess.',
  );
  expect([...CONNECTORS]).toEqual([...CONNECTORS].sort());
  expect(CONNECTORS).toContain('an');
});

test('hold messages ask to check the disconnection, not Airplane mode, which a Mac does not have', () => {
  for (const reason of ['site-answered', 'network-answered', 'reconnected', 'browser-online'] as const) {
    expect(copy.band[reason]).not.toMatch(/airplane/i);
    expect(copy.band[reason]).toContain("check that you're disconnected");
  }
});

test('the own-word help warns against things others could link to you', () => {
  expect(copy.compose.ownHelp).toContain('Avoid anything others could link to you, such as names, birthdays or places.');
});
