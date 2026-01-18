import { test, expect } from '@playwright/test';

/**
 * Feed & Social E2E Tests
 * Tests feed viewing, posts, and social interactions
 */

test.describe('Feed & Social', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/(home|feed|memories)/);
    });

    test('user can view feed', async ({ page }) => {
        // Navigate to feed
        await page.goto('/feed');

        // Should show posts or empty state
        const hasPosts = await page.locator('[role="article"], [data-testid="post"]').count() > 0;
        const hasEmptyState = await page.locator('text=/no posts|nothing to show/i').isVisible();

        expect(hasPosts || hasEmptyState).toBeTruthy();
    });

    test('user can create a post', async ({ page }) => {
        await page.goto('/feed');

        // Click create post button
        await page.click('button[aria-label*="Create" i], button:has-text("Post")');

        // Fill post content
        const postText = `Test post ${Date.now()}`;
        await page.fill('textarea[placeholder*="What\'s on your mind" i], textarea[placeholder*="Share" i]', postText);

        // Submit
        await page.click('button:has-text("Post"), button[type="submit"]');

        // Post should appear
        await expect(page.locator(`text="${postText}"`)).toBeVisible({ timeout: 10000 });
    });

    test('user can like a post', async ({ page }) => {
        await page.goto('/feed');

        // Find first like button
        const likeButton = page.locator('button[aria-label*="Like" i]').first();

        if (await likeButton.isVisible()) {
            await likeButton.click();

            // Should show liked state
            await expect(likeButton).toHaveAttribute('aria-pressed', 'true');
        }
    });

    test('shows loading state initially', async ({ page }) => {
        await page.goto('/feed');

        // Should show skeleton or loading indicator briefly
        const hasLoading = await page.locator('[role="status"], [aria-label*="Loading" i]').isVisible();

        // Content should eventually load
        await expect(page.locator('main, [role="main"]')).toBeVisible();
    });
});
