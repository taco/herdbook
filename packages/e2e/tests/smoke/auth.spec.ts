import { test, expect } from '@playwright/test';
import { TEST_RIDER_EMAIL, TEST_RIDER_PASSWORD } from '@/seedConstants';

// Auth tests need a clean browser state — they test the login/signup flows directly
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
    test('can log in with valid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill in login form
        await page.fill('input[id="email"]', TEST_RIDER_EMAIL);
        await page.fill('input[id="password"]', TEST_RIDER_PASSWORD);

        // Submit form
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
    });

    test('shows error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill in login form with wrong password
        await page.fill('input[id="email"]', TEST_RIDER_EMAIL);
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

    // TODO(#89): re-enable — needs E2E seed barn with invite code and test to fill inviteCode field
    test.skip('shows error for duplicate email on signup', async ({ page }) => {
        await page.goto('/signup');

        // Try to sign up with existing email
        await page.fill('input[id="name"]', 'Another User');
        await page.fill('input[id="email"]', TEST_RIDER_EMAIL);
        await page.fill('input[id="password"]', TEST_RIDER_PASSWORD);

        // Submit form
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(page.locator('text=Email already in use')).toBeVisible();

        // Should still be on signup page
        await expect(page).toHaveURL('/signup');
    });
});
