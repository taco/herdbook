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

const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({
    element,
}) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? element : <Navigate to="/login" />;
};

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
                    path="/logout"
                    element={<PrivateRoute element={<Logout />} />}
                />
                <Route
                    path="/signup"
                    element={<PublicRoute element={<Signup />} />}
                />
                <Route
                    path="/"
                    element={<PrivateRoute element={<Dashboard />} />}
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
