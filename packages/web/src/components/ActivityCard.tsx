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
            <CardHeader className="p-3 pb-1">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-semibold text-primary">
                            {session.horse.name}
                        </CardTitle>
                        <div className="flex items-center text-muted-foreground text-xs mt-0.5">
                            <Activity className="w-3 h-3 mr-1" />
                            <span className="font-medium">
                                {getWorkTypeLabel(session.workType)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center text-muted-foreground text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formattedDate}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-1 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-muted-foreground">
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
                    <div className="mt-1 p-2 bg-muted/100 rounded-md text-muted-foreground italic text-xs">
                        <div className="line-clamp-2">"{session.notes}"</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
