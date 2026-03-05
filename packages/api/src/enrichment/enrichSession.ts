import OpenAI from 'openai';
import * as Sentry from '@sentry/node';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/db';
import { resolveModel, logPrompt } from '@/prompts';
import { prompt as enrichmentPrompt } from '@/prompts/enrichment.v1';

export interface SessionAiMetadata {
    version: string;
    movements: Array<{
        name: string;
        quality: string | null;
        role: string | null;
        notes: string | null;
    }>;
    horsePhysical: string[];
    riderObservations: string[];
    progressionSignals: string[];
    equipmentNotes: string[];
    overallTone: string | null;
    sessionSummary: string;
    extractionConfidence: string;
}

export async function enrichSession(
    sessionId: string,
    notes: string,
    workType: string
): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn(
            '[enrichment] OPENAI_API_KEY not set, skipping enrichment'
        );
        return;
    }

    const model = resolveModel(enrichmentPrompt);
    const systemPrompt = enrichmentPrompt.buildSystemPrompt({
        notes,
        workType,
    });
    const userMessage = notes;

    logPrompt(enrichmentPrompt, model, systemPrompt, userMessage);

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error('No content returned from AI');
    }

    const parsed = JSON.parse(content) as Omit<SessionAiMetadata, 'version'>;

    const metadata: SessionAiMetadata = {
        version: 'v1',
        ...parsed,
    };

    await prisma.session.update({
        where: { id: sessionId },
        data: { aiMetadata: metadata as unknown as Prisma.InputJsonObject },
    });

    console.info(
        `[enrichment] Session ${sessionId}: ${metadata.movements.length} movements, confidence=${metadata.extractionConfidence}`
    );
}

/** Fire-and-forget enrichment — logs errors, never throws */
export function triggerEnrichment(
    sessionId: string,
    notes: string,
    workType: string
): void {
    if (notes.trim().length === 0) return;

    void enrichSession(sessionId, notes, workType).catch((err) => {
        console.error(`[enrichment] Failed for session ${sessionId}:`, err);
        Sentry.captureException(err, {
            tags: { feature: 'enrichment' },
            extra: { sessionId },
        });
    });
}
