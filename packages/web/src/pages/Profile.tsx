import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function Profile() {
    const { riderName, logout } = useAuth();
    const navigate = useNavigate();

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

            <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
            >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
            </Button>
        </div>
    );
}
