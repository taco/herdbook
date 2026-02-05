import { Loader2 } from 'lucide-react';

export default function ProcessingOverlay() {
    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-xl font-medium">Processing...</span>
                <span className="text-base text-muted-foreground text-center max-w-xs">
                    Transcribing your audio and extracting session details
                </span>
            </div>
        </div>
    );
}
