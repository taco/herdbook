import type { ParseSessionContext } from './voice';

// --- JSON Schemas for OpenAI structured output ---

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

// --- Prompt builders ---

function formatNameList(items: Array<{ name: string }>): string {
    return items.map((item) => `- ${item.name}`).join('\n');
}

export function buildOriginalPrompt(context: ParseSessionContext): string {
    return `You are a session parser for an equestrian training log app. Extract structured fields from the user's spoken description of a training session.

Available horses (match case-insensitively, partial matches OK):
${formatNameList(context.horses)}

Available riders (match case-insensitively, partial matches OK):
${formatNameList(context.riders)}

The speaker is: ${context.speakerName}

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
Return null for any field you cannot confidently determine.`;
}

export function buildV2Prompt(context: ParseSessionContext): string {
    return `You are a session parser for an equestrian training log app.
You will receive a raw voice transcript describing a horse training session.

Your job is two-fold:
1. EXTRACT structured fields from the transcript
2. ORGANIZE the transcript into clean, readable training notes

== FIELD EXTRACTION ==

Available horses (match case-insensitively, partial matches, nicknames OK):
${formatNameList(context.horses)}

Available riders (match case-insensitively, partial matches, nicknames OK):
${formatNameList(context.riders)}

The speaker is: ${context.speakerName}

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
- Plain text only (no markdown formatting)`;
}

// --- Prompt registry ---

export type PromptName = 'original' | 'v2';

export interface PromptVariant {
    buildPrompt: (context: ParseSessionContext) => string;
    schema: typeof ORIGINAL_SCHEMA | typeof V2_SCHEMA;
}

export const PROMPTS: Record<PromptName, PromptVariant> = {
    original: { buildPrompt: buildOriginalPrompt, schema: ORIGINAL_SCHEMA },
    v2: { buildPrompt: buildV2Prompt, schema: V2_SCHEMA },
};
