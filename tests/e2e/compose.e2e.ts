import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';
import { startAtStep1 } from './start';

// WP02 slice 3 browser fixtures: Make it Yours.
const preview = (page: Page) => page.getByTestId('phrase-preview');
const story = (page: Page) => page.getByTestId('story-preview');
const tiles = (page: Page) => page.getByRole('list', { name: copy.compose.tilesLabel }).locator('li.token');
// Tile buttons carry the position after the word (2026-11-18), so match the word and any position.
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const removeName = (text: string) => new RegExp(`^Remove ${escapeRe(text)}, position \\d+$`);
const handle = (page: Page, text: string) =>
  page.getByRole('button', { name: new RegExp(`^Move ${escapeRe(text)}, position \\d+$`) });
const field = (page: Page, n: number) => page.getByRole('textbox', { name: new RegExp(`^${copy.compose.wordLabel(n)},`) });

async function reachCompose(page: Page, context: BrowserContext, count = 6) {
  await startAtStep1(page);
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  for (let i = 6; i < count; i++) await page.getByRole('button', { name: copy.generate.more }).click();
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

// Scrolls so both ends of a drag are fully on screen. Playwright's Firefox drops pointer moves outside
// the window, and a target that is only partly visible can have its centre just below the edge.
async function showBoth(page: Page, a: Locator, b: Locator) {
  const spans = await Promise.all(
    [a, b].map((l) => l.evaluate((el) => [el.getBoundingClientRect().top + scrollY, el.getBoundingClientRect().bottom + scrollY])),
  );
  const middle = (Math.min(spans[0][0], spans[1][0]) + Math.max(spans[0][1], spans[1][1])) / 2;
  await page.evaluate((y) => window.scrollTo({ top: y - innerHeight / 2, behavior: 'instant' }), middle);
}

// Drags with real pointer events from one element's centre to just before another's left edge.
async function dragTo(page: Page, from: Locator, before: Locator) {
  await showBoth(page, from, before);
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
  await expect(page.getByTestId('random-words').locator('.count')).toHaveText(copy.compose.strengthCount(6, 6)); // dressed up, still random (D8 as amended)

  await first.fill('zzqx');
  await expect(tiles(page).first()).toContainText(copy.compose.origin.rewritten);
  await expect(page.getByTestId('random-words').locator('.count')).toHaveText(copy.compose.strengthCount(5, 6));

  await first.fill('');
  await expect(page.getByText(copy.compose.wordErrors.empty)).toBeVisible();
  await expect(first).toHaveAttribute('aria-invalid', 'true');
  await expect(preview(page)).toHaveText(['zzqx', ...words.slice(1)].join(' ')); // last valid text stays

  await first.fill(words[0]);
  await expect(tiles(page).first()).toContainText(copy.compose.origin.unchanged);
  await expect(page.getByTestId('random-words').locator('.count')).toHaveText(copy.compose.strengthCount(6, 6));
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
  await page.getByRole('button', { name: `${copy.compose.split}: ${words[0] + words[1]}` }).click();
  await expect(preview(page)).toHaveText(words.join(' '));

  await page.getByRole('button', { name: `${copy.compose.join}: ${words[0]}` }).click();
  await field(page, 1).fill(`${words[0]}${words[1]}7`);
  await expect(page.getByRole('button', { name: new RegExp(`^${copy.compose.split}:`) })).toHaveCount(0);
});

test('connecting words insert by selecting or dragging, never count as random, and can be removed', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); // the tray and the tiles both in view, as when a user drags
  const words = await reachCompose(page, context);
  await expect(story(page)).toHaveCount(0); // nothing added yet
  const tray = page.getByRole('region', { name: copy.compose.connectorsTitle });
  await tray.getByRole('button', { name: 'with', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('with', 2) }).click();
  await expect(story(page)).toHaveText([words[0], 'with', ...words.slice(1)].join(' '));

  await dragTo(page, tray.getByRole('button', { name: 'under', exact: true }), tiles(page).nth(4));
  const withBoth = [words[0], 'with', words[1], words[2], 'under', ...words.slice(3)].join(' ');
  await expect(story(page)).toHaveText(withBoth);
  await expect(story(page).locator('.added')).toHaveText(['with', 'under']); // set apart from the random words

  await page.getByRole('button', { name: removeName('with') }).click();
  await expect(story(page)).toHaveText([words[0], words[1], words[2], 'under', ...words.slice(3)].join(' '));
});

test('connecting words only help recall unless the user chooses to type them; the story stays under the phrase', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  const typeAdded = page.getByLabel(copy.compose.typeAdded);
  await expect(typeAdded).not.toBeChecked();
  await page.getByRole('region', { name: copy.compose.connectorsTitle }).getByRole('button', { name: 'and', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('and', 2) }).click();
  const withAnd = [words[0], 'and', ...words.slice(1)].join(' ');
  await expect(preview(page)).toHaveText(words.join(' '));
  await expect(story(page)).toHaveText(withAnd);
  await page.getByRole('radio', { name: copy.compose.separators.hyphen }).check();
  await expect(preview(page)).toHaveText(words.join('-'));
  await expect(story(page)).toHaveText(withAnd); // the story always uses spaces
  await page.getByRole('radio', { name: copy.compose.separators.space }).check();

  await typeAdded.check();
  await expect(preview(page)).toHaveText(withAnd);
  await expect(story(page)).toHaveCount(0); // the phrase itself now shows them

  await page.getByRole('button', { name: copy.compose.reset }).click();
  await expect(typeAdded).not.toBeChecked();
  await expect(story(page)).toHaveCount(0);
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

test('after Back, a higher count adds a word to the end of the draft without a warning; a lower one warns', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await field(page, 1).fill('Mine');
  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.more }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const seven = (await page.locator('.tiles .word').allInnerTexts()).map((w) => w.trim());
  expect(seven.slice(0, 6)).toEqual(words);
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(preview(page)).toHaveText(['Mine', ...seven.slice(1)].join(' '));

  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.fewer }).click();
  await expect(page.getByRole('alertdialog', { name: copy.warn.discardTitle })).toBeVisible();
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

test('locks from Generate are not shown on Make it Yours and do not stop editing', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await page.getByRole('button', { name: copy.compose.back }).click();
  await page.getByRole('button', { name: copy.generate.lock(3, words[2]) }).click();
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(tiles(page).nth(2)).not.toContainText('Locked');
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
  await page.getByRole('button', { name: removeName('with') }).click();
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

test('joining words whose letters were moved between them reads as the two drawn words again (D8 as amended)', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  // Move the second word's first letter onto the first word, as in "dinghyg" + "eranium".
  await field(page, 1).fill(words[0] + words[1][0]);
  await field(page, 2).fill(words[1].slice(1));
  const joined = words[0] + words[1];
  await page.getByRole('button', { name: `${copy.compose.join}: ${words[0] + words[1][0]}` }).click();
  await expect(preview(page)).toHaveText([joined, ...words.slice(2)].join(' '));
  await expect(tiles(page).first()).toContainText(copy.compose.origin.combined);
  await expect(page.getByTestId('random-words').locator('.count')).toHaveText(copy.compose.strengthCount(6, 6));
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

test('a character put inside a word splits it up, so it no longer counts as random (D8 as amended)', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await field(page, 1).fill(`${words[0].slice(0, 2)}-${words[0].slice(2)}`);
  await expect(tiles(page).first()).toContainText(copy.compose.origin.rewritten);
  await expect(page.getByTestId('random-words').locator('.count')).toHaveText(copy.compose.strengthCount(5, 6));
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

test('on phones a slim copy of the exact phrase follows you once the preview scrolls away', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const words = await reachCompose(page, context);
  const sticky = page.getByTestId('sticky-phrase');
  await expect(sticky).toBeHidden(); // the preview itself is in view
  await page.locator('section.tray').scrollIntoViewIfNeeded();
  await expect(sticky).toBeVisible();
  await expect(sticky.locator('p')).toHaveText(await preview(page).innerText());
  await field(page, 6).fill(`${words[5]}!`);
  await expect(sticky.locator('p')).toHaveText([...words.slice(0, 5), `${words[5]}!`].join(' '));

  // Nothing the user works on ends up under the bar.
  const clearOfBar = async () => {
    const box = (await field(page, 3).boundingBox())!;
    const bar = await sticky.boundingBox(); // null when hidden
    return !bar || box.y >= bar.y + bar.height;
  };
  const toBottom = () => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  // Focus brings a field above the viewport back into view (browsers centre it).
  await toBottom();
  expect((await field(page, 3).boundingBox())!.y).toBeLessThan(0);
  await field(page, 3).focus();
  expect(await clearOfBar()).toBe(true);

  // Once the bar is showing, a scroll that aligns a field to the top stops below it, not under it.
  await toBottom();
  await expect(sticky).toBeVisible();
  await field(page, 3).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect(sticky).toBeVisible();
  expect(await clearOfBar()).toBe(true);
});

test('a long phrase makes the phone bar taller, and fields still stop below it', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await reachCompose(page, context, 12);
  for (const n of [1, 4, 7, 10]) await field(page, n).fill(`${n}`.padEnd(32, 'x'));
  const sticky = page.getByTestId('sticky-phrase');
  await page.locator('section.tray').scrollIntoViewIfNeeded();
  await expect(sticky).toBeVisible();
  const bar = (await sticky.boundingBox())!;
  expect(bar.height).toBeGreaterThan(150); // several lines, far past the old fixed 88 px padding
  for (const n of [9, 12]) {
    await field(page, n).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect(sticky).toBeVisible();
    expect((await field(page, n).boundingBox())!.y).toBeGreaterThanOrEqual(bar.y + bar.height);
  }
});

test('wider screens never show the sticky phrase bar', async ({ page, context }) => {
  await reachCompose(page, context);
  await page.locator('section.tray').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('sticky-phrase')).toBeHidden();
});

test('while dragging, a copy of the word follows the pointer and the other words make room live', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text())); // a CSP block would show here
  const from = handle(page, words[0]);
  await showBoth(page, from, tiles(page).nth(3)); // each step opens at the top, above the tiles
  const a = (await from.boundingBox())!;
  const b = (await tiles(page).nth(3).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 4, b.y + b.height / 2, { steps: 8 });

  await expect(page.locator('.ghost')).toHaveText(words[0]);
  await expect(page.locator('li.placeholder')).toHaveCount(1);
  // On screen, the tiles now read in the order the drop would produce.
  const boxes = await tiles(page).evaluateAll((els) =>
    els.map((el) => ({ id: (el as HTMLElement).dataset.id, top: el.getBoundingClientRect().top, left: el.getBoundingClientRect().left })),
  );
  boxes.sort((p, q) => (Math.abs(p.top - q.top) > 4 ? p.top - q.top : p.left - q.left));
  expect(boxes.map((x) => x.id)).toEqual(['w1', 'w2', 'w0', 'w3', 'w4', 'w5']);

  await page.mouse.up();
  await expect(page.locator('.ghost')).toHaveCount(0);
  await expect(preview(page)).toHaveText([words[1], words[2], words[0], ...words.slice(3)].join(' '));
  expect(errors).toEqual([]);
});

test('a word can be removed after a confirmation; Reset brings it back; the last word stays', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await page.getByRole('button', { name: removeName(words[2]) }).click();
  const warn = page.getByRole('alertdialog', { name: copy.warn.removeTitle(words[2]) });
  await expect(warn.getByRole('button', { name: copy.warn.cancel })).toBeFocused();
  await warn.getByRole('button', { name: copy.warn.cancel }).click();
  await expect(preview(page)).toHaveText(words.join(' '));

  await page.getByRole('button', { name: removeName(words[2]) }).click();
  await page.getByRole('alertdialog', { name: copy.warn.removeTitle(words[2]) }).getByRole('button', { name: copy.warn.removeConfirm }).click();
  const five = words.filter((_, i) => i !== 2);
  await expect(preview(page)).toHaveText(five.join(' '));

  await page.getByRole('button', { name: copy.compose.reset }).click();
  await expect(preview(page)).toHaveText(words.join(' '));

  for (const w of words.slice(1)) {
    await page.getByRole('button', { name: removeName(w) }).click();
    await page.getByRole('alertdialog', { name: copy.warn.removeTitle(w) }).getByRole('button', { name: copy.warn.removeConfirm }).click();
  }
  await expect(preview(page)).toHaveText(words[0]);
  await expect(page.getByRole('button', { name: removeName(words[0]) })).toHaveCount(0);
});

test('any number of words join into one, and Split separates them all again', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await page.getByRole('button', { name: `${copy.compose.join}: ${words[0]}` }).click();
  await page.getByRole('button', { name: `${copy.compose.join}: ${words[0] + words[1]}` }).click();
  const three = words[0] + words[1] + words[2];
  await expect(preview(page)).toHaveText([three, ...words.slice(3)].join(' '));
  await page.getByRole('button', { name: `${copy.compose.split}: ${three}` }).click();
  await expect(preview(page)).toHaveText(words.join(' '));
});

test('Nothing between words joins the whole phrase, and the new connecting words are offered', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await page.getByRole('radio', { name: copy.compose.separators.none }).check();
  await expect(preview(page)).toHaveText(words.join(''));
  const tray = page.getByRole('region', { name: copy.compose.connectorsTitle });
  for (const c of ['but', 'then', 'into', 'before']) await expect(tray.getByRole('button', { name: c, exact: true })).toBeVisible();
});

test('your own word is added at the end, moves and edits like a tile, and never counts as random', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  const own = page.getByLabel(copy.compose.ownLabel, { exact: true });
  const add = page.getByRole('button', { name: copy.compose.ownAdd, exact: true });
  await expect(add).toBeDisabled();
  await own.fill(' x');
  await add.click();
  await expect(page.getByText(copy.compose.wordErrors['edge-space'])).toBeVisible();
  await own.fill('my 2nd!');
  await own.press('Enter');
  await expect(own).toHaveValue('');
  await expect(preview(page)).toHaveText(words.join(' ')); // not typed unless the user chooses
  await page.getByLabel(copy.compose.typeAdded).check();
  await expect(preview(page)).toHaveText([...words, 'my 2nd!'].join(' '));
  await expect(page.getByTestId('random-words').locator('.count')).toHaveText(copy.compose.strengthCount(6, 6)); // nothing random was edited

  await handle(page, 'my 2nd!').press('ArrowLeft');
  await expect(preview(page)).toHaveText([...words.slice(0, 5), 'my 2nd!', words[5]].join(' '));
  await field(page, 6).fill('our 3rd!');
  await expect(preview(page)).toHaveText([...words.slice(0, 5), 'our 3rd!', words[5]].join(' '));
  await expect(tiles(page).nth(5)).toContainText(copy.compose.origin.own);

  await page.getByRole('button', { name: removeName('our 3rd!') }).click();
  await expect(preview(page)).toHaveText(words.join(' '));
  // The live region says what happened last, then empties, so it never keeps a word that left the phrase.
  const live = page.locator('p.visually-hidden[aria-live="polite"]');
  await expect(live).toHaveText(copy.compose.removed); // names no word, so the removed one is gone at once
  await expect(live).not.toContainText('our 3rd!');
  await expect(live).toHaveText('', { timeout: 8000 });
});

test('Reset my changes empties the live region at once', async ({ page, context }) => {
  await reachCompose(page, context);
  const own = page.getByLabel(copy.compose.ownLabel, { exact: true });
  await own.fill('pebble');
  await own.press('Enter');
  const live = page.locator('p.visually-hidden[aria-live="polite"]');
  await expect(live).toHaveText(copy.compose.ownAdded('pebble'));
  await page.getByRole('button', { name: copy.compose.reset }).click();
  await expect(live).toHaveText('');
});

test('Continue does not leave while an edit is invalid: it goes to the field instead', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await field(page, 2).fill('');
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.compose.heading })).toBeVisible();
  await expect(field(page, 2)).toBeFocused();
  await expect(page.getByText(copy.compose.wordErrors.empty)).toBeVisible();

  await field(page, 2).fill('Qzv');
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.remember.heading })).toBeFocused();
  await page.getByRole('button', { name: copy.remember.showPhrase }).click();
  await expect(page.getByTestId('reference-phrase')).toHaveText([words[0], 'Qzv', ...words.slice(2)].join(' '));
});

test('repeated words get different button names, told apart by position', async ({ page, context }) => {
  await reachCompose(page, context);
  for (const at of [1, 3]) {
    await page.getByRole('button', { name: 'and', exact: true }).click();
    await page.getByRole('button', { name: copy.compose.insertHere('and', at) }).click();
  }
  const names = await page.getByRole('button', { name: /^(Move|Remove) and, position \d+$/ }).evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  expect(names).toHaveLength(4);
  expect(new Set(names).size).toBe(4);
});

for (const width of [1280, 390]) {
  test(`at ${width}px a tile takes two columns only when its word would not fit in one, and the word always shows in full`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await reachCompose(page, context);
    const tile = tiles(page).first();
    const fitsField = () => field(page, 1).evaluate((el: HTMLInputElement) => el.scrollWidth <= el.clientWidth);
    await field(page, 1).fill('illiterates'); // eleven narrow letters: more than the old ten-character rule allowed
    if (width > 600) await expect(tile).not.toHaveClass(/\bwide\b/); // phone columns are too narrow to be sure
    expect(await fitsField()).toBe(true);
    await field(page, 1).fill('reappearingmammoth');
    await expect(tile).toHaveClass(/\bwide\b/);
    expect(await fitsField()).toBe(true);
  });
}

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
  // Hints that ask the browser and keyboard not to keep, restore, correct or learn what is typed.
  for (const [name, value] of [['autocomplete', 'off'], ['autocorrect', 'off'], ['autocapitalize', 'off'], ['spellcheck', 'false']])
    await expect(field(page, 2)).toHaveAttribute(name, value);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
