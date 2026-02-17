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

    test('log session button navigates to new session with horse prefilled', async ({
        page,
    }) => {
        await page.getByRole('button', { name: 'Horses' }).click();
        await page.click(`text=${TEST_HORSE_NAME}`);

        await page.getByRole('button', { name: 'Log Session' }).click();
        await expect(page).toHaveURL('/sessions/new');

        // Horse should be prefilled in the summary row
        await expect(
            page.getByRole('button', { name: 'Edit Horse' })
        ).toContainText(TEST_HORSE_NAME);
    });
});
