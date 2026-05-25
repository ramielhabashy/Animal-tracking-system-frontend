import { test, expect } from '@playwright/test';
import { apiLogin } from './helpers.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await apiLogin(page, 'admin@oasis.com', 'password');
  });

  test('dashboard shows stats cards', async ({ page }) => {
    await page.goto('/react.oasis/dashboard');
    await page.waitForTimeout(3000);
    await expect(page.locator('#root')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#root')).toContainText(/animal|total|device|stat/i, { timeout: 5000 });
  });

  test('sidebar navigation links are visible', async ({ page }) => {
    await page.goto('/react.oasis/dashboard');
    await page.waitForTimeout(3000);
    await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('aside')).toContainText(/animal|device|auction/i, { timeout: 3000 });
  });

  test('animals page loads when navigated directly', async ({ page }) => {
    await page.goto('/react.oasis/animals');
    await page.waitForTimeout(3000);
    await expect(page.locator('#root')).toContainText(/animal management/i, { timeout: 5000 });
  });
});
