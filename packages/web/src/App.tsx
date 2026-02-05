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
import Logout from '@/pages/Logout';
import EditSession from '@/pages/EditSession';
import EditHorse from '@/pages/EditHorse';
import VoiceSessionCapture from '@/pages/VoiceSessionCapture';
import SessionReview from '@/pages/SessionReview';
import PrivateLayout from '@/layouts/PrivateLayout';
import MinimalPrivateLayout from '@/layouts/MinimalPrivateLayout';

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

                {/* Authenticated routes */}
                <Route element={<PrivateLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/logout" element={<Logout />} />
                    <Route path="/sessions/new" element={<EditSession />} />
                    <Route
                        path="/sessions/:id/edit"
                        element={<EditSession />}
                    />
                    <Route path="/horses/new" element={<EditHorse />} />
                    <Route path="/horses/:id/edit" element={<EditHorse />} />
                </Route>

                {/* Full-screen authenticated routes (no sidebar header) */}
                <Route element={<MinimalPrivateLayout />}>
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
