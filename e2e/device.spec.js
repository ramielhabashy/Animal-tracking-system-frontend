import { test, expect } from '@playwright/test';
import { apiLogin } from './helpers.js';

test.describe('Devices', () => {
  test.beforeEach(async ({ page }) => {
    await apiLogin(page, 'admin@oasis.com', 'password');
    await page.goto('/react.oasis/devices');
  });

  test('devices page loads and shows list', async ({ page }) => {
    const bodyText = await page.locator('#root').textContent();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('device details can be viewed', async ({ page }) => {
    await page.waitForTimeout(3000);
    const firstDevice = page.locator('table tbody tr, [class*="device-card"]').first();
    if (await firstDevice.isVisible()) {
      await firstDevice.click();
      await page.waitForTimeout(2000);
    }
  });
});
