import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FloatingBackButton } from '@/components/FloatingBackButton';
import { useSlideTransition } from '@/context/SlideTransitionContext';

export default function SubPageLayout(): React.ReactNode {
    const { isAuthenticated } = useAuth();
    const { triggerExit } = useSlideTransition();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <>
            <FloatingBackButton onBack={triggerExit} />
            <main className="min-h-dvh">
                <Outlet />
            </main>
        </>
    );
}
