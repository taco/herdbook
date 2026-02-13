---
description: E2E dev loop — start infra, write/fix tests, run single tests with fast feedback, iterate, then run the full suite.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# /e2e — E2E Dev Loop

## Usage

- `/e2e` — start the E2E dev environment and iterate
- `/e2e <description>` — write or fix an E2E test for the described scenario

## Workflow

### 1. Check if E2E infra is running

```bash
curl -sf http://127.0.0.1:4099 > /dev/null && echo "up" || echo "down"
curl -sf http://127.0.0.1:3099 > /dev/null && echo "up" || echo "down"
```

### 2. Start infra if needed

```bash
pnpm run test:e2e:dev
```

This starts Docker, migrates, seeds, and launches API + Web with hot reload. Leave it running in the background.

### 3. Write or fix tests

Read these files to match current patterns:

- `packages/e2e/tests/sessions.spec.ts` — most comprehensive example (login, drawer editing, field helpers, navigation)
- `packages/e2e/tests/horses.spec.ts` — CRUD flow pattern
- `packages/e2e/tests/auth.spec.ts` — login/signup flow
- `packages/e2e/tests/seedConstants.ts` — seed data constants
- `packages/e2e/tests/utils/radixHelpers.ts` — Radix select helper

Test file location: `packages/e2e/tests/<feature>.spec.ts`

### 4. Run a single test for fast feedback

```bash
pnpm --filter e2e run test --grep "<test description>"
```

With infra already running, global-setup and teardown are skipped — tests start instantly.

### 5. Iterate

Edit source or test code. The API server (tsx watch) and Web server (Vite HMR) pick up changes automatically. Re-run the single test.

### 6. Run full suite when done

```bash
pnpm --filter e2e run test
```

## Key Conventions

- **Login in `beforeEach`**: fill email + password from seed constants, click Login, assert URL is `/`
- **`exact: true`**: on `getByRole`/`getByText` when text could partially match (e.g., "Me" matching "Home")
- **`getByRole('heading', ...)`**: when page headings duplicate tab labels
- **Drawer editing**: tap `aria-label="Edit ${label}"` to open sheet, interact with dialog, close
- **Notes editing**: `aria-label="Edit Notes"`
- **Back button**: `aria-label="Go back"`
- **Radix selects**: use `selectRadixOption(page, label, option)` from `utils/radixHelpers`
- **No `data-testid`**: prefer `getByRole`, `getByLabel`, `getByText`
- **Mobile viewport**: iPhone 12 (configured in playwright.config.ts)
- **Single worker, 30s timeout**

## Mutation Test Patterns

### Create flow

Navigate to form, fill fields via drawer helpers, submit, verify redirect and new item visible:

```typescript
test('can create a session', async ({ page }) => {
    const uniqueNote = `Test note ${Date.now()}`;
    await page.goto('/sessions/new');
    await selectFieldOption(page, 'Horse', TEST_HORSE_NAME);
    await selectFieldOption(page, 'Work Type', 'Flatwork');
    await setFieldValue(page, 'Duration', '45');
    await setNotes(page, uniqueNote);
    await page.getByRole('button', { name: 'Save Session' }).click();
    await page.waitForURL('/');
    await expect(page.getByText(uniqueNote)).toBeVisible();
});
```

### Edit flow

Navigate to detail → open edit overlay → modify → save → verify on detail page, then verify on list:

```typescript
// Open detail
await page.getByText(originalNote).first().click();
// Open edit overlay
await page.getByRole('button', { name: 'Edit' }).click();
await expect(page.getByRole('heading', { name: 'Edit Session' })).toBeVisible();
// Modify and save
await setNotes(page, updatedNote);
await page.getByRole('button', { name: 'Save Session' }).click();
// Verify stays on detail
await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
await expect(page.getByText(updatedNote)).toBeVisible();
```

### Delete flow

From edit overlay → click delete → confirm in alert dialog → verify redirect and item gone:

```typescript
await page.getByRole('button', { name: 'Delete Session' }).click();
const alertDialog = page.getByRole('alertdialog');
await expect(alertDialog.getByText('Delete session?')).toBeVisible();
await alertDialog.getByRole('button', { name: 'Delete' }).click();
await page.waitForURL('/');
await expect(page.getByText(uniqueNote)).not.toBeVisible();
```

### Drawer helper functions

Define these at the top of your test file for drawer-based field editing:

```typescript
async function selectFieldOption(page, fieldLabel, optionText) {
    await page.getByLabel(`Edit ${fieldLabel}`).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByText(optionText, { exact: true }).click();
    await expect(sheet).not.toBeVisible();
}

async function setFieldValue(page, fieldLabel, value) {
    await page.getByLabel(`Edit ${fieldLabel}`).click();
    const sheet = page.getByRole('dialog');
    const input = sheet.locator('input, textarea').first();
    await input.fill(value);
    await sheet.getByRole('button', { name: 'Done' }).click();
    await expect(sheet).not.toBeVisible();
}

async function setNotes(page, notes) {
    await page.getByLabel('Edit Notes').click();
    const sheet = page.getByRole('dialog');
    const textarea = sheet.locator('textarea').first();
    await textarea.fill(notes);
    await sheet.getByRole('button', { name: 'Done' }).click();
    await expect(sheet).not.toBeVisible();
}
```

**Key rules**: always use `Date.now()` in test data for uniqueness, verify both the immediate result (detail page) and the list view after navigating back.

## Route Reference

Read `packages/web/src/App.tsx` for the current route table.

## Ports

| Service  | Port | URL                                                     |
| -------- | ---- | ------------------------------------------------------- |
| Web      | 3099 | http://127.0.0.1:3099                                   |
| API      | 4099 | http://127.0.0.1:4099                                   |
| Postgres | 5433 | postgresql://postgres:test@127.0.0.1:5433/herdbook_test |
