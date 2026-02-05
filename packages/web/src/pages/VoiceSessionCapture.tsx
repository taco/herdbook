import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { ChevronLeft, RotateCcw, PenLine, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import RecordingPanel from '@/components/voice/RecordingPanel';
import ProcessingOverlay from '@/components/voice/ProcessingOverlay';
import { useRecordingStateMachine } from '@/hooks/useRecordingStateMachine';
import { GetHorsesQuery, GetRidersQuery } from '@/generated/graphql';

const GET_HORSES_QUERY = gql`
    query GetHorses {
        horses {
            id
            name
        }
    }
`;

const GET_RIDERS_QUERY = gql`
    query GetRiders {
        riders {
            id
            name
        }
    }
`;

export default function VoiceSessionCapture() {
    const navigate = useNavigate();

    const { data: horsesData, loading: horsesLoading } =
        useQuery<GetHorsesQuery>(GET_HORSES_QUERY);
    const { data: ridersData, loading: ridersLoading } =
        useQuery<GetRidersQuery>(GET_RIDERS_QUERY);

    const horses = horsesData?.horses ?? [];
    const riders = ridersData?.riders ?? [];
    const dataLoading = horsesLoading || ridersLoading;

    const {
        state,
        elapsedSeconds,
        maxDurationSeconds,
        parsedFields,
        error,
        startRecording,
        stopRecording,
        cancelRecording,
        reset,
    } = useRecordingStateMachine({
        horses,
        riders,
    });

    // Navigate to review screen on success
    useEffect(() => {
        if (state === 'success' && parsedFields) {
            navigate('/sessions/review', { state: { parsedFields } });
        }
    }, [state, parsedFields, navigate]);

    const handleBack = () => {
        if (state === 'recording') {
            cancelRecording();
        }
        navigate(-1);
    };

    const handleManualEntry = () => {
        navigate('/sessions/new');
    };

    const isRecording = state === 'recording';
    const isProcessing = state === 'processing';
    const isError = state === 'error';
    const isIdle = state === 'idle';

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
                <h1 className="text-lg font-semibold">Log Session</h1>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {dataLoading ? (
                    <div className="text-base text-muted-foreground">
                        Loading...
                    </div>
                ) : isProcessing ? (
                    <ProcessingOverlay />
                ) : isError ? (
                    <Card className="w-full max-w-sm">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertCircle className="w-8 h-8 text-destructive" />
                                </div>
                                <div className="text-center">
                                    <h2 className="font-semibold text-xl mb-1">
                                        Something went wrong
                                    </h2>
                                    <p className="text-base text-muted-foreground">
                                        {error ||
                                            'Failed to process your recording'}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    <Button onClick={reset} className="w-full">
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Try Again
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleManualEntry}
                                        className="w-full"
                                    >
                                        <PenLine className="mr-2 h-4 w-4" />
                                        Manual Entry
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <RecordingPanel
                        isRecording={isRecording}
                        elapsedSeconds={elapsedSeconds}
                        maxDurationSeconds={maxDurationSeconds}
                        onStart={startRecording}
                        onStop={stopRecording}
                        onCancel={cancelRecording}
                    />
                )}
            </div>

            {/* Footer hint */}
            {(isIdle || isRecording) && !dataLoading && (
                <div className="p-6 pt-0">
                    <p className="text-center text-base text-muted-foreground">
                        {isRecording
                            ? 'Describe your session: horse, duration, what you worked on...'
                            : "Speak naturally about your ride and we'll extract the details"}
                    </p>
                </div>
            )}
        </div>
    );
}
