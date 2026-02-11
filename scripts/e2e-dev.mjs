#!/usr/bin/env node

/**
 * E2E dev environment — spin up once, iterate fast, tear down when you choose.
 *
 * 1. Start Docker test container (skip if already running on 5433)
 * 2. Wait for Postgres ready
 * 3. Run migrate + seed (skip if test rider already exists)
 * 4. Spawn API dev server (tsx watch) with E2E env vars on port 4099
 * 5. Spawn Web dev server (Vite) with E2E env vars on port 3099
 * 6. Stream logs with [api]/[web] prefixes
 * 7. On SIGINT: kill servers, leave Docker running
 */

import { spawn, execSync } from 'node:child_process';
import net from 'node:net';

// ── colour helpers ──────────────────────────────────────────────────
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function log(msg) {
    console.log(`${YELLOW}[e2e-dev]${RESET} ${msg}`);
}

function prefixLines(tag, colour, data) {
    const text = data.toString();
    for (const line of text.split('\n')) {
        if (line.length > 0) {
            process.stdout.write(`${colour}[${tag}]${RESET} ${line}\n`);
        }
    }
}

// ── env vars (match playwright.config.ts) ───────────────────────────
const DATABASE_URL = 'postgresql://postgres:test@127.0.0.1:5433/herdbook_test';
const API_ENV = {
    ...process.env,
    PORT: '4099',
    DATABASE_URL,
    JWT_SECRET: 'e2e-test-jwt-secret',
    RATE_LIMIT_AUTH: '1000',
    RATE_LIMIT_WRITE: '1000',
    RATE_LIMIT_READ: '1000',
    USE_HTTPS: 'false',
};
const WEB_ENV = {
    ...process.env,
    VITE_API_URL: 'http://127.0.0.1:4099',
    VITE_DEV_AUTOLOGIN: 'false',
    USE_HTTPS: 'false',
};

// ── helpers ─────────────────────────────────────────────────────────
function tcpReady(host, port, timeoutMs = 1000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, timeoutMs);
        socket.once('connect', () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(true);
        });
        socket.once('error', () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, host);
    });
}

function getDockerComposeCommand() {
    try {
        execSync('docker compose version', { stdio: 'pipe' });
        return 'docker compose';
    } catch {
        // ignore
    }
    try {
        execSync('docker-compose version', { stdio: 'pipe' });
        return 'docker-compose';
    } catch {
        // ignore
    }
    throw new Error(
        'Neither `docker compose` nor `docker-compose` is available on PATH'
    );
}

function testRiderExists() {
    try {
        const result = execSync(
            `docker compose -f docker-compose.test.yml exec -T postgres psql -U postgres -d herdbook_test -tAc "SELECT 1 FROM \\"Rider\\" WHERE email = 'test@herdbook.test' LIMIT 1"`,
            { stdio: 'pipe', encoding: 'utf-8' }
        ).trim();
        return result === '1';
    } catch {
        return false;
    }
}

// ── process management ──────────────────────────────────────────────
const children = [];

function killAll() {
    for (const child of children) {
        if (!child.killed) {
            child.kill('SIGTERM');
        }
    }
}

function onChildExit(name, code) {
    console.log(`${name} exited with code ${code}`);
    killAll();
    process.exit(code ?? 1);
}

// ── main ────────────────────────────────────────────────────────────
async function main() {
    // 1. Start Docker (skip if Postgres already listening)
    const pgUp = await tcpReady('127.0.0.1', 5433);
    if (pgUp) {
        log('Postgres already running on port 5433, skipping Docker start');
    } else {
        log('Starting Docker test container...');
        const dockerCompose = getDockerComposeCommand();
        execSync(`${dockerCompose} -f docker-compose.test.yml up -d`, {
            stdio: 'inherit',
        });

        // 2. Wait for Postgres ready
        log('Waiting for Postgres...');
        let retries = 30;
        while (retries > 0) {
            const ready = await tcpReady('127.0.0.1', 5433);
            if (ready) break;
            retries--;
            if (retries === 0) {
                console.error('Postgres failed to become ready');
                process.exit(1);
            }
            await new Promise((r) => setTimeout(r, 1000));
        }
        log('Postgres ready');
    }

    // 3. Migrate + seed (skip if test rider exists)
    if (testRiderExists()) {
        log('Test rider already exists, skipping migrate + seed');
    } else {
        log('Running migrations...');
        execSync('pnpm --filter api run prisma:migrate:deploy', {
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL },
        });

        log('Generating Prisma client...');
        execSync('pnpm --filter api run prisma:generate', {
            stdio: 'inherit',
        });

        log('Seeding test data...');
        execSync('pnpm --filter api run prisma:seed:e2e', {
            stdio: 'inherit',
            env: { ...process.env, DATABASE_URL },
        });
    }

    // 4. Spawn API dev server
    log('Starting API server on port 4099...');
    const api = spawn('pnpm', ['--filter', 'api', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: API_ENV,
    });
    children.push(api);
    api.stdout.on('data', (d) => prefixLines('api', MAGENTA, d));
    api.stderr.on('data', (d) => prefixLines('api', MAGENTA, d));

    // Wait for API to be ready before starting web
    const API_READY_RE = /Server is running on/;
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Timed out waiting for API server'));
        }, 30_000);
        api.stdout.on('data', (data) => {
            if (API_READY_RE.test(data.toString())) {
                clearTimeout(timer);
                resolve();
            }
        });
        api.on('close', (code) => {
            clearTimeout(timer);
            reject(new Error(`API exited (code ${code}) before ready`));
        });
    });

    log('API ready');

    // 5. Spawn Web dev server
    log('Starting Web server on port 3099...');
    const web = spawn('pnpm', ['--filter', 'web', 'dev', '--port', '3099'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: WEB_ENV,
    });
    children.push(web);
    web.stdout.on('data', (d) => prefixLines('web', CYAN, d));
    web.stderr.on('data', (d) => prefixLines('web', CYAN, d));
    web.on('close', (code) => onChildExit('web', code));
    api.on('close', (code) => onChildExit('api', code));

    log('E2E dev environment ready!');
    log(`Web: http://127.0.0.1:3099`);
    log(`API: http://127.0.0.1:4099/graphql`);
    log(`DB:  postgresql://postgres:test@127.0.0.1:5433/herdbook_test`);
    console.log(
        `\n${DIM}Run tests in another terminal: pnpm --filter e2e run test --grep "test name"${RESET}`
    );
    console.log(
        `${DIM}Ctrl+C to stop servers (Docker will keep running)${RESET}\n`
    );
}

main().catch((err) => {
    console.error(err.message);
    killAll();
    process.exit(1);
});

// ── signal handling ─────────────────────────────────────────────────
for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
        log('Stopping servers (Docker will keep running)...');
        log(
            `${DIM}To stop the database: docker compose -f docker-compose.test.yml down -v${RESET}`
        );
        killAll();
    });
}
