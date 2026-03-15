import { execSync } from 'node:child_process';
import type { FastifyInstance } from 'fastify';

function parseDbName(): string {
    try {
        const url = new URL(process.env.DATABASE_URL ?? '');
        return url.pathname.slice(1);
    } catch {
        return 'unknown';
    }
}

function getGitBranch(): string {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', {
            encoding: 'utf-8',
            stdio: 'pipe',
        }).trim();
    } catch {
        return 'unknown';
    }
}

export async function registerDevToolbarRoutes(
    app: FastifyInstance
): Promise<void> {
    const gitBranch = getGitBranch();

    app.get('/toolbar', async () => {
        const dbLabel = process.env.DATABASE_LABEL || parseDbName();
        const bgColor = process.env.DATABASE_LABEL_COLOR || '#facc15';
        return { dbLabel, bgColor, gitBranch };
    });
}
