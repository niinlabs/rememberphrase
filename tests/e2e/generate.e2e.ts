import { readFileSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';

// WP02 slice 2 browser fixtures: the Generate step.
const LIST = new Set(readFileSync('public/wordlists/eff-large-en.txt', 'utf8').split('\n').filter(Boolean));

const tiles = (page: Page) => page.getByRole('list', { name: copy.generate.wordsLabel }).getByRole('listitem');
const shown = async (page: Page) => (await tiles(page).locator('.word').allInnerTexts()).map((w) => w.trim());
const primary = (page: Page) => page.getByRole('button', { name: /Generate random words|Generate new words|Reroll unlocked words/ });
const count = (page: Page) => page.locator('output');

async function reachGenerate(page: Page, context: BrowserContext) {
  await page.goto('/');
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.generate.heading })).toBeFocused();
}

async function generateWords(page: Page) {
  await page.getByRole('button', { name: copy.generate.generate }).click();
  await expect(tiles(page)).toHaveCount(6);
  return shown(page);
}

test('Continue leads to Generate; the default is six words from the list, made with no requests or storage', async ({ page, context }) => {
  await reachGenerate(page, context);
  await expect(page.getByRole('navigation', { name: 'Progress' }).locator('[aria-current="step"]')).toContainText('Generate');
  await expect(count(page)).toHaveText('6');
  await expect(page.getByText(copy.generate.guidance.recommended)).toBeVisible();

  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  const words = await generateWords(page);
  for (const w of words) expect(LIST.has(w), w).toBe(true);
  await page.getByRole('button', { name: copy.generate.newWords }).click();
  await expect.poll(() => shown(page)).not.toEqual(words);
  expect(requests).toEqual([]);

  const storage = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    indexedDB: (await indexedDB.databases()).length,
    caches: (await caches.keys()).length,
  }));
  expect(storage).toEqual({ local: 0, session: 0, indexedDB: 0, caches: 0 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('locked words keep their value and position through rerolls', async ({ page, context }) => {
  await reachGenerate(page, context);
  const before = await generateWords(page);
  await page.getByRole('button', { name: copy.generate.lock(before[1]) }).click();
  await page.getByRole('button', { name: copy.generate.lock(before[4]) }).click();
  await expect(page.getByRole('button', { name: copy.generate.lock(before[1]) })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: copy.generate.reroll(4) }).click();
  const after = await shown(page);
  expect([after[1], after[4]]).toEqual([before[1], before[4]]);
  expect([0, 2, 3, 5].every((i) => after[i] === before[i])).toBe(false); // four fresh draws
  for (const w of after) expect(LIST.has(w), w).toBe(true);
});

test('with every word locked, reroll is unavailable until a word is unlocked', async ({ page, context }) => {
  await reachGenerate(page, context);
  for (const w of await generateWords(page)) await page.getByRole('button', { name: copy.generate.lock(w) }).click();
  await expect(primary(page)).toBeDisabled();
  await expect(page.getByText(copy.generate.allLocked)).toBeVisible();
  await page.getByRole('button', { name: copy.generate.unlockAll }).click();
  await expect(page.getByRole('button', { name: copy.generate.newWords })).toBeEnabled();
});

test('the count runs from 4 to 12 with guidance, and raising keeps existing words and locks', async ({ page, context }) => {
  await reachGenerate(page, context);
  const fewer = page.getByRole('button', { name: copy.generate.fewer });
  const more = page.getByRole('button', { name: copy.generate.more });
  await fewer.click();
  await fewer.click();
  await expect(count(page)).toHaveText('4');
  await expect(fewer).toBeDisabled();
  await expect(page.getByText(copy.generate.guidance.short)).toBeVisible();
  await page.getByRole('button', { name: copy.generate.generate }).click();
  await expect(tiles(page)).toHaveCount(4);
  const before = await shown(page);
  await page.getByRole('button', { name: copy.generate.lock(before[0]) }).click();
  for (let i = 0; i < 8; i++) await more.click();
  await expect(count(page)).toHaveText('12');
  await expect(more).toBeDisabled();
  const after = await shown(page);
  expect(after).toHaveLength(12);
  expect(after.slice(0, 4)).toEqual(before);
  await expect(page.getByRole('button', { name: copy.generate.lock(before[0]) })).toHaveAttribute('aria-pressed', 'true');
});

test('lowering the count never removes a locked word', async ({ page, context }) => {
  await reachGenerate(page, context);
  for (const w of await generateWords(page)) await page.getByRole('button', { name: copy.generate.lock(w) }).click();
  await page.getByRole('button', { name: copy.generate.fewer }).click();
  await expect(page.getByText(copy.generate.unlocksNeeded(1, 5))).toBeVisible();
  await expect(tiles(page)).toHaveCount(6);
});

test('before the first draw there are no tiles or connecting words; afterwards the status collapses but keeps its reason', async ({ page, context }) => {
  await reachGenerate(page, context);
  const band = page.getByTestId('status-band');
  await expect(page.locator('.tiles, .tile')).toHaveCount(0);
  await expect(page.getByRole('region', { name: copy.compose.connectorsTitle })).toHaveCount(0);
  await expect(band).toContainText(copy.band.green);
  await expect(band.getByText(copy.band.details)).toHaveCount(0); // full explanation before words exist

  await generateWords(page);
  await expect(page.getByRole('region', { name: copy.compose.connectorsTitle })).toHaveCount(0);
  await expect(band).toContainText(copy.chip.green); // short reason stays visible
  await expect(band.getByText(copy.band.greenNote)).toBeHidden();
  await band.getByText(copy.band.details).click();
  await expect(band.getByText(copy.band.greenNote)).toBeVisible();
});

test('an allowed amber reason stays visible after drawing', async ({ page }) => {
  await page.route('**/reachability.txt?*', (route) => route.abort('internetdisconnected')); // browser still online
  await page.goto('/');
  await page.getByRole('button', { name: copy.list.action }).click();
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.generate.heading })).toBeFocused();
  await generateWords(page);
  await expect(page.getByTestId('status-band')).toContainText(`${copy.band.labels.caution}. ${copy.chip['browser-online']}`);
});

test('duplicate words are allowed and pointed out', async ({ page, context }) => {
  await page.addInitScript(() => {
    crypto.getRandomValues = ((array: Uint32Array<ArrayBuffer>) => array.fill(0)) as typeof crypto.getRandomValues;
  });
  await reachGenerate(page, context);
  await generateWords(page);
  await expect(page.getByText(copy.generate.duplicate)).toHaveCount(6); // every draw is the first word
});

test('reconnecting on Generate holds drawing; Acknowledge returns to Go offline and the words are kept', async ({ page, context }) => {
  await reachGenerate(page, context);
  const words = await generateWords(page);
  await context.setOffline(false);
  const alert = page.getByRole('alertdialog', { name: copy.interruption.title });
  await expect(alert).toContainText(copy.band.reconnected);
  await alert.getByRole('button', { name: copy.interruption.acknowledge }).click();
  await expect(page.getByLabel(copy.offline.confirmLabel)).toBeFocused();

  await context.setOffline(true);
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.generate.heading })).toBeFocused();
  expect(await shown(page)).toEqual(words); // the fresh check returned to Generate without a new draw
});

test('a failed draw holds drawing with a reason and a retry, and never changes the words shown', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const real = crypto.getRandomValues.bind(crypto);
    (window as unknown as { failRandom: boolean }).failRandom = false;
    crypto.getRandomValues = ((array: Uint32Array<ArrayBuffer>) => {
      if ((window as unknown as { failRandom: boolean }).failRandom) throw new Error('random source failed');
      return real(array);
    }) as typeof crypto.getRandomValues;
  });
  const fail = (on: boolean) => page.evaluate((v) => ((window as unknown as { failRandom: boolean }).failRandom = v), on);
  const band = page.getByTestId('status-band');
  const retry = page.getByRole('button', { name: copy.offline.retryCheck });
  await reachGenerate(page, context);

  // Initial generation fails: nothing appears, drawing is held, the reason and the retry are shown.
  await fail(true);
  await page.getByRole('button', { name: copy.generate.generate }).click();
  await expect(band).toContainText(copy.band['local-check-failed']);
  await expect(page.getByRole('button', { name: copy.generate.generate })).toBeDisabled();
  await expect(tiles(page)).toHaveCount(0);
  await retry.click(); // still failing: stays held
  await expect(band).toContainText(copy.band['local-check-failed']);
  await fail(false);
  await retry.click();
  await expect(band).toContainText(copy.band.green);
  const words = await generateWords(page);

  // A failing reroll or count increase leaves the words as they were.
  await fail(true);
  await page.getByRole('button', { name: copy.generate.newWords }).click();
  await expect(band).toContainText(copy.band['local-check-failed']);
  expect(await shown(page)).toEqual(words);
  await fail(false);
  await retry.click();
  await fail(true);
  await page.getByRole('button', { name: copy.generate.more }).click();
  await expect(band).toContainText(copy.band['local-check-failed']);
  await expect(count(page)).toHaveText('6');
  expect(await shown(page)).toEqual(words);
  expect(errors).toEqual([]);
});

test('Back keeps the words for when you return', async ({ page, context }) => {
  await reachGenerate(page, context);
  const words = await generateWords(page);
  await page.getByRole('button', { name: copy.generate.back }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.heading })).toBeFocused();
  await expect(page.getByTestId('status-band')).toHaveCount(0); // no duplicate ready card on Prepare
  await page.getByRole('button', { name: copy.ready.continue }).click();
  expect(await shown(page)).toEqual(words);
});

test('narrow screens: two-column tiles, no sideways scroll, accessible', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reachGenerate(page, context);
  await generateWords(page);
  const [first, second] = await tiles(page).evaluateAll((els) => els.slice(0, 2).map((e) => e.getBoundingClientRect().top));
  expect(first).toBe(second);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
