// =====================================================
// E2E AUTHENTICATION TESTS
// End-to-end tests for user authentication flows
// =====================================================

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/login');

      await expect(page.locator('h1')).toContainText('Sign In');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Wait for error message
      await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/login');

      await page.click('text=Sign up');

      await expect(page).toHaveURL('/signup');
    });
  });

  test.describe('Signup', () => {
    test('should display signup page', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.locator('h1')).toContainText('Create Account');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/signup');

      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Browser HTML5 validation should trigger
      const emailInput = page.locator('input[type="email"]');
      const validationMessage = await emailInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );

      expect(validationMessage).toBeTruthy();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/signup');

      await page.click('text=Sign in');

      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Password Reset', () => {
    test('should display forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');

      await expect(page.locator('h1')).toContainText('Reset Password');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should submit reset request', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/');

      // Should redirect to login
      await expect(page).toHaveURL('/login', { timeout: 5000 });
    });

    test('should redirect to login for calls page', async ({ page }) => {
      await page.goto('/calls');

      await expect(page).toHaveURL('/login', { timeout: 5000 });
    });

    test('should redirect to login for settings page', async ({ page }) => {
      await page.goto('/settings');

      await expect(page).toHaveURL('/login', { timeout: 5000 });
    });
  });
});
