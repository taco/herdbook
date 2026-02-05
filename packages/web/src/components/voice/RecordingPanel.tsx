import { Mic, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecordingPanelProps {
    isRecording: boolean;
    elapsedSeconds: number;
    maxDurationSeconds: number;
    onStart: () => void;
    onStop: () => void;
    onCancel: () => void;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function RecordingPanel({
    isRecording,
    elapsedSeconds,
    maxDurationSeconds,
    onStart,
    onStop,
    onCancel,
}: RecordingPanelProps) {
    const remainingSeconds = maxDurationSeconds - elapsedSeconds;
    const isNearLimit = remainingSeconds <= 30;

    return (
        <div className="flex flex-col items-center gap-8">
            {/* Recording indicator */}
            <div className="relative flex items-center justify-center">
                <div
                    className={cn(
                        'w-32 h-32 rounded-full flex items-center justify-center transition-colors',
                        isRecording ? 'bg-destructive/10' : 'bg-muted'
                    )}
                >
                    {isRecording && (
                        <>
                            {/* Pulsing rings */}
                            <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                            <div
                                className="absolute inset-4 rounded-full bg-destructive/30 animate-pulse"
                                style={{ animationDelay: '150ms' }}
                            />
                        </>
                    )}
                    <Mic
                        className={cn(
                            'w-12 h-12 relative z-10',
                            isRecording
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                        )}
                    />
                </div>
            </div>

            {/* Timer */}
            <div className="flex flex-col items-center gap-2">
                <span
                    className={cn(
                        'text-5xl font-mono font-semibold tabular-nums',
                        isRecording && isNearLimit && 'text-destructive'
                    )}
                >
                    {formatTime(elapsedSeconds)}
                </span>
                {isRecording && (
                    <span
                        className={cn(
                            'text-base',
                            isNearLimit
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                        )}
                    >
                        {isNearLimit
                            ? `${formatTime(remainingSeconds)} remaining`
                            : `Max ${formatTime(maxDurationSeconds)}`}
                    </span>
                )}
                {!isRecording && (
                    <span className="text-base text-muted-foreground">
                        Tap to start recording
                    </span>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
                {isRecording ? (
                    <>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-14 w-14 rounded-full"
                            onClick={onCancel}
                            aria-label="Cancel recording"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-20 w-20 rounded-full shadow-lg"
                            onClick={onStop}
                            aria-label="Stop recording"
                        >
                            <Square className="h-8 w-8" />
                        </Button>
                        {/* Spacer for symmetry */}
                        <div className="h-14 w-14" />
                    </>
                ) : (
                    <Button
                        size="icon"
                        className="h-20 w-20 rounded-full shadow-lg"
                        onClick={onStart}
                        aria-label="Start recording"
                    >
                        <Mic className="h-8 w-8" />
                    </Button>
                )}
            </div>
        </div>
    );
}
