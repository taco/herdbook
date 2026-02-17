import 'dotenv/config';
import { parseArgs } from 'node:util';
import { readFileSync, appendFileSync } from 'node:fs';
import { SAMPLE_TRANSCRIPTS, TEST_CONTEXT } from './voiceFixtures';
import { VOICE_PARSE_PROMPTS, type VoiceParseVersion } from '../src/prompts';
import { estimateCost, formatCost, SUPPORTED_MODELS } from './voiceCost';
import type { ParseSessionContext } from '../src/rest/voice';
import OpenAI from 'openai';

// --- CLI argument parsing ---

// Strip bare `--` separators injected by pnpm before our flags
const args = process.argv.slice(2).filter((a) => a !== '--');

const { values } = parseArgs({
    args,
    options: {
        fixture: { type: 'string', short: 'f' },
        transcript: { type: 'string', short: 't' },
        file: { type: 'string' },
        model: { type: 'string', short: 'm', default: 'gpt-4o-mini' },
        prompt: { type: 'string', short: 'p', default: 'v2' },
        compare: { type: 'string', short: 'c' },
        output: { type: 'string', short: 'o' },
        'list-fixtures': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
});

function printUsage(): void {
    console.log(`
Usage: pnpm --filter api run test:voice -- [options]

Options:
  --fixture, -f <name>      Use a built-in transcript fixture
  --transcript, -t <text>   Parse inline transcript text
  --file <path>             Read transcript from file
  --model, -m <model>       OpenAI model (default: gpt-4o-mini)
  --prompt, -p <name>       Prompt variant: original | v2 (default: v2)
  --compare, -c <models>    Compare models (comma-separated)
  --output, -o <path>       Save results to file (appends)
  --list-fixtures           List available fixtures
  --help, -h                Show this help

Examples:
  pnpm --filter api run test:voice -- --fixture cheeto-groundwork
  pnpm --filter api run test:voice -- --fixture cheeto-groundwork --model gpt-4o
  pnpm --filter api run test:voice -- --fixture cheeto-groundwork --compare gpt-4o-mini,gpt-4o
  pnpm --filter api run test:voice -- --fixture cheeto-groundwork --prompt original
  pnpm --filter api run test:voice -- --fixture cheeto-groundwork -o results.txt
  pnpm --filter api run test:voice -- --transcript "I rode Cheeto for an hour..."
  pnpm --filter api run test:voice -- --file transcript.txt

Supported models: ${SUPPORTED_MODELS.join(', ')}
`);
}

// --- Core parsing ---

interface ParseResult {
    model: string;
    promptName: VoiceParseVersion;
    systemPrompt: string;
    latencyMs: number;
    parsed: Record<string, unknown>;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
}

async function runParse(
    transcript: string,
    context: ParseSessionContext,
    model: string,
    promptName: VoiceParseVersion
): Promise<ParseResult> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not set in environment');
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const promptConfig = VOICE_PARSE_PROMPTS[promptName];
    const systemPrompt = promptConfig.buildSystemPrompt(context);

    const start = performance.now();

    const completion = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
        ],
        response_format:
            promptConfig.schema as OpenAI.ChatCompletionCreateParams['response_format'],
    });

    const latencyMs = performance.now() - start;

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const usage = {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
    };

    const costEstimate = estimateCost(model, usage);

    return {
        model,
        promptName,
        systemPrompt,
        latencyMs,
        parsed,
        usage,
        cost: costEstimate.cost,
    };
}

// --- Display ---

function resolveNameToId(
    name: string | null,
    items: Array<{ id: string; name: string }>
): string | null {
    if (!name) return null;
    const lower = name.toLowerCase();
    const match = items.find((item) => item.name.toLowerCase() === lower);
    return match?.id ?? null;
}

function formatNameField(
    name: string | null,
    items: Array<{ id: string; name: string }>
): string {
    if (!name) return '(none)';
    const id = resolveNameToId(name, items);
    return id ? `${name} -> ${id}` : `${name} (no match)`;
}

function formatResult(
    result: ParseResult,
    context: ParseSessionContext
): string {
    const divider = '='.repeat(60);
    const latency = (result.latencyMs / 1000).toFixed(1);
    const lines: string[] = [];

    lines.push('');
    lines.push(divider);
    lines.push(
        `Model: ${result.model} | Prompt: ${result.promptName} | Latency: ${latency}s`
    );
    lines.push(divider);

    lines.push('');
    lines.push('--- System Prompt ---');
    for (const line of result.systemPrompt.split('\n')) {
        lines.push(`  ${line}`);
    }

    lines.push('');
    lines.push('--- Extracted Fields ---');
    lines.push(
        `  Horse:    ${formatNameField(result.parsed.horseName as string | null, context.horses)}`
    );
    lines.push(
        `  Rider:    ${formatNameField(result.parsed.riderName as string | null, context.riders)}`
    );
    lines.push(
        `  Duration: ${result.parsed.durationMinutes != null ? `${result.parsed.durationMinutes} min` : '(none)'}`
    );
    lines.push(`  WorkType: ${result.parsed.workType ?? '(none)'}`);

    if (typeof result.parsed.formattedNotes === 'string') {
        lines.push('');
        lines.push('--- Formatted Notes ---');
        for (const line of result.parsed.formattedNotes.split('\n')) {
            lines.push(`  ${line}`);
        }
    }

    lines.push('');
    lines.push('--- Usage ---');
    lines.push(`  Prompt tokens:     ${result.usage.promptTokens}`);
    lines.push(`  Completion tokens: ${result.usage.completionTokens}`);
    lines.push(`  Total tokens:      ${result.usage.totalTokens}`);
    lines.push(`  Estimated cost:    ${formatCost(result.cost)}`);

    return lines.join('\n');
}

function outputResult(
    result: ParseResult,
    context: ParseSessionContext,
    outputPath: string | undefined
): void {
    const text = formatResult(result, context);
    console.log(text);
    if (outputPath) {
        appendFileSync(outputPath, text + '\n');
    }
}

// --- Main ---

async function main(): Promise<void> {
    if (values.help) {
        printUsage();
        return;
    }

    if (values['list-fixtures']) {
        console.log('\nAvailable fixtures:');
        for (const name of Object.keys(SAMPLE_TRANSCRIPTS)) {
            const preview = SAMPLE_TRANSCRIPTS[name].slice(0, 80);
            console.log(`  ${name}`);
            console.log(`    "${preview}..."`);
        }
        return;
    }

    // Resolve transcript
    let transcript: string | undefined;

    if (values.fixture) {
        transcript = SAMPLE_TRANSCRIPTS[values.fixture];
        if (!transcript) {
            console.error(`Unknown fixture: ${values.fixture}`);
            console.error(
                `Available: ${Object.keys(SAMPLE_TRANSCRIPTS).join(', ')}`
            );
            process.exit(1);
        }
    } else if (values.transcript) {
        transcript = values.transcript;
    } else if (values.file) {
        transcript = readFileSync(values.file, 'utf-8').trim();
    } else {
        printUsage();
        process.exit(1);
    }

    const promptName = (values.prompt ?? 'v2') as VoiceParseVersion;
    if (!VOICE_PARSE_PROMPTS[promptName]) {
        console.error(`Unknown prompt: ${promptName}`);
        console.error(
            `Available: ${Object.keys(VOICE_PARSE_PROMPTS).join(', ')}`
        );
        process.exit(1);
    }

    const context = TEST_CONTEXT;

    const outputPath = values.output;

    // Compare mode: run multiple models sequentially
    if (values.compare) {
        const models = values.compare.split(',').map((m) => m.trim());
        for (const model of models) {
            try {
                const result = await runParse(
                    transcript,
                    context,
                    model,
                    promptName
                );
                outputResult(result, context, outputPath);
            } catch (err) {
                console.error(
                    `\nError with model ${model}:`,
                    err instanceof Error ? err.message : err
                );
            }
        }
        if (outputPath) {
            console.log(`\nResults saved to ${outputPath}`);
        }
        return;
    }

    // Single model
    const model = values.model ?? 'gpt-4o-mini';
    const result = await runParse(transcript, context, model, promptName);
    outputResult(result, context, outputPath);
    if (outputPath) {
        console.log(`\nResults saved to ${outputPath}`);
    }
}

main().catch((err) => {
    console.error('Fatal error:', err instanceof Error ? err.message : err);
    process.exit(1);
});
