import { cn } from '@/lib/utils';

interface WeeklyActivity {
    weekStart: string;
    count: number;
}

interface HeatmapProps {
    activity: WeeklyActivity[];
}

export function Heatmap({ activity }: HeatmapProps) {
    return (
        <div className="flex gap-1">
            {activity.map((week, i) => {
                const count = week.count;
                let bgClass = 'bg-muted';

                // Simple logic for now:
                // 0 -> muted (grayish)
                // 1-2 -> primary/40 (light green)
                // 3+ -> primary (dark green)
                if (count >= 3) {
                    bgClass = 'bg-primary';
                } else if (count > 0) {
                    bgClass = 'bg-primary/40';
                }

                // Handle date parsing safely.
                // If it's a number (timestamp) or string date.
                const dateValue = new Date(week.weekStart);
                // Check if valid date
                const label = !isNaN(dateValue.getTime())
                    ? `Week of ${dateValue.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                    : 'Week';

                return (
                    <div
                        key={i}
                        className={cn('flex-1 h-6 rounded-sm', bgClass)}
                        title={`${count} session${count !== 1 ? 's' : ''} (${label})`}
                    />
                );
            })}
        </div>
    );
}
