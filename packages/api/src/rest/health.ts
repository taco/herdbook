import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { prisma } from '@/db';

const pkg = JSON.parse(
    readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
) as { version: string };

function parseDbInfo(): { dbHost: string; dbName: string } {
    try {
        const url = new URL(process.env.DATABASE_URL ?? '');
        return { dbHost: url.hostname, dbName: url.pathname.slice(1) };
    } catch {
        return { dbHost: 'unknown', dbName: 'unknown' };
    }
}

export async function registerHealthRoutes(
    app: FastifyInstance
): Promise<void> {
    // Liveness probe — no I/O, no auth
    app.get('/health', async () => {
        return { status: 'ok' };
    });

    // Readiness probe — protected by shared token
    app.get('/health/ready', async (request, reply) => {
        const expected = process.env.HEALTH_CHECK_TOKEN;
        if (!expected || request.headers['x-health-token'] !== expected) {
            return reply
                .status(403)
                .send({ status: 'error', message: 'Forbidden' });
        }

        const start = performance.now();
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch {
            return reply
                .status(503)
                .send({ status: 'error', message: 'Database unreachable' });
        }
        const dbLatencyMs = Math.round(performance.now() - start);

        const { dbHost, dbName } = parseDbInfo();

        return {
            status: 'ok',
            version: pkg.version,
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            dbLatencyMs,
            dbHost,
            dbName,
        };
    });
}
