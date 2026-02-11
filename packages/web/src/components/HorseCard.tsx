import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Heatmap } from './Heatmap';

interface HorseCardProps {
    horse: {
        id: string;
        name: string;
        activity: { weekStart: string; count: number }[];
    };
}

export function HorseCard({ horse }: HorseCardProps) {
    const { push } = useAppNavigate();

    return (
        <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => push(`/horses/${horse.id}`)}
        >
            <CardHeader>
                <CardTitle className="truncate">{horse.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <Heatmap activity={horse.activity} />
            </CardContent>
        </Card>
    );
}
