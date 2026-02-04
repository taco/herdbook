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

async function globalSetup() {
    try {
        console.log('Starting E2E test database...');

        const dockerCompose = getDockerComposeCommand();
        const dockerComposeFileArg = `-f "${DOCKER_COMPOSE_FILE}"`;

        // Optional: pull newest image tags before starting containers (slower, but "latest").
        if (process.env.E2E_DOCKER_PULL === '1') {
            execSync(`${dockerCompose} ${dockerComposeFileArg} pull postgres`, {
                stdio: 'inherit',
                cwd: ROOT_DIR,
            });
        }

        // Start Docker container
        execSync(`${dockerCompose} ${dockerComposeFileArg} up -d`, {
            stdio: 'inherit',
            cwd: ROOT_DIR,
        });

        // Wait for Postgres to be ready
        console.log('Waiting for Postgres to be ready...');
        let retries = 30;
        while (retries > 0) {
            try {
                execSync(
                    `${dockerCompose} ${dockerComposeFileArg} exec -T postgres pg_isready -U postgres`,
                    { stdio: 'pipe', cwd: ROOT_DIR }
                );
                break;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    throw new Error('Postgres failed to become ready');
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        // Set DATABASE_URL for test environment
        const DATABASE_URL =
            'postgresql://postgres:test@127.0.0.1:5433/herdbook_test';

        // Run migrations
        console.log('Running database migrations...');
        execSync(`pnpm --filter api prisma:migrate:deploy`, {
            stdio: 'inherit',
            cwd: ROOT_DIR,
            env: {
                ...process.env,
                DATABASE_URL,
            },
        });

        // Generate Prisma client
        console.log('Generating Prisma client...');
        execSync(`pnpm --filter api prisma:generate`, {
            stdio: 'inherit',
            cwd: ROOT_DIR,
        });

        // Seed test data
        console.log('Seeding test data...');
        execSync(`pnpm --filter api prisma:seed:e2e`, {
            stdio: 'inherit',
            cwd: ROOT_DIR,
            env: {
                ...process.env,
                DATABASE_URL,
            },
        });

        console.log('E2E test database ready!');
    } catch (error) {
        console.error('Error in globalSetup:', error);
        throw error;
    }
}

export default globalSetup;
