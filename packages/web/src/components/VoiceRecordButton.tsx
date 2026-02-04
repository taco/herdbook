import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { cn } from '@/lib/utils';

interface VoiceRecordButtonProps {
    onTranscription: (text: string) => void;
    className?: string;
}

export default function VoiceRecordButton({
    onTranscription,
    className,
}: VoiceRecordButtonProps) {
    const { state, startRecording, stopRecording, error } = useVoiceRecording({
        onTranscription,
    });

    const handleClick = () => {
        if (state === 'recording') {
            stopRecording();
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
                          ? 'Transcribing...'
                          : 'Start voice recording'
                }
            >
                {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : isRecording ? (
                    <Square className="h-5 w-5" />
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
                    Transcribing...
                </span>
            )}
            {error && (
                <span className="text-xs text-destructive text-center">
                    {error}
                </span>
            )}
        </div>
    );
}
