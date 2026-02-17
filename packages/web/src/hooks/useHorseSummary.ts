import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiEndpoint } from '@/lib/api';

type SummaryStatus = 'idle' | 'loading' | 'success' | 'error';

type SummaryErrorCode =
    | 'RATE_LIMITED'
    | 'COOLDOWN_ACTIVE'
    | 'NOT_STALE'
    | 'INSUFFICIENT_SESSIONS'
    | 'GENERATION_FAILED'
    | 'UNKNOWN';

interface SummaryError {
    code: SummaryErrorCode;
    message: string;
    refreshAvailableAt?: string;
}

interface SummaryResult {
    content: string;
    generatedAt: string;
}

interface UseHorseSummaryReturn {
    status: SummaryStatus;
    error: SummaryError | null;
    result: SummaryResult | null;
    generate: (horseId: string) => Promise<boolean>;
}

export function useHorseSummary(): UseHorseSummaryReturn {
    const { token } = useAuth();
    const [status, setStatus] = useState<SummaryStatus>('idle');
    const [error, setError] = useState<SummaryError | null>(null);
    const [result, setResult] = useState<SummaryResult | null>(null);

    const generate = useCallback(
        async (horseId: string): Promise<boolean> => {
            setStatus('loading');
            setError(null);

            try {
                const response = await fetch(
                    apiEndpoint('/api/horse-summary'),
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ horseId }),
                    }
                );

                if (!response.ok) {
                    const body = (await response.json()) as {
                        error?: string;
                        message?: string;
                        refreshAvailableAt?: string;
                    };
                    const code = (body.error ?? 'UNKNOWN') as SummaryErrorCode;
                    setError({
                        code,
                        message: body.message ?? 'Failed to generate summary.',
                        refreshAvailableAt: body.refreshAvailableAt,
                    });
                    setStatus('error');
                    return false;
                }

                const data = (await response.json()) as SummaryResult;
                setResult(data);
                setStatus('success');
                return true;
            } catch {
                setError({
                    code: 'UNKNOWN',
                    message: 'Network error. Please try again.',
                });
                setStatus('error');
                return false;
            }
        },
        [token]
    );

    return { status, error, result, generate };
}
