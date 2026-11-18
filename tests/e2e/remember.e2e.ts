import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';
import { startAtStep1 } from './start';

// WP03 slice 1 browser fixtures: Remember, practise and clear. The phrase is a fresh random draw in
// a test browser, never a real secret, and nothing here prints it.
const entry = (page: Page) => page.getByLabel(copy.remember.attemptLabel, { exact: true });
const eye = (page: Page) => page.getByRole('button', { name: /^(Show|Hide) entry$/ });
const result = (page: Page) => page.locator('.result');
const reveal = (page: Page) => page.getByRole('button', { name: /^(Reveal|Hide) whole phrase$/ });
const rail = (page: Page) => page.getByTestId('practice-rail');
const aid = (page: Page, name: keyof typeof copy.remember.aids) => page.getByRole('radio', { name: copy.remember.aids[name], exact: true });
// What the rail shows on screen: screen-reader-only text removed.
const seen = (page: Page) =>
  rail(page).evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.visually-hidden').forEach((n) => n.remove());
    return clone.textContent!.trim();
  });
const withConnectors = (page: Page) => page.getByLabel(copy.remember.showConnectors);
const field = (page: Page, n: number) => page.getByRole('textbox', { name: new RegExp(`^${copy.compose.wordLabel(n)},`) });

async function reachCompose(page: Page, context: BrowserContext, count = 6) {
  await startAtStep1(page);
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  for (let i = count; i < 6; i++) await page.getByRole('button', { name: copy.generate.fewer }).click();
  await page.getByRole('button', { name: copy.generate.generate }).click();
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.compose.heading })).toBeFocused();
}

// Returns the exact phrase as Make it Yours showed it.
async function reachRemember(page: Page, context: BrowserContext) {
  await reachCompose(page, context);
  const phrase = await page.getByTestId('phrase-preview').innerText();
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.remember.heading })).toBeFocused();
  return phrase;
}

test('Make it Yours leads to Remember: one memory sentence, the practice card and recovery show, and the phrase starts hidden', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  await expect(page.getByRole('navigation', { name: 'Progress' }).locator('[aria-current="step"]')).toContainText('Remember');
  await expect(page.getByText(copy.remember.stick)).toBeVisible();
  const ideas = page.locator('details.ideas');
  await expect(ideas).not.toHaveAttribute('open');
  await ideas.locator('summary').click();
  for (const tip of copy.remember.tips) await expect(ideas.getByText(tip)).toBeVisible();
  await expect(page.getByText(copy.generate.guidance.recommended)).toHaveCount(0); // the length guidance lives in Make it yours now
  for (const line of copy.remember.recovery) await expect(page.getByText(line)).toBeVisible();
  await expect(page.getByText(phrase, { exact: true })).toHaveCount(0);

  await expect(reveal(page)).toHaveAttribute('aria-expanded', 'false');
  await reveal(page).click();
  await expect(reveal(page)).toHaveAccessibleName(copy.remember.hidePhrase);
  await expect(reveal(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('reference-phrase')).toHaveText(phrase);
  await reveal(page).click();
  await expect(page.getByTestId('reference-phrase')).toHaveCount(0);
});

test('practice starts with No aid and nothing of the phrase; Show connecting words is offered only with added words', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  await expect(aid(page, 'none')).toBeChecked();
  await expect(rail(page)).toHaveCount(0);
  await expect(page.getByText(copy.remember.aidHelp.none)).toBeVisible();
  for (const a of ['follow', 'reveal'] as const) await expect(aid(page, a)).toBeVisible();
  await expect(withConnectors(page)).toHaveCount(0);
  await entry(page).fill(phrase.slice(0, 3));
  await expect(result(page)).toHaveText(''); // without an aid, only a match or Enter gives a result
});

test('Follow along shows the phrase faintly and lights it while the typing matches; a mistake stops it', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  await aid(page, 'follow').check();
  await expect(rail(page)).toHaveText(phrase);
  await expect(rail(page).locator('.lit')).toHaveCount(0); // nothing lit yet
  await entry(page).fill(phrase.slice(0, 3));
  await expect(rail(page).locator('.lit')).toHaveText(phrase.slice(0, 3));
  await expect(result(page)).toHaveText(copy.remember.live.short);

  // A wrong fourth character, then the rest typed correctly: nothing past the mistake lights up.
  await entry(page).fill(`${phrase.slice(0, 3)}#${phrase.slice(4)}`);
  await expect(rail(page).locator('.lit')).toHaveText(phrase.slice(0, 3));
  await expect(rail(page).locator('.stop')).toHaveCount(1);
  await expect(result(page)).toHaveText(copy.remember.live.wrong);
  await expect(result(page)).toHaveCSS('color', 'rgb(180, 35, 24)'); // --red

  await entry(page).fill(phrase);
  await expect(rail(page).locator('.lit')).toHaveText(phrase);
  await expect(rail(page).locator('.stop')).toHaveCount(0);
  await expect(result(page)).toHaveText(copy.remember.match);
  await expect(result(page)).toHaveCSS('color', 'rgb(30, 111, 55)'); // --green
  await expect(result(page).locator('svg')).toHaveCount(1); // never colour alone
  await entry(page).fill(`${phrase}x`);
  await expect(result(page)).toHaveText(copy.remember.live.long);
});

test('Reveal as you type shows one dot per character and turns dots into characters only as typed correctly', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  const n = [...phrase].length;
  await aid(page, 'reveal').check();
  expect(await seen(page)).toBe('•'.repeat(n));
  await expect(rail(page)).toContainText(copy.remember.hidden(n));
  await entry(page).fill(phrase.slice(0, 5));
  expect(await seen(page)).toBe(phrase.slice(0, 5) + '•'.repeat(n - 5));
  await expect(rail(page)).toContainText(copy.remember.hidden(n - 5));
  await entry(page).fill(`${phrase.slice(0, 5)}#${phrase.slice(6)}`);
  expect(await seen(page)).toBe(phrase.slice(0, 5) + '•'.repeat(n - 5)); // the mistake stops it
  await expect(rail(page).locator('.stop')).toHaveCount(1);

  await aid(page, 'none').check(); // switching aids keeps the typing
  await expect(rail(page)).toHaveCount(0);
  await expect(entry(page)).toHaveValue(`${phrase.slice(0, 5)}#${phrase.slice(6)}`);
});

test('Show connecting words adds the added words to an aid, with each random word as dots in Reveal as you type', async ({ page, context }) => {
  await reachRemember(page, context);
  await page.getByRole('button', { name: copy.remember.back }).click();
  const words = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => field(page, n).inputValue()));
  for (const [c, at] of [['and', 2], ['with', 4]] as const) {
    await page.getByRole('button', { name: c, exact: true }).click();
    await page.getByRole('button', { name: copy.compose.insertHere(c, at) }).click();
  }
  await page.locator('details.requirements summary').click();
  await page.getByRole('radio', { name: copy.requirements.capitalise.every }).check();
  await page.getByRole('button', { name: copy.compose.continue }).click();

  const dots = (w: string) => '•'.repeat([...w].length);
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  await expect(withConnectors(page)).toBeDisabled(); // No aid: nothing to add them to
  await aid(page, 'reveal').check();
  await withConnectors(page).check();
  // Not typed: set apart where they belong, after the separator they sit in.
  expect(await seen(page)).toBe(`${dots(words[0])} And${dots(words[1])} With${words.slice(2).map(dots).join(' ')}`);
  await expect(rail(page).locator('.aside')).toHaveText([`${copy.remember.notTyped} And`, `${copy.remember.notTyped} With`]);
  await expect(rail(page)).toContainText(copy.remember.hidden([...words[0]].length));
  await entry(page).fill(`${cap(words[0])} `); // typing lights past the separator, the aside stays as it is
  expect(await seen(page)).toBe(`${cap(words[0])} And${dots(words[1])} With${words.slice(2).map(dots).join(' ')}`);
  await expect(rail(page).locator('.lit')).toHaveText(`${cap(words[0])} `);

  await aid(page, 'follow').check(); // the choice carries over to the other aid
  expect(await seen(page)).toBe(`${cap(words[0])} And${cap(words[1])} With${words.slice(2).map(cap).join(' ')}`);
  await withConnectors(page).uncheck();
  await expect(rail(page).locator('.aside')).toHaveCount(0);
  await aid(page, 'none').check();
  await expect(withConnectors(page)).toBeDisabled();

  await page.getByRole('button', { name: copy.remember.back }).click();
  await page.getByLabel(copy.compose.typeAdded).check();
  await page.getByRole('radio', { name: copy.compose.separators.hyphen }).check();
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await aid(page, 'reveal').check();
  await withConnectors(page).check();
  expect(await seen(page)).toBe([dots(words[0]), 'And', dots(words[1]), 'With', ...words.slice(2).map(dots)].join('-')); // the exact string, masked
  await expect(rail(page).locator('.aside')).toHaveCount(0);

  await reveal(page).click(); // the whole phrase is a separate control
  await expect(page.getByTestId('reference-phrase')).toHaveText(
    [words[0], 'And', words[1], 'With', ...words.slice(2)].map(cap).join('-'),
  );
  await expect(rail(page)).toBeVisible();
});

test('the entry starts masked; the eye shows and hides it without losing the text or focus', async ({ page, context }) => {
  await reachRemember(page, context);
  await expect(entry(page)).toHaveAttribute('type', 'password');
  await expect(eye(page)).toHaveAccessibleName(copy.remember.showEntry);
  await entry(page).fill('practice text');
  await eye(page).click();
  await expect(entry(page)).toHaveAttribute('type', 'text');
  await expect(eye(page)).toHaveAccessibleName(copy.remember.hideEntry);
  await expect(entry(page)).toBeFocused();
  await expect(entry(page)).toHaveValue('practice text');
  await eye(page).click();
  await expect(entry(page)).toHaveAttribute('type', 'password');
  await expect(entry(page)).toBeFocused();
  await expect(entry(page)).toHaveValue('practice text');

  // From the keyboard the eye keeps its own focus and still keeps the text.
  await eye(page).focus();
  await page.keyboard.press('Enter');
  await expect(entry(page)).toHaveAttribute('type', 'text');
  await expect(entry(page)).toHaveValue('practice text');
});

test('the check is automatic and exact: case and separators count, and a mismatch never shows the phrase', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  await expect(page.getByRole('button', { name: /^Check$/ })).toHaveCount(0);
  const next = page.getByRole('button', { name: copy.remember.retry });

  for (const wrong of [phrase.toUpperCase(), phrase.replaceAll(' ', '-'), `${phrase} `]) {
    await entry(page).fill(wrong);
    await expect(result(page)).toHaveText(''); // No aid: nothing about a wrong attempt until Enter
    await entry(page).press('Enter');
    await expect(result(page)).toHaveText(copy.remember.mismatch);
    await expect(next).toHaveCount(0);
    await expect(page.getByTestId('reference-phrase')).toHaveCount(0);
  }
  await entry(page).fill(phrase);
  await expect(result(page)).toHaveText(copy.remember.match); // no button press needed
  await expect(next).toBeVisible();
});

test('Next attempt appears on a match, then clears the attempt and returns to the field', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  const next = page.getByRole('button', { name: copy.remember.retry });
  await entry(page).fill(phrase);
  await next.click();
  await expect(entry(page)).toHaveValue('');
  await expect(entry(page)).toBeFocused();
  await expect(result(page)).toHaveText('');
  await expect(next).toHaveCount(0);

  await entry(page).fill(phrase);
  await entry(page).press('Enter'); // Enter on a match starts the next attempt too
  await expect(entry(page)).toHaveValue('');
});

test('there is no Skip practice button: practice is optional and recovery is always on the page', async ({ page, context }) => {
  await reachRemember(page, context);
  await expect(page.getByRole('button', { name: /skip/i })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: copy.remember.recoveryTitle })).toBeVisible();
});

test('practice compares against the final phrase after edits, connecting words and separators', async ({ page, context }) => {
  await reachCompose(page, context);
  const plain = await page.getByTestId('phrase-preview').innerText();
  const first = await field(page, 1).inputValue();
  await field(page, 1).fill(`${first[0].toUpperCase()}${first.slice(1)}7!`);
  await page.getByRole('button', { name: 'the', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('the', 2) }).click();
  await page.getByLabel(copy.compose.typeAdded).check();
  await page.getByRole('radio', { name: copy.compose.separators.underscore }).check();
  const final = await page.getByTestId('phrase-preview').innerText();
  expect(final).not.toBe(plain);
  await page.getByRole('button', { name: copy.compose.continue }).click();

  await entry(page).fill(plain);
  await entry(page).press('Enter');
  await expect(result(page)).toHaveText(copy.remember.mismatch);
  await entry(page).fill(final);
  await expect(result(page)).toHaveText(copy.remember.match);
});

test('leaving Remember forgets the attempt, so it cannot be checked against a changed phrase', async ({ page, context }) => {
  await reachRemember(page, context);
  await entry(page).fill('typed for the old phrase');
  await reveal(page).click();
  await page.getByRole('button', { name: copy.remember.back }).click();
  await field(page, 1).fill('Changed');
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await expect(entry(page)).toHaveValue('');
  await expect(entry(page)).toHaveAttribute('type', 'password');
  await expect(page.getByTestId('reference-phrase')).toHaveCount(0);
  await expect(result(page)).toHaveText('');
});

test('Clear phrase warns first, then removes the phrase from the page and can start again', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  await page.getByRole('button', { name: copy.remember.clear }).click();
  const warn = page.getByRole('alertdialog', { name: copy.warn.clearTitle });
  await expect(warn.getByRole('button', { name: copy.warn.cancel })).toBeFocused();
  await warn.getByRole('button', { name: copy.warn.cancel }).click();
  await expect(entry(page)).toBeVisible();

  await entry(page).fill(phrase);
  await reveal(page).click();
  await page.getByRole('button', { name: copy.remember.clear }).click();
  await page.getByRole('alertdialog', { name: copy.warn.clearTitle }).getByRole('button', { name: copy.warn.clearConfirm }).click();
  await expect(page.getByText(copy.remember.cleared)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: copy.remember.heading })).toBeFocused();
  expect(await page.locator('body').innerText()).not.toContain(phrase);
  expect(await page.locator('input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).not.toContain(phrase);

  await page.getByRole('button', { name: copy.remember.another }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.generate.heading })).toBeFocused();
  await expect(page.locator('.tiles .word')).toHaveCount(0);
  await page.getByRole('button', { name: copy.generate.generate }).click();
  await expect(page.locator('.tiles .word')).toHaveCount(6);
});

// Random words now sit under the phrase in Make it yours (D8 as amended 2026-11-18); Remember keeps the caution.
const random = (page: Page) => page.getByTestId('random-words');
const count = (page: Page) => random(page).locator('.count');
const dot = (page: Page) => random(page).locator('.dot');
const filled = (page: Page) => random(page).locator('.dot.on');
const caution = (page: Page) => page.getByTestId('caution');
const goRemember = async (page: Page) => {
  const phrase = await page.getByTestId('phrase-preview').innerText();
  await page.getByRole('button', { name: copy.compose.continue }).click();
  return phrase;
};

test('Make it yours shows twelve dots filled per random word, the count, the guidance and What counts?; Remember no longer does', async ({ page, context }) => {
  await reachCompose(page, context);
  await expect(page.locator('section.preview').getByTestId('random-words')).toBeVisible(); // in the preview box
  await expect(random(page).getByRole('heading', { name: copy.compose.randomTitle })).toBeVisible();
  await expect(dot(page)).toHaveCount(12); // always the most there can be
  await expect(filled(page)).toHaveCount(6);
  // Marks after the third and fifth dots split the row into the three D4 levels: too few, short, recommended.
  await expect(random(page).locator('.mark')).toHaveCount(2);
  await expect(random(page).locator('.dots > *').nth(3)).toHaveClass(/\bmark\b/);
  await expect(random(page).locator('.dots > *').nth(6)).toHaveClass(/\bmark\b/);
  await expect(count(page)).toHaveText(copy.compose.strengthCount(6, 6));
  await expect(count(page).getByRole('status')).toHaveText(copy.compose.strengthCount(6, 6)); // the text, not the dots, is read
  await expect(random(page).locator('.dots')).toHaveAttribute('aria-hidden', 'true');
  await expect(random(page).getByText(copy.generate.guidance.recommended)).toBeVisible();

  const counts = random(page).locator('details.counts');
  await expect(counts).not.toHaveAttribute('open');
  await counts.locator('summary').click();
  await expect(counts.getByText(copy.compose.strengthWhy('7,776'))).toBeVisible();
  for (const line of copy.compose.counts) await expect(counts.getByText(line)).toBeVisible();
  expect(await random(page).innerText()).not.toMatch(/\bbits?\b|crack|years|secure|2\^|\d+e\d+/i);

  await goRemember(page);
  await expect(page.getByTestId('random-words')).toHaveCount(0);
  await expect(page.getByText(copy.compose.strengthCount(6, 6))).toHaveCount(0);
  await expect(caution(page)).toHaveCount(0); // six random words: no caution
});

test('joined and dressed-up words keep their dots; removing a letter or lowering the count empties one each', async ({ page, context }) => {
  await reachCompose(page, context);
  const second = await field(page, 2).inputValue();
  await page.getByRole('button', { name: `${copy.compose.join}: ${second}` }).click();
  await expect(filled(page)).toHaveCount(6); // two draws, two dots, no bonus

  const joined = await field(page, 2).inputValue();
  await field(page, 2).fill(`${joined[0].toUpperCase()}${joined.slice(1)}9`); // capital and a digit
  await expect(filled(page)).toHaveCount(6);

  await field(page, 2).fill(joined.slice(0, -1)); // the third drawn word loses its last letter
  await expect(dot(page)).toHaveCount(12);
  await expect(filled(page)).toHaveCount(5);
  await expect(dot(page).nth(4)).toHaveClass(/\bon\b/); // filled from the start, short of the mark
  await expect(dot(page).nth(5)).not.toHaveClass(/\bon\b/);
  await expect(count(page)).toHaveText(copy.compose.strengthCount(5, 6));
  await goRemember(page);
  await expect(caution(page)).toHaveText(copy.generate.guidance.short);
});

test('a four-word phrase fills four of twelve dots, short of the recommended mark', async ({ page, context }) => {
  await reachCompose(page, context, 4);
  await expect(dot(page)).toHaveCount(12);
  await expect(filled(page)).toHaveCount(4);
  await expect(count(page)).toHaveText(copy.compose.strengthCount(4, 4));
  await expect(random(page).getByText(copy.generate.guidance.short)).toBeVisible();
});

test('a four-word phrase carries the caution without opening the details', async ({ page, context }) => {
  await reachCompose(page, context, 4);
  await goRemember(page);
  await expect(caution(page)).toBeVisible();
  await expect(caution(page)).toHaveText(copy.generate.guidance.short);
  await expect(caution(page).locator('svg')).toHaveCount(1);
});

test('with every word rewritten, Make it yours says it cannot estimate the strength', async ({ page, context }) => {
  await reachCompose(page, context);
  for (let n = 1; n <= 6; n++) await field(page, n).fill(`Qz${n}`);
  await expect(filled(page)).toHaveCount(0);
  await expect(dot(page)).toHaveCount(12);
  await random(page).locator('details.counts summary').click();
  await expect(random(page).getByText(copy.compose.strengthNone)).toBeVisible();
  await expect(random(page).getByText(copy.compose.strengthWhy('7,776'))).toHaveCount(0);
  await goRemember(page);
  await expect(caution(page)).toHaveText(copy.generate.guidance.tooFew);
});

test('Want to know more? is optional reading after the recovery copy, about managers and 2FA', async ({ page, context }) => {
  await reachCompose(page, context, 4);
  await goRemember(page);
  const more = page.locator('details.more');
  await expect(more).not.toHaveAttribute('open');
  await expect(caution(page)).toBeVisible(); // nothing consequential waits behind it
  for (const line of copy.remember.recovery) await expect(page.getByText(line)).toBeVisible();
  const recoveryBelow = await page.getByRole('heading', { name: copy.remember.recoveryTitle }).boundingBox();
  expect((await more.boundingBox())!.y).toBeGreaterThan(recoveryBelow!.y);

  await more.locator('summary').click();
  await expect(more.getByRole('heading', { name: copy.remember.managersTitle })).toBeVisible();
  await expect(more.getByRole('heading', { name: copy.remember.twoFactorTitle })).toBeVisible();
  await expect(more.getByText('Rememberphrase is not a password manager and does not keep your phrase.')).toBeVisible();
});

// Checks that one phrase state drives everything: the Make it Yours random-word count and login checklist,
// then in Remember the rule reminder and the exact string practice accepts. It leaves a
// wrong attempt behind each time, so the next visit proves an old attempt never survives a change.
async function checkEverywhere(page: Page, s: { intact: number; connectors: number; spaces: boolean }) {
  const phrase = await page.getByTestId('phrase-preview').innerText();
  await expect(count(page)).toHaveText(copy.compose.strengthCount(s.intact, 6));
  await expect(page.locator('details.requirements .status')).toHaveText(copy.requirements.summary(s.spaces ? 0 : 1, 1));
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await expect(entry(page)).toHaveValue('');
  await expect(page.getByText(copy.remember.rulesUnmet(1))).toHaveCount(s.spaces ? 1 : 0);
  await entry(page).fill(phrase);
  await expect(result(page)).toHaveText(copy.remember.match);
  await entry(page).fill(`${phrase}x`);
  await page.getByRole('button', { name: copy.remember.back }).click();
  return phrase;
}

test('every change in Make it Yours or Generate reaches the counts, the login check, the strength details and practice together', async ({ page, context }) => {
  test.slow(); // eleven round trips between Make it Yours and Remember
  await reachCompose(page, context);
  await page.locator('details.requirements summary').click();
  await page.getByLabel(copy.requirements.options.noSpaces).check();
  const seen = [await checkEverywhere(page, { intact: 6, connectors: 0, spaces: true })];
  const changed = async (s: Parameters<typeof checkEverywhere>[1]) => {
    const phrase = await checkEverywhere(page, s);
    expect(seen.at(-1)).not.toBe(phrase);
    seen.push(phrase);
  };

  await page.locator('[data-handle]').first().press('ArrowRight'); // reorder
  await changed({ intact: 6, connectors: 0, spaces: true });
  const first = await field(page, 1).inputValue();
  await page.getByRole('button', { name: `${copy.compose.join}: ${first}` }).click();
  await changed({ intact: 6, connectors: 0, spaces: true });
  await page.getByRole('button', { name: `${copy.compose.split}: ${await field(page, 1).inputValue()}` }).click();
  await changed({ intact: 6, connectors: 0, spaces: true });
  await field(page, 2).fill(`${await field(page, 2).inputValue()}9`); // dressed up: still random
  await changed({ intact: 6, connectors: 0, spaces: true });
  await page.getByRole('button', { name: 'the', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('the', 2) }).click();
  await page.getByLabel(copy.compose.typeAdded).check();
  await changed({ intact: 6, connectors: 1, spaces: true });
  await page.getByRole('radio', { name: copy.compose.separators.hyphen }).check();
  await changed({ intact: 6, connectors: 1, spaces: false });
  await page.getByRole('button', { name: copy.compose.remove('the') }).click();
  await changed({ intact: 6, connectors: 0, spaces: false });
  await field(page, 3).fill('Qzv'); // replaced
  await changed({ intact: 5, connectors: 0, spaces: false });

  await page.getByRole('button', { name: copy.compose.reset }).click();
  expect(await checkEverywhere(page, { intact: 6, connectors: 0, spaces: true })).toBe(seen[0]);

  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.newWords }).click(); // no edits left, so no warning
  await page.getByRole('button', { name: copy.generate.continue }).click();
  expect(await checkEverywhere(page, { intact: 6, connectors: 0, spaces: true })).not.toBe(seen[0]);
});

test('the clear icon empties the field and keeps focus in it', async ({ page, context }) => {
  await reachRemember(page, context);
  await expect(page.getByRole('button', { name: copy.remember.clearEntry })).toHaveCount(0);
  await entry(page).fill('some text');
  await page.getByRole('button', { name: copy.remember.clearEntry }).click();
  await expect(entry(page)).toHaveValue('');
  await expect(entry(page)).toBeFocused();
});

test('after Clear phrase, the page explains how to remove what the browser may keep', async ({ page, context }) => {
  await reachRemember(page, context);
  await page.getByRole('button', { name: copy.remember.clear }).click();
  await page.getByRole('alertdialog', { name: copy.warn.clearTitle }).getByRole('button', { name: copy.warn.clearConfirm }).click();
  await expect(page.getByRole('heading', { name: copy.remember.clearedTipsTitle })).toBeVisible();
  for (const tip of copy.remember.clearedTips) await expect(page.getByText(tip)).toBeVisible();
});

test('practising makes no requests, stores nothing and has no form; narrow screens work and pass accessibility checks', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const phrase = await reachRemember(page, context);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await reveal(page).click();
  await entry(page).fill(phrase);
  await eye(page).click();
  await expect(result(page)).toHaveText(copy.remember.match);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length)).toBe(0);
  await expect(page.locator('form')).toHaveCount(0);
  await expect(entry(page)).toHaveAttribute('autocomplete', 'off');
  await expect(entry(page)).toHaveAttribute('spellcheck', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
