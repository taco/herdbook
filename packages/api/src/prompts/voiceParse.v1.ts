import type { ParseSessionContext } from '@/rest/voice';
import type { PromptConfig } from './types';

function formatNameList(items: Array<{ name: string }>): string {
    return items.map((item) => `- ${item.name}`).join('\n');
}

export const ORIGINAL_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'session',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                horseName: { type: ['string', 'null'] },
                riderName: { type: ['string', 'null'] },
                durationMinutes: { type: ['number', 'null'] },
                workType: {
                    type: ['string', 'null'],
                    enum: [
                        'FLATWORK',
                        'JUMPING',
                        'GROUNDWORK',
                        'IN_HAND',
                        'TRAIL',
                        'OTHER',
                        null,
                    ],
                },
            },
            required: ['horseName', 'riderName', 'durationMinutes', 'workType'],
            additionalProperties: false,
        },
    },
} as const;

export const prompt: PromptConfig<ParseSessionContext> = {
    feature: 'voiceParse',
    version: 'v1',
    model: 'gpt-5.2',
    modelEnvVar: 'VOICE_PARSE_MODEL',
    buildSystemPrompt: (ctx) =>
        `You are a session parser for an equestrian training log app. Extract structured fields from the user's spoken description of a training session.

Available horses (match case-insensitively, partial matches OK):
${formatNameList(ctx.horses)}

Available riders (match case-insensitively, partial matches OK):
${formatNameList(ctx.riders)}

The speaker is: ${ctx.speakerName}

Instructions:
1. Match horse/rider names from the available lists. Use fuzzy matching (partial names, nicknames, case-insensitive). Return the name exactly as it appears in the list.
2. Parse duration: "an hour" → 60, "45 minutes" → 45, "half an hour" → 30, "an hour and a half" → 90
3. Infer work type from context clues:
   - FLATWORK: dressage, schooling, walk/trot/canter work, arena work
   - JUMPING: jumps, fences, poles, courses
   - GROUNDWORK: lunging, long-lining, liberty work
   - IN_HAND: leading, ground manners, showmanship
   - TRAIL: hacking, trail ride, outside ride
   - OTHER: anything else or unclear
Return null for any field you cannot confidently determine.`,
    schema: ORIGINAL_SCHEMA,
};
