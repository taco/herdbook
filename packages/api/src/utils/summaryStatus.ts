import { isDevelopment } from '@/config';
import { prisma } from '@/db';

/**
 * Sliding cooldown for summary refresh based on recency of last session.
 *
 * Active horse (<7 days since last session): 48h cooldown
 * Moderate (7-14 days): 72h cooldown
 * Idle (>14 days): 168h (7 day) cooldown
 */
export function getRefreshCooldownHours(latestSessionDate: Date): number {
    const daysSinceLastSession = Math.floor(
        (Date.now() - latestSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastSession < 7) return 48;
    if (daysSinceLastSession < 14) return 72;
    return 168;
}

export interface SummaryStatus {
    stale: boolean;
    refreshAvailableAt: Date | null;
}

/**
 * Determines whether a horse's AI summary is stale and when a refresh
 * is available. A summary is stale when new sessions exist since it was
 * generated. In development mode, summaries are always marked stale.
 */
export async function getSummaryStatus(
    horseId: string,
    summaryGeneratedAt: Date
): Promise<SummaryStatus> {
    const newSessions = await prisma.session.count({
        where: {
            horseId,
            createdAt: { gt: summaryGeneratedAt },
        },
    });
    const stale = isDevelopment() || newSessions > 0;

    let refreshAvailableAt: Date | null = null;
    if (stale && !isDevelopment()) {
        const latestSession = await prisma.session.findFirst({
            where: { horseId },
            orderBy: { date: 'desc' },
            select: { date: true },
        });
        if (latestSession) {
            const cooldownHours = getRefreshCooldownHours(latestSession.date);
            refreshAvailableAt = new Date(
                summaryGeneratedAt.getTime() + cooldownHours * 60 * 60 * 1000
            );
        }
    }

    return { stale, refreshAvailableAt };
}
