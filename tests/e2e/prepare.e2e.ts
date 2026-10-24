import { readdirSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { copy } from '../../src/copy';

// WP01 browser fixtures: the revised Prepare step against the built site.
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
const chip = (page: Page) => page.getByTestId('status-chip');
const ready = (page: Page) => page.getByRole('region', { name: copy.ready.title });
const alert = (page: Page) => page.getByRole('alertdialog', { name: copy.interruption.title });
const confirmBox = (page: Page) => page.getByLabel(copy.offline.confirmLabel);
const confirmButton = (page: Page) => page.getByRole('button', { name: copy.offline.confirm });

async function fetchWords(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
}

async function confirmOffline(page: Page) {
  await confirmBox(page).check();
  await confirmButton(page).click();
}

async function acknowledgeAlert(page: Page, reason: string) {
  await expect(alert(page)).toBeVisible();
  await expect(alert(page)).toContainText(reason);
  await expect(alert(page).getByRole('button', { name: copy.interruption.acknowledge })).toBeFocused();
  await alert(page).getByRole('button', { name: copy.interruption.acknowledge }).click();
  await expect(alert(page)).toBeHidden();
  // The hold stays: red explanation inside Go offline, confirmation cleared and focused, nothing ready.
  await expect(band(page)).toContainText(reason);
  await expect(confirmBox(page)).not.toBeChecked();
  await expect(confirmBox(page)).toBeFocused();
  await expect(confirmButton(page)).toBeDisabled();
  await expect(ready(page)).toHaveCount(0);
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

test('stage 01 holds the language selector and a text-only Fetch words button', async ({ page }) => {
  await page.goto('/');
  const stage = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: copy.stages.fetch }) });
  await expect(stage.getByLabel(copy.list.languageLabel).locator('option')).toHaveText(['English']);
  await expect(stage.getByText(copy.list.helper)).toBeVisible();
  const fetch = stage.getByRole('button', { name: copy.list.action });
  await expect(fetch).toBeVisible();
  await expect(fetch.locator('svg')).toHaveCount(0);
  await expect(page.locator('header select')).toHaveCount(0);
});

test('offline journey: no answer, silent local check, green, nothing shown, sent or stored', async ({ page, context }) => {
  await fetchWords(page);
  await expectAccessible(page);
  await context.setOffline(true);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(new URL(r.url()).pathname));

  await confirmOffline(page);
  await expect(page.getByText(copy.offline.noAnswer)).toBeVisible();
  await expect(ready(page)).toBeVisible();
  await expect(band(page)).toContainText(copy.band.green);
  await expect(chip(page)).toHaveText(copy.chip.green);
  expect(requests.filter((p) => p !== '/reachability.txt')).toEqual([]); // the local check makes no requests
  await expect(page.locator('main ol li ol, .tiles, .sample')).toHaveCount(0); // no sample words on screen

  await expectNoStorage(page, context);
  await expectAccessible(page);
  await expectNoCspViolations(page);
});

test('reconnecting after preparation interrupts in red, keeps the hold, and a fresh check recovers', async ({ page, context }) => {
  await fetchWords(page);
  await context.setOffline(true);
  await confirmOffline(page);
  await expect(ready(page)).toBeVisible();

  await context.setOffline(false);
  await acknowledgeAlert(page, copy.band.reconnected);

  await context.setOffline(true);
  await confirmOffline(page);
  await expect(ready(page)).toBeVisible();
  await expect(band(page)).toContainText(copy.band.green);
});

test('a reachable site interrupts in red, sends no cookie or referrer, and cannot be continued past', async ({ page, context }) => {
  await fetchWords(page);
  const probe = page.waitForRequest('**/reachability.txt?*');
  await confirmOffline(page);
  const headers = await (await probe).allHeaders();
  expect(headers.cookie).toBeUndefined();
  expect(headers.referer).toBeUndefined();
  await acknowledgeAlert(page, copy.band['site-answered']);
  await expect(chip(page)).toHaveText(copy.chip.red);

  await context.setOffline(true);
  await confirmOffline(page);
  await expect(ready(page)).toBeVisible(); // a later offline check is not a cached replay
  await expectNoCspViolations(page);
});

for (const [name, response] of [
  ['a redirect', { status: 302, headers: { location: 'https://example.com/login' } }],
  ['an error status', { status: 503, body: 'Service unavailable' }],
  ['a captive-portal page', { status: 200, body: '<html>Log in to Wi-Fi</html>' }],
] as const) {
  test(`${name} means a network answered and holds preparation`, async ({ page, browserName }) => {
    test.skip(name === 'a redirect' && browserName === 'webkit', 'Playwright cannot fake redirects in WebKit');
    const followed: string[] = [];
    page.on('request', (r) => r.url().startsWith('https://example.com') && followed.push(r.url()));
    await page.route('**/reachability.txt?*', (route) => route.fulfill(response));
    await fetchWords(page);
    await confirmOffline(page);
    await acknowledgeAlert(page, copy.band['network-answered']);
    expect(followed).toEqual([]);
  });
}

test('reconnecting while the check is pending interrupts in red instead of continuing', async ({ page, context }) => {
  await page.route('**/reachability.txt?*', () => {}); // never answers
  await fetchWords(page);
  await confirmOffline(page);
  await expect(page.getByRole('dialog', { name: copy.dialog.title })).toBeVisible();
  await context.setOffline(true);
  await context.setOffline(false); // the browser reports coming back online during the check
  await expect(page.getByRole('dialog', { name: copy.dialog.title })).toBeHidden();
  await acknowledgeAlert(page, copy.band.reconnected);
});

test('Skip cancels a pending check and leaves a labelled amber state', async ({ page }) => {
  await page.route('**/reachability.txt?*', () => {});
  await fetchWords(page);
  await confirmOffline(page);
  const dialog = page.getByRole('dialog', { name: copy.dialog.title });
  await expect(dialog.getByRole('button', { name: copy.dialog.skip })).toBeFocused();
  await expectAccessible(page);
  await dialog.getByRole('button', { name: copy.dialog.skip }).click();
  await expect(ready(page)).toBeVisible();
  await expect(band(page)).toContainText(copy.band.skipped);
  await expect(chip(page)).toHaveText(copy.chip.skipped);
});

test('Escape counts as Skip', async ({ page }) => {
  await page.route('**/reachability.txt?*', () => {});
  await fetchWords(page);
  await confirmOffline(page);
  await expect(page.getByRole('dialog', { name: copy.dialog.title })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText(copy.offline.skipped, { exact: true })).toBeVisible();
});

test('a browser that still reports online after a failed check is amber but may continue', async ({ page }) => {
  await page.route('**/reachability.txt?*', (route) => route.abort('internetdisconnected'));
  await fetchWords(page);
  await confirmOffline(page);
  await expect(ready(page)).toBeVisible();
  await expect(band(page)).toContainText(copy.band['browser-online']);
  await expect(chip(page)).toHaveText(copy.chip['browser-online']);
});

test('going offline before fetching shows a download error, and fetching again works once back online', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByRole('alert')).toHaveText(copy.list.errors.download);
  await context.setOffline(false);
  await page.getByRole('button', { name: copy.list.retry }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
});

test('a tampered word list is rejected and preparation does not continue', async ({ page }) => {
  await page.route('**/wordlists/eff-large-en.txt', (route) => route.fulfill({ body: 'alfa\nbravo\n' }));
  await page.goto('/');
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByRole('alert')).toHaveText(copy.list.errors.version);
  await expect(confirmButton(page)).toHaveCount(0);
});

test('without a random source, preparation holds with HTTPS and browser guidance', async ({ page, context }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, 'getRandomValues', { value: undefined }));
  await fetchWords(page);
  await expect(band(page)).toContainText(copy.band.rng);
  await context.setOffline(true);
  await confirmOffline(page);
  await expect(ready(page)).toHaveCount(0);
});

test('a failing local check holds preparation instead of reporting ready', async ({ page, context }) => {
  await page.addInitScript(() => {
    crypto.getRandomValues = () => {
      throw new Error('random source failed');
    };
  });
  await fetchWords(page);
  await context.setOffline(true);
  await confirmOffline(page);
  await expect(band(page)).toContainText(copy.band.rng);
  await expect(ready(page)).toHaveCount(0);
});

test('leaving after the list is loaded asks first, because nothing is saved', async ({ page }) => {
  await fetchWords(page);
  const dialog = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  expect((await dialog).type()).toBe('beforeunload');
});

for (const [width, height] of [
  [390, 844],
  [320, 568], // roughly a 640 px window at 200% zoom
]) {
  test(`narrow ${width}px: no sideways scroll, caution before the confirmation, red alert in view`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fetchWords(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const bandFirst = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="status-band"]')!;
      const c = document.querySelector('input[type="checkbox"]')!;
      return Boolean(b.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(bandFirst).toBe(true);
    await expectAccessible(page);
    await confirmOffline(page); // the preview server answers, so this goes red
    await expect(alert(page).getByRole('button', { name: copy.interruption.acknowledge })).toBeInViewport();
    await expect(alert(page).getByRole('heading', { name: copy.interruption.title })).toBeInViewport();
  });
}
