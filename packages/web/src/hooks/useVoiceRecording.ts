import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiEndpoint } from '@/lib/api';

type RecordingState = 'idle' | 'recording' | 'processing';

interface UseVoiceRecordingOptions {
    onTranscription: (text: string) => void;
    onError?: (error: string) => void;
}

interface UseVoiceRecordingReturn {
    state: RecordingState;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    error: string | null;
}

export function useVoiceRecording({
    onTranscription,
    onError,
}: UseVoiceRecordingOptions): UseVoiceRecordingReturn {
    const { token } = useAuth();
    const [state, setState] = useState<RecordingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            // Prefer webm (Chrome, Firefox) or mp4 (Safari)
            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : MediaRecorder.isTypeSupported('audio/mp4')
                  ? 'audio/mp4'
                  : 'audio/wav';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks to release microphone
                stream.getTracks().forEach((track) => track.stop());

                setState('processing');

                const audioBlob = new Blob(chunksRef.current, {
                    type: mimeType,
                });

                const formData = new FormData();
                formData.append('audio', audioBlob, 'audio.webm');

                try {
                    const response = await fetch(
                        apiEndpoint('/api/transcribe'),
                        {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                            body: formData,
                        }
                    );

                    if (!response.ok) {
                        const errorData = (await response.json()) as {
                            error: string;
                        };
                        throw new Error(
                            errorData.error || 'Transcription failed'
                        );
                    }

                    const data = (await response.json()) as {
                        transcription: string;
                    };
                    onTranscription(data.transcription);
                } catch (err) {
                    const errorMessage =
                        err instanceof Error
                            ? err.message
                            : 'Failed to transcribe';
                    setError(errorMessage);
                    onError?.(errorMessage);
                } finally {
                    setState('idle');
                }
            };

            mediaRecorder.start();
            setState('recording');
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'Failed to access microphone';
            setError(errorMessage);
            onError?.(errorMessage);
            setState('idle');
        }
    }, [token, onTranscription, onError]);

    const stopRecording = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === 'recording'
        ) {
            mediaRecorderRef.current.stop();
        }
    }, []);

    return {
        state,
        startRecording,
        stopRecording,
        error,
    };
}
