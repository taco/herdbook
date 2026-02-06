import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Full-screen authenticated layout for voice flows and immersive experiences.
 * No tab bar, no back button — page controls its own chrome.
 */
export default function FullScreenLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return <Outlet />;
}
