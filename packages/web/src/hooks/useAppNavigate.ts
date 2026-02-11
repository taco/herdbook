import { useNavigate } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';

interface AppNavigate {
    /** Navigate forward to a sub-page (slide in from right) */
    push: (to: string, opts?: NavigateOptions) => void;
    /** Navigate back to previous page (slide out to right) */
    back: () => void;
    /** Dismiss current page to a specific route (slide out to right) — use after saves/deletes */
    backTo: (to: string, opts?: NavigateOptions) => void;
    /** Raw navigate — no animation. Only for auth redirects and non-visual navigation. */
    navigate: ReturnType<typeof useNavigate>;
}

export function useAppNavigate(): AppNavigate {
    const navigate = useNavigate();

    const push = (to: string, opts?: NavigateOptions): void => {
        document.documentElement.dataset.transition = 'slide-forward';
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                navigate(to, opts);
            });
        } else {
            navigate(to, opts);
        }
    };

    const back = (): void => {
        document.documentElement.dataset.transition = 'slide-back';
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                navigate(-1);
            });
        } else {
            navigate(-1);
        }
    };

    const backTo = (to: string, opts?: NavigateOptions): void => {
        document.documentElement.dataset.transition = 'slide-back';
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                navigate(to, opts);
            });
        } else {
            navigate(to, opts);
        }
    };

    return { push, back, backTo, navigate };
}
