import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import ActivityCard from '@/components/ActivityCard';
import SessionDetailSheet from '@/components/SessionDetailSheet';
import { HorseCard } from '@/components/HorseCard';
import {
    GetDashboardDataQuery,
    GetDashboardDataQueryVariables,
} from '@/generated/graphql';
import { useNavigate } from 'react-router-dom';

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

type Session = NonNullable<GetDashboardDataQuery['sessions']>[number];

export default function Dashboard() {
    const { data, loading, error } = useQuery<
        GetDashboardDataQuery,
        GetDashboardDataQueryVariables
    >(DASHBOARD_QUERY);
    const navigate = useNavigate();
    const [selectedSession, setSelectedSession] = useState<Session | null>(
        null
    );
    const [sheetOpen, setSheetOpen] = useState(false);

    const handleSessionClick = (session: Session) => {
        setSelectedSession(session);
        setSheetOpen(true);
    };

    if (loading)
        return <div className="p-4 text-center">Loading activity...</div>;
    if (error)
        return (
            <div className="p-4 text-center text-red-500">
                Error loading data.
            </div>
        );

    return (
        <div className="p-4">
            <div className="space-y-6">
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
                        {data?.sessions.map((session) => (
                            <ActivityCard
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
                                onClick={() => handleSessionClick(session)}
                            />
                        ))}
                    </div>
                </section>
            </div>

            <SessionDetailSheet
                session={selectedSession}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />
        </div>
    );
}
