import { X, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

interface FilterChipProps {
    label: string;
    activeLabel?: string | null;
    isActive: boolean;
    onPress: () => void;
    onClear: () => void;
}

export default function FilterChip({
    label,
    activeLabel,
    isActive,
    onPress,
    onClear,
}: FilterChipProps): React.ReactNode {
    return (
        <button
            type="button"
            onClick={onPress}
            className={cn(
                'inline-flex items-center gap-1.5 shrink-0',
                'rounded-full px-3.5 h-9 text-sm font-medium',
                'transition-all duration-200 ease-out',
                'active:scale-[0.96]',
                isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/70 text-foreground border border-border hover:bg-secondary'
            )}
        >
            <span className="truncate max-w-[120px]">
                {isActive && activeLabel ? activeLabel : label}
            </span>

            {isActive ? (
                <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Clear ${label} filter`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            e.preventDefault();
                            onClear();
                        }
                    }}
                    className="ml-0.5 -mr-1 rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </span>
            ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
        </button>
    );
}
