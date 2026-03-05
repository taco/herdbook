import type { PromptConfig } from './types';

export interface EnrichmentContext {
    notes: string;
    workType: string;
}

const QUALITY_VALUES = [
    'struggled',
    'needed_work',
    'productive',
    'came_easily',
    'automatic',
];

const ENRICHMENT_JSON_SCHEMA = {
    type: 'object',
    properties: {
        movements: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    quality: {
                        type: ['string', 'null'],
                        enum: [...QUALITY_VALUES, null],
                    },
                    role: {
                        type: ['string', 'null'],
                        enum: ['focus', 'warmup', 'maintenance', null],
                    },
                    notes: { type: ['string', 'null'] },
                },
                required: ['name', 'quality', 'role', 'notes'],
                additionalProperties: false,
            },
        },
        horsePhysical: { type: 'array', items: { type: 'string' } },
        riderObservations: { type: 'array', items: { type: 'string' } },
        progressionSignals: { type: 'array', items: { type: 'string' } },
        equipmentNotes: { type: 'array', items: { type: 'string' } },
        overallTone: { type: ['string', 'null'] },
        sessionSummary: { type: 'string' },
        extractionConfidence: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
        },
    },
    required: [
        'movements',
        'horsePhysical',
        'riderObservations',
        'progressionSignals',
        'equipmentNotes',
        'overallTone',
        'sessionSummary',
        'extractionConfidence',
    ],
    additionalProperties: false,
};

export const prompt: PromptConfig<EnrichmentContext> = {
    feature: 'enrichment',
    version: 'v1',
    model: 'gpt-5-mini',
    modelEnvVar: 'ENRICHMENT_MODEL',
    buildSystemPrompt: (ctx) =>
        `You extract structured metadata from equestrian training session notes. Output valid JSON matching the schema exactly.

Work type for this session: ${ctx.workType}

Rules for movements:
- Use canonical 1-3 word names in lowercase: "walk-trot", "canter", "leg yield", "shoulder-in", "crossrail", "vertical", "gymnastic line", "ground driving", "lunging", "halt-walk transitions", "stretching circle", "lateral work", "backing up", "trot", "bending", "compression work", "upward transitions", "downward transitions", "changing direction", "tucking"
- Good names: "leg yield", "shoulder-in", "canter", "crossrail", "ground driving"
- Bad names: "leg yield at the trot from the quarter line" (too long), "LY" (abbreviation), "Leg Yield" (capitalized)
- quality: how it went — "struggled" (real difficulty), "needed_work" (challenges but progress), "productive" (solid work), "came_easily" (horse handled it well), "automatic" (effortless). Use null if not mentioned.
- role: "focus" (main exercise), "warmup" (warm-up), "maintenance" (brief/routine). Use null if unclear.
- notes: brief context from the rider's words, 1-2 sentences max. Use null if nothing notable.
- Only include movements that are explicitly described. Do not invent movements.
- If no specific movements are mentioned, return an empty array.

Rules for other fields:
- horsePhysical: physical observations about the horse (soundness, stiffness, energy, way of going). Short phrases.
- riderObservations: rider's self-observations (confidence, position, feelings). Short phrases.
- progressionSignals: notable firsts, improvements, milestones. Short phrases.
- equipmentNotes: tack, supplements, medications mentioned. Short phrases.
- overallTone: one word capturing the session mood — "productive", "challenging", "frustrating", "routine", "mixed", or null if unclear.
- sessionSummary: one sentence recap of what happened. Keep it factual and concise.
- extractionConfidence: "high" if notes are detailed with clear information, "medium" if notes are moderately detailed, "low" if notes are very brief or vague.

Important:
- Only extract what is explicitly stated. Do not infer or guess.
- Empty arrays are fine when nothing matches a field.
- Keep all text concise — short phrases, not full sentences (except sessionSummary).`,
    schema: ENRICHMENT_JSON_SCHEMA,
};
