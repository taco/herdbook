import { test, expect } from '@playwright/test';
import { TEST_RIDER_NAME, TEST_HORSE_NAME } from '@/seedConstants';

// storageState from smoke-setup handles auth — no manual login needed

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForURL('/');
    });

    test('bottom tab bar navigates between main pages', async ({ page }) => {
        // Should start on Home
        await expect(page).toHaveURL('/');

        // Navigate to Horses tab
        await page.getByRole('button', { name: 'Horses' }).click();
        await expect(page).toHaveURL('/horses');
        await expect(
            page.getByRole('heading', { name: 'Horses' })
        ).toBeVisible();

        // Navigate to Sessions tab
        await page.getByRole('button', { name: 'Sessions' }).click();
        await expect(page).toHaveURL('/sessions');
        await expect(
            page.getByRole('heading', { name: 'Sessions' })
        ).toBeVisible();

        // Navigate to Profile tab
        await page.getByRole('button', { name: 'Me', exact: true }).click();
        await expect(page).toHaveURL('/profile');
        await expect(page.getByText(TEST_RIDER_NAME)).toBeVisible();

        // Navigate back to Home tab
        await page.getByRole('button', { name: 'Home', exact: true }).click();
        await expect(page).toHaveURL('/');
    });

    test('sub-page slides in over tab page and back button returns', async ({
        page,
    }) => {
        // Navigate to a horse profile (sub-page)
        await page.getByText(TEST_HORSE_NAME).first().click();
        await expect(page).toHaveURL(/\/horses\/[^/]+$/);

        // Back button should be visible on the sub-page
        const backButton = page.getByLabel('Go back');
        await expect(backButton).toBeVisible();

        // Click back — view transition plays, then navigates to previous page
        await backButton.click();
        await expect(page).toHaveURL('/');
    });

    test('profile logout clears auth and redirects to login', async ({
        page,
    }) => {
        // Navigate to profile
        await page.getByRole('button', { name: 'Me', exact: true }).click();
        await expect(page).toHaveURL('/profile');

        // Click logout
        await page.getByRole('button', { name: 'Log Out' }).click();

        // Should redirect to login
        await expect(page).toHaveURL('/login');

        // Going to home should redirect back to login (not authenticated)
        await page.goto('/');
        await expect(page).toHaveURL('/login');
    });

    test('center Log tab navigates to voice capture', async ({ page }) => {
        await page.getByRole('button', { name: 'Log' }).click();
        await expect(page).toHaveURL('/sessions/voice');
    });
});
