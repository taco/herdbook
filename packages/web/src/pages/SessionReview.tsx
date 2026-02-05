import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle, PenLine, Mic, ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ParsedSessionFields } from '@/hooks/useRecordingStateMachine';

interface LocationState {
    parsedFields: ParsedSessionFields;
}

export default function SessionReview() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState | null;

    // Redirect if no parsed data
    if (!state?.parsedFields) {
        return <Navigate to="/sessions/voice" replace />;
    }

    const { parsedFields } = state;

    const handleManualEntry = () => {
        // Navigate to manual entry with prefilled data
        navigate('/sessions/new', {
            state: {
                prefill: {
                    horseId: parsedFields.horseId,
                    riderId: parsedFields.riderId,
                    date: parsedFields.date,
                    durationMinutes: parsedFields.durationMinutes,
                    workType: parsedFields.workType,
                    notes: parsedFields.notes,
                },
            },
        });
    };

    const handleRecordAgain = () => {
        navigate('/sessions/voice');
    };

    const handleBack = () => {
        navigate('/sessions/voice');
    };

    return (
        <div className="min-h-dvh flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-10 w-10"
                    aria-label="Go back"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-semibold">Review Session</h1>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <div className="text-center">
                                <h2 className="font-semibold text-xl mb-1">
                                    Recording Processed
                                </h2>
                                <p className="text-base text-muted-foreground">
                                    Review screen coming in Phase 2
                                </p>
                            </div>

                            {/* Show extracted data for testing */}
                            <div className="w-full mt-4 p-4 bg-muted rounded-lg text-base">
                                <h3 className="font-medium mb-2">
                                    Extracted Data:
                                </h3>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li>
                                        <span className="font-medium">
                                            Horse:
                                        </span>{' '}
                                        {parsedFields.horseId || 'Not detected'}
                                    </li>
                                    <li>
                                        <span className="font-medium">
                                            Rider:
                                        </span>{' '}
                                        {parsedFields.riderId || 'Not detected'}
                                    </li>
                                    <li>
                                        <span className="font-medium">
                                            Duration:
                                        </span>{' '}
                                        {parsedFields.durationMinutes
                                            ? `${parsedFields.durationMinutes} min`
                                            : 'Not detected'}
                                    </li>
                                    <li>
                                        <span className="font-medium">
                                            Work Type:
                                        </span>{' '}
                                        {parsedFields.workType ||
                                            'Not detected'}
                                    </li>
                                    <li>
                                        <span className="font-medium">
                                            Date:
                                        </span>{' '}
                                        {parsedFields.date
                                            ? new Date(
                                                  parsedFields.date
                                              ).toLocaleString()
                                            : 'Not detected'}
                                    </li>
                                    {parsedFields.notes && (
                                        <li className="pt-2">
                                            <span className="font-medium">
                                                Notes:
                                            </span>
                                            <p className="mt-1 whitespace-pre-wrap">
                                                {parsedFields.notes}
                                            </p>
                                        </li>
                                    )}
                                </ul>
                            </div>

                            <div className="flex flex-col gap-2 w-full mt-2">
                                <Button
                                    onClick={handleManualEntry}
                                    className="w-full"
                                >
                                    <PenLine className="mr-2 h-4 w-4" />
                                    Continue to Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleRecordAgain}
                                    className="w-full"
                                >
                                    <Mic className="mr-2 h-4 w-4" />
                                    Record Again
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
