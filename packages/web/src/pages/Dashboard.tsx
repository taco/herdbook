import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import ActivityCard from '@/components/ActivityCard';
import { HorseCard } from '@/components/HorseCard';
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

interface Horse {
    id: string;
    name: string;
    activity: {
        weekStart: string;
        count: number;
    }[];
}

const DASHBOARD_QUERY = gql`
    query GetDashboardData {
        horses {
            id
            name
            activity(weeks: 12) {
                weekStart
                count
            }
        }
        sessions(limit: 20) {
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

interface DashboardData {
    horses: Horse[];
    sessions: Session[];
}

export default function Dashboard() {
    const { data, loading, error } = useQuery<DashboardData>(DASHBOARD_QUERY);

    if (loading)
        return <div className="p-4 text-center">Loading activity...</div>;
    if (error)
        return (
            <div className="p-4 text-center text-red-500">
                Error loading data.
            </div>
        );

    return (
        <div className="min-h-dvh flex flex-col bg-background">
            <header className="flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-10">
                <h1 className="text-lg font-semibold">Herdbook</h1>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto bg-muted/30 p-4">
                <div className="space-y-6 pb-24">
                    {/* Herd Activity Section */}
                    <section>
                        <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                            Herd Activity
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {data?.horses.map((horse) => (
                                <HorseCard key={horse.id} horse={horse} />
                            ))}
                        </div>
                    </section>

                    {/* Recent Activity Section */}
                    <section>
                        <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                            Recent Activity
                        </h2>
                        <div className="space-y-3">
                            {data?.sessions.map((session: Session) => (
                                <ActivityCard
                                    key={session.id}
                                    session={{
                                        id: session.id,
                                        date: session.date,
                                        durationMinutes:
                                            session.durationMinutes,
                                        workType: session.workType,
                                        horse: session.horse,
                                        rider: session.rider,
                                        notes: session.notes,
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pointer-events-none">
                <div className="w-full pointer-events-auto">
                    <Button
                        className="w-full shadow-lg rounded-full text-base font-medium"
                        size="lg"
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        Log Session
                    </Button>
                </div>
            </div>
        </div>
    );
}
