/**
 * Enrichment evaluation script — compares aiMetadata from DB against
 * the validated baseline in .notes/enrichment-validation-results.json.
 *
 * Usage:
 *   pnpm --filter api run enrich:eval              # compare current DB results
 *   pnpm --filter api run enrich:eval -- --verbose  # show per-field diffs
 *
 * Workflow:
 *   1. Run backfill:    pnpm --filter api run enrich:backfill
 *   2. Evaluate:        pnpm --filter api run enrich:eval
 *   3. Tweak prompt in src/prompts/enrichment.v1.ts
 *   4. Clear metadata:  pnpm --filter api run enrich:clear
 *   5. Repeat from step 1
 */
import '../src/instrument';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/db';

// --- Types ---

interface ValidationMovement {
    name: string;
    quality: string | null;
    role: string | null;
    notes: string | null;
}

interface ValidationExtraction {
    movements: ValidationMovement[];
    horse_physical: string[];
    rider_observations: string[];
    progression_signals: string[];
    equipment_notes: string[];
    overall_tone: string | null;
    session_summary: string;
    extraction_confidence: string;
}

interface ValidationEntry {
    horse: string;
    rider: string;
    date: string;
    workType: string;
    notesLength: number;
    tokens: number;
    extraction: ValidationExtraction;
}

interface DbMetadata {
    version: string;
    movements: ValidationMovement[];
    horsePhysical: string[];
    riderObservations: string[];
    progressionSignals: string[];
    equipmentNotes: string[];
    overallTone: string | null;
    sessionSummary: string;
    extractionConfidence: string;
}

// --- Snake → camel mapping for comparison ---

function toCamel(entry: ValidationExtraction): Omit<DbMetadata, 'version'> {
    return {
        movements: entry.movements,
        horsePhysical: entry.horse_physical,
        riderObservations: entry.rider_observations,
        progressionSignals: entry.progression_signals,
        equipmentNotes: entry.equipment_notes,
        overallTone: entry.overall_tone,
        sessionSummary: entry.session_summary,
        extractionConfidence: entry.extraction_confidence,
    };
}

// --- Scoring ---

function scoreArrayOverlap(baseline: string[], actual: string[]): number {
    if (baseline.length === 0 && actual.length === 0) return 1;
    if (baseline.length === 0 || actual.length === 0) return 0;

    const baseNorm = baseline.map((s) => s.toLowerCase().trim());
    const actualNorm = actual.map((s) => s.toLowerCase().trim());

    // Fuzzy match: count how many baseline items have a close match in actual
    let matches = 0;
    for (const b of baseNorm) {
        const found = actualNorm.some(
            (a) =>
                a.includes(b) ||
                b.includes(a) ||
                levenshteinSimilarity(a, b) > 0.6
        );
        if (found) matches++;
    }

    // Penalize extras — don't want hallucinated items
    const precision =
        actualNorm.length > 0
            ? actualNorm.filter((a) =>
                  baseNorm.some(
                      (b) =>
                          a.includes(b) ||
                          b.includes(a) ||
                          levenshteinSimilarity(a, b) > 0.6
                  )
              ).length / actualNorm.length
            : 0;

    const recall = matches / baseNorm.length;
    // F1 score
    if (precision + recall === 0) return 0;
    return (2 * precision * recall) / (precision + recall);
}

function levenshteinSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    const dist = levenshtein(a, b);
    return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
        new Array(n + 1).fill(0)
    );
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] =
                a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 +
                      Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function scoreMovements(
    baseline: ValidationMovement[],
    actual: ValidationMovement[]
): { nameScore: number; qualityScore: number; count: string } {
    if (baseline.length === 0 && actual.length === 0) {
        return { nameScore: 1, qualityScore: 1, count: '0/0' };
    }

    const baseNames = baseline.map((m) => m.name.toLowerCase());
    const actualNames = actual.map((m) => m.name.toLowerCase());
    const nameScore = scoreArrayOverlap(baseNames, actualNames);

    // Quality match: for movements that share a name, does quality agree?
    let qualityMatches = 0;
    let qualityTotal = 0;
    for (const bm of baseline) {
        const match = actual.find(
            (am) =>
                am.name.toLowerCase() === bm.name.toLowerCase() ||
                levenshteinSimilarity(
                    am.name.toLowerCase(),
                    bm.name.toLowerCase()
                ) > 0.6
        );
        if (match && bm.quality) {
            qualityTotal++;
            if (match.quality === bm.quality) qualityMatches++;
        }
    }

    const qualityScore = qualityTotal > 0 ? qualityMatches / qualityTotal : 1;
    return {
        nameScore,
        qualityScore,
        count: `${actual.length}/${baseline.length}`,
    };
}

function exactMatch(a: string | null, b: string | null): number {
    if (a === b) return 1;
    if (a === null || b === null) return 0;
    return a.toLowerCase() === b.toLowerCase() ? 1 : 0;
}

interface SessionScore {
    horse: string;
    rider: string;
    date: string;
    workType: string;
    matched: boolean;
    movementNames: number;
    movementQuality: number;
    movementCount: string;
    horsePhysical: number;
    riderObservations: number;
    progressionSignals: number;
    equipmentNotes: number;
    overallTone: number;
    confidence: number;
    overall: number;
}

function scoreSession(
    baseline: Omit<DbMetadata, 'version'>,
    actual: DbMetadata
): Omit<SessionScore, 'horse' | 'rider' | 'date' | 'workType' | 'matched'> {
    const mv = scoreMovements(baseline.movements, actual.movements);
    const hp = scoreArrayOverlap(baseline.horsePhysical, actual.horsePhysical);
    const ro = scoreArrayOverlap(
        baseline.riderObservations,
        actual.riderObservations
    );
    const ps = scoreArrayOverlap(
        baseline.progressionSignals,
        actual.progressionSignals
    );
    const en = scoreArrayOverlap(
        baseline.equipmentNotes,
        actual.equipmentNotes
    );
    const tone = exactMatch(baseline.overallTone, actual.overallTone);
    const conf = exactMatch(
        baseline.extractionConfidence,
        actual.extractionConfidence
    );

    // Weighted overall: movements matter most
    const overall =
        mv.nameScore * 0.25 +
        mv.qualityScore * 0.15 +
        hp * 0.15 +
        ro * 0.1 +
        ps * 0.1 +
        en * 0.1 +
        tone * 0.1 +
        conf * 0.05;

    return {
        movementNames: mv.nameScore,
        movementQuality: mv.qualityScore,
        movementCount: mv.count,
        horsePhysical: hp,
        riderObservations: ro,
        progressionSignals: ps,
        equipmentNotes: en,
        overallTone: tone,
        confidence: conf,
        overall,
    };
}

// --- Main ---

async function main(): Promise<void> {
    const verbose = process.argv.includes('--verbose');

    // Load baseline
    const baselinePath = resolve(
        __dirname,
        '../../..',
        '.notes/enrichment-validation-results.json'
    );
    const baseline: ValidationEntry[] = JSON.parse(
        readFileSync(baselinePath, 'utf-8')
    );
    console.info(`[eval] Loaded ${baseline.length} baseline entries`);

    // Fetch all sessions with aiMetadata, joining horse + rider names
    const sessions = await prisma.session.findMany({
        where: { NOT: { aiMetadata: { equals: Prisma.DbNull } } },
        include: {
            horse: { select: { name: true } },
            rider: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
    });

    console.info(`[eval] Found ${sessions.length} enriched sessions in DB\n`);

    if (sessions.length === 0) {
        console.info(
            '[eval] No enriched sessions. Run: pnpm --filter api run enrich:backfill'
        );
        await prisma.$disconnect();
        return;
    }

    // Match and score
    const scores: SessionScore[] = [];
    let unmatched = 0;

    for (const entry of baseline) {
        const dateStr = entry.date; // "2026-02-21"
        const match = sessions.find((s) => {
            const sDate = new Date(s.date).toISOString().slice(0, 10);
            return (
                s.horse.name === entry.horse &&
                s.rider.name === entry.rider &&
                sDate === dateStr &&
                s.workType === entry.workType
            );
        });

        if (!match || !match.aiMetadata) {
            unmatched++;
            scores.push({
                horse: entry.horse,
                rider: entry.rider,
                date: entry.date,
                workType: entry.workType,
                matched: false,
                movementNames: 0,
                movementQuality: 0,
                movementCount: '-',
                horsePhysical: 0,
                riderObservations: 0,
                progressionSignals: 0,
                equipmentNotes: 0,
                overallTone: 0,
                confidence: 0,
                overall: 0,
            });
            continue;
        }

        const baselineCamel = toCamel(entry.extraction);
        const actual = match.aiMetadata as unknown as DbMetadata;
        const sessionScore = scoreSession(baselineCamel, actual);

        scores.push({
            horse: entry.horse,
            rider: entry.rider,
            date: entry.date,
            workType: entry.workType,
            matched: true,
            ...sessionScore,
        });
    }

    // Print results
    const matched = scores.filter((s) => s.matched);

    console.info('─'.repeat(100));
    console.info(
        padRight('Horse', 10) +
            padRight('Rider', 10) +
            padRight('Date', 12) +
            padRight('Type', 12) +
            padRight('Mvmts', 8) +
            padRight('MvQual', 8) +
            padRight('Phys', 8) +
            padRight('Rider', 8) +
            padRight('Prog', 8) +
            padRight('Equip', 8) +
            padRight('Tone', 8) +
            padRight('Overall', 8)
    );
    console.info('─'.repeat(100));

    for (const s of scores) {
        if (!s.matched) {
            console.info(
                padRight(s.horse, 10) +
                    padRight(s.rider, 10) +
                    padRight(s.date, 12) +
                    padRight(s.workType, 12) +
                    '  (not enriched yet)'
            );
            continue;
        }
        console.info(
            padRight(s.horse, 10) +
                padRight(s.rider, 10) +
                padRight(s.date, 12) +
                padRight(s.workType, 12) +
                padRight(pct(s.movementNames), 8) +
                padRight(pct(s.movementQuality), 8) +
                padRight(pct(s.horsePhysical), 8) +
                padRight(pct(s.riderObservations), 8) +
                padRight(pct(s.progressionSignals), 8) +
                padRight(pct(s.equipmentNotes), 8) +
                padRight(pct(s.overallTone), 8) +
                padRight(pct(s.overall), 8)
        );
    }

    console.info('─'.repeat(100));

    // Averages
    if (matched.length > 0) {
        const avg = (field: keyof SessionScore): number => {
            const vals = matched.map((s) => s[field] as number);
            return vals.reduce((a, b) => a + b, 0) / vals.length;
        };

        console.info(
            '\n' +
                padRight('AVERAGE', 10) +
                padRight('', 10) +
                padRight('', 12) +
                padRight('', 12) +
                padRight(pct(avg('movementNames')), 8) +
                padRight(pct(avg('movementQuality')), 8) +
                padRight(pct(avg('horsePhysical')), 8) +
                padRight(pct(avg('riderObservations')), 8) +
                padRight(pct(avg('progressionSignals')), 8) +
                padRight(pct(avg('equipmentNotes')), 8) +
                padRight(pct(avg('overallTone')), 8) +
                padRight(pct(avg('overall')), 8)
        );
    }

    console.info(`\nMatched: ${matched.length}/${baseline.length}`);
    if (unmatched > 0) {
        console.info(`Unmatched: ${unmatched} (not yet enriched)`);
    }

    // Verbose: show per-session diffs
    if (verbose) {
        console.info('\n\n=== DETAILED DIFFS ===\n');
        for (const entry of baseline) {
            const match = sessions.find((s) => {
                const sDate = new Date(s.date).toISOString().slice(0, 10);
                return (
                    s.horse.name === entry.horse &&
                    s.rider.name === entry.rider &&
                    sDate === entry.date &&
                    s.workType === entry.workType
                );
            });
            if (!match?.aiMetadata) continue;

            const actual = match.aiMetadata as unknown as DbMetadata;
            const base = toCamel(entry.extraction);

            console.info(
                `\n--- ${entry.horse} / ${entry.rider} / ${entry.date} / ${entry.workType} ---`
            );

            // Movements
            console.info(
                `  Movements (baseline ${base.movements.length}, actual ${actual.movements.length}):`
            );
            for (const bm of base.movements) {
                const am = actual.movements.find(
                    (m) =>
                        m.name.toLowerCase() === bm.name.toLowerCase() ||
                        levenshteinSimilarity(
                            m.name.toLowerCase(),
                            bm.name.toLowerCase()
                        ) > 0.6
                );
                if (am) {
                    const qualMatch = am.quality === bm.quality ? '=' : '!=';
                    console.info(
                        `    "${bm.name}" → "${am.name}" quality: ${bm.quality} ${qualMatch} ${am.quality}`
                    );
                } else {
                    console.info(`    "${bm.name}" → MISSING`);
                }
            }
            // Extras in actual
            for (const am of actual.movements) {
                const inBase = base.movements.some(
                    (bm) =>
                        bm.name.toLowerCase() === am.name.toLowerCase() ||
                        levenshteinSimilarity(
                            bm.name.toLowerCase(),
                            am.name.toLowerCase()
                        ) > 0.6
                );
                if (!inBase) {
                    console.info(`    EXTRA: "${am.name}" (${am.quality})`);
                }
            }

            // Array fields
            for (const field of [
                'horsePhysical',
                'riderObservations',
                'progressionSignals',
                'equipmentNotes',
            ] as const) {
                const bArr = base[field];
                const aArr = actual[field];
                if (bArr.length > 0 || aArr.length > 0) {
                    console.info(`  ${field}:`);
                    console.info(`    baseline: ${JSON.stringify(bArr)}`);
                    console.info(`    actual:   ${JSON.stringify(aArr)}`);
                }
            }

            // Scalars
            if (base.overallTone !== actual.overallTone) {
                console.info(
                    `  overallTone: baseline="${base.overallTone}" actual="${actual.overallTone}"`
                );
            }
            if (base.extractionConfidence !== actual.extractionConfidence) {
                console.info(
                    `  confidence: baseline="${base.extractionConfidence}" actual="${actual.extractionConfidence}"`
                );
            }
        }
    }

    await prisma.$disconnect();
}

function padRight(s: string, n: number): string {
    return s.padEnd(n);
}

function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
}

main().catch((err) => {
    console.error('[eval] Fatal error:', err);
    process.exit(1);
});
