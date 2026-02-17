#!/usr/bin/env node

/**
 * Delete the Neon dev branch and switch back to local env.
 *
 * 1. Check if dev branch exists (exit cleanly if not)
 * 2. Delete the branch
 * 3. Switch the API env symlink back to .env.local
 */

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── constants ───────────────────────────────────────────────────────
const PROJECT_ID = 'aged-fire-09682517';
const BRANCH_NAME = 'dev';

// ── colour helpers ──────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function log(msg) {
    console.log(`${YELLOW}[branch-delete]${RESET} ${msg}`);
}

function success(msg) {
    console.log(`${GREEN}[branch-delete]${RESET} ${msg}`);
}

function error(msg) {
    console.error(`${RED}[branch-delete]${RESET} ${msg}`);
}

// ── helpers ─────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
    const result = execSync(cmd, { encoding: 'utf-8', ...opts });
    return result ? result.trim() : '';
}

function branchExists() {
    try {
        run(`neonctl branches get ${BRANCH_NAME} --project-id ${PROJECT_ID}`, {
            stdio: 'pipe',
        });
        return true;
    } catch {
        return false;
    }
}

// ── main ────────────────────────────────────────────────────────────
try {
    // 1. Check if branch exists
    if (!branchExists()) {
        log(`Branch "${BRANCH_NAME}" does not exist, nothing to delete.`);
        process.exit(0);
    }

    // 2. Delete the branch
    log(`Deleting branch "${BRANCH_NAME}"...`);
    run(`neonctl branches delete ${BRANCH_NAME} --project-id ${PROJECT_ID}`, {
        stdio: 'inherit',
    });

    // 3. Switch env to local
    run('ln -sf ../../.env.local packages/api/.env', { cwd: ROOT });

    // 4. Confirmation
    console.log('');
    success(`Branch "${BRANCH_NAME}" deleted.`);
    console.log(`${DIM}  Env switched to: .env.local`);
    console.log(`  Next step:       pnpm run dev${RESET}`);
    console.log('');
} catch (err) {
    error(err.message);
    process.exit(1);
}
