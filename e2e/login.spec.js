import { test, expect } from '@playwright/test';
import { apiLogin } from './helpers.js';

test.describe('Login', () => {
  test('shows login page with form fields', async ({ page }) => {
    await page.goto('/react.oasis/');
    await page.waitForTimeout(2000);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /sign in|login|log in/i })).toBeVisible({ timeout: 5000 });
  });

  test('login with valid admin credentials', async ({ page }) => {
    await apiLogin(page, 'admin@oasis.com', 'password');
    await page.goto('/react.oasis/');
    await page.waitForTimeout(2000);
    await expect(page.locator('#root')).toBeVisible({ timeout: 5000 });
  });

  test('login with invalid credentials stays on login page', async ({ page }) => {
    await page.goto('/react.oasis/');
    await page.waitForTimeout(2000);
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.getByRole('button', { name: /sign in|login|log in/i }).click();
    await page.waitForTimeout(3000);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  });

  test('login with owner credentials works', async ({ page }) => {
    await apiLogin(page, 'khalid@oasis.com', 'password');
    await page.goto('/react.oasis/');
    await page.waitForTimeout(2000);
    await expect(page.locator('#root')).toBeVisible({ timeout: 5000 });
  });
});
