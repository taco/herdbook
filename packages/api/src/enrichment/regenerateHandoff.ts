import OpenAI from 'openai';
import * as Sentry from '@sentry/node';
import { prisma } from '@/db';
import { resolveModel, logPrompt } from '@/prompts';
import { prompt as handoffPrompt } from '@/prompts/handoff.v1';
import type { HandoffContext } from '@/prompts/handoff.v1';

export async function regenerateHandoff(horseId: string): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('[handoff] OPENAI_API_KEY not set, skipping handoff');
        return;
    }

    const horse = await prisma.horse.findUnique({
        where: { id: horseId },
        select: { name: true },
    });
    if (!horse) return;

    const sessions = await prisma.session.findMany({
        where: { horseId },
        orderBy: { date: 'desc' },
        take: 5,
        include: {
            rider: { select: { name: true } },
        },
    });

    if (sessions.length === 0) {
        // No sessions — clear handoff
        await prisma.horse.update({
            where: { id: horseId },
            data: { handoffContent: null, handoffGeneratedAt: null },
        });
        return;
    }

    const ctx: HandoffContext = {
        horseName: horse.name,
        sessions: sessions.map((s) => ({
            date: s.date,
            riderName: s.rider.name,
            workType: s.workType,
            notes: s.notes,
            aiMetadata: s.aiMetadata as Record<string, unknown> | null,
        })),
    };

    const model = resolveModel(handoffPrompt);
    const systemPrompt = handoffPrompt.buildSystemPrompt(ctx);
    const userMessage = `Write a handoff note for ${horse.name}.`;

    logPrompt(handoffPrompt, model, systemPrompt, userMessage);

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
    });

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error('No content returned from AI');
    }

    await prisma.horse.update({
        where: { id: horseId },
        data: {
            handoffContent: content.trim(),
            handoffGeneratedAt: new Date(),
        },
    });

    console.info(
        `[handoff] Horse ${horseId}: updated (${content.length} chars)`
    );
}

/** Fire-and-forget handoff regeneration — logs errors, never throws */
export function triggerHandoff(horseId: string): void {
    void regenerateHandoff(horseId).catch((err) => {
        console.error(`[handoff] Failed for horse ${horseId}:`, err);
        Sentry.captureException(err, {
            tags: { feature: 'handoff' },
            extra: { horseId },
        });
    });
}
