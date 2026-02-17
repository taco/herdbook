import { useState } from 'react';
import {
    Sparkles,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHorseSummary } from '@/hooks/useHorseSummary';
import type { HorseSummary } from '@/generated/graphql';

interface HorseSummarySectionProps {
    horseId: string;
    totalSessions: number;
    summary: Pick<
        HorseSummary,
        'content' | 'generatedAt' | 'stale' | 'refreshAvailableAt'
    > | null;
    onSummaryGenerated: () => void;
}

function formatCooldownRemaining(refreshAvailableAt: string | Date): string {
    const available =
        typeof refreshAvailableAt === 'string'
            ? new Date(refreshAvailableAt)
            : refreshAvailableAt;
    const hoursRemaining = Math.max(
        1,
        Math.ceil((available.getTime() - Date.now()) / (1000 * 60 * 60))
    );
    return `${hoursRemaining}h`;
}

export default function HorseSummarySection({
    horseId,
    totalSessions,
    summary,
    onSummaryGenerated,
}: HorseSummarySectionProps): React.ReactNode {
    const { status, error, generate } = useHorseSummary();
    const [expanded, setExpanded] = useState(false);

    const handleGenerate = async (): Promise<void> => {
        const ok = await generate(horseId);
        if (ok) onSummaryGenerated();
    };

    // Not enough sessions
    if (totalSessions < 3) {
        return (
            <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Training Summary
                </h2>
                <p className="text-sm text-muted-foreground/70 italic">
                    Log a few more sessions to unlock AI training summaries.
                </p>
            </section>
        );
    }

    // Loading state
    if (status === 'loading') {
        return (
            <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Training Summary
                </h2>
                <div className="space-y-2.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-[95%]" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-[88%]" />
                    <Skeleton className="h-3.5 w-[92%]" />
                </div>
            </section>
        );
    }

    // No summary yet — show generate button
    if (!summary) {
        return (
            <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Training Summary
                </h2>
                {error && (
                    <p className="text-sm text-destructive mb-2 flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {error.message}
                    </p>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleGenerate}
                >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Generate Summary
                </Button>
            </section>
        );
    }

    // Has summary — show content
    const cooldownActive =
        summary.stale &&
        summary.refreshAvailableAt &&
        new Date(summary.refreshAvailableAt).getTime() > Date.now();
    const refreshReady = summary.stale && !cooldownActive;

    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Training Summary
                </h2>
                {refreshReady && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={handleGenerate}
                    >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Refresh
                    </Button>
                )}
                {!summary.stale && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        disabled
                    >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Up to date
                    </Button>
                )}
            </div>

            {/* Error banner — keep existing content visible */}
            {error && (
                <div className="mb-2 flex items-start gap-1.5 text-sm">
                    {error.code === 'RATE_LIMITED' ? (
                        <p className="text-muted-foreground italic">
                            Daily limit reached. Try again tomorrow.
                        </p>
                    ) : (
                        <p className="text-destructive flex items-start gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            {error.message}
                        </p>
                    )}
                </div>
            )}

            {/* Summary content */}
            <p
                className={`text-sm whitespace-pre-wrap ${!expanded ? 'line-clamp-6' : ''}`}
            >
                {summary.content}
            </p>
            <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-8 px-2 text-xs text-muted-foreground"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? (
                    <>
                        <ChevronUp className="mr-1 h-3 w-3" />
                        Show less
                    </>
                ) : (
                    <>
                        <ChevronDown className="mr-1 h-3 w-3" />
                        Show more
                    </>
                )}
            </Button>

            {/* Cooldown notice */}
            {cooldownActive && summary.refreshAvailableAt && (
                <p className="mt-1 text-xs text-muted-foreground/70 italic">
                    Refresh available in{' '}
                    {formatCooldownRemaining(summary.refreshAvailableAt)}
                </p>
            )}
        </section>
    );
}
