import { test, expect } from '@playwright/test';
import {
    TEST_HORSE_NAME,
    TEST_RIDER_EMAIL,
    TEST_RIDER_PASSWORD,
    TEST_SESSION_NOTE,
} from '@/seedConstants';
import { resetDatabase } from '../utils/resetDatabase';

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

    test('can edit a session', async ({ page }) => {
        // Navigate to the seeded session via the dashboard
        await page.getByText(TEST_SESSION_NOTE).first().click();
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);

        // Click Edit button in the header
        await page.getByRole('button', { name: 'Edit' }).click();

        // The edit overlay should show with the drawer-based editor
        await expect(
            page.getByRole('heading', { name: 'Edit Session' })
        ).toBeVisible();

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
    });

    test('can delete a session', async ({ page }) => {
        // First create a session to delete (don't use the seed session —
        // other tests depend on it and test order isn't guaranteed)
        const uniqueNote = `Session to delete ${Date.now()}`;
        await page.goto('/sessions/new');
        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Trail');
        await setFieldValue(page, 'Duration', '20');
        await setNotes(page, uniqueNote);
        await page.getByRole('button', { name: 'Save Session' }).click();
        await page.waitForURL('/');

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

    test('can log a session with intensity and rating', async ({ page }) => {
        const uniqueNote = `Intensity and rating test ${Date.now()}`;

        await page.goto('/sessions/new');

        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Flatwork');
        await setFieldValue(page, 'Duration', '40');

        // Set intensity to Hard
        await page.getByRole('radio', { name: 'Hard', exact: true }).click();

        // Set rating to 4 stars
        await page.getByRole('radio', { name: '4 stars' }).click();

        await setNotes(page, uniqueNote);
        await page.getByRole('button', { name: 'Save Session' }).click();
        await page.waitForURL('/');

        // Verify the session appears on dashboard with intensity chip
        await expect(page.getByText(uniqueNote)).toBeVisible();

        // Open session detail and verify intensity and rating display
        await page.getByText(uniqueNote).first().click();
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
        await expect(page.getByText('Hard', { exact: true })).toBeVisible();
    });

    test('can edit intensity and rating on an existing session', async ({
        page,
    }) => {
        // Create a session with intensity/rating first
        const uniqueNote = `Edit intensity test ${Date.now()}`;
        await page.goto('/sessions/new');
        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Groundwork');
        await setFieldValue(page, 'Duration', '30');
        await page.getByRole('radio', { name: 'Light', exact: true }).click();
        await page.getByRole('radio', { name: '3 stars' }).click();
        await setNotes(page, uniqueNote);
        await page.getByRole('button', { name: 'Save Session' }).click();
        await page.waitForURL('/');

        // Navigate to session detail
        await page.getByText(uniqueNote).first().click();
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
        await expect(page.getByText('Light')).toBeVisible();

        // Open edit overlay
        await page.getByRole('button', { name: 'Edit' }).click();
        await expect(
            page.getByRole('heading', { name: 'Edit Session' })
        ).toBeVisible();

        // Change intensity from Light to V.Hard
        await page.getByRole('radio', { name: 'V.Hard' }).click();

        // Change rating to 5 stars
        await page.getByRole('radio', { name: '5 stars' }).click();

        await page.getByRole('button', { name: 'Save Session' }).click();

        // Verify on detail page
        await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
        await expect(page.getByText('Very Hard')).toBeVisible();
    });

    test('can deselect intensity and rating by tapping again', async ({
        page,
    }) => {
        await page.goto('/sessions/new');

        await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
        await selectFieldOption(page, 'Work Type', 'Flatwork');
        await setFieldValue(page, 'Duration', '30');

        // Select intensity, then deselect by tapping same option
        const modButton = page.getByRole('radio', { name: 'Mod' });
        await modButton.click();
        await expect(modButton).toHaveAttribute('aria-checked', 'true');
        await modButton.click();
        await expect(modButton).toHaveAttribute('aria-checked', 'false');

        // Select rating, then deselect by tapping same star
        const star3 = page.getByRole('radio', { name: '3 stars' });
        await star3.click();
        await expect(star3).toHaveAttribute('aria-checked', 'true');
        await star3.click();
        await expect(star3).toHaveAttribute('aria-checked', 'false');
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
