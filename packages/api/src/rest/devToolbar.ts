import type { FastifyInstance } from 'fastify';

function parseDbName(): string {
    try {
        const url = new URL(process.env.DATABASE_URL ?? '');
        return url.pathname.slice(1);
    } catch {
        return 'unknown';
    }
}

export async function registerDevToolbarRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get('/toolbar', async () => {
        const dbLabel = process.env.DATABASE_LABEL || parseDbName();
        const bgColor = process.env.DATABASE_LABEL_COLOR || '#facc15';
        return { dbLabel, bgColor };
    });
}
