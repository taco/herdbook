import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const DASHBOARD_QUERY = gql`
    query GetDashboardData {
        horses {
            id
            name
        }
        sessions {
            id
            date
            durationMinutes
            workType
            horse {
                name
            }
        }
    }
`;

export default function Dashboard() {
    const { user, logout } = useAuth();
    const { data, loading, error } = useQuery<any>(DASHBOARD_QUERY);

    if (loading) return <div className="p-8">Loading...</div>;
    if (error)
        return <div className="p-8 text-red-500">Error: {error.message}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome, {user?.name}
                </h1>
                <Button onClick={logout} variant="outline">
                    Logout
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Horses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.horses.length === 0 ? (
                            <p className="text-gray-500">
                                No horses added yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {data?.horses.map((horse: any) => (
                                    <li
                                        key={horse.id}
                                        className="p-2 bg-gray-100 rounded"
                                    >
                                        {horse.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.sessions.length === 0 ? (
                            <p className="text-gray-500">
                                No sessions recorded yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {data?.sessions.map((session: any) => (
                                    <li
                                        key={session.id}
                                        className="p-3 bg-white border rounded shadow-sm"
                                    >
                                        <div className="font-semibold">
                                            {session.horse.name}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {new Date(
                                                session.date
                                            ).toLocaleDateString()}{' '}
                                            - {session.durationMinutes} mins (
                                            {session.workType})
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
