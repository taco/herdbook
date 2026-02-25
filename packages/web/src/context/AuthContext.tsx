import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { client } from '@/lib/apollo';
import { ME_QUERY } from '@/lib/queries';
import type { MeQuery } from '@/generated/graphql';
import { setSentryUser } from '@/lib/sentry';

interface AuthContextInterface {
    token: string | null;
    riderId: string | null;
    riderName: string | null;
    riderRole: string | null;
    isAuthenticated: boolean;
    isTrainer: boolean;
    login: (token: string) => void;
    logout: () => void;
    syncIdentity: (name: string, role: string) => void;
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
    const [riderId, setRiderId] = useState<string | null>(null);
    const [riderName, setRiderName] = useState<string | null>(null);
    const [riderRole, setRiderRole] = useState<string | null>(null);

    const syncIdentity = useCallback((name: string, role: string): void => {
        setRiderName(name);
        setRiderRole(role);
    }, []);

    useEffect(() => {
        setSentryUser(riderId);
    }, [riderId]);

    useEffect(() => {
        if (!token) return;

        client
            .query<MeQuery>({ query: ME_QUERY, fetchPolicy: 'network-only' })
            .then(({ data }) => {
                if (!data) return;
                setRiderId(data.me.id);
                syncIdentity(data.me.name, data.me.role);
            })
            .catch(() => {
                // Token is invalid or expired — force logout
                setToken(null);
                localStorage.removeItem('token');
                setRiderId(null);
                setRiderName(null);
                setRiderRole(null);
            });
    }, [token, syncIdentity]);

    const login = (token: string): void => {
        setToken(token);
        localStorage.setItem('token', token);
    };

    const logout = (): void => {
        setToken(null);
        localStorage.removeItem('token');
        setRiderId(null);
        setRiderName(null);
        setRiderRole(null);
        client.clearStore();
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
                syncIdentity,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
