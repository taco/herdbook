import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ActivityCard from '@/components/ActivityCard';
import { useAppNavigate } from '@/hooks/useAppNavigate';

const PAGE_SIZE = 20;

const SESSIONS_QUERY = gql`
    query GetSessions($limit: Int, $offset: Int) {
        sessions(limit: $limit, offset: $offset) {
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

interface SessionItem {
    id: string;
    date: string;
    durationMinutes: number;
    workType: string;
    notes: string;
    horse: { name: string };
    rider: { name: string };
}

interface SessionsData {
    sessions: SessionItem[];
}

function SessionSkeleton(): React.ReactNode {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-md" />
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-full rounded-md" />
            </CardContent>
        </Card>
    );
}

export default function Sessions(): React.ReactNode {
    const { push } = useAppNavigate();
    const { data, loading, fetchMore } = useQuery<SessionsData>(
        SESSIONS_QUERY,
        {
            variables: { limit: PAGE_SIZE, offset: 0 },
        }
    );

    const sessions = data?.sessions ?? [];
    const hasMore = sessions.length > 0 && sessions.length % PAGE_SIZE === 0;

    const handleLoadMore = (): void => {
        fetchMore({
            variables: { limit: PAGE_SIZE, offset: sessions.length },
            updateQuery(prev, { fetchMoreResult }) {
                if (!fetchMoreResult) return prev;
                return {
                    sessions: [...prev.sessions, ...fetchMoreResult.sessions],
                };
            },
        });
    };

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-lg font-semibold">Sessions</h1>

            {loading ? (
                <div className="space-y-3">
                    <SessionSkeleton />
                    <SessionSkeleton />
                    <SessionSkeleton />
                </div>
            ) : sessions.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                    <p>No sessions yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <ActivityCard
                            key={session.id}
                            session={session}
                            onClick={() => push(`/sessions/${session.id}`)}
                        />
                    ))}

                    {hasMore && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleLoadMore}
                        >
                            Load more
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
