import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Heatmap } from './Heatmap';

interface HorseCardProps {
    horse: {
        id: string;
        name: string;
        activity: { weekStart: string; count: number }[];
    };
}

export function HorseCard({ horse }: HorseCardProps) {
    const navigate = useNavigate();

    return (
        <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/horses/${horse.id}/edit`)}
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
