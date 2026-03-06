// --- Prompt config ---

export interface PromptConfig<TContext> {
    feature: string;
    version: string;
    model: string;
    modelEnvVar: string;
    buildSystemPrompt: (ctx: TContext) => string;
    schema: unknown;
}

export function resolveModel<T>(config: PromptConfig<T>): string {
    return process.env[config.modelEnvVar] ?? config.model;
}

/** Log prompt details before sending to the model */
export function logPrompt<T>(
    config: PromptConfig<T>,
    model: string,
    systemPrompt: string,
    userMessage: string
): void {
    const divider = '─'.repeat(60);
    console.info(`[prompt] ${config.feature}:${config.version} → ${model}`);
    console.info(`[prompt] ${divider}`);
    console.info(`[prompt:system]\n${systemPrompt}`);
    console.info(`[prompt] ${divider}`);
    console.info(`[prompt:user]\n${userMessage}`);
    console.info(`[prompt] ${divider}`);
}
