import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BottomTabBar } from '@/components/BottomTabBar';

export default function TabLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <>
            <main className="flex-1 pb-20 pb-[calc(5rem+env(safe-area-inset-bottom)+var(--hb-bottom-tab-extra))]">
                <Outlet />
            </main>
            <BottomTabBar />
        </>
    );
}
