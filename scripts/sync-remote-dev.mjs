#!/usr/bin/env node

/**
 * Sync the remote Neon dev branch to latest production state.
 *
 * 1. Check neonctl is installed
 * 2. Reset (or create) the dev branch from production
 * 3. Get connection string and update .env.api.neon-dev
 * 4. Apply pending Prisma migrations to handle schema drift
 * 5. Switch the API env symlink to .env.api.neon-dev
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── constants ───────────────────────────────────────────────────────
const PROJECT_ID = 'aged-fire-09682517';
const BRANCH_NAME = 'dev';
const PARENT_BRANCH = 'production';

// ── colour helpers ──────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function log(msg) {
    console.log(`${YELLOW}[sync-dev]${RESET} ${msg}`);
}

function success(msg) {
    console.log(`${GREEN}[sync-dev]${RESET} ${msg}`);
}

function error(msg) {
    console.error(`${RED}[sync-dev]${RESET} ${msg}`);
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
    // 1. Check neonctl is installed
    try {
        run('neonctl --version', { stdio: 'pipe' });
    } catch {
        error('neonctl is not installed.');
        console.error(
            `${DIM}Install it with: npm install -g neonctl\nThen authenticate: neonctl auth${RESET}`
        );
        process.exit(1);
    }

    // 2. Reset or create dev branch
    if (branchExists()) {
        log(`Resetting branch "${BRANCH_NAME}" from "${PARENT_BRANCH}"...`);
        run(
            `neonctl branches reset ${BRANCH_NAME} --parent --project-id ${PROJECT_ID}`,
            { stdio: 'inherit' }
        );
    } else {
        log(`Creating branch "${BRANCH_NAME}" from "${PARENT_BRANCH}"...`);
        run(
            `neonctl branches create --name ${BRANCH_NAME} --parent ${PARENT_BRANCH} --project-id ${PROJECT_ID}`,
            { stdio: 'inherit' }
        );
    }

    // 3. Get connection string
    log('Getting connection string...');
    const connectionString = run(
        `neonctl connection-string ${BRANCH_NAME} --pooled --project-id ${PROJECT_ID}`,
        { stdio: 'pipe' }
    );

    // 4. Update .env.neon-dev (before migrations so it's available for manual debugging)
    const envPath = resolve(ROOT, '.env.api.neon-dev');
    const prodEnvPath = resolve(ROOT, '.env.api.neon-prod');

    if (existsSync(envPath)) {
        let content = readFileSync(envPath, 'utf-8');
        content = content.replace(
            /^DATABASE_URL=.*/m,
            `DATABASE_URL="${connectionString}"`
        );
        writeFileSync(envPath, content);
        log('Updated DATABASE_URL in .env.api.neon-dev');
    } else if (existsSync(prodEnvPath)) {
        let content = readFileSync(prodEnvPath, 'utf-8');
        content = content.replace(
            /^DATABASE_URL=.*/m,
            `DATABASE_URL="${connectionString}"`
        );
        writeFileSync(envPath, content);
        log('Created .env.api.neon-dev from .env.api.neon-prod template');
    } else {
        writeFileSync(envPath, `DATABASE_URL="${connectionString}"\n`);
        log('Created .env.api.neon-dev (no .env.api.neon-prod template found)');
    }

    // 5. Apply pending migrations
    log('Applying pending migrations...');
    try {
        run('pnpm --filter api run prisma:migrate:deploy', {
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL: connectionString },
        });
    } catch {
        error('Migration failed. You may need to fix the migration manually.');
        error('Connection string is saved in .env.api.neon-dev');
        process.exit(1);
    }

    // 6. Switch env symlink
    run('ln -sf ../../.env.api.neon-dev packages/api/.env', { cwd: ROOT });

    // 7. Summary
    console.log('');
    success('Dev branch is ready with fresh production data!');
    console.log(`${DIM}  Branch:     ${BRANCH_NAME}`);
    console.log(`  Parent:     ${PARENT_BRANCH}`);
    console.log(`  Env file:   .env.api.neon-dev`);
    console.log(`  Next step:  pnpm run dev${RESET}`);
    console.log('');
} catch (err) {
    error(err.message);
    process.exit(1);
}
