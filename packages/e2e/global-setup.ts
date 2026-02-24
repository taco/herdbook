import { execSync } from 'child_process';
import net from 'net';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTestPrisma, disconnectTestPrisma } from './tests/utils/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, '../..');
const DOCKER_COMPOSE_FILE = resolve(ROOT_DIR, 'docker-compose.test.yml');
const DATABASE_URL = 'postgresql://postgres:test@127.0.0.1:5433/herdbook_test';

function tcpReady(port: number, timeoutMs = 1000): Promise<boolean> {
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
        socket.connect(port, '127.0.0.1');
    });
}

async function testRiderExists(): Promise<boolean> {
    try {
        const prisma = getTestPrisma();
        const rider = await prisma.rider.findUnique({
            where: { email: 'test@herdbook.test' },
        });
        return rider !== null;
    } catch {
        return false;
    }
}

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

async function globalSetup(): Promise<void> {
    try {
        // In CI, the database is already running via GitHub Actions services
        // and migrations/seed are handled by workflow steps
        if (process.env.CI) {
            console.log('CI environment detected - skipping database setup');
            return;
        }

        // If Postgres is already up and seeded (e.g. via e2e-dev.mjs), skip setup
        const pgUp = await tcpReady(5433);
        if (pgUp && (await testRiderExists())) {
            await disconnectTestPrisma();
            console.log('E2E infra already running, skipping setup');
            return;
        }

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
