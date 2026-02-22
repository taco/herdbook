import { Intensity } from '@/generated/graphql';
import { INTENSITY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface IntensitySelectorProps {
    value: Intensity | null;
    onChange: (value: Intensity | null) => void;
}

const OPTIONS = [
    Intensity.Light,
    Intensity.Moderate,
    Intensity.Hard,
    Intensity.VeryHard,
] as const;

export default function IntensitySelector({
    value,
    onChange,
}: IntensitySelectorProps): React.ReactNode {
    return (
        <div
            role="radiogroup"
            aria-label="Intensity"
            className="grid grid-cols-4 gap-2"
        >
            {OPTIONS.map((option) => {
                const selected = value === option;
                return (
                    <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(selected ? null : option)}
                        className={cn(
                            'min-h-[44px] rounded-lg text-sm font-medium transition-colors active:scale-[0.96]',
                            selected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary/70 text-foreground border border-border'
                        )}
                    >
                        {INTENSITY_LABELS[option]}
                    </button>
                );
            })}
        </div>
    );
}
