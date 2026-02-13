import { test, expect } from '@playwright/test';
import {
    TEST_HORSE_NAME,
    TEST_RIDER_NAME,
    TEST_RIDER_EMAIL,
    TEST_RIDER_PASSWORD,
} from '@/seedConstants';
import { resetDatabase } from './utils/resetDatabase';

test.beforeAll(() => {
    resetDatabase();
});

/** Helper: open the field edit drawer, select an option, and wait for it to close */
async function selectFieldOption(
    page: import('@playwright/test').Page,
    fieldLabel: string,
    optionText: string
): Promise<void> {
    // Tap the SummaryRow to open the FieldEditSheet
    await page.getByLabel(`Edit ${fieldLabel}`).click();
    // Wait for the sheet to appear and pick the option
    const sheet = page.getByRole('dialog');
    await sheet.getByText(optionText, { exact: true }).click();
    // Sheet auto-closes on selection for list fields
    await expect(sheet).not.toBeVisible();
}

/** Helper: open a field drawer, type a value, and tap Done */
async function setFieldValue(
    page: import('@playwright/test').Page,
    fieldLabel: string,
    value: string
): Promise<void> {
    await page.getByLabel(`Edit ${fieldLabel}`).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    const input = sheet.locator('input, textarea').first();
    await input.fill(value);
    await sheet.getByRole('button', { name: 'Done' }).click();
    await expect(sheet).not.toBeVisible();
}

/** Helper: open notes editor, type notes, and tap Done */
async function setNotes(
    page: import('@playwright/test').Page,
    notes: string
): Promise<void> {
    // Notes has a different entry point — the "Edit" link in the NotesSection
    await page.getByLabel('Edit Notes').click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    const textarea = sheet.locator('textarea').first();
    await textarea.fill(notes);
    await sheet.getByRole('button', { name: 'Done' }).click();
    await expect(sheet).not.toBeVisible();
}

test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[id="email"]', TEST_RIDER_EMAIL);
        await page.fill('input[id="password"]', TEST_RIDER_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('can log a new session', async ({ page }) => {
        const uniqueNote = `Worked on canter transitions ${Date.now()}`;

        await page.goto('/sessions/new');

        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Flatwork');
        await setFieldValue(page, 'Duration', '45');
        await setNotes(page, uniqueNote);

        await page.getByRole('button', { name: 'Save Session' }).click();

        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
        await expect(page.getByText(uniqueNote)).toBeVisible();
    });

    test('can view session details by tapping activity card', async ({
        page,
    }) => {
        // First create a session
        const uniqueNote = `Session for detail view test ${Date.now()}`;
        await page.goto('/sessions/new');
        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Groundwork');
        await setFieldValue(page, 'Duration', '30');
        await setNotes(page, uniqueNote);
        await page.getByRole('button', { name: 'Save Session' }).click();
        await page.waitForURL('/');

        // Find and click the activity card with our note
        await page.getByText(uniqueNote).first().click();

        // Verify we're on the session detail page
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);

        // Check session details are visible on the detail page
        await expect(page.getByText(TEST_HORSE_NAME).first()).toBeVisible();
        await expect(page.getByText('Groundwork').first()).toBeVisible();
        await expect(page.getByText('30 minutes')).toBeVisible();
        await expect(page.getByText(TEST_RIDER_NAME).first()).toBeVisible();
        await expect(page.getByText(uniqueNote)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    });

    test('can edit a session', async ({ page }) => {
        // First create a session
        const originalNote = `Original note ${Date.now()}`;
        await page.goto('/sessions/new');
        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Flatwork');
        await setFieldValue(page, 'Duration', '45');
        await setNotes(page, originalNote);
        await page.getByRole('button', { name: 'Save Session' }).click();
        await page.waitForURL('/');

        // Click on the activity card to open session detail
        await page.getByText(originalNote).first().click();
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);

        // Click Edit button in the header
        await page.getByRole('button', { name: 'Edit' }).click();

        // The edit overlay should show with the drawer-based editor
        await expect(
            page.getByRole('heading', { name: 'Edit Session' })
        ).toBeVisible();

        // Verify current notes value is shown in the edit overlay
        await expect(page.getByText(originalNote).first()).toBeVisible();

        // Update the notes via the drawer
        const updatedNote = `Updated note ${Date.now()}`;
        await setNotes(page, updatedNote);

        // Save — should close edit overlay and return to detail
        await page.getByRole('button', { name: 'Save Session' }).click();

        // Should still be on the session detail page (not redirected to dashboard)
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
        await expect(page.getByText(updatedNote)).toBeVisible();

        // Go back to dashboard and verify update is reflected
        await page.getByLabel('Go back').first().click();
        await page.waitForURL('/');
        await expect(page.getByText(updatedNote)).toBeVisible();
        await expect(page.getByText(originalNote)).not.toBeVisible();
    });

    test('can delete a session', async ({ page }) => {
        // First create a session
        const uniqueNote = `Session to delete ${Date.now()}`;
        await page.goto('/sessions/new');
        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Trail');
        await setFieldValue(page, 'Duration', '20');
        await setNotes(page, uniqueNote);
        await page.getByRole('button', { name: 'Save Session' }).click();
        await page.waitForURL('/');

        // Verify session exists
        await expect(page.getByText(uniqueNote)).toBeVisible();

        // Click on the activity card to open session detail
        await page.getByText(uniqueNote).first().click();
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);

        // Click Edit button to open edit overlay
        await page.getByRole('button', { name: 'Edit' }).click();
        await expect(
            page.getByRole('heading', { name: 'Edit Session' })
        ).toBeVisible();

        // Click Delete Session button
        await page.getByRole('button', { name: 'Delete Session' }).click();

        // Confirm deletion in the alert dialog
        const alertDialog = page.getByRole('alertdialog');
        await expect(alertDialog.getByText('Delete session?')).toBeVisible();
        await alertDialog.getByRole('button', { name: 'Delete' }).click();

        // Verify redirect to dashboard and session is gone
        await page.waitForURL('/');
        await expect(page.getByText(uniqueNote)).not.toBeVisible();
    });

    test('can filter sessions by work type and persist across navigation', async ({
        page,
    }) => {
        const ts = Date.now();
        const flatworkNote = `Flatwork filter test ${ts}`;
        const groundworkNote = `Groundwork filter test ${ts}`;

        // Create a Flatwork session
        await page.goto('/sessions/new');
        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Flatwork');
        await setFieldValue(page, 'Duration', '30');
        await setNotes(page, flatworkNote);
        await page.getByRole('button', { name: 'Save Session' }).click();
        await page.waitForURL('/');

        // Create a Groundwork session
        await page.goto('/sessions/new');
        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Groundwork');
        await setFieldValue(page, 'Duration', '25');
        await setNotes(page, groundworkNote);
        await page.getByRole('button', { name: 'Save Session' }).click();
        await page.waitForURL('/');

        // Go to sessions list
        await page.goto('/sessions');
        await expect(page.getByText(flatworkNote)).toBeVisible();
        await expect(page.getByText(groundworkNote)).toBeVisible();

        // Apply work type filter: tap "Work type" chip → pick Flatwork
        await page.getByRole('button', { name: 'Work type' }).click();
        const sheet = page.getByRole('dialog');
        await sheet.getByText('Flatwork', { exact: true }).click();
        await expect(sheet).not.toBeVisible();

        // Flatwork session visible, Groundwork hidden
        await expect(page.getByText(flatworkNote)).toBeVisible();
        await expect(page.getByText(groundworkNote)).not.toBeVisible();

        // Filter chip should show active label
        await expect(
            page.getByRole('button', { name: /Flatwork/ })
        ).toBeVisible();

        // Navigate to session detail and back — filter persists
        await page.getByText(flatworkNote).click();
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
        await page.getByLabel('Go back').click();
        await expect(page).toHaveURL(/\/sessions\?/);
        await expect(page.getByText(flatworkNote)).toBeVisible();
        await expect(page.getByText(groundworkNote)).not.toBeVisible();

        // Clear the filter
        await page.getByLabel('Clear Work type filter').click();
        await expect(page.getByText(flatworkNote)).toBeVisible();
        await expect(page.getByText(groundworkNote)).toBeVisible();
    });
});
