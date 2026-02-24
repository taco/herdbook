import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const DATABASE_URL = 'postgresql://postgres:test@127.0.0.1:5433/herdbook_test';

let prisma: PrismaClient | null = null;
let pool: pg.Pool | null = null;

export function getTestPrisma(): PrismaClient {
    if (!prisma) {
        pool = new pg.Pool({ connectionString: DATABASE_URL });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
    }
    return prisma;
}

export async function disconnectTestPrisma(): Promise<void> {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
    }
    if (pool) {
        await pool.end();
        pool = null;
    }
}
