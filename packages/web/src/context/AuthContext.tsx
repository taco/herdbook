import { createContext, useContext, useEffect, useState } from 'react';
import { setSentryUser } from '@/lib/sentry';

interface AuthContextInterface {
    token: string | null;
    riderId: string | null;
    riderName: string | null;
    riderRole: string | null;
    isAuthenticated: boolean;
    isTrainer: boolean;
    login: (
        token: string,
        riderId: string,
        riderName: string,
        riderRole: string
    ) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextInterface | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(
        localStorage.getItem('token') || null
    );
    const [riderId, setRiderId] = useState<string | null>(
        localStorage.getItem('riderId') || null
    );
    const [riderName, setRiderName] = useState<string | null>(
        localStorage.getItem('riderName') || null
    );
    const [riderRole, setRiderRole] = useState<string | null>(
        localStorage.getItem('riderRole') || null
    );

    useEffect(() => {
        setSentryUser(riderId);
    }, [riderId]);

    const login = (
        token: string,
        riderId: string,
        riderName: string,
        riderRole: string
    ) => {
        setToken(token);
        localStorage.setItem('token', token);
        setRiderId(riderId);
        localStorage.setItem('riderId', riderId);
        setRiderName(riderName);
        localStorage.setItem('riderName', riderName);
        setRiderRole(riderRole);
        localStorage.setItem('riderRole', riderRole);
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('token');
        setRiderId(null);
        localStorage.removeItem('riderId');
        setRiderName(null);
        localStorage.removeItem('riderName');
        setRiderRole(null);
        localStorage.removeItem('riderRole');
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                riderId,
                riderName,
                riderRole,
                isAuthenticated: !!token,
                isTrainer: riderRole === 'TRAINER',
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
