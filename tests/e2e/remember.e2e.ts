import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';
import { startAtStep1 } from './start';

// WP03 slice 1 browser fixtures: Remember, practise and clear. The phrase is a fresh random draw in
// a test browser, never a real secret, and nothing here prints it.
const entry = (page: Page) => page.getByLabel(copy.remember.attemptLabel, { exact: true });
const eye = (page: Page) => page.getByRole('button', { name: /^(Show|Hide) entry$/ });
const result = (page: Page) => page.locator('.result');
const reveal = (page: Page) => page.getByRole('button', { name: /^(Show|Hide) phrase$/ });
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

test('Make it Yours leads to Remember: tips, the guidance and recovery show, and the phrase starts hidden', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  await expect(page.getByRole('navigation', { name: 'Progress' }).locator('[aria-current="step"]')).toContainText('Remember');
  for (const tip of copy.remember.tips) await expect(page.getByText(tip)).toBeVisible();
  await expect(page.getByText(copy.generate.guidance.recommended)).toBeVisible();
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

test('the check is exact: case and separators count, and a mismatch never shows the phrase', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  const check = page.getByRole('button', { name: copy.remember.check, exact: true });
  await expect(check).toBeDisabled();

  for (const wrong of [phrase.toUpperCase(), phrase.replaceAll(' ', '-'), `${phrase} `]) {
    await entry(page).fill(wrong);
    await check.click();
    await expect(result(page)).toHaveText(copy.remember.mismatch);
    await expect(page.getByTestId('reference-phrase')).toHaveCount(0);
  }
  await entry(page).fill(phrase);
  await expect(result(page)).toHaveText(''); // typing again clears the old result
  await entry(page).press('Enter');
  await expect(result(page)).toHaveText(copy.remember.match);
});

test('Try again clears the attempt and returns to the field', async ({ page, context }) => {
  await reachRemember(page, context);
  await entry(page).fill('not it');
  await page.getByRole('button', { name: copy.remember.check, exact: true }).click();
  await page.getByRole('button', { name: copy.remember.retry }).click();
  await expect(entry(page)).toHaveValue('');
  await expect(entry(page)).toBeFocused();
  await expect(result(page)).toHaveText('');
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
  await page.getByRole('radio', { name: copy.compose.separators.underscore }).check();
  const final = await page.getByTestId('phrase-preview').innerText();
  expect(final).not.toBe(plain);
  await page.getByRole('button', { name: copy.compose.continue }).click();

  const check = page.getByRole('button', { name: copy.remember.check, exact: true });
  await entry(page).fill(plain);
  await check.click();
  await expect(result(page)).toHaveText(copy.remember.mismatch);
  await entry(page).fill(final);
  await check.click();
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

const details = (page: Page) => page.locator('details.strength');
const caution = (page: Page) => page.locator('.guidance.caution');
const goRemember = async (page: Page) => {
  const phrase = await page.getByTestId('phrase-preview').innerText();
  await page.getByRole('button', { name: copy.compose.continue }).click();
  return phrase;
};

test('strength details start closed and explain the phrase from its draws, with no false precision', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  await expect(details(page)).not.toHaveAttribute('open');
  await expect(caution(page)).toHaveCount(0); // six intact words: guidance without the caution mark
  await details(page).locator('summary').click();
  await expect(details(page).getByText(copy.remember.strengthDraws(6, 6, '7,776'))).toBeVisible();
  await expect(details(page).getByText(copy.remember.strengthTyped(6, 6, [...phrase].length))).toBeVisible();
  await expect(details(page).getByText(copy.remember.strengthCaveat)).toBeVisible();
  for (const rule of copy.remember.strengthRules) await expect(details(page).getByText(rule)).toBeVisible();
  expect(await details(page).innerText()).not.toMatch(/\bbits?\b|crack|years|secure|2\^|\d+e\d+/i);
});

test('two joined words count as their two draws with no bonus, and editing the join removes their credit', async ({ page, context }) => {
  await reachCompose(page, context);
  const second = await field(page, 2).inputValue();
  await page.getByRole('button', { name: `${copy.compose.join}: ${second}` }).click();
  const phrase = await goRemember(page);
  await details(page).locator('summary').click();
  await expect(details(page).getByText(copy.remember.strengthDraws(6, 6, '7,776'))).toBeVisible();
  await expect(details(page).getByText(copy.remember.strengthTyped(6, 5, [...phrase].length))).toBeVisible();
  await expect(caution(page)).toHaveCount(0);

  await page.getByRole('button', { name: copy.remember.back }).click();
  await field(page, 2).fill(`${await field(page, 2).inputValue()}9`); // the joined word
  await goRemember(page);
  await expect(caution(page)).toHaveText(copy.generate.guidance.short);
  await details(page).locator('summary').click();
  await expect(details(page).getByText(copy.remember.strengthDraws(4, 6, '7,776'))).toBeVisible();
});

test('a four-word phrase carries the caution without opening the details', async ({ page, context }) => {
  await reachCompose(page, context, 4);
  await goRemember(page);
  await expect(caution(page)).toBeVisible();
  await expect(caution(page)).toHaveText(copy.generate.guidance.short);
  await expect(caution(page).locator('svg')).toHaveCount(1);
});

test('with every word rewritten, the page says it cannot estimate the strength', async ({ page, context }) => {
  await reachCompose(page, context);
  for (let n = 1; n <= 6; n++) await field(page, n).fill(`Qz${n}`);
  await goRemember(page);
  await expect(caution(page)).toHaveText(copy.generate.guidance.tooFew);
  await details(page).locator('summary').click();
  await expect(details(page).getByText(copy.remember.strengthNone)).toBeVisible();
  await expect(details(page).getByText(/random words are exactly as drawn/)).toHaveCount(0);
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

// Checks that one phrase state drives everything: the Make it Yours counts and login checklist, then in
// Remember the rule reminder, the strength details and the exact string practice accepts. It leaves a
// wrong attempt behind each time, so the next visit proves an old attempt never survives a change.
async function checkEverywhere(page: Page, s: { intact: number; typed: number; connectors: number; spaces: boolean }) {
  const phrase = await page.getByTestId('phrase-preview').innerText();
  const chars = [...phrase].length;
  await expect(page.getByText(copy.compose.counts(s.intact, 6, s.connectors, chars))).toBeVisible();
  await expect(page.locator('details.requirements .status')).toHaveText(copy.requirements.summary(s.spaces ? 0 : 1, 1));
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await expect(entry(page)).toHaveValue('');
  await expect(page.getByText(copy.remember.rulesUnmet(1))).toHaveCount(s.spaces ? 1 : 0);
  await details(page).locator('summary').click();
  await expect(details(page).getByText(copy.remember.strengthDraws(s.intact, 6, '7,776'))).toBeVisible();
  await expect(details(page).getByText(copy.remember.strengthTyped(6, s.typed, chars))).toBeVisible();
  await entry(page).fill(phrase);
  await page.getByRole('button', { name: copy.remember.check, exact: true }).click();
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
  const seen = [await checkEverywhere(page, { intact: 6, typed: 6, connectors: 0, spaces: true })];
  const changed = async (s: Parameters<typeof checkEverywhere>[1]) => {
    const phrase = await checkEverywhere(page, s);
    expect(seen.at(-1)).not.toBe(phrase);
    seen.push(phrase);
  };

  await page.locator('[data-handle]').first().press('ArrowRight'); // reorder
  await changed({ intact: 6, typed: 6, connectors: 0, spaces: true });
  const first = await field(page, 1).inputValue();
  await page.getByRole('button', { name: `${copy.compose.join}: ${first}` }).click();
  await changed({ intact: 6, typed: 5, connectors: 0, spaces: true });
  await page.getByRole('button', { name: `${copy.compose.split}: ${await field(page, 1).inputValue()}` }).click();
  await changed({ intact: 6, typed: 6, connectors: 0, spaces: true });
  await field(page, 2).fill(`${await field(page, 2).inputValue()}9`); // partial edit
  await changed({ intact: 5, typed: 6, connectors: 0, spaces: true });
  await page.getByRole('button', { name: 'the', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('the', 2) }).click();
  await changed({ intact: 5, typed: 7, connectors: 1, spaces: true });
  await page.getByRole('radio', { name: copy.compose.separators.hyphen }).check();
  await changed({ intact: 5, typed: 7, connectors: 1, spaces: false });
  await page.getByRole('button', { name: copy.compose.remove('the') }).click();
  await changed({ intact: 5, typed: 6, connectors: 0, spaces: false });
  await field(page, 3).fill('Qzv'); // full rewrite
  await changed({ intact: 4, typed: 6, connectors: 0, spaces: false });

  await page.getByRole('button', { name: copy.compose.reset }).click();
  expect(await checkEverywhere(page, { intact: 6, typed: 6, connectors: 0, spaces: true })).toBe(seen[0]);

  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.newWords }).click(); // no edits left, so no warning
  await page.getByRole('button', { name: copy.generate.continue }).click();
  expect(await checkEverywhere(page, { intact: 6, typed: 6, connectors: 0, spaces: true })).not.toBe(seen[0]);
});

test('Check as I type says wrong, too short and too long as you go, in red and green, and disables Check', async ({ page, context }) => {
  const phrase = await reachRemember(page, context);
  const live = page.getByTestId('practice-result');
  await page.getByLabel(copy.remember.autoCheck).check();
  await expect(page.getByRole('button', { name: copy.remember.check, exact: true })).toBeDisabled();
  await entry(page).fill(phrase.slice(0, 3));
  await expect(live).toHaveText(copy.remember.live.short);
  await entry(page).fill(`${phrase.slice(0, 3)}#`);
  await expect(live).toHaveText(copy.remember.live.wrong);
  await expect(live).toHaveClass(/wrong/);
  await entry(page).fill(phrase);
  await expect(live).toHaveText(copy.remember.match);
  await expect(live).toHaveCSS('color', 'rgb(30, 111, 55)'); // --green
  await expect(live.locator('svg')).toHaveCount(1); // never colour alone
  await entry(page).fill(`${phrase}x`);
  await expect(live).toHaveText(copy.remember.live.long);
  await expect(live).toHaveCSS('color', 'rgb(180, 35, 24)'); // --red
  await expect(page.getByTestId('reference-phrase')).toHaveCount(0); // live checking never reveals the phrase

  await page.getByLabel(copy.remember.autoCheck).uncheck();
  await expect(live).toHaveText('');
  await entry(page).press('Enter');
  await expect(live).toHaveText(copy.remember.mismatch);
  await expect(live).toHaveCSS('color', 'rgb(180, 35, 24)');
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
  await entry(page).press('Enter');
  await expect(result(page)).toHaveText(copy.remember.match);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length)).toBe(0);
  await expect(page.locator('form')).toHaveCount(0);
  await expect(entry(page)).toHaveAttribute('autocomplete', 'off');
  await expect(entry(page)).toHaveAttribute('spellcheck', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
