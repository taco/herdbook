import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function FullScreenLayout(): React.ReactNode {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return (
        <main className="min-h-dvh">
            <Outlet />
        </main>
    );
}
