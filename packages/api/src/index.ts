import 'dotenv/config';
import { createApiApp } from '@/server';
import { getServerHost } from '@/config';

async function start() {
    const fastify = await createApiApp();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
    const host = getServerHost();
    await fastify.listen({ port, host });
    console.log(`Server is running on http://${host}:${port}/graphql`);
}

start();
