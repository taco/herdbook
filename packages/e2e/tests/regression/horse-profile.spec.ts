import { test, expect } from '@playwright/test';
import {
    TEST_HORSE_NAME,
    TEST_RIDER_EMAIL,
    TEST_RIDER_PASSWORD,
} from '@/seedConstants';

test.describe('Horse Profile', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[id="email"]', TEST_RIDER_EMAIL);
        await page.fill('input[id="password"]', TEST_RIDER_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('navigates to horse profile from horses list', async ({ page }) => {
        // Go to Horses tab
        await page.getByRole('button', { name: 'Horses' }).click();
        await expect(page).toHaveURL('/horses');

        // Tap the seed horse card
        await page.click(`text=${TEST_HORSE_NAME}`);
        await expect(page).toHaveURL(/\/horses\/[^/]+$/);

        // Verify profile header (h1 specifically, session cards also have horse name as h3)
        await expect(
            page.locator('h1', { hasText: TEST_HORSE_NAME })
        ).toBeVisible();
    });

    test('displays activity heatmap and stats', async ({ page }) => {
        await page.getByRole('button', { name: 'Horses' }).click();
        await page.click(`text=${TEST_HORSE_NAME}`);

        // Activity section exists
        await expect(page.getByText('Activity')).toBeVisible();

        // Stats row (uses paragraph text inside stat cards)
        await expect(
            page.getByRole('paragraph').filter({ hasText: /^Sessions$/ })
        ).toBeVisible();
        await expect(page.getByText('Last Ride')).toBeVisible();
    });

    test('displays horse notes', async ({ page }) => {
        await page.getByRole('button', { name: 'Horses' }).click();
        await page.click(`text=${TEST_HORSE_NAME}`);

        // Notes section
        await expect(page.getByText('Notes')).toBeVisible();
        await expect(page.getByText('Test horse for E2E tests')).toBeVisible();
    });

    test('back button returns to horses list', async ({ page }) => {
        await page.getByRole('button', { name: 'Horses' }).click();
        await page.click(`text=${TEST_HORSE_NAME}`);
        await expect(page).toHaveURL(/\/horses\/[^/]+$/);

        await page.getByLabel('Go back').click();
        await expect(page).toHaveURL('/horses');
    });

    test('edit button navigates to edit form', async ({ page }) => {
        await page.getByRole('button', { name: 'Horses' }).click();
        await page.click(`text=${TEST_HORSE_NAME}`);

        await page.getByRole('button', { name: 'Edit' }).click();
        await expect(page).toHaveURL(/\/horses\/.*\/edit/);
    });

    test('log session button navigates to new session with horse prefilled', async ({
        page,
    }) => {
        await page.getByRole('button', { name: 'Horses' }).click();
        await page.click(`text=${TEST_HORSE_NAME}`);

        await page.getByRole('button', { name: 'Log Session' }).click();
        await expect(page).toHaveURL('/sessions/new');

        // Horse should be prefilled
        await expect(
            page.getByText(TEST_HORSE_NAME, { exact: true })
        ).toBeVisible();
    });
});
