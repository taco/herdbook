import { test, expect } from '@playwright/test';
import { selectRadixOption } from '@/utils/radixHelpers';
import {
    TEST_HORSE_NAME,
    TEST_RIDER_NAME,
    TEST_RIDER_EMAIL,
    TEST_RIDER_PASSWORD,
} from '@/seedConstants';

test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('input[id="email"]', TEST_RIDER_EMAIL);
        await page.fill('input[id="password"]', TEST_RIDER_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('can log a new session', async ({ page }) => {
        const uniqueNote = `Worked on canter transitions ${Date.now()}`;

        await page.waitForSelector('text=Log Session', { state: 'visible' });
        await page.click('text=Log Session');
        await page.waitForURL('/sessions/new');

        await selectRadixOption(page, 'Horse', TEST_HORSE_NAME);
        await page.fill('input[id="durationMinutes"]', '45');
        await selectRadixOption(page, 'Work type', 'Flatwork');
        await page.fill('textarea[id="notes"]', uniqueNote);

        await page.click('button[type="submit"]:has-text("Log Session")');

        await page.waitForURL('/');
        await expect(page).toHaveURL('/');

        await expect(page.getByText(uniqueNote)).toBeVisible();
    });

    test('shows horse context when selecting horse', async ({ page }) => {
        await page.click('text=Log Session');
        await page.waitForURL('/sessions/new');

        await page.waitForSelector('label:has-text("Horse")', {
            state: 'visible',
        });

        await selectRadixOption(page, 'Horse', TEST_HORSE_NAME);

        // Wait for last session context to load (if there is one)
        // The component shows a skeleton while loading, then the ActivityCard
        // We'll check that the previous session section is visible
        const previousSessionLabel = page.locator(
            'label:has-text("Previous session")'
        );
        await expect(previousSessionLabel).toBeVisible();

        // The section should either show a skeleton (loading) or content (loaded)
        // Both are valid states, we just verify the section exists
        const previousSessionSection = previousSessionLabel.locator('..');
        await expect(previousSessionSection).toBeVisible();
    });

    test('can view session details by tapping activity card', async ({
        page,
    }) => {
        // First create a session
        const uniqueNote = `Session for detail view test ${Date.now()}`;
        await page.click('text=Log Session');
        await page.waitForURL('/sessions/new');
        await selectRadixOption(page, 'Horse', TEST_HORSE_NAME);
        await page.fill('input[id="durationMinutes"]', '30');
        await selectRadixOption(page, 'Work type', 'Groundwork');
        await page.fill('textarea[id="notes"]', uniqueNote);
        await page.click('button[type="submit"]:has-text("Log Session")');
        await page.waitForURL('/');

        // Find and click the activity card with our note
        const activityCard = page.locator('text=' + uniqueNote).first();
        await activityCard.click();

        // Verify the sheet opens with session details
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        // Check for horse name specifically in the dialog header
        await expect(
            dialog.getByRole('heading', { name: TEST_HORSE_NAME })
        ).toBeVisible();
        await expect(dialog.getByText('Groundwork')).toBeVisible();
        await expect(dialog.getByText('30 minutes')).toBeVisible();
        await expect(dialog.getByText(TEST_RIDER_NAME)).toBeVisible();
        await expect(dialog.getByText(uniqueNote)).toBeVisible();
        await expect(
            dialog.getByRole('button', { name: 'Edit Session' })
        ).toBeVisible();
    });

    test('can edit a session', async ({ page }) => {
        // First create a session
        const originalNote = `Original note ${Date.now()}`;
        await page.click('text=Log Session');
        await page.waitForURL('/sessions/new');
        await selectRadixOption(page, 'Horse', TEST_HORSE_NAME);
        await page.fill('input[id="durationMinutes"]', '45');
        await selectRadixOption(page, 'Work type', 'Flatwork');
        await page.fill('textarea[id="notes"]', originalNote);
        await page.click('button[type="submit"]:has-text("Log Session")');
        await page.waitForURL('/');

        // Click on the activity card to open details
        const activityCard = page.locator('text=' + originalNote).first();
        await activityCard.click();

        // Click Edit Session button in the dialog
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Edit Session' }).click();
        await page.waitForURL(/\/sessions\/.*\/edit/);

        // Verify we're on edit page with correct data loaded
        await expect(page.getByText('Edit session')).toBeVisible();
        // Wait for the form data to be fully populated
        await expect(page.locator('textarea[id="notes"]')).toHaveValue(
            originalNote
        );
        // Also wait for the horse select to show the correct value (not placeholder)
        await expect(page.locator('button[id="horseId"]')).not.toHaveText(
            'Select a horse'
        );
        // Wait for work type select to be populated
        await expect(page.locator('button[id="workType"]')).not.toHaveText(
            'Select a work type'
        );

        // Update the notes
        const updatedNote = `Updated note ${Date.now()}`;
        await page.fill('textarea[id="notes"]', updatedNote);

        // Click the Save submit button
        await page.click('button[type="submit"]:has-text("Save")');

        // Verify redirect and updated content
        await page.waitForURL('/');
        await expect(page.getByText(updatedNote)).toBeVisible();
        await expect(page.getByText(originalNote)).not.toBeVisible();
    });

    test('can delete a session', async ({ page }) => {
        // First create a session
        const uniqueNote = `Session to delete ${Date.now()}`;
        await page.click('text=Log Session');
        await page.waitForURL('/sessions/new');
        await selectRadixOption(page, 'Horse', TEST_HORSE_NAME);
        await page.fill('input[id="durationMinutes"]', '20');
        await selectRadixOption(page, 'Work type', 'Trail');
        await page.fill('textarea[id="notes"]', uniqueNote);
        await page.click('button[type="submit"]:has-text("Log Session")');
        await page.waitForURL('/');

        // Verify session exists
        await expect(page.getByText(uniqueNote)).toBeVisible();

        // Click on the activity card to open details
        const activityCard = page.locator('text=' + uniqueNote).first();
        await activityCard.click();

        // Click Edit Session button in the detail sheet
        const detailSheet = page.getByRole('dialog');
        await detailSheet.getByRole('button', { name: 'Edit Session' }).click();
        await page.waitForURL(/\/sessions\/.*\/edit/);

        // Click Delete Session button
        await page.getByRole('button', { name: 'Delete Session' }).click();

        // Confirm deletion in the alert dialog
        const alertDialog = page.getByRole('alertdialog');
        await expect(alertDialog.getByText('Delete session?')).toBeVisible();
        await alertDialog.getByRole('button', { name: 'Delete' }).click();

        // Verify redirect and session is gone
        await page.waitForURL('/');
        await expect(page.getByText(uniqueNote)).not.toBeVisible();
    });
});
