import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '../..');
const DOCKER_COMPOSE_FILE = resolve(ROOT_DIR, 'docker-compose.test.yml');

async function globalTeardown() {
    console.log('Stopping E2E test database...');

    try {
        execSync(`docker-compose -f ${DOCKER_COMPOSE_FILE} down -v`, {
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
