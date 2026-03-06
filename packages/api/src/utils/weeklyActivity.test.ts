import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWeeklyActivity } from './weeklyActivity';

const mockFindMany = vi.fn();

vi.mock('@/db', () => ({
    prisma: {
        session: {
            findMany: (...args: unknown[]) => mockFindMany(...args),
        },
    },
}));

afterEach(() => {
    vi.useRealTimers();
});

describe('getWeeklyActivity', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
        mockFindMany.mockReset();
    });

    it('returns empty buckets when no sessions exist', async () => {
        mockFindMany.mockResolvedValue([]);

        const result = await getWeeklyActivity('horse-1', 4);

        expect(result).toHaveLength(4);
        expect(result.every((b) => b.count === 0)).toBe(true);
    });

    it('buckets sessions into correct weeks', async () => {
        mockFindMany.mockResolvedValue([
            { date: new Date('2026-03-05T10:00:00Z') }, // this week
            { date: new Date('2026-03-04T10:00:00Z') }, // this week
            { date: new Date('2026-02-25T10:00:00Z') }, // last week
        ]);

        const result = await getWeeklyActivity('horse-1', 2);

        expect(result).toHaveLength(2);
        expect(result[0].count).toBe(1); // older week
        expect(result[1].count).toBe(2); // current week
    });

    it('respects the weeks parameter', async () => {
        mockFindMany.mockResolvedValue([]);

        const result = await getWeeklyActivity('horse-1', 8);

        expect(result).toHaveLength(8);
        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    horseId: 'horse-1',
                }),
            })
        );
    });
});
