/**
 * Clear all aiMetadata from sessions — reset for prompt iteration.
 *
 * Usage: pnpm --filter api run enrich:clear
 */
import '../src/instrument';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/db';

async function main(): Promise<void> {
    const result = await prisma.session.updateMany({
        where: { NOT: { aiMetadata: { equals: Prisma.DbNull } } },
        data: { aiMetadata: Prisma.DbNull },
    });

    console.info(`[clear] Cleared aiMetadata from ${result.count} sessions`);
    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('[clear] Fatal error:', err);
    process.exit(1);
});
