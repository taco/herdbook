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
import CreateSession from '@/pages/CreateSession';
import PrivateLayout from '@/layouts/PrivateLayout';

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
                    <Route path="/sessions/new" element={<CreateSession />} />
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
