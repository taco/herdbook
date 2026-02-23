import './instrument';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createApiApp } from '@/server';
import { getServerHost } from '@/config';

function getHttpsOptions(): { key: Buffer; cert: Buffer } | undefined {
    if (process.env.USE_HTTPS === 'false') {
        return undefined;
    }

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

async function start(): Promise<void> {
    const httpsOptions = getHttpsOptions();
    const fastify = await createApiApp(httpsOptions);
    const basePort = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
    const host = getServerHost();
    const protocol = httpsOptions ? 'https' : 'http';
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const port = basePort + attempt;
        try {
            await fastify.listen({ port, host });
            console.log(
                `Server is running on ${protocol}://${host}:${port}/graphql`
            );
            return;
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                'code' in err &&
                (err as NodeJS.ErrnoException).code === 'EADDRINUSE'
            ) {
                console.warn(`Port ${port} in use, trying ${port + 1}…`);
                continue;
            }
            throw err;
        }
    }

    throw new Error(
        `Could not find an open port after ${maxAttempts} attempts (tried ${basePort}–${basePort + maxAttempts - 1})`
    );
}

start();
