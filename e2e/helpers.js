import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8050';

let cachedToken = null;
let cachedUser = null;

export async function apiLogin(page, email, password) {
  // If we already have a cached token, reuse it to avoid hitting the rate limiter
  if (cachedToken) {
    await page.context().addCookies([
      { name: 'oasis_token', value: cachedToken, domain: 'localhost', path: '/' },
      { name: 'oasis_user', value: JSON.stringify(cachedUser), domain: 'localhost', path: '/' },
      { name: 'oasis_role', value: cachedUser.role, domain: 'localhost', path: '/' },
    ]);
    return;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await page.request.post(`${BACKEND_URL}/api/auth/login`, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: { email, password },
    });

    if (response.ok()) {
      const data = await response.json();
      const userRole = data.user?.role || 'Owner';
      cachedUser = { ...data.user, role: userRole };
      cachedToken = data.token;

      await page.context().addCookies([
        { name: 'oasis_token', value: cachedToken, domain: 'localhost', path: '/' },
        { name: 'oasis_user', value: JSON.stringify(cachedUser), domain: 'localhost', path: '/' },
        { name: 'oasis_role', value: userRole, domain: 'localhost', path: '/' },
      ]);
      return;
    }

    if (response.status() === 429 && attempt < 2) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    throw new Error(`Login failed (${response.status()}): ${await response.text()}`);
  }
}

export async function loginIfNeeded(page, email, password) {
  const loginForm = page.locator('input[type="email"]');
  if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    const responsePromise = page.waitForResponse(resp => resp.url().includes('/auth/login'), { timeout: 15000 });
    await page.getByRole('button', { name: /sign in|login|log in/i }).click();
    await responsePromise;
    await page.waitForTimeout(3000);
  }
}
