import { test, expect } from '@playwright/test';
import { selectRadixOption } from '@/utils/radixHelpers';
import { TEST_HORSE_NAME } from '@/seedConstants';

const TEST_EMAIL = 'test@herdbook.test';
const TEST_PASSWORD = 'testpassword123';

test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('input[id="email"]', TEST_EMAIL);
        await page.fill('input[id="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('can log a new session', async ({ page }) => {
        const uniqueNote = `Worked on canter transitions ${Date.now()}`;

        await page.waitForSelector('text=Log Session', { state: 'visible' });
        await page.click('text=Log Session');
        await page.waitForURL('/sessions/new');
        
        await selectRadixOption(page, "Horse", TEST_HORSE_NAME);
        await page.fill('input[id="durationMinutes"]', '45');
        await selectRadixOption(page, "Work type", "Flatwork");
        await page.fill('textarea[id="notes"]', uniqueNote);
        
        await page.click('button[type="submit"]:has-text("Log Session")');

        await page.waitForURL('/');
        await expect(page).toHaveURL('/');

        await expect(page.getByText(uniqueNote)).toBeVisible();
    });

    test('shows horse context when selecting horse', async ({ page }) => {
        await page.click('text=Log Session');
        await page.waitForURL('/sessions/new');

        await page.waitForSelector('label:has-text("Horse")', { state: 'visible' });

        await selectRadixOption(page, "Horse", TEST_HORSE_NAME);

        // Wait for last session context to load (if there is one)
        // The component shows a skeleton while loading, then the ActivityCard
        // We'll check that the previous session section is visible
        const previousSessionLabel = page.locator('label:has-text("Previous session")');
        await expect(previousSessionLabel).toBeVisible();
        
        // The section should either show a skeleton (loading) or content (loaded)
        // Both are valid states, we just verify the section exists
        const previousSessionSection = previousSessionLabel.locator('..');
        await expect(previousSessionSection).toBeVisible();
    });
});
