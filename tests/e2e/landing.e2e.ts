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
  // The tab icon is written into the page, so no favicon is fetched; it must still load under the CSP. The
  // only icon a browser may fetch is the home-screen one, from this site (Firefox does, as the page loads).
  expect(requests.filter((u) => /icon/.test(u) && !/\/assets\/apple-touch-icon-[\w-]+\.png$/.test(u))).toEqual([]);
  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(icon).toMatch(/^data:image\/png;base64,/);
  expect(await page.evaluate((src) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img.naturalWidth);
    img.onerror = () => ok(0);
    img.src = src;
  }), icon!)).toBe(32);
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

test('on a phone, starting from the bottom of the introduction opens Step 1 at the top of the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await start(page).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await start(page).click();
  await expect(step1Heading(page)).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
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

test('a closed notice explains what changing the words does', async ({ page }) => {
  await page.goto('/');
  const notice = page.locator('details.notice');
  await expect(notice).not.toHaveAttribute('open');
  await notice.locator('summary').click();
  for (const line of copy.landing.edit) await expect(notice.getByText(line)).toBeVisible();
});

test('the footer credits the sponsor and developer in new tabs, with the licence', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  for (const [name, href] of [
    [copy.footer.sponsor, 'https://shifteverywhere.com'],
    [copy.footer.developer, 'https://github.com/niinlabs/rememberphrase'],
  ]) {
    const link = footer.getByRole('link', { name: new RegExp(`^${name}`) });
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAttribute('target', '_blank'); // following it in this tab would lose the phrase
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(footer).toContainText(copy.footer.licence);
  const eff = page.getByRole('link', { name: new RegExp(`^${copy.panel.attribution.link}`) });
  await expect(eff).toHaveAttribute('href', 'https://www.eff.org/');
  await expect(eff).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('banner')).toContainText(copy.tagline);
});

test('the logo leads home: straight away without a phrase, after a warning with one', async ({ page, context }) => {
  const logo = page.getByRole('banner').getByRole('button', { name: /^Rememberphrase/ });
  await page.goto('/');
  await start(page).click();
  await logo.click();
  await expect(landingHeading(page)).toBeFocused();

  await start(page).click();
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  await page.getByRole('button', { name: copy.generate.generate }).click();
  await logo.click();
  const warn = page.getByRole('alertdialog', { name: copy.warn.homeTitle });
  await expect(warn.getByRole('button', { name: copy.warn.cancel })).toBeFocused();
  await warn.getByRole('button', { name: copy.warn.cancel }).click();
  await expect(page.locator('.tiles .word')).toHaveCount(6);

  await logo.click();
  await page.getByRole('alertdialog', { name: copy.warn.homeTitle }).getByRole('button', { name: copy.warn.homeConfirm }).click();
  await expect(landingHeading(page)).toBeFocused();
  await start(page).click();
  await page.getByRole('button', { name: copy.ready.continue }).click(); // list and offline check kept
  await expect(page.locator('.tiles .word')).toHaveCount(0); // the phrase is gone
});

