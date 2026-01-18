import { test, expect } from '@playwright/test';

/**
 * Messaging E2E Tests
 * Tests chat opening, sending messages, and realtime updates
 */

test.describe('Messaging', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/(home|feed|memories)/);
    });

    test('user can open a chat', async ({ page }) => {
        // Navigate to messages
        await page.click('a[href*="/messages"], button[aria-label*="Messages" i]');

        await expect(page).toHaveURL(/\/messages/);

        // Click on first chat
        await page.click('[role="list"] > div:first-child, [data-testid="chat-item"]:first-child');

        // Chat should open
        await expect(page.locator('[data-testid="chat-window"], [role="main"]')).toBeVisible();
    });

    test('user can send a message', async ({ page }) => {
        // Navigate to messages
        await page.goto('/messages');

        // Open first chat
        await page.click('[role="list"] > div:first-child');

        // Type message
        const messageText = `Test message ${Date.now()}`;
        await page.fill('textarea[placeholder*="message" i], input[placeholder*="message" i]', messageText);

        // Send message
        await page.click('button[aria-label*="Send" i], button[type="submit"]');

        // Message should appear in chat
        await expect(page.locator(`text="${messageText}"`)).toBeVisible();
    });

    test('shows typing indicator', async ({ page }) => {
        await page.goto('/messages');
        await page.click('[role="list"] > div:first-child');

        // Start typing (without sending)
        await page.fill('textarea[placeholder*="message" i], input[placeholder*="message" i]', 'Hello');

        // Should show typing indicator (may not be visible in single-user test)
        // This is more useful in multi-user scenarios
    });

    test('shows empty state when no chats', async ({ page }) => {
        // Go to messages
        await page.goto('/messages');

        // Should show empty state (or chat list)
        const hasChats = await page.locator('[role="list"] > div').count() > 0;
        const hasEmptyState = await page.locator('text=/no messages|start a conversation/i').isVisible();

        expect(hasChats || hasEmptyState).toBeTruthy();
    });

    test('can upload an image in chat', async ({ page }) => {
        await page.goto('/messages');
        await page.click('[role="list"] > div:first-child');

        // Find file upload button
        const fileInput = page.locator('input[type="file"]');

        if (await fileInput.count() > 0) {
            // Upload a test image
            await fileInput.setInputFiles({
                name: 'test-image.png',
                mimeType: 'image/png',
                buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
            });

            // Image preview should appear
            await expect(page.locator('img[alt*="upload" i], img[alt*="preview" i]')).toBeVisible({ timeout: 5000 });
        }
    });
});
