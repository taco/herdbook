import { defineConfig, devices } from '@playwright/test';

export const STORAGE_STATE = 'playwright/.auth/user.json';

/**
 * Base Playwright configuration — used for local development (runs all projects).
 * CI uses playwright.smoke.config.ts and playwright.regression.config.ts instead.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    timeout: 30 * 1000,
    globalSetup: './global-setup.ts',
    globalTeardown: './global-teardown.ts',
    use: {
        baseURL: 'http://127.0.0.1:3099',
        trace: 'on-first-retry',
    },

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
        {
            name: 'regression-chrome',
            testDir: './tests/regression',
            use: { ...devices['Pixel 5'] },
            dependencies: ['smoke-chrome'],
        },
        {
            name: 'regression-safari',
            testDir: './tests/regression',
            use: { ...devices['iPhone 12'] },
            dependencies: ['smoke-chrome'],
        },
    ],

    webServer: [
        {
            command: 'pnpm --filter api dev',
            url: 'http://127.0.0.1:4099/health',
            reuseExistingServer: !process.env.CI,
            env: {
                PORT: '4099',
                DATABASE_URL:
                    'postgresql://postgres:test@127.0.0.1:5433/herdbook_test',
                JWT_SECRET: 'e2e-test-jwt-secret',
                RATE_LIMIT_AUTH: '1000',
                RATE_LIMIT_WRITE: '1000',
                RATE_LIMIT_READ: '1000',
                USE_HTTPS: 'false',
            },
            timeout: 30 * 1000,
        },
        {
            command: 'pnpm --filter web dev --port 3099',
            url: 'http://127.0.0.1:3099',
            reuseExistingServer: !process.env.CI,
            env: {
                VITE_API_URL: 'http://127.0.0.1:4099',
                VITE_DEV_AUTOLOGIN: 'false',
                USE_HTTPS: 'false',
            },
            timeout: 30 * 1000,
        },
    ],
});
