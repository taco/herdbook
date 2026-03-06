import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRefreshCooldownHours, getSummaryStatus } from './summaryStatus';

const mockSessionCount = vi.fn();
const mockSessionFindFirst = vi.fn();

vi.mock('@/db', () => ({
    prisma: {
        session: {
            count: (...args: unknown[]) => mockSessionCount(...args),
            findFirst: (...args: unknown[]) => mockSessionFindFirst(...args),
        },
    },
}));

vi.mock('@/config', () => ({
    isDevelopment: () => false,
}));

describe('getRefreshCooldownHours', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('returns 48h for active horses (<7 days)', () => {
        const recent = new Date('2026-03-04T12:00:00Z'); // 2 days ago
        expect(getRefreshCooldownHours(recent)).toBe(48);
    });

    it('returns 72h for moderate horses (7-14 days)', () => {
        const moderate = new Date('2026-02-25T12:00:00Z'); // 9 days ago
        expect(getRefreshCooldownHours(moderate)).toBe(72);
    });

    it('returns 168h for idle horses (>14 days)', () => {
        const idle = new Date('2026-02-01T12:00:00Z'); // 33 days ago
        expect(getRefreshCooldownHours(idle)).toBe(168);
    });
});

describe('getSummaryStatus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
        mockSessionCount.mockReset();
        mockSessionFindFirst.mockReset();
    });

    it('returns stale=true when new sessions exist', async () => {
        mockSessionCount.mockResolvedValue(3);
        mockSessionFindFirst.mockResolvedValue({
            date: new Date('2026-03-05T10:00:00Z'),
        });

        const result = await getSummaryStatus(
            'horse-1',
            new Date('2026-03-01T12:00:00Z')
        );

        expect(result.stale).toBe(true);
        expect(result.refreshAvailableAt).toBeInstanceOf(Date);
    });

    it('returns stale=false when no new sessions exist', async () => {
        mockSessionCount.mockResolvedValue(0);

        const result = await getSummaryStatus(
            'horse-1',
            new Date('2026-03-01T12:00:00Z')
        );

        expect(result.stale).toBe(false);
        expect(result.refreshAvailableAt).toBeNull();
    });

    it('calculates refreshAvailableAt based on cooldown', async () => {
        mockSessionCount.mockResolvedValue(1);
        // Latest session 2 days ago → 48h cooldown
        mockSessionFindFirst.mockResolvedValue({
            date: new Date('2026-03-04T12:00:00Z'),
        });

        const generatedAt = new Date('2026-03-05T12:00:00Z');
        const result = await getSummaryStatus('horse-1', generatedAt);

        expect(result.stale).toBe(true);
        // 48h after generatedAt
        const expected = new Date(generatedAt.getTime() + 48 * 60 * 60 * 1000);
        expect(result.refreshAvailableAt).toEqual(expected);
    });
});
