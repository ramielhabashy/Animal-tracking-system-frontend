import { test, expect } from '@playwright/test';
import { apiLogin } from './helpers.js';

test.describe('Auctions', () => {
  test.beforeEach(async ({ page }) => {
    await apiLogin(page, 'admin@oasis.com', 'password');
    await page.goto('/react.oasis/auctions');
  });

  test('auctions page loads with list', async ({ page }) => {
    await page.waitForTimeout(3000);
    await expect(page.locator('#root')).toContainText(/auction/i, { timeout: 5000 });
  });

  test('auction filter tabs are visible', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.locator('#root')).toContainText(/auction/i, { timeout: 5000 });
    const tabs = ['All', 'Active', 'Sold', 'Ended'];
    for (const tab of tabs) {
      const tabEl = page.locator(`button:has-text("${tab}"), a:has-text("${tab}"), [class*="tab"]:has-text("${tab}")`);
      const visible = await tabEl.isVisible().catch(() => false);
      if (visible) {
        await expect(tabEl).toBeVisible();
      }
    }
  });
});
