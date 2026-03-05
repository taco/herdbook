import type { FastifyInstance } from 'fastify';
import { isDevelopment } from '@/config';

function parseDbName(): string {
    try {
        const url = new URL(process.env.DATABASE_URL ?? '');
        return url.pathname.slice(1);
    } catch {
        return 'unknown';
    }
}

export async function registerEnvBannerRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get('/api/env-banner', async (_request, reply) => {
        if (!isDevelopment()) {
            return reply.status(404).send();
        }

        const dbLabel = process.env.DATABASE_LABEL || parseDbName();
        const bgColor = process.env.DATABASE_LABEL_COLOR || '#facc15';
        return { dbLabel, bgColor };
    });
}
