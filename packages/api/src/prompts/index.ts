export type { PromptConfig } from './types';
export type {
    SummaryContext,
    SummarySignals,
    WorkloadLevel,
    Trend,
} from './types';
export { resolveModel, logPrompt } from './types';

import { prompt as voiceParseV1 } from './voiceParse.v1';
import { prompt as voiceParseV2 } from './voiceParse.v2';
import { prompt as horseSummaryV1 } from './horseSummary.v1';
export { ORIGINAL_SCHEMA } from './voiceParse.v1';
export { V2_SCHEMA } from './voiceParse.v2';

export const VOICE_PARSE_PROMPTS = {
    v1: voiceParseV1,
    v2: voiceParseV2,
} as const;

export const HORSE_SUMMARY_PROMPTS = {
    v1: horseSummaryV1,
} as const;

export type VoiceParseVersion = keyof typeof VOICE_PARSE_PROMPTS;
