import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createApiApp } from '@/server';
import { getServerHost } from '@/config';

function getHttpsOptions(): { key: Buffer; cert: Buffer } | undefined {
    // Look for certs in repo root (two levels up from packages/api/src)
    const certPath = resolve(__dirname, '../../../localhost+3.pem');
    const keyPath = resolve(__dirname, '../../../localhost+3-key.pem');

    if (existsSync(certPath) && existsSync(keyPath)) {
        return {
            key: readFileSync(keyPath),
            cert: readFileSync(certPath),
        };
    }
    return undefined;
}

async function start() {
    const httpsOptions = getHttpsOptions();
    const fastify = await createApiApp(httpsOptions);
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
    const host = getServerHost();
    const protocol = httpsOptions ? 'https' : 'http';
    await fastify.listen({ port, host });
    console.log(`Server is running on ${protocol}://${host}:${port}/graphql`);
}

start();
