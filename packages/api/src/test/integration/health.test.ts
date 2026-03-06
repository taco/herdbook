import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApiApp } from '@/server';

describe('Health endpoints', () => {
    let app: FastifyInstance;
    let prevToken: string | undefined;

    beforeAll(async () => {
        prevToken = process.env.HEALTH_CHECK_TOKEN;
        process.env.HEALTH_CHECK_TOKEN = 'test-health-secret';
        app = await createApiApp();
    });

    afterAll(async () => {
        if (prevToken === undefined) {
            delete process.env.HEALTH_CHECK_TOKEN;
        } else {
            process.env.HEALTH_CHECK_TOKEN = prevToken;
        }
        await app.close();
    });

    describe('GET /health', () => {
        it('returns 200 with status ok', async () => {
            const res = await app.inject({ method: 'GET', url: '/health' });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toEqual({ status: 'ok' });
        });
    });

    describe('GET /health/ready', () => {
        it('returns 403 without token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/health/ready',
            });
            expect(res.statusCode).toBe(403);
            expect(res.json()).toEqual({
                status: 'error',
                message: 'Forbidden',
            });
        });

        it('returns 403 with wrong token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/health/ready',
                headers: { 'x-health-token': 'wrong-token' },
            });
            expect(res.statusCode).toBe(403);
            expect(res.json()).toEqual({
                status: 'error',
                message: 'Forbidden',
            });
        });

        it('returns 200 with correct token when DB is up', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/health/ready',
                headers: { 'x-health-token': 'test-health-secret' },
            });
            expect(res.statusCode).toBe(200);

            const body = res.json();
            expect(body.status).toBe('ok');
            expect(body.version).toEqual(expect.any(String));
            expect(body.uptime).toEqual(expect.any(Number));
            expect(body.timestamp).toEqual(expect.any(String));
            expect(body.dbLatencyMs).toEqual(expect.any(Number));
            expect(body.dbHost).toEqual(expect.any(String));
            expect(body.dbName).toEqual(expect.any(String));
        });

        it('returns 403 when HEALTH_CHECK_TOKEN is unset', async () => {
            const saved = process.env.HEALTH_CHECK_TOKEN;
            delete process.env.HEALTH_CHECK_TOKEN;

            try {
                const res = await app.inject({
                    method: 'GET',
                    url: '/health/ready',
                    headers: { 'x-health-token': 'anything' },
                });
                expect(res.statusCode).toBe(403);
                expect(res.json()).toEqual({
                    status: 'error',
                    message: 'Forbidden',
                });
            } finally {
                process.env.HEALTH_CHECK_TOKEN = saved;
            }
        });
    });
});
