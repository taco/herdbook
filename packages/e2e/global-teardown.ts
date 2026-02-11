import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '../..');
const DOCKER_COMPOSE_FILE = resolve(ROOT_DIR, 'docker-compose.test.yml');

function getDockerComposeCommand(): string {
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

async function globalTeardown(): Promise<void> {
    // In CI, the database is managed by GitHub Actions services
    if (process.env.CI) {
        console.log('CI environment detected - skipping database teardown');
        return;
    }

    // If dev servers are still running externally (e2e-dev.mjs), skip teardown
    try {
        const res = await fetch('http://127.0.0.1:4099');
        if (res.ok || res.status) {
            console.log('Dev servers still running, skipping Docker teardown');
            return;
        }
    } catch {
        // Server not responding — Playwright's own servers have exited, proceed with cleanup
    }

    console.log('Stopping E2E test database...');

    try {
        const dockerCompose = getDockerComposeCommand();
        const dockerComposeFileArg = `-f "${DOCKER_COMPOSE_FILE}"`;

        execSync(`${dockerCompose} ${dockerComposeFileArg} down -v`, {
            stdio: 'inherit',
            cwd: ROOT_DIR,
        });
        console.log('E2E test database stopped.');
    } catch (error) {
        console.error('Error stopping test database:', error);
        // Don't throw - teardown should be best-effort
    }
}

export default globalTeardown;
