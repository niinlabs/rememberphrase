import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';

// WP04 browser fixtures: the unnumbered introduction before Step 1.
const start = (page: Page) => page.getByRole('button', { name: copy.landing.start });
const landingHeading = (page: Page) => page.getByRole('heading', { level: 1, name: copy.landing.heading });
const step1Heading = (page: Page) => page.getByRole('heading', { level: 1, name: copy.heading });
const prepRequests = (urls: string[]) => urls.filter((u) => /wordlists|reachability/.test(u));

test('a fresh visit opens the introduction, with no word list, check, other site or storage', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(landingHeading(page)).toBeVisible();
  await expect(page.getByRole('button', { name: copy.list.action })).toHaveCount(0);
  await expect(page.getByTestId('status-chip')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Progress' }).locator('[aria-current]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Progress' })).toContainText('Prepare');

  expect(prepRequests(requests)).toEqual([]);
  const origin = new URL(page.url()).origin;
  expect(requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:'))).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length)).toBe(0);
});

test('the one start button comes last and opens Step 1 with focus on its heading, without fetching', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  await expect(page.locator('section.work').getByRole('button')).toHaveCount(1);
  const button = (await start(page).boundingBox())!;
  const tabNote = (await page.getByText(copy.landing.tabNote).boundingBox())!;
  expect(button.y).toBeGreaterThan(tabNote.y);

  await start(page).focus();
  await page.keyboard.press('Enter');
  await expect(step1Heading(page)).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Progress' }).locator('[aria-current="step"]')).toContainText('Prepare');
  await expect(page.getByTestId('status-chip')).toBeVisible();
  expect(prepRequests(requests)).toEqual([]); // Fetch words stays a separate, explicit action

  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
  expect(prepRequests(requests)).toHaveLength(1);
});

test('the examples show six hand-picked list words arranged with connecting words, and are labelled not for use', async ({ page }) => {
  await page.goto('/');
  const stories = page.getByTestId('example-story');
  await expect(stories).toHaveCount(copy.landing.examples.length);
  for (const [i, example] of copy.landing.examples.entries()) {
    await expect(stories.nth(i)).toHaveText(example.story);
    await expect(stories.nth(i).locator('.connector')).toHaveCount(example.story.split(' ').length - 6);
  }
  await expect(page.getByText(copy.landing.examplesOnly)).toBeVisible();
  await expect(page.getByText(copy.landing.examplesNote)).toBeVisible();
});

test('a reload returns to the introduction rather than resuming', async ({ page }) => {
  await page.goto('/');
  await start(page).click();
  await expect(step1Heading(page)).toBeFocused();
  await page.reload();
  await expect(landingHeading(page)).toBeVisible();
  await expect(step1Heading(page)).toHaveCount(0);
});

for (const width of [390, 320]) {
  test(`narrow ${width}px: no sideways scroll, nothing clipped, and accessibility checks pass`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const button = (await start(page).boundingBox())!;
    expect(button.x).toBeGreaterThanOrEqual(0);
    expect(button.x + button.width).toBeLessThanOrEqual(width);
    for (const story of await page.getByTestId('example-story').all()) {
      const box = (await story.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
