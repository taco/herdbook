import { Calendar, Clock, User, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getWorkTypeLabel } from '@/lib/constants';
import { formatTimeAgo } from '@/lib/utils';

interface ActivityCardProps {
    session: {
        id: string;
        date: string;
        durationMinutes: number;
        workType: string;
        notes: string;
        horse: {
            name: string;
        };
        rider: {
            name: string;
        };
    };
}

export default function ActivityCard({ session }: ActivityCardProps) {
    const dateValue = Number(session.date);
    const dateObj = isNaN(dateValue)
        ? new Date(session.date)
        : new Date(dateValue);
    const formattedDate = formatTimeAgo(dateObj);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                        <CardTitle>{session.horse.name}</CardTitle>
                        <div className="flex items-center text-muted-foreground text-xs">
                            <Activity className="w-3 h-3 mr-1.5" />
                            <span>{getWorkTypeLabel(session.workType)}</span>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center text-muted-foreground text-xs bg-secondary/50 px-2 py-0.5 rounded-md">
                        <Calendar className="w-3 h-3 mr-1.5" />
                        {formattedDate}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1.5" />
                        <span>{session.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center">
                        <User className="w-3 h-3 mr-1.5" />
                        <span>{session.rider.name}</span>
                    </div>
                </div>

                {session.notes && (
                    <div className="p-2 bg-muted/30 rounded-md text-muted-foreground text-xs italic">
                        <p className="line-clamp-2">{session.notes}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
