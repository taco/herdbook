import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/context/AuthContext';
import { ME_QUERY } from '@/lib/queries';
import type { MeQuery, MeQueryVariables } from '@/generated/graphql';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LogOut } from 'lucide-react';
import BarnSection from '@/components/BarnSection';

export default function Profile() {
    const { riderName, syncIdentity, logout } = useAuth();
    const navigate = useNavigate();

    const { data } = useQuery<MeQuery, MeQueryVariables>(ME_QUERY, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    useEffect(() => {
        if (data) {
            syncIdentity(data.me.name, data.me.role);
        }
    }, [data, syncIdentity]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-lg font-semibold">Profile</h1>

            <div className="flex items-center p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-lg font-medium mr-4">
                    {riderName?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                    <p className="font-medium">{riderName ?? 'Rider'}</p>
                </div>
            </div>

            <Separator />

            <BarnSection />

            <Separator />

            <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleLogout}
            >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
            </Button>
        </div>
    );
}
