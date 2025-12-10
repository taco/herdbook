import { Calendar, Clock, User, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getWorkTypeLabel } from '@/lib/constants';

interface ActivityItemProps {
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

export default function ActivityItem({ session }: ActivityItemProps) {
    const dateValue = Number(session.date);
    const dateObj = isNaN(dateValue)
        ? new Date(session.date)
        : new Date(dateValue);
    const formattedDate = dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg text-primary">
                            {session.horse.name}
                        </CardTitle>
                        <div className="flex items-center text-muted-foreground text-sm mt-1">
                            <Activity className="w-3 h-3 mr-1" />
                            <span className="font-medium">
                                {getWorkTypeLabel(session.workType)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center text-muted-foreground text-xs bg-secondary px-2 py-1 rounded-full">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formattedDate}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
                <div className="flex justify-between items-center text-muted-foreground">
                    <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{session.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        <span>{session.rider.name}</span>
                    </div>
                </div>

                {session.notes && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-md text-muted-foreground italic text-xs">
                        "{session.notes}"
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
