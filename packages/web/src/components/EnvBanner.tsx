import { useEffect, useState } from 'react';
import { apiEndpoint } from '@/lib/api';

export function EnvBanner(): React.ReactNode {
    const [banner, setBanner] = useState<{
        dbLabel: string;
        bgColor: string;
    } | null>(null);

    useEffect(() => {
        fetch(apiEndpoint('/api/env-banner'))
            .then((res) => {
                if (!res.ok) return null;
                return res.json() as Promise<{
                    dbLabel: string;
                    bgColor: string;
                }>;
            })
            .then((data) => {
                if (data?.dbLabel) setBanner(data);
            })
            .catch(() => {
                // Silently ignore — production returns 404
            });
    }, []);

    if (!banner) return null;

    return (
        <div
            className="text-center text-xs font-semibold py-1"
            style={{ backgroundColor: banner.bgColor, color: '#1a1a1a' }}
        >
            DB: {banner.dbLabel}
        </div>
    );
}
