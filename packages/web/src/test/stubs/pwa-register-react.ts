import { useState } from 'react';

export function useRegisterSW(): {
    needRefresh: [boolean, (v: boolean) => void];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
} {
    const needRefresh = useState(false);
    return {
        needRefresh,
        updateServiceWorker: () => Promise.resolve(),
    };
}
