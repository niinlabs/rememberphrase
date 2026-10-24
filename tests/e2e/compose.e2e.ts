import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';

// WP02 slice 3 browser fixtures: Make it Yours.
const preview = (page: Page) => page.getByTestId('phrase-preview');
const tiles = (page: Page) => page.getByRole('list', { name: copy.compose.tilesLabel }).locator('li.token');
const handle = (page: Page, text: string) => page.getByRole('button', { name: copy.compose.handle(text), exact: true });
const field = (page: Page, n: number) => page.getByRole('textbox', { name: new RegExp(`^${copy.compose.wordLabel(n)},`) });

async function reachCompose(page: Page, context: BrowserContext) {
  await page.goto('/');
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  await page.getByRole('button', { name: copy.generate.generate }).click();
  const words = (await page.locator('.tiles .word').allInnerTexts()).map((w) => w.trim());
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.compose.heading })).toBeFocused();
  return words;
}

// Lets a test make the random source throw on demand (window.failRandom), after preparation succeeded.
function failableRandom() {
  const real = crypto.getRandomValues.bind(crypto);
  (window as unknown as { failRandom: boolean }).failRandom = false;
  crypto.getRandomValues = ((array: Uint32Array<ArrayBuffer>) => {
    if ((window as unknown as { failRandom: boolean }).failRandom) throw new Error('random source failed');
    return real(array);
  }) as typeof crypto.getRandomValues;
}

// Drags with real pointer events from one element's centre to just before another's left edge.
async function dragTo(page: Page, from: Locator, before: Locator) {
  await from.scrollIntoViewIfNeeded();
  const a = (await from.boundingBox())!;
  const b = (await before.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 4, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test('the preview starts as the generated words, in order, separated by spaces', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await expect(preview(page)).toHaveText(words.join(' '));
  await expect(tiles(page)).toHaveCount(6);
  await expect(page.getByText(copy.compose.counts(6, 6, 0, words.join(' ').length))).toBeVisible();
  await expect(page.getByRole('button', { name: copy.compose.reset })).toBeDisabled();
});

test('the exact phrase and the separator choice come before the editable words', async ({ page, context }) => {
  await reachCompose(page, context);
  const tops = await page.evaluate(() =>
    ['[data-testid="phrase-preview"]', 'fieldset.separators', 'ol.tokens', 'section.tray'].map(
      (s) => document.querySelector(s)!.getBoundingClientRect().top,
    ),
  );
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
});

test('editing a word updates the preview and its origin; invalid edits are refused with a reason', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  const first = field(page, 1);
  await first.fill(`${words[0].toUpperCase()}1!`);
  await expect(preview(page)).toHaveText([`${words[0].toUpperCase()}1!`, ...words.slice(1)].join(' '));
  await expect(tiles(page).first()).toContainText(copy.compose.origin.edited);
  await expect(page.getByText(copy.compose.editedNote)).toBeVisible();

  await first.fill('zzqx');
  await expect(tiles(page).first()).toContainText(copy.compose.origin.rewritten);

  await first.fill('');
  await expect(page.getByText(copy.compose.wordErrors.empty)).toBeVisible();
  await expect(first).toHaveAttribute('aria-invalid', 'true');
  await expect(preview(page)).toHaveText(['zzqx', ...words.slice(1)].join(' ')); // last valid text stays

  await first.fill(words[0]);
  await expect(tiles(page).first()).toContainText(copy.compose.origin.unchanged);
  await expect(page.getByText(copy.compose.editedNote)).toHaveCount(0);
});

test('words move with the arrow keys and the move is announced', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await handle(page, words[0]).focus();
  await page.keyboard.press('ArrowRight');
  await expect(preview(page)).toHaveText([words[1], words[0], ...words.slice(2)].join(' '));
  await expect(handle(page, words[0])).toBeFocused();
  await expect(page.getByText(copy.compose.moved(words[0], 2, 6))).toBeAttached();
});

test('words move by selecting them and choosing a spot, without dragging', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await handle(page, words[5]).click();
  await expect(page.getByText(copy.compose.placingWord(words[5]))).toBeVisible();
  await page.getByRole('button', { name: copy.compose.moveHere(1) }).click();
  await expect(preview(page)).toHaveText([words[5], ...words.slice(0, 5)].join(' '));
});

test('words move by dragging the handle', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await dragTo(page, handle(page, words[0]), tiles(page).nth(3));
  await expect(preview(page)).toHaveText([words[1], words[2], words[0], ...words.slice(3)].join(' '));
});

test('two words join into one and split back; an edited join cannot be split', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await page.getByRole('button', { name: `${copy.compose.join}: ${words[0]}` }).click();
  await expect(preview(page)).toHaveText([words[0] + words[1], ...words.slice(2)].join(' '));
  await expect(tiles(page).first()).toContainText(copy.compose.origin.combined);
  await expect(page.getByText(copy.compose.counts(6, 6, 0, (words[0] + words[1] + ' ' + words.slice(2).join(' ')).length))).toBeVisible();
  await page.getByRole('button', { name: `${copy.compose.split}: ${words[0] + words[1]}` }).click();
  await expect(preview(page)).toHaveText(words.join(' '));

  await page.getByRole('button', { name: `${copy.compose.join}: ${words[0]}` }).click();
  await field(page, 1).fill(`${words[0]}${words[1]}7`);
  await expect(page.getByRole('button', { name: new RegExp(`^${copy.compose.split}:`) })).toHaveCount(0);
});

test('connecting words insert by selecting or dragging, never count as random, and can be removed', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); // the tray and the tiles both in view, as when a user drags
  const words = await reachCompose(page, context);
  const tray = page.getByRole('region', { name: copy.compose.connectorsTitle });
  await tray.getByRole('button', { name: 'with', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('with', 2) }).click();
  await expect(preview(page)).toHaveText([words[0], 'with', ...words.slice(1)].join(' '));

  await dragTo(page, tray.getByRole('button', { name: 'under', exact: true }), tiles(page).nth(4));
  await expect(preview(page)).toHaveText([words[0], 'with', words[1], words[2], 'under', ...words.slice(3)].join(' '));
  await expect(page.getByText(/^6 of 6 random words unchanged · 2 connecting words/)).toBeVisible();

  await page.getByRole('button', { name: copy.compose.remove('with') }).click();
  await expect(preview(page)).toHaveText([words[0], words[1], words[2], 'under', ...words.slice(3)].join(' '));
});

test('every separator changes the exact string', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  for (const [key, char] of [['hyphen', '-'], ['period', '.'], ['underscore', '_'], ['space', ' ']] as const) {
    await page.getByRole('radio', { name: copy.compose.separators[key] }).check();
    await expect(preview(page)).toHaveText(words.join(char));
  }
});

test('Reset my changes restores the generated words without new draws', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await field(page, 2).fill('');
  await field(page, 1).fill('Changed');
  await page.getByRole('radio', { name: copy.compose.separators.hyphen }).check();
  await page.getByRole('region', { name: copy.compose.connectorsTitle }).getByRole('button', { name: 'and', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('and', 1) }).click();
  await page.getByRole('button', { name: copy.compose.reset }).click();
  await expect(preview(page)).toHaveText(words.join(' '));
  await expect(field(page, 2)).toHaveValue(words[1]); // the field that held an invalid edit shows the word again
  await expect(page.getByRole('button', { name: copy.compose.reset })).toBeDisabled();
});

test('Back keeps the draft; a reroll then warns before replacing it', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await field(page, 1).fill('Mine');
  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(preview(page)).toHaveText(['Mine', ...words.slice(1)].join(' '));

  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.newWords }).click();
  const warn = page.getByRole('alertdialog', { name: copy.warn.discardTitle });
  await expect(warn.getByRole('button', { name: copy.warn.cancel })).toBeFocused();
  await warn.getByRole('button', { name: copy.warn.cancel }).click();
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(preview(page)).toHaveText(['Mine', ...words.slice(1)].join(' '));

  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.newWords }).click();
  await page.getByRole('alertdialog', { name: copy.warn.discardTitle }).getByRole('button', { name: copy.warn.discardConfirm }).click();
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(preview(page)).not.toContainText('Mine');
});

test('Start fresh warns, then draws a new set and returns to Generate', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await page.getByRole('button', { name: copy.compose.startFresh }).click();
  await page.getByRole('alertdialog', { name: copy.warn.freshTitle }).getByRole('button', { name: copy.warn.freshConfirm }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.generate.heading })).toBeVisible();
  const fresh = (await page.locator('.tiles .word').allInnerTexts()).map((w) => w.trim());
  expect(fresh).toHaveLength(6);
  expect(fresh).not.toEqual(words);
});

test('locks show on Make it Yours but do not stop editing', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.lock(words[2]) }).click();
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(tiles(page).nth(2)).toContainText(copy.compose.lockedNote);
  await field(page, 3).fill(`${words[2]}!`);
  await expect(preview(page)).toContainText(`${words[2]}!`);
});

test('removing a selected connecting word clears the selection without errors', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const words = await reachCompose(page, context);
  await page.getByRole('region', { name: copy.compose.connectorsTitle }).getByRole('button', { name: 'with', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('with', 2) }).click();
  await handle(page, 'with').click(); // select the inserted connector for moving
  await expect(page.getByText(copy.compose.placingWord('with'))).toBeVisible();
  await page.getByRole('button', { name: copy.compose.remove('with') }).click();
  await expect(preview(page)).toHaveText(words.join(' '));
  // The selection itself is gone, not just its text: no Cancel and no "Move here" spots remain.
  await expect(page.getByRole('button', { name: copy.compose.cancelPlacing })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Move here/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a word edited before joining can still be split, keeping the edit', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await field(page, 1).fill(`${words[0]}1`);
  await page.getByRole('button', { name: `${copy.compose.join}: ${words[0]}1` }).click();
  await page.getByRole('button', { name: `${copy.compose.split}: ${words[0]}1${words[1]}` }).click();
  await expect(preview(page)).toHaveText([`${words[0]}1`, ...words.slice(1)].join(' '));
});

test('joining edited words that spell the original never restores random-word credit', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  // Move the second word's first letter onto the first word, as in "dinghyg" + "eranium".
  await field(page, 1).fill(words[0] + words[1][0]);
  await field(page, 2).fill(words[1].slice(1));
  const joined = words[0] + words[1];
  const length = [joined, ...words.slice(2)].join(' ').length;
  await expect(page.getByText(copy.compose.counts(4, 6, 0, words.join(' ').length))).toBeVisible();
  await page.getByRole('button', { name: `${copy.compose.join}: ${words[0] + words[1][0]}` }).click();
  await expect(preview(page)).toHaveText([joined, ...words.slice(2)].join(' '));
  await expect(page.getByText(copy.compose.counts(4, 6, 0, length))).toBeVisible();
  await expect(tiles(page).first()).toContainText(copy.compose.origin.edited);
});

test('an invalid edit on its own can be reset', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await field(page, 2).fill('');
  const reset = page.getByRole('button', { name: copy.compose.reset });
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(field(page, 2)).toHaveValue(words[1]);
  await expect(reset).toBeDisabled();
});

test('a character inserted between the original letters counts as an edit', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await field(page, 1).fill(`${words[0].slice(0, 2)}1${words[0].slice(2)}`);
  await expect(tiles(page).first()).toContainText(copy.compose.origin.edited);
});

test('a failed Start fresh keeps the phrase, returns to Generate and holds drawing', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(failableRandom);
  const words = await reachCompose(page, context);
  await page.evaluate(() => ((window as unknown as { failRandom: boolean }).failRandom = true));
  await page.getByRole('button', { name: copy.compose.startFresh }).click();
  await page.getByRole('alertdialog', { name: copy.warn.freshTitle }).getByRole('button', { name: copy.warn.freshConfirm }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.generate.heading })).toBeVisible();
  await expect(page.getByTestId('status-band')).toContainText(copy.band['local-check-failed']);
  expect((await page.locator('.tiles .word').allInnerTexts()).map((w) => w.trim())).toEqual(words);
  expect(errors).toEqual([]);
});

test('composing makes no requests and stores nothing; narrow screens work and pass accessibility checks', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const words = await reachCompose(page, context);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await field(page, 1).fill(`${words[0]}9`);
  await page.getByRole('button', { name: `${copy.compose.join}: ${words[1]}` }).click();
  await page.getByRole('radio', { name: copy.compose.separators.period }).check();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
