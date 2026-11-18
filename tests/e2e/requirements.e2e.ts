import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';
import { startAtStep1 } from './start';

// WP03 slice 3 browser fixtures: login requirements (D9) and the decoration controls.
const section = (page: Page) => page.locator('details.requirements');
const status = (page: Page) => section(page).locator('.status');
const checklist = (page: Page) => page.getByTestId('checklist').locator('li');
const preview = (page: Page) => page.getByTestId('phrase-preview');
const field = (page: Page, n: number) => page.getByRole('textbox', { name: new RegExp(`^${copy.compose.wordLabel(n)},`) });
const item = (page: Page, text: string) => checklist(page).filter({ hasText: text });

async function reachCompose(page: Page, context: BrowserContext) {
  await startAtStep1(page);
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

async function openSection(page: Page) {
  await section(page).locator('summary').click();
  await expect(section(page)).toHaveAttribute('open');
}

test('requirements start closed and not specified, with nothing to check', async ({ page, context }) => {
  await reachCompose(page, context);
  await expect(section(page)).not.toHaveAttribute('open');
  await expect(status(page)).toHaveText(copy.requirements.notSpecified);
  await openSection(page);
  await expect(page.getByTestId('checklist')).toHaveCount(0);
  await expect(page.getByText(copy.requirements.otherRules)).toHaveCount(0);
});

test('stated rules are checked, and the fit controls meet them without losing random-word credit', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await openSection(page);
  for (const id of ['upper', 'digit', 'symbol', 'noSpaces'] as const) await page.getByLabel(copy.requirements.options[id]).check();
  await expect(checklist(page)).toHaveCount(4);
  // Four list words (drop-down, felt-tip, t-shirt, yo-yo) carry a hyphen, which already counts as a symbol.
  const hyphenated = words.some((w) => w.includes('-'));
  await expect(status(page)).toHaveText(copy.requirements.summary(hyphenated ? 1 : 0, 4));
  await expect(item(page, copy.requirements.rule.upper)).toContainText(copy.requirements.fix.upper);
  await expect(item(page, copy.requirements.rule.noSpaces)).toContainText(copy.requirements.fix.noSpaces);
  await expect(page.getByText(copy.requirements.otherRules)).toBeVisible();

  await page.getByRole('radio', { name: copy.requirements.capitalise.first }).check();
  await page.getByLabel(copy.requirements.digitLabel).selectOption('7');
  await page.getByLabel(copy.requirements.symbolLabel).selectOption('!');
  await page.getByRole('radio', { name: copy.compose.separators.hyphen }).check();

  const expected = `${words[0][0].toUpperCase()}${words[0].slice(1)}-${words.slice(1).join('-')}7!`;
  await expect(preview(page)).toHaveText(expected);
  await expect(status(page)).toHaveText(copy.requirements.summary(4, 4));
  for (const li of await checklist(page).all()) await expect(li).toContainText(copy.requirements.met);
  await expect(page.getByTestId('random-words').locator('.count')).toHaveText(copy.compose.strengthCount(6, 6));
  await expect(field(page, 1)).toHaveValue(words[0]); // the word itself is untouched
});

test('length limits report against the exact phrase', async ({ page, context }) => {
  await reachCompose(page, context);
  const length = [...(await preview(page).innerText())].length;
  await openSection(page);
  await page.getByLabel(copy.requirements.maxLength).fill(String(length - 1));
  await expect(item(page, copy.requirements.rule.maxLength(length - 1))).toContainText(copy.requirements.fix.maxLength);
  await page.getByLabel(copy.requirements.maxLength).clear(); // Firefox's fill adds to a number field's value
  await page.getByLabel(copy.requirements.maxLength).fill(String(length));
  await expect(item(page, copy.requirements.rule.maxLength(length))).toContainText(copy.requirements.met);
  await page.getByLabel(copy.requirements.minLength).fill(String(length + 1));
  await expect(item(page, copy.requirements.rule.minLength(length + 1))).toContainText(copy.requirements.notMet);
  await page.getByLabel(copy.requirements.minLength).fill('');
  await expect(checklist(page)).toHaveCount(1);
});

test('typing at a start-up screen flags characters some keyboards lack', async ({ page, context }) => {
  await reachCompose(page, context);
  await openSection(page);
  await page.getByLabel(copy.requirements.options.plainKeyboard).check();
  await expect(item(page, copy.requirements.rule.plainKeyboard)).toContainText(copy.requirements.met);
  await field(page, 1).fill('café');
  await expect(item(page, copy.requirements.rule.plainKeyboard)).toContainText(copy.requirements.fix.plainKeyboard);
});

test('Remember points back to unmet rules, and practice uses the fitted phrase', async ({ page, context }) => {
  await reachCompose(page, context);
  await openSection(page);
  await page.getByLabel(copy.requirements.options.upper).check();
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await expect(page.getByText(copy.remember.rulesUnmet(1))).toBeVisible();
  await page.getByRole('button', { name: copy.remember.fixRules }).click();

  await expect(section(page)).toHaveAttribute('open'); // stated rules stay in view on return
  await page.getByRole('radio', { name: copy.requirements.capitalise.every }).check();
  const fitted = await preview(page).innerText();
  await page.getByRole('button', { name: copy.compose.continue }).click();
  await expect(page.getByText(copy.remember.rulesUnmet(1))).toHaveCount(0);
  await page.getByLabel(copy.remember.attemptLabel, { exact: true }).fill(fitted);
  await expect(page.locator('.result')).toHaveText(copy.remember.match);
});

test('Reset removes the fit changes but keeps the rules; Clear phrase forgets both', async ({ page, context }) => {
  const words = await reachCompose(page, context);
  await openSection(page);
  await page.getByLabel(copy.requirements.options.digit).check();
  await page.getByLabel(copy.requirements.digitLabel).selectOption('3');
  await expect(status(page)).toHaveText(copy.requirements.summary(1, 1));
  await page.getByRole('button', { name: copy.compose.reset }).click();
  await expect(preview(page)).toHaveText(words.join(' '));
  await expect(page.getByLabel(copy.requirements.digitLabel)).toHaveValue('');
  await expect(status(page)).toHaveText(copy.requirements.summary(0, 1));

  await page.getByRole('button', { name: copy.compose.continue }).click();
  await page.getByRole('button', { name: copy.remember.clear }).click();
  await page.getByRole('alertdialog', { name: copy.warn.clearTitle }).getByRole('button', { name: copy.warn.clearConfirm }).click();
  await page.getByRole('button', { name: copy.remember.another }).click();
  await page.getByRole('button', { name: copy.generate.generate }).click();
  await page.getByRole('button', { name: copy.generate.continue }).click();
  await expect(status(page)).toHaveText(copy.requirements.notSpecified);
});

test('the requirements make no requests, store nothing, fit narrow screens and pass accessibility checks', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reachCompose(page, context);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await openSection(page);
  await page.getByLabel(copy.requirements.minLength).fill('20');
  await page.getByLabel(copy.requirements.options.symbol).check();
  await page.getByLabel(copy.requirements.symbolLabel).selectOption('#');
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
