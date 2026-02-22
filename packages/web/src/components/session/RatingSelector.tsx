import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingSelectorProps {
    value: number | null;
    onChange: (value: number | null) => void;
}

const STARS = [1, 2, 3, 4, 5] as const;

export default function RatingSelector({
    value,
    onChange,
}: RatingSelectorProps): React.ReactNode {
    return (
        <div role="radiogroup" aria-label="Rating" className="flex gap-1">
            {STARS.map((star) => {
                const filled = value !== null && star <= value;
                const selected = value === star;
                return (
                    <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        onClick={() => onChange(selected ? null : star)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-110 transition-transform"
                    >
                        <Star
                            className={cn(
                                'h-7 w-7',
                                filled
                                    ? 'fill-foreground text-foreground'
                                    : 'text-muted-foreground/40'
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
}
