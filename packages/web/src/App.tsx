import React from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';

import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Horses from '@/pages/Horses';
import Profile from '@/pages/Profile';
import EditSession from '@/pages/EditSession';
import EditHorse from '@/pages/EditHorse';
import HorseProfile from '@/pages/HorseProfile';
import Sessions from '@/pages/Sessions';
import SessionDetail from '@/pages/SessionDetail';
import VoiceSessionCapture from '@/pages/VoiceSessionCapture';
import TabLayout from '@/layouts/TabLayout';
import FullScreenLayout from '@/layouts/FullScreenLayout';

const PublicRoute: React.FC<{ element: React.ReactElement }> = ({
    element,
}) => {
    const { isAuthenticated } = useAuth();
    return !isAuthenticated ? element : <Navigate to="/" />;
};

function AppRoutes(): React.ReactNode {
    return (
        <Routes>
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
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/profile" element={<Profile />} />
            </Route>

            <Route element={<FullScreenLayout />}>
                <Route
                    path="/sessions/voice"
                    element={<VoiceSessionCapture />}
                />
                <Route path="/sessions/new" element={<EditSession />} />
                <Route path="/sessions/:id" element={<SessionDetail />} />
                <Route path="/horses/new" element={<EditHorse />} />
                <Route path="/horses/:id" element={<HorseProfile />} />
                <Route path="/horses/:id/edit" element={<EditHorse />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
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
