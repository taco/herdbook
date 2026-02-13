import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
    path: string;
    label: string;
    icon: React.ElementType;
    isCenter?: boolean;
}

const TABS: Tab[] = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/horses', label: 'Horses', icon: HorseIcon },
    { path: '/sessions/voice', label: 'Log', icon: Plus, isCenter: true },
    { path: '/sessions', label: 'Sessions', icon: ClipboardList },
    { path: '/profile', label: 'Me', icon: User },
];

function HorseIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {/* head + ear + neck */}
            <path d="M17 3l-1 3 3 2-2 1-2-2-2 2-3 1c-2 .7-3 2.4-3 4.6V20a1 1 0 0 0 1 1h3.6c1.1 0 2.1-.6 2.7-1.5l1.4-2.2 2.1-1.1c.7-.4 1.2-1.2 1.2-2V9.5A3 3 0 0 0 18 6.6h-1.4L17 3z" />

            {/* eye (filled for clarity at 24px) */}
            <circle
                cx="13.2"
                cy="12.2"
                r="0.6"
                fill="currentColor"
                stroke="none"
            />

            {/* subtle chest/neck detail */}
            <path d="M9 17h3" />
        </svg>
    );
}

export function BottomTabBar() {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string): boolean => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background pb-[calc(env(safe-area-inset-bottom)+var(--hb-bottom-tab-extra))]">
            <div className="flex items-center justify-around h-14">
                {TABS.map((tab) => {
                    const active = isActive(tab.path);

                    if (tab.isCenter) {
                        return (
                            <button
                                key={tab.path}
                                onClick={() => navigate(tab.path)}
                                className="flex flex-col items-center justify-center -mt-3"
                            >
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg">
                                    <tab.icon className="h-6 w-6" />
                                </div>
                                <span className="text-[10px] mt-0.5 text-muted-foreground">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={cn(
                                'flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5',
                                active
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                            )}
                        >
                            <tab.icon className="h-6 w-6" />
                            <span className="text-[10px]">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
