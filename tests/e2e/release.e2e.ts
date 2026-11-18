import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { copy } from '../../src/copy';

// WP05 release fixture: one visitor's whole journey, from the landing page to Clear phrase, using every
// control that changes the phrase. It proves end to end what the per-step tests prove in parts: the only
// requests are the word list and the reachability check before the visitor confirms offline, nothing is
// stored, no content is blocked by the policy and there is no form to submit.

declare global {
  interface Window {
    cspViolations: string[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => window.cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
});

async function storage(page: Page, context: BrowserContext) {
  return {
    cookies: (await context.cookies()).length,
    ...(await page.evaluate(async () => ({
      cookie: document.cookie,
      local: localStorage.length,
      session: sessionStorage.length,
      indexedDB: (await indexedDB.databases()).length,
      caches: (await caches.keys()).length,
      serviceWorkers: (await navigator.serviceWorker?.getRegistrations())?.length ?? 0,
      forms: document.forms.length,
    }))),
  };
}
const nothingStored = { cookies: 0, cookie: '', local: 0, session: 0, indexedDB: 0, caches: 0, serviceWorkers: 0, forms: 0 };

test('the whole journey makes no request after confirming offline, stores nothing and breaks no policy', async ({ page, context }) => {
  test.slow(); // every step of the site in one test
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const field = (n: number) => page.getByRole('textbox', { name: new RegExp(`^${copy.compose.wordLabel(n)},`) });

  // Landing and Prepare, online: the page itself, then only the word list and the reachability check.
  await page.goto('/');
  await page.getByRole('button', { name: copy.landing.start }).click();
  await page.getByRole('button', { name: copy.list.action }).click();
  await expect(page.getByText(copy.list.ready('English', '7,776'))).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel(copy.offline.confirmLabel).check();
  await page.getByRole('button', { name: copy.offline.confirm }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.generate.heading })).toBeVisible();
  expect(requests.filter((u) => !u.startsWith(origin) && !u.startsWith('data:'))).toEqual([]);
  const beforeSecrets = requests.length;

  // Generate: more words, lock one, reroll the rest, back to six.
  await page.getByRole('button', { name: copy.generate.generate }).click();
  await page.getByRole('button', { name: copy.generate.more }).click();
  const kept = await page.getByRole('button', { name: /^Lock word 1,/ }).getAttribute('aria-label');
  await page.getByRole('button', { name: /^Lock word 1,/ }).click();
  await page.getByRole('button', { name: /^Reroll unlocked words/ }).click();
  await expect(page.getByRole('button', { name: kept! })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: copy.generate.fewer }).click();
  await page.getByRole('button', { name: copy.generate.continue }).click();

  // Make it yours: join and split, edit a word, add and remove a connecting word, add an own word,
  // change the separator and add a number for a stated rule.
  const first = await field(1).inputValue();
  await page.getByRole('button', { name: new RegExp(`^${copy.compose.join}: ${first},`) }).click();
  await page.getByRole('button', { name: new RegExp(`^${copy.compose.split}:`) }).click();
  await field(2).fill(`${(await field(2).inputValue()).toUpperCase()}!`);
  await page.getByRole('button', { name: 'and', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('and', 2) }).click();
  await page.getByRole('button', { name: 'with', exact: true }).click();
  await page.getByRole('button', { name: copy.compose.insertHere('with', 4) }).click();
  await page.getByRole('button', { name: /^Remove with, position \d+$/ }).click();
  const own = page.getByLabel(copy.compose.ownLabel, { exact: true });
  await own.fill('kayak');
  await own.press('Enter');
  await page.getByLabel(copy.compose.typeAdded).check();
  await page.getByRole('radio', { name: copy.compose.separators.hyphen }).check();
  await page.locator('details.requirements summary').click();
  await page.getByLabel(copy.requirements.options.digit).check();
  const phrase = await page.getByTestId('phrase-preview').innerText();
  expect(phrase).toMatch(/-and-.*kayak/);
  await page.getByRole('button', { name: copy.compose.continue }).click();

  // Remember: every aid with connecting words shown, the eye, the whole-phrase reveal, a match and a
  // new attempt, then Clear phrase.
  const entry = page.getByLabel(copy.remember.attemptLabel, { exact: true });
  for (const aid of ['follow', 'reveal', 'none'] as const) {
    await page.getByRole('radio', { name: copy.remember.aids[aid], exact: true }).check();
    if (aid !== 'none') await page.getByLabel(copy.remember.showConnectors).check();
    await entry.fill(phrase.slice(0, 4));
  }
  await page.getByRole('button', { name: copy.remember.showEntry }).click();
  await page.getByRole('button', { name: copy.remember.showPhrase }).click();
  await expect(page.getByTestId('reference-phrase')).toHaveText(phrase);
  await entry.fill(phrase);
  await expect(page.locator('.result')).toHaveText(copy.remember.match);
  await page.getByRole('button', { name: copy.remember.retry }).click();
  await expect(entry).toHaveValue('');
  expect(await storage(page, context)).toEqual(nothingStored);

  await page.getByRole('button', { name: copy.remember.clear }).click();
  await page.getByRole('alertdialog', { name: copy.warn.clearTitle }).getByRole('button', { name: copy.warn.clearConfirm }).click();
  await expect(page.getByText(copy.remember.cleared)).toBeVisible();
  await expect(page.getByText(phrase)).toHaveCount(0);

  // From confirming offline to clearing the phrase: no request at all, nothing kept, nothing blocked.
  expect(requests.slice(beforeSecrets)).toEqual([]);
  expect(await storage(page, context)).toEqual(nothingStored);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
});
