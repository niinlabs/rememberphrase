import { readdirSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';

// WP01 browser fixtures: the Prepare step against the built site.
declare global {
  interface Window {
    cspViolations: string[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
});

const band = (page: Page) => page.getByTestId('status-band');
const sampleButton = (page: Page) => page.getByRole('button', { name: /disposable sample|another sample/ });

async function loadList(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('7,776'))).toBeVisible();
}

async function confirmOffline(page: Page) {
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
}

async function expectNoCspViolations(page: Page) {
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
}

async function expectNoStorage(page: Page, context: BrowserContext) {
  expect(await context.cookies()).toEqual([]);
  const storage = await page.evaluate(async () => ({
    cookie: document.cookie,
    local: localStorage.length,
    session: sessionStorage.length,
    indexedDB: (await indexedDB.databases()).length,
    caches: (await caches.keys()).length,
    serviceWorkers: (await navigator.serviceWorker?.getRegistrations())?.length ?? 0,
  }));
  expect(storage).toEqual({ cookie: '', local: 0, session: 0, indexedDB: 0, caches: 0, serviceWorkers: 0 });
}

async function expectAccessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

test('build has exactly one JS and one CSS file', () => {
  const files = readdirSync('dist/assets');
  expect(files.filter((f) => f.endsWith('.js'))).toHaveLength(1);
  expect(files.filter((f) => f.endsWith('.css'))).toHaveLength(1);
});

test('only approved languages are offered', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel(copy.languageLabel).locator('option')).toHaveText(['English']);
});

test('full offline preparation: no answer, two samples with no requests, nothing stored, then green', async ({ page, context }) => {
  await loadList(page);
  await expectAccessible(page);
  await context.setOffline(true);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(new URL(r.url()).pathname));

  await confirmOffline(page);
  await expect(page.getByText(copy.offline.noAnswer)).toBeVisible();
  expect(requests.filter((p) => p !== '/reachability.txt')).toEqual([]);

  requests.length = 0;
  await sampleButton(page).click();
  await sampleButton(page).click();
  const first = await page.getByRole('list', { name: copy.sample.label(1) }).innerText();
  const second = await page.getByRole('list', { name: copy.sample.label(2) }).innerText();
  expect(first).not.toBe(second); // two independent 6-word draws from 7,776 words
  expect(requests).toEqual([]);
  await expect(band(page)).toContainText(copy.band.green);
  await expect(page.getByTestId('status-chip')).toHaveText(copy.chip.green);

  await expectNoStorage(page, context);
  await expectAccessible(page);
  await expectNoCspViolations(page);

  // D7 row 2: coming back online after confirmation pauses generation and reopens the offline stage.
  await context.setOffline(false);
  await expect(band(page)).toContainText(copy.band.reconnected);
  await expect(page.getByRole('button', { name: copy.offline.confirm })).toBeVisible();
});

test('a reachable site holds generation, sends no cookie or referrer, and a later check is not a cached replay', async ({ page, context }) => {
  await loadList(page);
  const probe = page.waitForRequest('**/reachability.txt?*');
  await confirmOffline(page);
  const headers = await (await probe).allHeaders();
  expect(headers.cookie).toBeUndefined();
  expect(headers.referer).toBeUndefined();
  await expect(band(page)).toContainText(copy.band['site-answered']);
  await expect(sampleButton(page)).toHaveCount(0);

  await context.setOffline(true);
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  await expect(page.getByText(copy.offline.noAnswer)).toBeVisible();
  await expect(sampleButton(page)).toBeEnabled();
  await expectNoCspViolations(page);
});

for (const [name, response] of [
  ['a redirect', { status: 302, headers: { location: 'https://example.com/login' } }],
  ['an error status', { status: 503, body: 'Service unavailable' }],
  ['a captive-portal page', { status: 200, body: '<html>Log in to Wi-Fi</html>' }],
] as const) {
  test(`${name} means a network answered and holds generation`, async ({ page, browserName }) => {
    test.skip(name === 'a redirect' && browserName === 'webkit', 'Playwright cannot fake redirects in WebKit');
    const followed: string[] = [];
    page.on('request', (r) => r.url().startsWith('https://example.com') && followed.push(r.url()));
    await page.route('**/reachability.txt?*', (route) => route.fulfill(response));
    await loadList(page);
    await confirmOffline(page);
    await expect(band(page)).toContainText(copy.band['network-answered']);
    await expect(page.getByTestId('status-chip')).toHaveText(copy.chip.red);
    await expect(sampleButton(page)).toHaveCount(0);
    expect(followed).toEqual([]);
  });
}

test('Skip cancels a pending check and leaves a labelled amber state', async ({ page, context }) => {
  await page.route('**/reachability.txt?*', () => {}); // never answers
  await loadList(page);
  await confirmOffline(page);
  const dialog = page.getByRole('dialog', { name: copy.dialog.title });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: copy.dialog.skip })).toBeFocused();
  await expectAccessible(page);
  await page.getByRole('button', { name: copy.dialog.skip }).click();
  await expect(dialog).toBeHidden();
  await context.setOffline(true);
  await sampleButton(page).click();
  await expect(band(page)).toContainText(copy.band.skipped);
  await expect(page.getByTestId('status-chip')).toHaveText(copy.chip.skipped);
});

test('Escape counts as Skip', async ({ page }) => {
  await page.route('**/reachability.txt?*', () => {});
  await loadList(page);
  await confirmOffline(page);
  await expect(page.getByRole('dialog', { name: copy.dialog.title })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText(copy.offline.skipped, { exact: true })).toBeVisible();
});

test('a browser that still reports online after a failed check stays amber but may continue', async ({ page }) => {
  await page.route('**/reachability.txt?*', (route) => route.abort('internetdisconnected'));
  await loadList(page);
  await confirmOffline(page);
  await expect(page.getByText(copy.offline.noAnswer)).toBeVisible();
  await sampleButton(page).click();
  await expect(band(page)).toContainText(copy.band['browser-online']);
  await expect(page.getByTestId('status-chip')).toHaveText(copy.chip['browser-online']);
});

test('going offline before loading the list shows a download error, and retry works once back online', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByRole('alert')).toHaveText(copy.list.errors.download);
  await expect(band(page)).toContainText(copy.band.list);
  await context.setOffline(false);
  await page.getByRole('button', { name: copy.list.retry }).click();
  await expect(page.getByText(copy.list.ready('7,776'))).toBeVisible();
});

test('a tampered word list is rejected', async ({ page }) => {
  await page.route('**/wordlists/eff-large-en.txt', (route) => route.fulfill({ body: 'alfa\nbravo\n' }));
  await page.goto('/');
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByRole('alert')).toHaveText(copy.list.errors.version);
  await expect(page.getByRole('button', { name: copy.offline.confirm })).toHaveCount(0);
});

test('without secure random numbers nothing can be generated', async ({ page, context }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, 'getRandomValues', { value: undefined }));
  await loadList(page);
  await context.setOffline(true);
  await confirmOffline(page);
  await expect(band(page)).toContainText(copy.band.rng);
  await expect(sampleButton(page)).toBeDisabled();
});

test('leaving after the list is loaded asks first, because nothing is saved', async ({ page }) => {
  await loadList(page);
  const dialog = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  expect((await dialog).type()).toBe('beforeunload');
});

test('mobile: no horizontal scrolling and accessible at 390 × 844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadList(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectAccessible(page);
});
