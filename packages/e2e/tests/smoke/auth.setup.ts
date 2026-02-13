import { test as setup } from '@playwright/test';
import { TEST_RIDER_EMAIL, TEST_RIDER_PASSWORD } from '@/seedConstants';

const AUTH_FILE = 'playwright/.auth/user.json';

setup('authenticate as test rider', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="email"]', TEST_RIDER_EMAIL);
    await page.fill('input[id="password"]', TEST_RIDER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.context().storageState({ path: AUTH_FILE });
});
