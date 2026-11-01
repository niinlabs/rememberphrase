import type { Page } from '@playwright/test';
import { copy } from '../../src/copy';

// Opens the site and passes the WP04 introduction into Step 1, as a visitor does.
export async function startAtStep1(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: copy.landing.start }).click();
}
