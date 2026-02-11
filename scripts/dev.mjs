#!/usr/bin/env node

/**
 * Dev orchestration script — replaces `concurrently` so the web server
 * always proxies to whatever port the API actually landed on.
 *
 * 1. Spawn the API server and wait for its "Server is running on …" line.
 * 2. Parse the origin URL from that line.
 * 3. Spawn the web dev server with VITE_API_URL pointing at that origin.
 * 4. Forward all output with coloured [api] / [web] prefixes.
 */

import { spawn } from 'node:child_process';

// ── colour helpers (matches concurrently's magenta / cyan) ──────────
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function prefixLines(tag, colour, data) {
    const text = data.toString();
    for (const line of text.split('\n')) {
        if (line.length > 0) {
            process.stdout.write(`${colour}[${tag}]${RESET} ${line}\n`);
        }
    }
}

// ── spawn helpers ───────────────────────────────────────────────────
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
const API_READY_RE = /Server is running on (https?:\/\/[^/]+)\/graphql/;
const TIMEOUT_MS = 30_000;

const api = spawn('pnpm', ['--filter', 'api', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
});
children.push(api);

api.stderr.on('data', (d) => prefixLines('api', MAGENTA, d));

let apiOrigin = null;

const apiReady = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
        reject(new Error('Timed out waiting for API server to start'));
    }, TIMEOUT_MS);

    api.stdout.on('data', (data) => {
        prefixLines('api', MAGENTA, data);

        if (apiOrigin) return; // already matched

        const match = data.toString().match(API_READY_RE);
        if (match) {
            apiOrigin = match[1];
            clearTimeout(timer);
            resolve(apiOrigin);
        }
    });

    api.on('close', (code) => {
        clearTimeout(timer);
        if (!apiOrigin) {
            reject(new Error(`API exited (code ${code}) before ready`));
        }
    });
});

try {
    const origin = await apiReady;
    console.log(`\n${MAGENTA}[api]${RESET} ready at ${origin}\n`);

    const web = spawn('pnpm', ['--filter', 'web', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, VITE_API_URL: origin },
    });
    children.push(web);

    web.stdout.on('data', (d) => prefixLines('web', CYAN, d));
    web.stderr.on('data', (d) => prefixLines('web', CYAN, d));
    web.on('close', (code) => onChildExit('web', code));

    // Now that web is running, hook up the API exit handler
    api.on('close', (code) => onChildExit('api', code));
} catch (err) {
    console.error(err.message);
    killAll();
    process.exit(1);
}

// ── signal handling ─────────────────────────────────────────────────
for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
        killAll();
    });
}
