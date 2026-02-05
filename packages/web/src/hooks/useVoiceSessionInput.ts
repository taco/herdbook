import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WorkType } from '@/generated/graphql';
import { apiEndpoint } from '@/lib/api';

type RecordingState = 'idle' | 'recording' | 'processing';

interface HorseOption {
    id: string;
    name: string;
}

interface RiderOption {
    id: string;
    name: string;
}

export interface ParsedSessionFields {
    transcript: string;
    horseId: string | null;
    riderId: string | null;
    date: string | null;
    durationMinutes: number | null;
    workType: WorkType | null;
    notes: string | null;
}

interface UseVoiceSessionInputOptions {
    horses: HorseOption[];
    riders: RiderOption[];
    onParsed: (fields: ParsedSessionFields) => void;
    onError?: (error: string) => void;
}

interface UseVoiceSessionInputReturn {
    state: RecordingState;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    error: string | null;
}

export function useVoiceSessionInput({
    horses,
    riders,
    onParsed,
    onError,
}: UseVoiceSessionInputOptions): UseVoiceSessionInputReturn {
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
                stream.getTracks().forEach((track) => track.stop());

                setState('processing');

                const audioBlob = new Blob(chunksRef.current, {
                    type: mimeType,
                });

                const formData = new FormData();
                formData.append('audio', audioBlob, 'audio.webm');
                formData.append(
                    'context',
                    JSON.stringify({
                        horses: horses.map((h) => ({
                            id: h.id,
                            name: h.name,
                        })),
                        riders: riders.map((r) => ({
                            id: r.id,
                            name: r.name,
                        })),
                        currentDateTime: new Date().toISOString(),
                    })
                );

                try {
                    const response = await fetch(
                        apiEndpoint('/api/parse-session'),
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
                            errorData.error || 'Failed to parse session'
                        );
                    }

                    const data = (await response.json()) as ParsedSessionFields;
                    onParsed(data);
                } catch (err) {
                    const errorMessage =
                        err instanceof Error
                            ? err.message
                            : 'Failed to parse session';
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
    }, [token, horses, riders, onParsed, onError]);

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
