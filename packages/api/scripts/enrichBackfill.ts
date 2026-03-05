/**
 * Backfill aiMetadata for sessions with non-empty notes.
 *
 * Usage: pnpm --filter api run enrich:backfill
 *
 * Idempotent — skips sessions that already have aiMetadata.
 * Processes sequentially with a 500ms delay between calls.
 */
import '../src/instrument';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/db';
import { enrichSession } from '../src/enrichment/enrichSession';

async function main(): Promise<void> {
    const sessions = await prisma.session.findMany({
        where: {
            aiMetadata: { equals: Prisma.DbNull },
            NOT: { notes: '' },
        },
        orderBy: { date: 'asc' },
        select: { id: true, notes: true, workType: true },
    });

    console.info(`[backfill] Found ${sessions.length} sessions to enrich`);

    let success = 0;
    let failed = 0;

    for (const session of sessions) {
        try {
            await enrichSession(session.id, session.notes, session.workType);
            success++;
            console.info(
                `[backfill] ${success + failed}/${sessions.length} — ${session.id} OK`
            );
        } catch (err) {
            failed++;
            console.error(
                `[backfill] ${success + failed}/${sessions.length} — ${session.id} FAILED:`,
                err
            );
        }

        // Rate-limit: 500ms between calls
        if (success + failed < sessions.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    console.info(
        `[backfill] Done. ${success} enriched, ${failed} failed, ${sessions.length} total`
    );
    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('[backfill] Fatal error:', err);
    process.exit(1);
});
