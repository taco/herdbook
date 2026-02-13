import { defineConfig, devices } from '@playwright/test';
import baseConfig, { STORAGE_STATE } from './playwright.config';

/**
 * Smoke test config — Chromium-only, parallel, with shared auth state.
 * Used by CI on pull requests for fast feedback.
 */
export default defineConfig({
    ...baseConfig,
    workers: 2,
    fullyParallel: true,

    projects: [
        {
            name: 'smoke-setup',
            testDir: './tests/smoke',
            testMatch: /.*\.setup\.ts/,
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'smoke-chrome',
            testDir: './tests/smoke',
            testIgnore: /.*\.setup\.ts/,
            use: {
                ...devices['Pixel 5'],
                storageState: STORAGE_STATE,
            },
            dependencies: ['smoke-setup'],
        },
    ],
});
