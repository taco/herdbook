import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests',
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Global setup and teardown */
    globalSetup: './global-setup.ts',
    globalTeardown: './global-teardown.ts',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('')`. */
        baseURL: 'http://127.0.0.1:3001',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    /* Configure projects for major browsers */
    projects: [

        /* Test against mobile viewports. */
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],

    /* Run local dev server before starting the tests */
    webServer: [
        {
            command: 'pnpm --filter api dev',
            url: 'http://127.0.0.1:4001',
            reuseExistingServer: !process.env.CI,
            env: {
                PORT: '4001',
                DATABASE_URL:
                    'postgresql://postgres:test@127.0.0.1:5433/herdbook_test',
            },
            timeout: 30 * 1000,
        },
        {
            command: 'pnpm --filter web dev --port 3001',
            url: 'http://127.0.0.1:3001',
            reuseExistingServer: !process.env.CI,
            env: {
                VITE_API_URL: 'http://127.0.0.1:4001/graphql',
            },
            timeout: 30 * 1000,
        },
    ],
});
