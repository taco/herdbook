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

async function globalTeardown() {
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
