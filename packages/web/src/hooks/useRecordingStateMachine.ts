import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WorkType } from '@/generated/graphql';
import { apiEndpoint } from '@/lib/api';

export type RecordingState =
    | 'idle'
    | 'recording'
    | 'processing'
    | 'success'
    | 'error';

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

interface UseRecordingStateMachineOptions {
    horses: HorseOption[];
    riders: RiderOption[];
    maxDurationSeconds?: number;
}

interface UseRecordingStateMachineReturn {
    state: RecordingState;
    elapsedSeconds: number;
    maxDurationSeconds: number;
    parsedFields: ParsedSessionFields | null;
    error: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    cancelRecording: () => void;
    reset: () => void;
}

const DEFAULT_MAX_DURATION = 180; // 3 minutes
const HARD_CAP_DURATION = 300; // 5 minutes

export function useRecordingStateMachine({
    horses,
    riders,
    maxDurationSeconds = DEFAULT_MAX_DURATION,
}: UseRecordingStateMachineOptions): UseRecordingStateMachineReturn {
    const { token } = useAuth();
    const [state, setState] = useState<RecordingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [parsedFields, setParsedFields] =
        useState<ParsedSessionFields | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const cancelledRef = useRef<boolean>(false);

    // Clamp max duration to hard cap
    const effectiveMaxDuration = Math.min(
        maxDurationSeconds,
        HARD_CAP_DURATION
    );

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        startTimeRef.current = null;
    }, []);

    const processAudio = useCallback(
        async (audioBlob: Blob) => {
            setState('processing');

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
                setParsedFields(data);
                setState('success');
            } catch (err) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : 'Failed to parse session';
                setError(errorMessage);
                setState('error');
            }
        },
        [token, horses, riders]
    );

    const startRecording = useCallback(async () => {
        setError(null);
        setParsedFields(null);
        setElapsedSeconds(0);
        cancelledRef.current = false;

        try {
            // Check if mediaDevices API is available (may not be on iOS in non-HTTPS or WebView)
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    'Microphone access is not available. Please ensure you are using HTTPS.'
                );
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = stream;

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

            mediaRecorder.onstop = () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                stream.getTracks().forEach((track) => track.stop());

                // Only process if we have chunks and recording wasn't cancelled
                if (chunksRef.current.length > 0 && !cancelledRef.current) {
                    const audioBlob = new Blob(chunksRef.current, {
                        type: mimeType,
                    });
                    processAudio(audioBlob);
                }
            };

            mediaRecorder.start();
            setState('recording');
            startTimeRef.current = Date.now();

            // Start timer
            timerRef.current = window.setInterval(() => {
                if (startTimeRef.current) {
                    const elapsed = Math.floor(
                        (Date.now() - startTimeRef.current) / 1000
                    );
                    setElapsedSeconds(elapsed);

                    // Auto-stop at max duration
                    if (elapsed >= effectiveMaxDuration) {
                        if (
                            mediaRecorderRef.current &&
                            mediaRecorderRef.current.state === 'recording'
                        ) {
                            mediaRecorderRef.current.stop();
                        }
                    }
                }
            }, 100);
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'Failed to access microphone';
            setError(errorMessage);
            setState('error');
        }
    }, [effectiveMaxDuration, processAudio]);

    const stopRecording = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === 'recording'
        ) {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const cancelRecording = useCallback(() => {
        // Set cancelled flag so onstop doesn't process audio
        cancelledRef.current = true;
        chunksRef.current = [];

        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === 'recording'
        ) {
            mediaRecorderRef.current.stop();
        }

        cleanup();
        setState('idle');
        setElapsedSeconds(0);
    }, [cleanup]);

    const reset = useCallback(() => {
        cleanup();
        setState('idle');
        setError(null);
        setParsedFields(null);
        setElapsedSeconds(0);
    }, [cleanup]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        state,
        elapsedSeconds,
        maxDurationSeconds: effectiveMaxDuration,
        parsedFields,
        error,
        startRecording,
        stopRecording,
        cancelRecording,
        reset,
    };
}
