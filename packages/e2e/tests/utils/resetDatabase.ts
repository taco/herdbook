import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTestPrisma } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '../../../..');
const DATABASE_URL = 'postgresql://postgres:test@127.0.0.1:5433/herdbook_test';

export async function resetDatabase(): Promise<void> {
    const prisma = getTestPrisma();
    await prisma.session.deleteMany();
    await prisma.horse.deleteMany();
    await prisma.rider.deleteMany();
    await prisma.barn.deleteMany();

    execSync('pnpm --filter api prisma:seed:e2e', {
        stdio: 'pipe',
        cwd: ROOT_DIR,
        env: { ...process.env, DATABASE_URL },
    });
}
