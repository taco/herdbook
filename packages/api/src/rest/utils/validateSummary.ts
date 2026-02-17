const FORMATTING_PATTERNS = [
    /^[-*•] /m, // bullet points
    /^\d+[.)]\s/m, // numbered lists
    /^#+\s/m, // markdown headings
    /^[A-Z][A-Za-z ]+:\s*$/m, // "Heading:" on its own line
    /\u2014/m, // em dash
];

const ADVICE_WORDS =
    /\b(should|try|recommend|consider|next time|work on|focus on|aim to)\b/i;

const DISALLOWED_WORDS =
    /\b(sessions|entries|logged|stats|median|average|gap|distribution|flag|signal|trending|notes coverage)\b/i;

export interface ValidationResult {
    valid: boolean;
    issues: string[];
}

export function validateSummary(text: string): ValidationResult {
    const issues: string[] = [];

    for (const pattern of FORMATTING_PATTERNS) {
        if (pattern.test(text)) {
            issues.push(`formatting violation: ${pattern.source}`);
        }
    }

    if (ADVICE_WORDS.test(text)) {
        const match = text.match(ADVICE_WORDS);
        issues.push(`advice leakage: "${match?.[0]}"`);
    }

    if (DISALLOWED_WORDS.test(text)) {
        const match = text.match(DISALLOWED_WORDS);
        issues.push(`disallowed word: "${match?.[0]}"`);
    }

    // Too many explicit dates signals chronological replay
    const dateMatches = text.match(
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/g
    );
    if (dateMatches && dateMatches.length > 2) {
        issues.push(
            `too many dates (${dateMatches.length}): recap should use relative time`
        );
    }

    // Sentences starting with a date or "On <Month>..."
    const sentences = text.split(/[.!?]\s+/);
    const dateLeadSentences = sentences.filter((s) =>
        /^(?:On\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(
            s.trim()
        )
    );
    if (dateLeadSentences.length >= 3) {
        issues.push(
            `chronological replay: ${dateLeadSentences.length} sentences start with a date`
        );
    }

    return { valid: issues.length === 0, issues };
}

/** Strip common formatting artifacts from model output. */
export function stripFormattingArtifacts(text: string): string {
    return text
        .replace(/^[-*•] /gm, '')
        .replace(/^#+\s+/gm, '')
        .replace(/^\d+[.)]\s/gm, '')
        .replace(/\u2014/g, ',');
}
