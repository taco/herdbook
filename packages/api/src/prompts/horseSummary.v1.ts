import type { PromptConfig, SummaryContext, SummarySignals } from './types';

// --- Work type short codes ---

const TYPE_CODES: Record<string, string> = {
    FLATWORK: 'F',
    JUMPING: 'J',
    GROUNDWORK: 'G',
    IN_HAND: 'I',
    TRAIL: 'T',
    OTHER: 'O',
};

function typeCode(workType: string): string {
    return TYPE_CODES[workType] ?? workType.charAt(0);
}

// --- Tiered note truncation ---

function truncateNotes(
    notes: string,
    sessionIndex: number,
    totalSessions: number
): string {
    if (!notes) return '';
    const recencyPosition = totalSessions - sessionIndex; // 1 = oldest, totalSessions = newest
    const isRecent = recencyPosition <= 5;
    const isMid = recencyPosition <= 12;

    const limit = isRecent ? 1000 : isMid ? 400 : 200;
    if (notes.length <= limit) return notes;
    return notes.slice(0, limit) + '...';
}

// --- Compact ride format ---

function formatRide(
    r: SummaryContext['rides'][number],
    index: number,
    total: number
): string {
    const rideDate = new Date(r.date);
    const dateStr = rideDate.toISOString().slice(0, 10);
    const daysAgo = Math.round(
        (Date.now() - rideDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const note = truncateNotes(r.notes, index, total);
    const parts = [
        dateStr,
        `ago=${daysAgo}`,
        `type=${typeCode(r.workType)}`,
        `min=${r.durationMinutes}`,
        `rider=${r.riderName}`,
    ];
    if (note) parts.push(`note="${note}"`);
    return parts.join(' | ');
}

// --- Signals format ---

function formatSignals(horseName: string, signals: SummarySignals): string {
    const parts = [
        `horse=${horseName}`,
        `workload_14d=${signals.workload14d}`,
        `trend=${signals.workloadTrend}`,
        `recent_focus=${signals.recentFocus.join(',')}`,
        `recent_pattern="${signals.recentPattern}"`,
        `longest_break="${signals.longestBreak}"`,
    ];
    if (signals.riders) {
        parts.push(`riders="${signals.riders}"`);
    }
    if (signals.flags.length > 0) {
        parts.push(`flags="${signals.flags.join(',')}"`);
    }
    return `SIGNALS ${parts.join(' ')}`;
}

const TYPE_LEGEND = `TYPE codes: F=flatwork J=jumping G=groundwork I=in-hand T=trail O=other`;

export const prompt: PromptConfig<SummaryContext> = {
    feature: 'horseSummary',
    version: 'v1',
    model: 'gpt-5-mini',
    modelEnvVar: 'SUMMARY_MODEL',
    buildSystemPrompt: (ctx) =>
        `You write concise trainer-style recaps for an equestrian training log app.

Task:
Write a 150-300 word plain-text recap of ${ctx.horseName}'s recent work using only the provided SIGNALS and RIDES.

Hard rules:
- Observational only. No advice, no recommendations, no "should", "try", "consider", "focus on", "aim to".
- Plain text only: no markdown, no headers, no bullets, no numbering, no emoji.
- Do not use the words "sessions", "entries", "logged", "stats", "median", "average", "gap", "distribution", "flag", "signal", or "trending".
- Do not use em dashes.
- Use ride language. Refer to "rides" and "work"; for non-mounted work, say "ground sessions" or "in-hand work".
- Do not guess. Only say "improved/better" if the notes explicitly state improvement.
- NEVER echo SIGNALS fields back. SIGNALS are context for you, not content for the reader. Do not say "moderate workload" or "trending up" or "mix of X and Y". Translate into natural trainer language.
- NEVER mention notes, note coverage, or whether rides have notes. The reader does not care about the data quality. Work with what you have.

Style goals:
- Write like a trainer who just flipped through the ride log and is telling a colleague what they noticed. Not an analyst summarizing a dataset.
- This is a takeaway summary, not a replay. Do not retell rides in order.
- Use relative time: "this week", "over the last two weeks", "recently".
- Include at most 1-2 date mentions total, only if they clarify a major shift.
- Focus on what the horse is doing and how it is going, not on metadata about the rides.

Content to include, as a single narrative:
1) What the horse has been doing lately and how often.
2) 2-4 recurring themes from the ride notes (way of going, straightness, stiffness, contact, spookiness, energy, etc).
3) Any notable changes or patterns (getting better at something, a recurring issue, a shift in work type).
4) End with what the most recent rides tell you.

${TYPE_LEGEND}

${formatSignals(ctx.horseName, ctx.signals)}

RIDES (oldest to newest):
${ctx.rides.map((r, i) => formatRide(r, i, ctx.rides.length)).join('\n')}`,
    schema: undefined,
};
