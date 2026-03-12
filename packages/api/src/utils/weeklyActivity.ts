import { prisma } from '@/db';

export interface WeekBucket {
    weekStart: Date;
    count: number;
}

/**
 * Counts sessions per week for the given horse over the last N weeks.
 * Returns an array of week buckets ordered oldest-first.
 */
export async function getWeeklyActivity(
    horseId: string,
    weeks: number
): Promise<WeekBucket[]> {
    const cappedWeeks = Math.min(weeks, 52);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - cappedWeeks * 7);

    const sessions = await prisma.session.findMany({
        where: {
            horseId,
            date: {
                gte: startDate,
                lte: now,
            },
        },
    });

    const activity: WeekBucket[] = [];
    for (let i = 0; i < cappedWeeks; i++) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);

        const count = sessions.filter((s) => {
            const sDate = new Date(s.date);
            return sDate > weekStart && sDate <= weekEnd;
        }).length;

        activity.unshift({ weekStart, count });
    }
    return activity;
}
