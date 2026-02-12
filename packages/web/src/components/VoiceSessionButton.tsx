import { Mic, Square, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    useVoiceSessionInput,
    ParsedSessionFields,
} from '@/hooks/useVoiceSessionInput';
import { cn } from '@/lib/utils';

interface HorseOption {
    id: string;
    name: string;
}

interface RiderOption {
    id: string;
    name: string;
}

interface VoiceSessionButtonProps {
    horses: HorseOption[];
    riders: RiderOption[];
    onParsed: (fields: ParsedSessionFields) => void;
    className?: string;
}

export default function VoiceSessionButton({
    horses,
    riders,
    onParsed,
    className,
}: VoiceSessionButtonProps) {
    const { state, startRecording, stopRecording, error, canRetry, retry } =
        useVoiceSessionInput({
            horses,
            riders,
            onParsed,
        });

    const handleClick = () => {
        if (state === 'recording') {
            stopRecording();
        } else if (state === 'idle' && canRetry) {
            retry();
        } else if (state === 'idle') {
            startRecording();
        }
    };

    const isRecording = state === 'recording';
    const isProcessing = state === 'processing';

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <Button
                type="button"
                variant={isRecording ? 'destructive' : 'outline'}
                size="icon"
                onClick={handleClick}
                disabled={isProcessing}
                className={cn(
                    'h-11 w-11 shrink-0',
                    isRecording && 'animate-pulse'
                )}
                title={
                    isRecording
                        ? 'Stop recording'
                        : isProcessing
                          ? 'Parsing...'
                          : canRetry
                            ? 'Tap to retry'
                            : 'Describe session with voice'
                }
            >
                {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : isRecording ? (
                    <Square className="h-5 w-5" />
                ) : canRetry ? (
                    <RotateCcw className="h-5 w-5" />
                ) : (
                    <Mic className="h-5 w-5" />
                )}
            </Button>
            {isRecording && (
                <span className="text-xs text-destructive font-medium text-center">
                    Recording...
                </span>
            )}
            {isProcessing && (
                <span className="text-xs text-muted-foreground text-center">
                    Parsing...
                </span>
            )}
            {canRetry && (
                <span className="text-xs text-muted-foreground text-center">
                    Tap to retry
                </span>
            )}
            {error && !canRetry && (
                <span className="text-xs text-destructive text-center">
                    {error}
                </span>
            )}
        </div>
    );
}
