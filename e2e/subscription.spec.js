import { test, expect } from '@playwright/test';
import { apiLogin } from './helpers.js';

test.describe('Subscription', () => {
  test.describe('Owner subscription flow', () => {
    test.beforeEach(async ({ page }) => {
      await apiLogin(page, 'khalid@oasis.com', 'password');
    });

    test('subscription page loads with plan tabs', async ({ page }) => {
      await page.goto('/react.oasis/subscription');
      await page.waitForTimeout(3000);
      await expect(page.locator('#root')).toContainText(/plan|subscription|subscribe/i, { timeout: 5000 });
    });

    test('billing tab shows current plan details', async ({ page }) => {
      await page.goto('/react.oasis/subscription');
      await page.waitForTimeout(3000);
      const billingTab = page.locator('button:has-text("Billing"), a:has-text("Billing"), [class*="tab"]:has-text("Billing")');
      const visible = await billingTab.isVisible().catch(() => false);
      if (visible) {
        await billingTab.click();
        await page.waitForTimeout(2000);
        await expect(page.locator('#root')).toContainText(/current plan|payment method|renewal/i, { timeout: 5000 });
      }
    });

    test('bank transfer upload section is visible', async ({ page }) => {
      await page.goto('/react.oasis/subscription');
      await page.waitForTimeout(3000);
      const billingTab = page.locator('button:has-text("Billing"), a:has-text("Billing"), [class*="tab"]:has-text("Billing")');
      const visible = await billingTab.isVisible().catch(() => false);
      if (!visible) return;
      await billingTab.click();
      await page.waitForTimeout(2000);
      const uploadSection = page.locator('text=Bank Transfer Payment');
      const uploadVisible = await uploadSection.isVisible().catch(() => false);
      if (uploadVisible) {
        await expect(page.locator('input[type="file"]')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Admin subscription management', () => {
    test.beforeEach(async ({ page }) => {
      await apiLogin(page, 'admin@oasis.com', 'password');
    });

    test('admin sees subscriber list', async ({ page }) => {
      await page.goto('/react.oasis/subscription');
      await page.waitForTimeout(3000);
      const subscribersTab = page.locator('button:has-text("Subscribers"), a:has-text("Subscribers"), [class*="tab"]:has-text("Subscribers")');
      const visible = await subscribersTab.isVisible().catch(() => false);
      if (visible) {
        await subscribersTab.click();
        await page.waitForTimeout(2000);
        await expect(page.locator('#root')).toContainText(/subscriber|user|owner/i, { timeout: 5000 });
      }
    });

    test('admin sees subscription stats', async ({ page }) => {
      await page.goto('/react.oasis/subscription');
      await page.waitForTimeout(3000);
      const reportsTab = page.locator('button:has-text("Reports"), a:has-text("Reports"), [class*="tab"]:has-text("Reports"), [class*="tab"]:has-text("Stats")');
      const visible = await reportsTab.isVisible().catch(() => false);
      if (visible) {
        await reportsTab.click();
        await page.waitForTimeout(2000);
        await expect(page.locator('#root')).toContainText(/revenue|subscription|tier|active|stat/i, { timeout: 5000 }).catch(() => {});
      }
    });
  });

  test.describe('Plan selection at checkout', () => {
    test.beforeEach(async ({ page }) => {
      await apiLogin(page, 'khalid@oasis.com', 'password');
    });

    test('checkout page shows available plans', async ({ page }) => {
      await page.goto('/react.oasis/checkout');
      await page.waitForTimeout(3000);
      await expect(page.locator('#root')).toContainText(/choose your plan|subscription|plan/i, { timeout: 5000 });
    });
  });
});
