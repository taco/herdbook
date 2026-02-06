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
import Riders from '@/pages/Riders';
import Profile from '@/pages/Profile';
import EditSession from '@/pages/EditSession';
import EditHorse from '@/pages/EditHorse';
import VoiceSessionCapture from '@/pages/VoiceSessionCapture';
import SessionReview from '@/pages/SessionReview';
import TabLayout from '@/layouts/TabLayout';
import SubPageLayout from '@/layouts/SubPageLayout';
import FullScreenLayout from '@/layouts/FullScreenLayout';

const PublicRoute: React.FC<{ element: React.ReactElement }> = ({
    element,
}) => {
    const { isAuthenticated } = useAuth();
    return !isAuthenticated ? element : <Navigate to="/" />;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={<PublicRoute element={<Login />} />}
                />
                <Route
                    path="/signup"
                    element={<PublicRoute element={<Signup />} />}
                />

                {/* Tab bar routes */}
                <Route element={<TabLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/horses" element={<Horses />} />
                    <Route path="/riders" element={<Riders />} />
                    <Route path="/profile" element={<Profile />} />
                </Route>

                {/* Sub-page routes (floating back button, no tab bar) */}
                <Route element={<SubPageLayout />}>
                    <Route path="/sessions/new" element={<EditSession />} />
                    <Route
                        path="/sessions/:id/edit"
                        element={<EditSession />}
                    />
                    <Route path="/horses/new" element={<EditHorse />} />
                    <Route path="/horses/:id/edit" element={<EditHorse />} />
                </Route>

                {/* Full-screen routes (voice flows) */}
                <Route element={<FullScreenLayout />}>
                    <Route
                        path="/sessions/voice"
                        element={<VoiceSessionCapture />}
                    />
                    <Route
                        path="/sessions/review"
                        element={<SessionReview />}
                    />
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
