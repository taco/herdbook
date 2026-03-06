import { describe, it, expect } from 'vitest';
import { validateSummary, stripFormattingArtifacts } from './summaryValidation';

describe('validateSummary', () => {
    it('passes clean prose', () => {
        const result = validateSummary(
            'The horse moved well this week, showing good rhythm in the canter work.'
        );
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('catches bullet points', () => {
        const result = validateSummary(
            'Good week overall.\n- Flatwork was solid'
        );
        expect(result.valid).toBe(false);
        expect(result.issues[0]).toContain('formatting violation');
    });

    it('catches numbered lists', () => {
        const result = validateSummary('Summary:\n1. Worked on canter');
        expect(result.valid).toBe(false);
        expect(
            result.issues.some((i) => i.includes('formatting violation'))
        ).toBe(true);
    });

    it('catches markdown headings', () => {
        const result = validateSummary('# Training Recap\nGood week.');
        expect(result.valid).toBe(false);
        expect(
            result.issues.some((i) => i.includes('formatting violation'))
        ).toBe(true);
    });

    it('catches em dashes', () => {
        const result = validateSummary(
            'Canter was strong\u2014really moving well.'
        );
        expect(result.valid).toBe(false);
        expect(
            result.issues.some((i) => i.includes('formatting violation'))
        ).toBe(true);
    });

    it('catches standalone heading lines', () => {
        const result = validateSummary('Overall Assessment:\nGood week.');
        expect(result.valid).toBe(false);
    });

    it('catches advice words', () => {
        const result = validateSummary(
            'The horse should work on lateral movements.'
        );
        expect(result.valid).toBe(false);
        expect(result.issues.some((i) => i.includes('advice leakage'))).toBe(
            true
        );
    });

    it('catches "consider" and "next time"', () => {
        expect(
            validateSummary('Consider adding more transitions.').issues.some(
                (i) => i.includes('advice')
            )
        ).toBe(true);
        expect(
            validateSummary('Next time, try longer warm-ups.').issues.some(
                (i) => i.includes('advice')
            )
        ).toBe(true);
    });

    it('catches disallowed dataset words', () => {
        const result = validateSummary(
            'Looking at the sessions, the horse improved.'
        );
        expect(result.valid).toBe(false);
        expect(result.issues.some((i) => i.includes('disallowed word'))).toBe(
            true
        );
    });

    it('catches "median", "average", "distribution"', () => {
        expect(
            validateSummary('The median duration was 45 minutes.').valid
        ).toBe(false);
        expect(
            validateSummary('Average intensity has been moderate.').valid
        ).toBe(false);
    });

    it('flags more than 2 explicit dates', () => {
        const text =
            'On Jan 1 they cantered. Feb 5 was a flat day. Mar 10 was jumping.';
        const result = validateSummary(text);
        expect(result.issues.some((i) => i.includes('too many dates'))).toBe(
            true
        );
    });

    it('allows up to 2 explicit dates', () => {
        const text = 'Started strong around Jan 1 and peaked by Feb 15.';
        const result = validateSummary(text);
        expect(result.issues.some((i) => i.includes('too many dates'))).toBe(
            false
        );
    });

    it('flags chronological replay (3+ date-leading sentences)', () => {
        const text =
            'Jan 1 they worked flat. Feb 2 was a trail ride. Mar 3 they jumped. Overall good.';
        const result = validateSummary(text);
        expect(
            result.issues.some((i) => i.includes('chronological replay'))
        ).toBe(true);
    });

    it('catches "On Month..." sentence pattern', () => {
        const text =
            'On Jan 5 they flatworked. On Feb 10 they jumped. On Mar 1 they hacked. Good progress.';
        const result = validateSummary(text);
        expect(
            result.issues.some((i) => i.includes('chronological replay'))
        ).toBe(true);
    });

    it('accumulates multiple issues', () => {
        const text =
            '# Summary\n- The horse should focus on canter.\nThe sessions were logged on Jan 1, Feb 2, and Mar 3.';
        const result = validateSummary(text);
        expect(result.valid).toBe(false);
        expect(result.issues.length).toBeGreaterThanOrEqual(3);
    });
});

describe('stripFormattingArtifacts', () => {
    it('removes bullet points', () => {
        expect(stripFormattingArtifacts('- Item one\n- Item two')).toBe(
            'Item one\nItem two'
        );
    });

    it('removes markdown headings', () => {
        expect(stripFormattingArtifacts('## Heading\nContent')).toBe(
            'Heading\nContent'
        );
    });

    it('removes numbered lists', () => {
        expect(stripFormattingArtifacts('1. First\n2) Second')).toBe(
            'First\nSecond'
        );
    });

    it('replaces em dashes with commas', () => {
        expect(stripFormattingArtifacts('good\u2014really good')).toBe(
            'good,really good'
        );
    });

    it('handles combined artifacts', () => {
        const input = '# Title\n- Item one\n1. Numbered\u2014dash';
        const result = stripFormattingArtifacts(input);
        expect(result).toBe('Title\nItem one\nNumbered,dash');
    });

    it('leaves clean text unchanged', () => {
        const text = 'The horse moved well this week.';
        expect(stripFormattingArtifacts(text)).toBe(text);
    });
});
