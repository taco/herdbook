interface ModelPricing {
    inputPerMillion: number;
    outputPerMillion: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
    'gpt-5-nano': { inputPerMillion: 0.05, outputPerMillion: 0.4 },
    'gpt-4.1-nano': { inputPerMillion: 0.1, outputPerMillion: 0.4 },
    'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
    'gpt-4.1-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6 },
    'gpt-5': { inputPerMillion: 1.25, outputPerMillion: 10.0 },
    'gpt-5.2': { inputPerMillion: 1.75, outputPerMillion: 14.0 },
    'gpt-4.1': { inputPerMillion: 2.0, outputPerMillion: 8.0 },
    'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0 },
};

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface CostEstimate extends TokenUsage {
    cost: number;
}

export function estimateCost(model: string, usage: TokenUsage): CostEstimate {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
        return { ...usage, cost: 0 };
    }

    const inputCost =
        (usage.promptTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost =
        (usage.completionTokens / 1_000_000) * pricing.outputPerMillion;

    return { ...usage, cost: inputCost + outputCost };
}

export function formatCost(cost: number): string {
    if (cost < 0.01) {
        return `$${cost.toFixed(4)}`;
    }
    return `$${cost.toFixed(2)}`;
}

export const SUPPORTED_MODELS = Object.keys(MODEL_PRICING);
