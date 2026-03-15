import { useEffect, useState } from 'react';
import { apiEndpoint } from '@/lib/api';

export function DevToolbar(): React.ReactNode {
    const [banner, setBanner] = useState<{
        dbLabel: string;
        bgColor: string;
        gitBranch: string;
    } | null>(null);

    useEffect(() => {
        fetch(apiEndpoint('/api/dev/toolbar'))
            .then((res) => {
                if (!res.ok) return null;
                return res.json() as Promise<{
                    dbLabel: string;
                    bgColor: string;
                    gitBranch: string;
                }>;
            })
            .then((data) => {
                if (data?.dbLabel) setBanner(data);
            })
            .catch(() => {
                // Silently ignore — production has no /api/dev routes
            });
    }, []);

    if (!banner) return null;

    return (
        <div
            className="text-center text-xs font-semibold py-1"
            style={{ backgroundColor: banner.bgColor, color: '#1a1a1a' }}
        >
            {banner.gitBranch} · DB: {banner.dbLabel}
        </div>
    );
}
