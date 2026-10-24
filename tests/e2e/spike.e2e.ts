import { readdirSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

async function loadList(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load word list' }).click();
  await expect(page.getByText('Word list ready in this tab (10 words).')).toBeVisible();
}

async function confirmOffline(page: Page) {
  await page.getByLabel(/turned on Airplane mode/).check();
  await page.getByRole('button', { name: 'Confirm offline' }).click();
}

const sampleButton = (page: Page) => page.getByRole('button', { name: 'Generate disposable sample' });

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

test('build has exactly one JS and one CSS file', () => {
  const files = readdirSync('dist/assets');
  expect(files.filter((f) => f.endsWith('.js'))).toHaveLength(1);
  expect(files.filter((f) => f.endsWith('.css'))).toHaveLength(1);
});

test('offline: check is inconclusive, then samples make no requests and store nothing', async ({ page, context }) => {
  await loadList(page);
  await context.setOffline(true);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(new URL(r.url()).pathname));

  await confirmOffline(page);
  await expect(page.getByText(/Could not reach Rememberphrase/)).toBeVisible();
  expect(requests.filter((p) => p !== '/reachability.txt')).toEqual([]);

  requests.length = 0;
  await sampleButton(page).click();
  await sampleButton(page).click();
  const samples = page.getByRole('list', { name: /Disposable sample/ });
  await expect(samples).toHaveCount(2);
  const [first, second] = await samples.allInnerTexts();
  expect(first).not.toBe(second); // 1 in 10^6 chance of a false failure with the 10-word fixture
  expect(requests).toEqual([]);

  await expectNoStorage(page, context);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expectNoCspViolations(page);
});

test('online: a reachable site holds generation, and a later offline check is not a cached replay', async ({ page, context }) => {
  await loadList(page);
  const probe = page.waitForRequest('**/reachability.txt?*');
  await confirmOffline(page);
  const headers = await (await probe).allHeaders();
  expect(headers.cookie).toBeUndefined();
  expect(headers.referer).toBeUndefined();
  await expect(page.getByText(/a connection may be active/)).toBeVisible();
  await expect(sampleButton(page)).toBeDisabled();

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Confirm offline' }).click();
  await expect(page.getByText(/Could not reach Rememberphrase/)).toBeVisible();
  await expectNoCspViolations(page);
});

test('skip cancels a pending check and is labelled as skipped', async ({ page }) => {
  await page.route('**/reachability.txt?*', () => {}); // never answers
  await loadList(page);
  await confirmOffline(page);
  await expect(page.getByRole('dialog', { name: 'Confirming offline' })).toBeVisible();
  await page.getByRole('button', { name: "Skip, I'm offline" }).click();
  await expect(page.getByText('You skipped the connection check.')).toBeVisible();
  await expect(sampleButton(page)).toBeEnabled();
  await expectNoCspViolations(page);
});

for (const [name, response] of [
  ['a redirect', { status: 302, headers: { location: '/' } }],
  ['an unexpected body', { status: 200, body: 'captive portal' }],
] as const) {
  test(`${name} is inconclusive, not reachable`, async ({ page, browserName }) => {
    test.skip(name === 'a redirect' && browserName === 'webkit', 'Playwright cannot fake redirects in WebKit');
    await page.route('**/reachability.txt?*', (route) => route.fulfill(response));
    await loadList(page);
    await confirmOffline(page);
    await expect(page.getByText(/Could not reach Rememberphrase/)).toBeVisible();
  });
}

test('a tampered word list is rejected', async ({ page }) => {
  await page.route('**/wordlists/fixture-en.txt', (route) => route.fulfill({ body: 'alfa\nbravo\n' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Load word list' }).click();
  await expect(page.getByText('The word list does not match the expected version.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm offline' })).toBeDisabled();
});

test('trusted types feasibility (informational)', async ({ page, browserName }) => {
  await page.route('/', async (route) => {
    const res = await route.fetch();
    const csp = `${res.headers()['content-security-policy']}; require-trusted-types-for 'script'`;
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } });
  });
  await page.goto('/');
  await page.waitForLoadState('load');
  const rendered = await page.getByRole('button', { name: 'Load word list' }).isVisible();
  const violations = await page.evaluate(() => window.cspViolations);
  console.log(`[trusted-types] ${browserName}: rendered=${rendered} violations=${JSON.stringify(violations)}`);
});
