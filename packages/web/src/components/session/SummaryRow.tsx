import { ChevronRight } from 'lucide-react';

interface SummaryRowProps {
    label: string;
    value: string | null;
    onClick: () => void;
    placeholder?: string;
}

export default function SummaryRow({
    label,
    value,
    onClick,
    placeholder = 'Not set',
}: SummaryRowProps) {
    const hasValue = value !== null && value.length > 0;

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center justify-between py-3 px-1 border-b border-border text-left min-h-[52px] active:bg-muted/50 transition-colors"
            aria-label={`Edit ${label}`}
        >
            <span className="text-base text-muted-foreground">{label}</span>
            <span className="flex items-center gap-2">
                <span
                    className={`text-base ${hasValue ? 'text-foreground' : 'text-muted-foreground/60'}`}
                >
                    {hasValue ? value : placeholder}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </span>
        </button>
    );
}
