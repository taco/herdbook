import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '../../../..');
const DATABASE_URL = 'postgresql://postgres:test@127.0.0.1:5433/herdbook_test';

export function resetDatabase(): void {
    execSync(
        `psql "${DATABASE_URL}" -c 'TRUNCATE TABLE "Session", "Horse", "Rider" CASCADE'`,
        { stdio: 'pipe' }
    );
    execSync('pnpm --filter api prisma:seed:e2e', {
        stdio: 'pipe',
        cwd: ROOT_DIR,
        env: { ...process.env, DATABASE_URL },
    });
}
