import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests signup, login, logout, and session persistence
 */

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        // Clear cookies and local storage before each test
        await page.context().clearCookies();
        await page.goto('/');
    });

    test('user can sign up with email and password', async ({ page }) => {
        await page.goto('/signup');

        // Fill signup form
        await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
        await page.fill('input[name="password"]', 'Test123!@#');
        await page.fill('input[name="username"]', `testuser${Date.now()}`);

        // Submit form
        await page.click('button[type="submit"]');

        // Should redirect to home/feed
        await expect(page).toHaveURL(/\/(home|feed|memories)/);

        // Should show user profile or navigation
        await expect(page.locator('nav')).toBeVisible();
    });

    test('user can login with existing credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill login form
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Test123!');

        // Submit form
        await page.click('button[type="submit"]');

        // Should redirect to home
        await expect(page).toHaveURL(/\/(home|feed|memories)/);
    });

    test('shows validation error for invalid email', async ({ page }) => {
        await page.goto('/login');

        // Enter invalid email
        await page.fill('input[name="email"]', 'invalid-email');
        await page.fill('input[name="password"]', 'Test123!');
        await page.click('button[type="submit"]');

        // Should show error
        await expect(page.locator('text=/invalid email|email is invalid/i')).toBeVisible();
    });

    test('shows error for wrong credentials', async ({ page }) => {
        await page.goto('/login');

        // Enter wrong credentials
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'WrongPassword123!');
        await page.click('button[type="submit"]');

        // Should show error
        await expect(page.locator('text=/invalid credentials|wrong password/i')).toBeVisible();
    });

    test('user can logout', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/(home|feed|memories)/);

        // Find and click logout button
        await page.click('button[aria-label*="Profile" i], button[aria-label*="Account" i]');
        await page.click('text=/logout|sign out/i');

        // Should redirect to login/landing
        await expect(page).toHaveURL(/\/(login|signup|\/)/);
    });

    test('session persists after page refresh', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/(home|feed|memories)/);

        // Refresh page
        await page.reload();

        // Should still be on home (not redirected to login)
        await expect(page).toHaveURL(/\/(home|feed|memories)/);
    });
});
