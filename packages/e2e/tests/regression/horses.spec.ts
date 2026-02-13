import { test, expect } from '@playwright/test';
import { TEST_RIDER_EMAIL, TEST_RIDER_PASSWORD } from '@/seedConstants';
import { resetDatabase } from '../utils/resetDatabase';

test.beforeAll(() => {
    resetDatabase();
});

test.describe('Horse Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[id="email"]', TEST_RIDER_EMAIL);
        await page.fill('input[id="password"]', TEST_RIDER_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('can create and then edit a horse', async ({ page }) => {
        const uniqueName = `Test Horse ${Date.now()}`;
        const updatedName = `Updated Horse ${Date.now()}`;

        // Navigate directly to create horse page
        await page.goto('/horses/new');

        // Create horse
        await page.fill('input[id="name"]', uniqueName);
        await page.fill('textarea[id="notes"]', 'Test notes');
        await page.click('button[type="submit"]');

        // Verify redirected and horse appears
        await page.waitForURL('/');
        await expect(page.getByText(uniqueName)).toBeVisible();

        // Click horse card → lands on profile
        await page.click(`text=${uniqueName}`);
        await expect(page).toHaveURL(/\/horses\/[^/]+$/);

        // Navigate to edit from profile
        await page.getByRole('button', { name: 'Edit' }).click();
        await expect(page).toHaveURL(/\/horses\/.*\/edit/);

        // Wait for the edit form to load the horse data
        const nameInput = page.locator('input[id="name"]');
        await expect(nameInput).toHaveValue(uniqueName);

        // Edit horse name
        await nameInput.fill(updatedName);
        await page.click('button[type="submit"]');

        // Verify changes
        await page.waitForURL('/');
        await expect(page.getByText(updatedName)).toBeVisible();
        await expect(page.getByText(uniqueName)).not.toBeVisible();
    });

    test('can deactivate a horse via the Active checkbox', async ({ page }) => {
        const uniqueName = `Active Test ${Date.now()}`;

        // Create a horse first
        await page.goto('/horses/new');
        await page.fill('input[id="name"]', uniqueName);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
        await expect(page.getByText(uniqueName)).toBeVisible();

        // Click into profile, then edit
        await page.click(`text=${uniqueName}`);
        await expect(page).toHaveURL(/\/horses\/[^/]+$/);
        await page.getByRole('button', { name: 'Edit' }).click();
        await expect(page).toHaveURL(/\/horses\/.*\/edit/);

        // Uncheck the Active checkbox
        const checkbox = page.locator('input[id="isActive"]');
        await expect(checkbox).toBeChecked();
        await checkbox.uncheck();
        await page.click('button[type="submit"]');

        // Horse should disappear from dashboard
        await page.waitForURL('/');
        await expect(page.getByText(uniqueName)).not.toBeVisible();
    });
});
