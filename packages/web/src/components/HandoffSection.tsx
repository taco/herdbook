import { MessageCircle } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

interface HandoffSectionProps {
    handoff: {
        content: string;
        generatedAt: string;
    } | null;
}

export default function HandoffSection({
    handoff,
}: HandoffSectionProps): React.ReactNode {
    if (!handoff) return null;

    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Lately
                </h2>
                <span className="text-xs text-muted-foreground/70">
                    {formatTimeAgo(new Date(handoff.generatedAt))}
                </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{handoff.content}</p>
        </section>
    );
}
