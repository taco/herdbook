import { Calendar, Clock, User, Activity, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseSessionDate, formatSessionTime } from '@/lib/dateUtils';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getWorkTypeLabel } from '@/lib/constants';

interface SessionDetailSheetProps {
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
    } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SessionDetailSheet({
    session,
    open,
    onOpenChange,
}: SessionDetailSheetProps) {
    const navigate = useNavigate();

    if (!session) return null;

    const dateObj = parseSessionDate(session.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = formatSessionTime(dateObj);

    const handleEdit = () => {
        onOpenChange(false);
        navigate(`/sessions/${session.id}/edit`);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
                <SheetHeader className="text-left">
                    <SheetTitle className="text-xl">
                        {session.horse.name}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        {getWorkTypeLabel(session.workType)}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium">{formattedDate}</p>
                            <p className="text-sm text-muted-foreground">
                                {formattedTime}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <p>{session.durationMinutes} minutes</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <p>{session.rider.name}</p>
                    </div>

                    <Separator />

                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                            Notes
                        </h4>
                        <p className="text-sm whitespace-pre-wrap">
                            {session.notes}
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                    <Button
                        className="w-full rounded-full"
                        size="lg"
                        onClick={handleEdit}
                    >
                        <Edit className="mr-2 h-5 w-5" />
                        Edit Session
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
