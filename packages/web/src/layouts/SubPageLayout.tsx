import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FloatingBackButton } from '@/components/FloatingBackButton';

export default function SubPageLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <>
            <FloatingBackButton />
            <main className="min-h-screen">
                <Outlet />
            </main>
        </>
    );
}
