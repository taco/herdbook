import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import ActivityItem from '@/components/ActivityItem';
import { Button } from '@/components/ui/button';
import { Menu, Plus } from 'lucide-react';

interface Session {
    id: string;
    date: string;
    durationMinutes: number;
    workType: string;
    notes: string;
    horse: {
        name: string;
    };
    rider: {
        name: string;
    };
}

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
            notes
            horse {
                name
            }
            rider {
                name
            }
        }
    }
`;

export default function Dashboard() {
    const { data, loading, error } = useQuery(DASHBOARD_QUERY);

    console.log('data.sessions', data?.sessions);
    console.log('data.horses', data?.horses);

    if (loading)
        return <div className="p-4 text-center">Loading activity...</div>;
    if (error)
        return (
            <div className="p-4 text-center text-red-500">
                Error loading data.
            </div>
        );

    return (
        <div className="h-dvh flex flex-col bg-background">
            <header className="flex items-center justify-between p-4 border-b bg-card">
                <h1 className="text-xl font-bold">Herdbook</h1>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                >
                    <Menu className="h-6 w-6" />
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 bg-muted/20">
                <div className="max-w-md mx-auto w-full">
                    <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                        Recent Activity
                    </h2>
                    <div className="space-y-3 pb-24">
                        {data?.sessions.map((session: Session) => (
                            <ActivityItem
                                key={session.id}
                                session={{
                                    id: session.id,
                                    date: session.date,
                                    durationMinutes: session.durationMinutes,
                                    workType: session.workType,
                                    horse: session.horse,
                                    rider: session.rider,
                                    notes: session.notes,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent pt-8">
                <div className="max-w-md mx-auto w-full">
                    <Button className="w-full shadow-lg rounded-full" size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        Log Session
                    </Button>
                </div>
            </div>
        </div>
    );
}
