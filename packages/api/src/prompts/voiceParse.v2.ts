import type { ParseSessionContext } from '@/rest/voice';
import type { PromptConfig } from './types';

function formatNameList(items: Array<{ name: string }>): string {
    return items.map((item) => `- ${item.name}`).join('\n');
}

export const V2_SCHEMA = {
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
                formattedNotes: { type: 'string' },
            },
            required: [
                'horseName',
                'riderName',
                'durationMinutes',
                'workType',
                'formattedNotes',
            ],
            additionalProperties: false,
        },
    },
} as const;

export const prompt: PromptConfig<ParseSessionContext> = {
    feature: 'voiceParse',
    version: 'v2',
    model: 'gpt-5.2',
    modelEnvVar: 'VOICE_PARSE_MODEL',
    buildSystemPrompt: (ctx) =>
        `You are a session parser for an equestrian training log app.
You will receive a raw voice transcript describing a horse training session.

Your job is two-fold:
1. EXTRACT structured fields from the transcript
2. ORGANIZE the transcript into clean, readable training notes

== FIELD EXTRACTION ==

Available horses (match case-insensitively, partial matches, nicknames OK):
${formatNameList(ctx.horses)}

Available riders (match case-insensitively, partial matches, nicknames OK):
${formatNameList(ctx.riders)}

The speaker is: ${ctx.speakerName}

Rules:
- horseName: The PRIMARY horse being worked. Return the name exactly as it appears in the list. Ignore horses mentioned in passing (e.g. "rode alongside Cheeto" — Cheeto is scenery, not the subject).
- riderName: The person who rode/worked the horse. Return the name exactly as it appears in the list. "I rode..." = the speaker. "[Name] rode..." = match that name.
- durationMinutes: "an hour" → 60, "half an hour" → 30, etc.
- workType: Infer from context:
  FLATWORK: dressage, arena work, walk/trot/canter, lateral work, contact
  JUMPING: jumps, fences, poles, courses
  GROUNDWORK: lunging, long-lining, liberty, round pen, "on the ground"
  IN_HAND: in-hand work, Serreta, Spanish Rider, ground manners
  TRAIL: hacking, trail ride, outside ride
  OTHER: unclear
  When multiple types appear, pick the PRIMARY focus.
- Return null for any field you cannot confidently determine.

== NOTES ORGANIZATION ==

Transform the raw transcript into clean training notes:
- Group related content into paragraphs separated by blank lines
- Add short topic headers when there are distinct topics — derive them from the actual content (e.g. warmup, over-fences, energy, contact). Skip headers for simple/short entries
- Clean up speech artifacts: filler words, false starts, self-corrections
- Preserve ALL substantive details and domain terms exactly
- Do NOT invent information not in the transcript
- Plain text only (no markdown formatting)`,
    schema: V2_SCHEMA,
};
