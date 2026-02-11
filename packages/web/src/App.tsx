import React, { useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
    useNavigate,
} from 'react-router-dom';
import type { Location } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { SlideTransitionContext } from '@/context/SlideTransitionContext';
import { cn } from '@/lib/utils';

import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Horses from '@/pages/Horses';
import Riders from '@/pages/Riders';
import Profile from '@/pages/Profile';
import EditSession from '@/pages/EditSession';
import EditHorse from '@/pages/EditHorse';
import SessionDetail from '@/pages/SessionDetail';
import VoiceSessionCapture from '@/pages/VoiceSessionCapture';
import TabLayout from '@/layouts/TabLayout';
import SubPageLayout from '@/layouts/SubPageLayout';
import FullScreenLayout from '@/layouts/FullScreenLayout';

const SUB_PAGE_PATTERN =
    /^\/(horses\/new|horses\/[^/]+\/edit|sessions\/new|sessions\/(?!voice$)[^/]+)$/;

function isSubPageRoute(pathname: string): boolean {
    return SUB_PAGE_PATTERN.test(pathname);
}

const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type AnimState = 'entering' | 'idle' | 'exiting';

const PublicRoute: React.FC<{ element: React.ReactElement }> = ({
    element,
}) => {
    const { isAuthenticated } = useAuth();
    return !isAuthenticated ? element : <Navigate to="/" />;
};

function AppRoutes(): React.ReactNode {
    const location = useLocation();
    const navigate = useNavigate();
    const isSubPage = isSubPageRoute(location.pathname);

    // Track the last tab location for background rendering
    const tabLocationRef = useRef<Location | null>(isSubPage ? null : location);
    if (!isSubPage) {
        tabLocationRef.current = location;
    }

    // Animation state — lifted here to coordinate background parallax + overlay slide
    const [animState, setAnimState] = useState<AnimState | null>(
        isSubPage ? (prefersReducedMotion ? 'idle' : 'entering') : null
    );
    const prevIsSubPage = useRef(isSubPage);

    if (isSubPage && !prevIsSubPage.current) {
        setAnimState(prefersReducedMotion ? 'idle' : 'entering');
    }
    if (!isSubPage && prevIsSubPage.current) {
        setAnimState(null);
    }
    prevIsSubPage.current = isSubPage;

    // Scroll position preservation when background switches to fixed
    const bgRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef(0);

    useLayoutEffect(() => {
        const wrapper = bgRef.current;
        if (!wrapper) return;

        if (isSubPage) {
            scrollRef.current = window.scrollY;
            wrapper.scrollTop = scrollRef.current;
            window.scrollTo(0, 0);
        } else {
            window.scrollTo(0, scrollRef.current);
        }
    }, [isSubPage]);

    // Back handler: triggers exit animation, then navigates after completion
    const handleBack = useCallback((): void => {
        if (animState === 'exiting') return;
        if (prefersReducedMotion) {
            navigate(-1);
            return;
        }
        setAnimState('exiting');
    }, [animState, navigate]);

    const handleOverlayAnimEnd = useCallback(
        (e: React.AnimationEvent): void => {
            if (e.target !== e.currentTarget) return;
            if (animState === 'entering') {
                setAnimState('idle');
            } else if (animState === 'exiting') {
                navigate(-1);
            }
        },
        [animState, navigate]
    );

    // For deep links: fall back to "/" so tab routes have something to render
    const backgroundLocation: Location | string | null = isSubPage
        ? (tabLocationRef.current ?? '/')
        : null;

    return (
        <>
            {/* Background: main routes — parallax pushes when sub-page is active */}
            <div
                ref={bgRef}
                className={cn(
                    isSubPage && 'fixed inset-0 overflow-y-auto',
                    (animState === 'entering' || animState === 'idle') &&
                        'animate-parallax-push',
                    animState === 'exiting' && 'animate-parallax-return'
                )}
            >
                <Routes location={backgroundLocation ?? location}>
                    <Route
                        path="/login"
                        element={<PublicRoute element={<Login />} />}
                    />
                    <Route
                        path="/signup"
                        element={<PublicRoute element={<Signup />} />}
                    />

                    <Route element={<TabLayout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/horses" element={<Horses />} />
                        <Route path="/riders" element={<Riders />} />
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    <Route element={<FullScreenLayout />}>
                        <Route
                            path="/sessions/voice"
                            element={<VoiceSessionCapture />}
                        />
                    </Route>

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>

            {/* Dim overlay between background and sub-page */}
            {isSubPage && (
                <div
                    className={cn(
                        'fixed inset-0 z-10 bg-black pointer-events-none',
                        (animState === 'entering' || animState === 'idle') &&
                            'animate-dim-in',
                        animState === 'exiting' && 'animate-dim-out'
                    )}
                />
            )}

            {/* Sub-page overlay — slides in from right over the parallaxed background */}
            {isSubPage && (
                <SlideTransitionContext.Provider
                    value={{ triggerExit: handleBack }}
                >
                    <div
                        className={cn(
                            'fixed inset-0 z-20 overflow-y-auto bg-background',
                            animState === 'entering' &&
                                'animate-slide-in-right',
                            animState === 'exiting' && 'animate-slide-out-right'
                        )}
                        onAnimationEnd={handleOverlayAnimEnd}
                    >
                        <Routes location={location}>
                            <Route element={<SubPageLayout />}>
                                <Route
                                    path="/sessions/new"
                                    element={<EditSession />}
                                />
                                <Route
                                    path="/sessions/:id"
                                    element={<SessionDetail />}
                                />
                                <Route
                                    path="/horses/new"
                                    element={<EditHorse />}
                                />
                                <Route
                                    path="/horses/:id/edit"
                                    element={<EditHorse />}
                                />
                            </Route>
                        </Routes>
                    </div>
                </SlideTransitionContext.Provider>
            )}
        </>
    );
}

function App(): React.ReactNode {
    return (
        <Router>
            <AppRoutes />
        </Router>
    );
}

export default App;
