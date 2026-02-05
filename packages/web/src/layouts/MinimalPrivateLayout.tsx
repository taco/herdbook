import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * A minimal authenticated layout without the sidebar header.
 * Use for full-screen experiences where the page controls its own header.
 */
export default function MinimalPrivateLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return <Outlet />;
}
