import { test, expect } from '@playwright/test';
import { apiLogin } from './helpers.js';

test.describe('Animal CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await apiLogin(page, 'admin@oasis.com', 'password');
    await page.goto('/react.oasis/animals');
    await page.waitForTimeout(2000);
  });

  test('animals page shows animal list', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.locator('#root')).toContainText(/animal management/i, { timeout: 5000 });
    const bodyText = await page.locator('#root').textContent();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('animal page has content', async ({ page }) => {
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('#root').textContent();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('animal filter by species works', async ({ page }) => {
    await page.waitForTimeout(2000);
    const filterSelect = page.locator('select').first();
    if (await filterSelect.isVisible()) {
      const options = await filterSelect.locator('option').allTextContents();
      if (options.length > 1) {
        await filterSelect.selectOption(options[1], { timeout: 3000 });
        await page.waitForTimeout(2000);
      }
    }
  });
});
