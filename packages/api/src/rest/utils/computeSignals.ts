import type { SummarySignals, WorkloadLevel, Trend } from '@/prompts';

export interface SessionRow {
    date: Date;
    workType: string;
    durationMinutes: number;
    notes: string;
    rider: { name: string };
}

const WORK_TYPE_LABELS: Record<string, string> = {
    FLATWORK: 'flatwork',
    JUMPING: 'jumping',
    GROUNDWORK: 'groundwork',
    IN_HAND: 'in-hand',
    TRAIL: 'trail',
    OTHER: 'other',
};

function workTypeLabel(wt: string): string {
    return WORK_TYPE_LABELS[wt] ?? wt.toLowerCase();
}

export function computeSignals(sessions: SessionRow[]): SummarySignals {
    const now = new Date();
    const dates = sessions.map((s) => new Date(s.date));

    const fmt = (d: Date): string =>
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // --- Workload 14d ---
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const recent14d = sessions.filter(
        (s) => new Date(s.date) >= fourteenDaysAgo
    );
    const workload14d: WorkloadLevel =
        recent14d.length >= 8
            ? 'heavy'
            : recent14d.length >= 4
              ? 'moderate'
              : 'light';

    // --- Workload trend (current 14d vs prior 14d) ---
    const twentyEightDaysAgo = new Date(
        now.getTime() - 28 * 24 * 60 * 60 * 1000
    );
    const prior14d = sessions.filter((s) => {
        const d = new Date(s.date);
        return d >= twentyEightDaysAgo && d < fourteenDaysAgo;
    });
    const workloadTrend: Trend =
        recent14d.length > prior14d.length + 1
            ? 'up'
            : recent14d.length < prior14d.length - 1
              ? 'down'
              : 'steady';

    // --- Recent focus: top 2 work types last 14d ---
    const recentTypeCounts: Record<string, number> = {};
    for (const s of recent14d) {
        recentTypeCounts[s.workType] = (recentTypeCounts[s.workType] ?? 0) + 1;
    }
    const recentFocus = Object.entries(recentTypeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([type]) => workTypeLabel(type));

    // --- Recent pattern phrase ---
    const totalRecent = recent14d.length;
    let recentPattern: string;
    if (totalRecent === 0) {
        recentPattern = 'no recent work in the last two weeks';
    } else if (recentFocus.length === 1) {
        recentPattern = `mostly ${recentFocus[0]}`;
    } else {
        const topCount =
            recentTypeCounts[
                Object.entries(recentTypeCounts).sort(
                    ([, a], [, b]) => b - a
                )[0][0]
            ];
        if (topCount >= totalRecent * 0.6) {
            recentPattern = `mostly ${recentFocus[0]} with some ${recentFocus[1]}`;
        } else {
            recentPattern = `mix of ${recentFocus[0]} and ${recentFocus[1]}`;
        }
    }

    // --- Longest break ---
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
        gaps.push(
            Math.round(
                (dates[i].getTime() - dates[i - 1].getTime()) /
                    (1000 * 60 * 60 * 24)
            )
        );
    }

    let longestGapDays = 0;
    let longestGapEnd = dates[0];
    for (let i = 0; i < gaps.length; i++) {
        if (gaps[i] > longestGapDays) {
            longestGapDays = gaps[i];
            longestGapEnd = dates[i + 1];
        }
    }

    let longestBreak: string;
    if (longestGapDays <= 3) {
        longestBreak = 'no significant breaks';
    } else if (longestGapDays <= 7) {
        longestBreak = `about a week off around ${fmt(longestGapEnd)}`;
    } else if (longestGapDays <= 14) {
        longestBreak = `about two weeks off around ${fmt(longestGapEnd)}`;
    } else {
        longestBreak = `${longestGapDays} days off around ${fmt(longestGapEnd)}`;
    }

    // --- Rider de-emphasis: only include if 2+ riders each >= 30% ---
    const riderCounts: Record<string, number> = {};
    for (const s of sessions) {
        riderCounts[s.rider.name] = (riderCounts[s.rider.name] ?? 0) + 1;
    }
    const riderEntries = Object.entries(riderCounts).sort(
        ([, a], [, b]) => b - a
    );
    let riders: string | null = null;
    if (riderEntries.length >= 2) {
        const threshold = sessions.length * 0.3;
        const significant = riderEntries.filter(([, c]) => c >= threshold);
        if (significant.length >= 2) {
            riders = significant
                .map(
                    ([name, count]) =>
                        `${name} (${Math.round((count / sessions.length) * 100)}%)`
                )
                .join(', ');
        }
    }

    // --- Flags ---
    const flags: string[] = [];

    const recentFive = sessions.slice(-5);
    const recentWithNotes = recentFive.filter((s) => s.notes?.trim()).length;
    if (recentWithNotes <= 1) {
        flags.push('note_sparse_recent');
    }

    const soundnessPattern =
        /\b(sound(ness)?|lame(ness)?|off|short(-| )stride|vet check|body work)\b/i;
    const recentThree = sessions.slice(-3);
    if (recentThree.some((s) => soundnessPattern.test(s.notes ?? ''))) {
        flags.push('soundness_check');
    }

    // --- Notes coverage ---
    const withNotes = sessions.filter((s) => s.notes?.trim()).length;
    const notesRatio = withNotes / sessions.length;
    const notesCoverage =
        notesRatio >= 0.8
            ? 'most rides have notes'
            : notesRatio >= 0.5
              ? 'about half the rides have notes'
              : notesRatio > 0
                ? 'only a few rides have notes'
                : 'no ride notes recorded';

    return {
        workload14d,
        workloadTrend,
        recentPattern,
        recentFocus,
        longestBreak,
        riders,
        flags,
        notesCoverage,
    };
}
