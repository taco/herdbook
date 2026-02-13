import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Regression test config — Chrome + Safari, sequential.
 * Used by CI on push to main and nightly cron runs.
 */
export default defineConfig({
    ...baseConfig,

    projects: [
        {
            name: 'regression-chrome',
            testDir: './tests/regression',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'regression-safari',
            testDir: './tests/regression',
            use: { ...devices['iPhone 12'] },
        },
    ],
});
