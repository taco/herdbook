import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeSignals, type SessionRow } from './sessionSignals';

afterEach(() => {
    vi.useRealTimers();
});

function makeSession(overrides: Partial<SessionRow> = {}): SessionRow {
    return {
        date: new Date('2026-03-05T10:00:00Z'),
        workType: 'FLATWORK',
        durationMinutes: 45,
        notes: 'Worked on transitions.',
        rider: { name: 'Alice' },
        ...overrides,
    };
}

function sessionsOnDates(
    dates: string[],
    overrides: Partial<SessionRow> = {}
): SessionRow[] {
    return dates.map((d) => makeSession({ date: new Date(d), ...overrides }));
}

describe('workload14d', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('returns light for <4 sessions in 14 days', () => {
        const sessions = sessionsOnDates([
            '2026-03-01',
            '2026-03-03',
            '2026-03-05',
        ]);
        expect(computeSignals(sessions).workload14d).toBe('light');
    });

    it('returns moderate for 4-7 sessions in 14 days', () => {
        const sessions = sessionsOnDates([
            '2026-02-25',
            '2026-02-27',
            '2026-03-01',
            '2026-03-03',
            '2026-03-05',
        ]);
        expect(computeSignals(sessions).workload14d).toBe('moderate');
    });

    it('returns heavy for 8+ sessions in 14 days', () => {
        const dates = Array.from({ length: 8 }, (_, i) => {
            const d = new Date('2026-02-24');
            d.setDate(d.getDate() + i * 1.5);
            return d.toISOString().slice(0, 10);
        });
        expect(computeSignals(sessionsOnDates(dates)).workload14d).toBe(
            'heavy'
        );
    });

    it('ignores sessions older than 14 days for workload', () => {
        const sessions = sessionsOnDates([
            '2026-02-01',
            '2026-02-05',
            '2026-02-10',
            '2026-02-15',
            '2026-03-05',
        ]);
        expect(computeSignals(sessions).workload14d).toBe('light');
    });
});

describe('workloadTrend', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('returns steady when current and prior periods are similar', () => {
        // 3 in recent 14d, 3 in prior 14d
        const sessions = sessionsOnDates([
            '2026-02-10',
            '2026-02-12',
            '2026-02-14',
            '2026-02-25',
            '2026-02-27',
            '2026-03-01',
        ]);
        expect(computeSignals(sessions).workloadTrend).toBe('steady');
    });

    it('returns up when current period has 2+ more sessions', () => {
        // 4 recent, 1 prior
        const sessions = sessionsOnDates([
            '2026-02-10',
            '2026-02-25',
            '2026-02-27',
            '2026-03-01',
            '2026-03-03',
        ]);
        expect(computeSignals(sessions).workloadTrend).toBe('up');
    });

    it('returns down when current period has 2+ fewer sessions', () => {
        // 1 recent, 4 prior
        const sessions = sessionsOnDates([
            '2026-02-08',
            '2026-02-10',
            '2026-02-12',
            '2026-02-14',
            '2026-03-05',
        ]);
        expect(computeSignals(sessions).workloadTrend).toBe('down');
    });
});

describe('recentPattern', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('reports no recent work when no sessions in 14 days', () => {
        const sessions = sessionsOnDates(['2026-01-15']);
        expect(computeSignals(sessions).recentPattern).toBe(
            'no recent work in the last two weeks'
        );
    });

    it('reports "mostly X" for single work type', () => {
        const sessions = sessionsOnDates(
            ['2026-03-01', '2026-03-03', '2026-03-05'],
            { workType: 'JUMPING' }
        );
        expect(computeSignals(sessions).recentPattern).toBe('mostly jumping');
    });

    it('reports "mostly X with some Y" when one type dominates', () => {
        // 3 flatwork, 1 jumping → 75% flatwork
        const sessions = [
            ...sessionsOnDates(['2026-03-01', '2026-03-03', '2026-03-05'], {
                workType: 'FLATWORK',
            }),
            ...sessionsOnDates(['2026-03-04'], { workType: 'JUMPING' }),
        ].sort((a, b) => a.date.getTime() - b.date.getTime());
        expect(computeSignals(sessions).recentPattern).toBe(
            'mostly flatwork with some jumping'
        );
    });

    it('reports "mix of X and Y" when types are balanced', () => {
        // 2 flatwork, 2 jumping → 50/50
        const sessions = [
            ...sessionsOnDates(['2026-03-01', '2026-03-03'], {
                workType: 'FLATWORK',
            }),
            ...sessionsOnDates(['2026-03-02', '2026-03-04'], {
                workType: 'JUMPING',
            }),
        ].sort((a, b) => a.date.getTime() - b.date.getTime());
        expect(computeSignals(sessions).recentPattern).toBe(
            'mix of flatwork and jumping'
        );
    });
});

describe('recentFocus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('returns top 2 work types as lowercase labels', () => {
        const sessions = [
            ...sessionsOnDates(['2026-03-01', '2026-03-02', '2026-03-03'], {
                workType: 'FLATWORK',
            }),
            ...sessionsOnDates(['2026-03-04', '2026-03-05'], {
                workType: 'IN_HAND',
            }),
            ...sessionsOnDates(['2026-03-05'], { workType: 'TRAIL' }),
        ].sort((a, b) => a.date.getTime() - b.date.getTime());
        const focus = computeSignals(sessions).recentFocus;
        expect(focus).toEqual(['flatwork', 'in-hand']);
    });
});

describe('longestBreak', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('reports no significant breaks for <=3 day gaps', () => {
        const sessions = sessionsOnDates([
            '2026-03-01',
            '2026-03-03',
            '2026-03-05',
        ]);
        expect(computeSignals(sessions).longestBreak).toBe(
            'no significant breaks'
        );
    });

    it('reports about a week off for 4-7 day gap', () => {
        const sessions = sessionsOnDates(['2026-02-20', '2026-02-26']);
        expect(computeSignals(sessions).longestBreak).toContain(
            'about a week off'
        );
    });

    it('reports about two weeks off for 8-14 day gap', () => {
        const sessions = sessionsOnDates(['2026-02-10', '2026-02-22']);
        expect(computeSignals(sessions).longestBreak).toContain(
            'about two weeks off'
        );
    });

    it('reports exact days for >14 day gap', () => {
        const sessions = sessionsOnDates(['2026-01-15', '2026-02-20']);
        const result = computeSignals(sessions).longestBreak;
        expect(result).toMatch(/\d+ days off/);
    });
});

describe('riders', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('returns null for single rider', () => {
        const sessions = sessionsOnDates(['2026-03-01', '2026-03-03']);
        expect(computeSignals(sessions).riders).toBeNull();
    });

    it('returns null when second rider is below 30% threshold', () => {
        // Alice: 8 sessions (80%), Bob: 2 sessions (20%)
        const sessions = [
            ...sessionsOnDates(
                [
                    '2026-03-01',
                    '2026-03-02',
                    '2026-03-03',
                    '2026-03-04',
                    '2026-03-05',
                    '2026-02-25',
                    '2026-02-26',
                    '2026-02-27',
                ],
                { rider: { name: 'Alice' } }
            ),
            ...sessionsOnDates(['2026-02-28', '2026-03-01'], {
                rider: { name: 'Bob' },
            }),
        ];
        expect(computeSignals(sessions).riders).toBeNull();
    });

    it('includes riders when 2+ each have >=30%', () => {
        // Alice: 3 (50%), Bob: 3 (50%)
        const sessions = [
            ...sessionsOnDates(['2026-03-01', '2026-03-03', '2026-03-05'], {
                rider: { name: 'Alice' },
            }),
            ...sessionsOnDates(['2026-03-02', '2026-03-04', '2026-03-05'], {
                rider: { name: 'Bob' },
            }),
        ];
        const riders = computeSignals(sessions).riders;
        expect(riders).toContain('Alice');
        expect(riders).toContain('Bob');
        expect(riders).toContain('50%');
    });
});

describe('flags', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('flags note_sparse_recent when <=1 of last 5 have notes', () => {
        const sessions = sessionsOnDates(
            [
                '2026-03-01',
                '2026-03-02',
                '2026-03-03',
                '2026-03-04',
                '2026-03-05',
            ],
            { notes: '' }
        );
        expect(computeSignals(sessions).flags).toContain('note_sparse_recent');
    });

    it('does not flag note_sparse when most of last 5 have notes', () => {
        const sessions = sessionsOnDates([
            '2026-03-01',
            '2026-03-02',
            '2026-03-03',
            '2026-03-04',
            '2026-03-05',
        ]);
        expect(computeSignals(sessions).flags).not.toContain(
            'note_sparse_recent'
        );
    });

    it('flags soundness_check when recent notes mention lameness', () => {
        const sessions = sessionsOnDates(['2026-03-05'], {
            notes: 'Horse seemed a bit lame today.',
        });
        expect(computeSignals(sessions).flags).toContain('soundness_check');
    });

    it('flags soundness_check for "short stride" and "vet check"', () => {
        expect(
            computeSignals(
                sessionsOnDates(['2026-03-05'], {
                    notes: 'Short stride in trot.',
                })
            ).flags
        ).toContain('soundness_check');
        expect(
            computeSignals(
                sessionsOnDates(['2026-03-05'], {
                    notes: 'Vet check scheduled.',
                })
            ).flags
        ).toContain('soundness_check');
    });

    it('does not flag soundness for older sessions', () => {
        const sessions = [
            makeSession({
                date: new Date('2026-01-01'),
                notes: 'Horse was lame.',
            }),
            makeSession({ date: new Date('2026-03-03'), notes: 'Good ride.' }),
            makeSession({
                date: new Date('2026-03-04'),
                notes: 'Smooth canter.',
            }),
            makeSession({ date: new Date('2026-03-05'), notes: 'Great day.' }),
        ];
        expect(computeSignals(sessions).flags).not.toContain('soundness_check');
    });
});

describe('notesCoverage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-06T12:00:00Z'));
    });

    it('reports "most rides have notes" at >=80%', () => {
        const sessions = [
            ...sessionsOnDates(
                ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04'],
                { notes: 'Has notes.' }
            ),
            ...sessionsOnDates(['2026-03-05'], { notes: '' }),
        ];
        expect(computeSignals(sessions).notesCoverage).toBe(
            'most rides have notes'
        );
    });

    it('reports "about half" at 50-79%', () => {
        const sessions = [
            ...sessionsOnDates(['2026-03-01', '2026-03-02'], {
                notes: 'Has notes.',
            }),
            ...sessionsOnDates(['2026-03-03', '2026-03-04'], { notes: '' }),
        ];
        expect(computeSignals(sessions).notesCoverage).toBe(
            'about half the rides have notes'
        );
    });

    it('reports "only a few" at 1-49%', () => {
        const sessions = [
            ...sessionsOnDates(['2026-03-01'], { notes: 'Has notes.' }),
            ...sessionsOnDates(['2026-03-02', '2026-03-03', '2026-03-04'], {
                notes: '',
            }),
        ];
        expect(computeSignals(sessions).notesCoverage).toBe(
            'only a few rides have notes'
        );
    });

    it('reports "no ride notes recorded" at 0%', () => {
        const sessions = sessionsOnDates(
            ['2026-03-01', '2026-03-02', '2026-03-03'],
            { notes: '' }
        );
        expect(computeSignals(sessions).notesCoverage).toBe(
            'no ride notes recorded'
        );
    });
});
