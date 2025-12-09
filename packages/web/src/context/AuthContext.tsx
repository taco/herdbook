import { createContext, useContext, useState } from 'react';

interface AuthContextInterface {
    token: string | null;
    riderId: string | null;
    riderName: string | null;
    isAuthenticated: boolean;
    login: (token: string, riderId: string, riderName: string) => void;
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

    const login = (token: string, riderId: string, riderName: string) => {
        setToken(token);
        localStorage.setItem('token', token);
        setRiderId(riderId);
        localStorage.setItem('riderId', riderId);
        setRiderName(riderName);
        localStorage.setItem('riderName', riderName);
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('token');
        setRiderId(null);
        localStorage.removeItem('riderId');
        setRiderName(null);
        localStorage.removeItem('riderName');
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                riderId,
                riderName,
                isAuthenticated: !!token,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
