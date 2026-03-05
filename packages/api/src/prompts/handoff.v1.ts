import type { PromptConfig } from './types';

export interface HandoffContext {
    horseName: string;
    sessions: Array<{
        date: Date;
        riderName: string;
        workType: string;
        notes: string;
        aiMetadata: Record<string, unknown> | null;
    }>;
}

function formatSession(
    s: HandoffContext['sessions'][number],
    index: number
): string {
    const dateStr = new Date(s.date).toISOString().slice(0, 10);
    const parts = [`${index + 1}. ${dateStr} — ${s.riderName} (${s.workType})`];

    if (s.notes) {
        parts.push(`   Notes: ${s.notes.slice(0, 500)}`);
    }

    if (s.aiMetadata) {
        const meta = s.aiMetadata as Record<string, unknown>;
        if (
            Array.isArray(meta.movements) &&
            (meta.movements as unknown[]).length > 0
        ) {
            const names = (meta.movements as Array<{ name: string }>).map(
                (m) => m.name
            );
            parts.push(`   Movements: ${names.join(', ')}`);
        }
        if (meta.overallTone) {
            parts.push(`   Tone: ${meta.overallTone}`);
        }
        if (meta.sessionSummary) {
            parts.push(`   Summary: ${meta.sessionSummary}`);
        }
    }

    return parts.join('\n');
}

export const prompt: PromptConfig<HandoffContext> = {
    feature: 'handoff',
    version: 'v1',
    model: 'gpt-5-mini',
    modelEnvVar: 'HANDOFF_MODEL',
    buildSystemPrompt: (ctx) =>
        `You write brief handoff notes for an equestrian training log app. A rider is about to get on ${ctx.horseName} and wants to know what's been happening recently.

Task:
Write 2-4 sentences summarizing what the next rider should know about ${ctx.horseName} based on the recent sessions below. Focus on:
- What work has been done recently and how it went
- Any physical notes (soundness, stiffness, energy)
- Equipment changes or things to be aware of
- How the horse has been feeling/behaving

Rules:
- Plain text only, no markdown, no bullets, no emoji.
- Write like a trainer leaving a quick note for a colleague.
- Use present-oriented language: "has been", "lately", "last few rides".
- Only mention what's in the data. Don't speculate or advise.
- Keep it to 2-4 sentences. Be concise.

Recent sessions (newest first):
${ctx.sessions.map((s, i) => formatSession(s, i)).join('\n\n')}`,
    schema: undefined,
};
