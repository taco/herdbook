import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@herdbook.test';
const TEST_PASSWORD = 'testpassword123';

test.describe('Authentication', () => {
    test('can sign up a new user', async ({ page }) => {
        await page.goto('/signup');

        const uniqueEmail = `newuser-${Date.now()}@herdbook.test`;

        // Fill in signup form
        await page.fill('input[id="name"]', 'New Test User');
        await page.fill('input[id="email"]', uniqueEmail);
        await page.fill('input[id="password"]', 'password123');

        // Submit form
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
    });

    test('can log in with valid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill in login form
        await page.fill('input[id="email"]', TEST_EMAIL);
        await page.fill('input[id="password"]', TEST_PASSWORD);

        // Submit form
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
    });

    test('shows error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill in login form with wrong password
        await page.fill('input[id="email"]', TEST_EMAIL);
        await page.fill('input[id="password"]', 'wrongpassword');

        // Submit form
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(
            page.locator('text=Invalid email or password')
        ).toBeVisible();

        // Should still be on login page
        await expect(page).toHaveURL('/login');
    });

    test('shows error for duplicate email on signup', async ({ page }) => {
        await page.goto('/signup');

        // Try to sign up with existing email
        await page.fill('input[id="name"]', 'Another User');
        await page.fill('input[id="email"]', TEST_EMAIL);
        await page.fill('input[id="password"]', 'password123');

        // Submit form
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(page.locator('text=Email already in use')).toBeVisible();

        // Should still be on signup page
        await expect(page).toHaveURL('/signup');
    });
});
