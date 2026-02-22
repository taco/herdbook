import { Calendar, Clock, User, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getIntensityLabel, getWorkTypeLabel } from '@/lib/constants';
import { formatTimeAgo } from '@/lib/utils';
import { parseSessionDate } from '@/lib/dateUtils';

interface ActivityCardProps {
    session: {
        id: string;
        date: string;
        durationMinutes: number;
        workType: string;
        intensity?: string | null;
        notes: string;
        horse: {
            name: string;
        };
        rider: {
            name: string;
        };
    };
    onClick?: () => void;
}

export default function ActivityCard({ session, onClick }: ActivityCardProps) {
    const formattedDate = formatTimeAgo(parseSessionDate(session.date));

    return (
        <Card
            className={
                onClick
                    ? 'cursor-pointer active:scale-[0.98] transition-transform'
                    : ''
            }
            onClick={onClick}
        >
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                        <CardTitle>{session.horse.name}</CardTitle>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <div className="flex items-center">
                                <Activity className="w-3 h-3 mr-1.5" />
                                <span>
                                    {getWorkTypeLabel(session.workType)}
                                </span>
                            </div>
                            {session.intensity && (
                                <span className="bg-secondary px-1.5 py-0.5 rounded text-[11px] font-medium">
                                    {getIntensityLabel(session.intensity)}
                                </span>
                            )}
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
