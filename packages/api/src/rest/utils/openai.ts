import OpenAI from 'openai';

let instance: OpenAI | null = null;

/** Lazy singleton OpenAI client. Throws if OPENAI_API_KEY is missing. */
export function getOpenAI(): OpenAI {
    if (!instance) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        instance = new OpenAI({ apiKey });
    }
    return instance;
}
