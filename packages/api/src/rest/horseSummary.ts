import type { FastifyInstance } from 'fastify';
import OpenAI from 'openai';
import { isDevelopment } from '@/config';
import { verifyToken } from '@/middleware/auth';
import { prisma } from '@/db';
import {
    HORSE_SUMMARY_PROMPTS,
    resolveModel,
    logPrompt,
    type SummaryContext,
    type SummarySignals,
} from '@/prompts';
import { setupAiLimiters, withAiRateLimit } from './utils/aiRateLimit';
import { computeSignals } from './utils/computeSignals';
import {
    validateSummary,
    stripFormattingArtifacts,
} from './utils/validateSummary';
import { getRefreshCooldownHours } from './utils/summaryUtils';

export async function registerSummaryRoutes(
    app: FastifyInstance
): Promise<void> {
    const limiters = setupAiLimiters(app);

    app.post(
        '/api/horse-summary',
        withAiRateLimit(limiters, 'ai', async (request, reply) => {
            // Auth
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const auth = verifyToken(authHeader);
            if (!auth) {
                return reply.status(401).send({ error: 'Invalid token' });
            }

            // Resolve rider to get barnId
            const rider = await prisma.rider.findUnique({
                where: { id: auth.riderId },
                select: { barnId: true },
            });
            if (!rider) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }

            const body = request.body as { horseId?: string } | null;
            const horseId = body?.horseId;
            if (!horseId) {
                return reply.status(400).send({ error: 'horseId is required' });
            }

            // Validate horse exists and belongs to rider's barn
            const horse = await prisma.horse.findFirst({
                where: { id: horseId, barnId: rider.barnId },
                select: {
                    id: true,
                    name: true,
                    summaryGeneratedAt: true,
                },
            });
            if (!horse) {
                return reply.status(404).send({ error: 'Horse not found' });
            }

            // Check minimum sessions
            const totalSessions = await prisma.session.count({
                where: { horseId },
            });
            if (totalSessions < 3) {
                return reply.status(400).send({
                    error: 'INSUFFICIENT_SESSIONS',
                    message:
                        'At least 3 sessions are needed to generate a summary.',
                });
            }

            // Check existing summary staleness and cooldown (skip in dev)
            if (!isDevelopment() && horse.summaryGeneratedAt) {
                const newSessions = await prisma.session.count({
                    where: {
                        horseId,
                        createdAt: { gt: horse.summaryGeneratedAt },
                    },
                });

                if (newSessions === 0) {
                    return reply.status(400).send({
                        error: 'NOT_STALE',
                        message: 'Summary is already up to date.',
                    });
                }

                const latestSession = await prisma.session.findFirst({
                    where: { horseId },
                    orderBy: { date: 'desc' },
                    select: { date: true },
                });
                if (latestSession) {
                    const cooldownHours = getRefreshCooldownHours(
                        latestSession.date
                    );
                    const refreshAvailableAt = new Date(
                        horse.summaryGeneratedAt.getTime() +
                            cooldownHours * 60 * 60 * 1000
                    );

                    if (Date.now() < refreshAvailableAt.getTime()) {
                        return reply.status(400).send({
                            error: 'COOLDOWN_ACTIVE',
                            message: `Summary can be refreshed after ${refreshAvailableAt.toISOString()}.`,
                            refreshAvailableAt:
                                refreshAvailableAt.toISOString(),
                        });
                    }
                }
            }

            // Fetch session window: last 30 sessions within 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const sessions = await prisma.session.findMany({
                where: {
                    horseId,
                    date: { gte: ninetyDaysAgo },
                },
                orderBy: { date: 'asc' },
                take: 30,
                include: {
                    rider: { select: { name: true } },
                },
            });

            if (sessions.length < 3) {
                return reply.status(400).send({
                    error: 'INSUFFICIENT_SESSIONS',
                    message:
                        'At least 3 sessions within the last 90 days are needed.',
                });
            }

            // Compute signals and build prompt
            const signals: SummarySignals = computeSignals(sessions);
            const promptConfig = HORSE_SUMMARY_PROMPTS['v1'];
            const model = resolveModel(promptConfig);

            const summaryCtx: SummaryContext = {
                horseName: horse.name,
                signals,
                rides: sessions.map((s) => ({
                    date: s.date,
                    workType: s.workType,
                    durationMinutes: s.durationMinutes,
                    riderName: s.rider.name,
                    notes: s.notes,
                })),
            };

            const systemPrompt = promptConfig.buildSystemPrompt(summaryCtx);
            const userMessage = `Generate a training recap for ${horse.name}.`;
            logPrompt(promptConfig, model, systemPrompt, userMessage);

            try {
                const openaiApiKey = process.env.OPENAI_API_KEY;
                if (!openaiApiKey) {
                    throw new Error('OpenAI API key not configured');
                }

                const openai = new OpenAI({ apiKey: openaiApiKey });

                // Generate with single retry on validation failure
                let content: string | null = null;
                let usage: OpenAI.CompletionUsage | undefined;

                for (let attempt = 0; attempt < 2; attempt++) {
                    const messages: OpenAI.ChatCompletionMessageParam[] = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage },
                    ];

                    if (attempt > 0) {
                        messages.splice(1, 0, {
                            role: 'system',
                            content:
                                'Rewrite. Your last output violated the rules. Remove dataset language and write in trainer-style ride terms.',
                        });
                        console.info(
                            '[horse-summary] Retrying with corrective prompt'
                        );
                    }

                    const completion = await openai.chat.completions.create({
                        model,
                        messages,
                    });

                    content = completion.choices[0].message.content;
                    usage = completion.usage;
                    if (!content) {
                        throw new Error('No content returned from AI');
                    }

                    const validation = validateSummary(content);
                    if (validation.valid) break;

                    console.warn(
                        `[horse-summary] Validation issues (attempt ${attempt + 1}): ${validation.issues.join(', ')}`
                    );

                    // Last attempt failed — strip artifacts and use it
                    if (attempt === 1) {
                        content = stripFormattingArtifacts(content);
                    }
                }

                // Persist
                const generatedAt = new Date();

                await prisma.horse.update({
                    where: { id: horseId },
                    data: {
                        summaryContent: content!,
                        summaryGeneratedAt: generatedAt,
                    },
                });

                return {
                    content,
                    generatedAt: generatedAt.toISOString(),
                };
            } catch (error) {
                console.error('[horse-summary] Generation error:', error);
                return reply.status(500).send({
                    error: 'GENERATION_FAILED',
                    message:
                        'Something went wrong generating the summary. Please try again.',
                });
            }
        })
    );
}
