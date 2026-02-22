import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { ChevronLeft, Edit, Plus, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Heatmap } from '@/components/Heatmap';
import ActivityCard from '@/components/ActivityCard';
import HorseSummarySection from '@/components/HorseSummarySection';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { useAuth } from '@/context/AuthContext';
import { parseSessionDate } from '@/lib/dateUtils';
import { formatTimeAgo } from '@/lib/utils';
import type {
    GetHorseProfileQuery,
    GetHorseProfileQueryVariables,
} from '@/generated/graphql';

const GET_HORSE_PROFILE = gql`
    query GetHorseProfile($id: ID!) {
        horse(id: $id) {
            id
            name
            notes
            isActive
            activity(weeks: 12) {
                weekStart
                count
            }
            summary {
                content
                generatedAt
                stale
                refreshAvailableAt
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
    }
`;

const NOTES_COLLAPSE_THRESHOLD = 120;

export default function HorseProfile(): React.ReactNode {
    const { id } = useParams<{ id: string }>();
    const { push, back } = useAppNavigate();
    const { isTrainer } = useAuth();
    const [notesExpanded, setNotesExpanded] = useState(false);

    const { data, loading, refetch } = useQuery<
        GetHorseProfileQuery,
        GetHorseProfileQueryVariables
    >(GET_HORSE_PROFILE, { variables: { id: id! } });

    if (loading && !data) {
        return (
            <div className="min-h-dvh p-4 flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    const horse = data?.horse;

    if (!horse) {
        return (
            <div className="min-h-dvh p-4 flex items-center justify-center">
                <p className="text-red-500">Horse not found.</p>
            </div>
        );
    }

    const sessions = [...horse.sessions].sort(
        (a, b) =>
            parseSessionDate(b.date).getTime() -
            parseSessionDate(a.date).getTime()
    );

    const totalSessions = sessions.length;
    const lastRideDate =
        sessions.length > 0
            ? formatTimeAgo(parseSessionDate(sessions[0].date))
            : null;

    const notesIsLong =
        horse.notes != null && horse.notes.length > NOTES_COLLAPSE_THRESHOLD;

    return (
        <div className="min-h-dvh flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={back}
                    className="h-10 w-10"
                    aria-label="Go back"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-semibold flex-1 truncate">
                    {horse.name}
                </h1>
                {isTrainer && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => push(`/horses/${id}/edit`)}
                        className="text-primary"
                    >
                        <Edit className="mr-1.5 h-4 w-4" />
                        Edit
                    </Button>
                )}
            </div>

            <div className="flex-1 p-4 pb-24">
                <div className="max-w-md mx-auto space-y-6">
                    {/* Heatmap */}
                    <section>
                        <h2 className="text-sm font-medium text-muted-foreground mb-2">
                            Activity
                        </h2>
                        <Heatmap activity={horse.activity} />
                    </section>

                    {/* Stats row */}
                    <section className="flex gap-4">
                        <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
                            <p className="text-2xl font-bold">
                                {totalSessions}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Sessions
                            </p>
                        </div>
                        <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
                            <p className="text-sm font-medium">
                                {lastRideDate ?? '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Last Ride
                            </p>
                        </div>
                    </section>

                    {/* Training Summary */}
                    <Separator />
                    <HorseSummarySection
                        horseId={id!}
                        totalSessions={totalSessions}
                        summary={horse.summary ?? null}
                        onSummaryGenerated={() => refetch()}
                    />

                    {/* Notes */}
                    {horse.notes && (
                        <>
                            <Separator />
                            <section>
                                <h2 className="text-sm font-medium text-muted-foreground mb-2">
                                    Notes
                                </h2>
                                <p
                                    className={`text-sm whitespace-pre-wrap ${
                                        !notesExpanded && notesIsLong
                                            ? 'line-clamp-3'
                                            : ''
                                    }`}
                                >
                                    {horse.notes}
                                </p>
                                {notesIsLong && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-1 h-8 px-2 text-xs text-muted-foreground"
                                        onClick={() =>
                                            setNotesExpanded(!notesExpanded)
                                        }
                                    >
                                        {notesExpanded ? (
                                            <>
                                                <ChevronUp className="mr-1 h-3 w-3" />
                                                Show less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="mr-1 h-3 w-3" />
                                                Show more
                                            </>
                                        )}
                                    </Button>
                                )}
                            </section>
                        </>
                    )}

                    {/* Sessions list */}
                    <Separator />
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                Sessions
                            </h2>
                            {sessions.length > 0 && (
                                <button
                                    className="text-sm text-primary"
                                    onClick={() =>
                                        push(
                                            `/sessions?horseId=${id}&horseName=${encodeURIComponent(horse.name)}`
                                        )
                                    }
                                >
                                    View all sessions
                                </button>
                            )}
                        </div>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No sessions yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {sessions.map((session) => (
                                    <ActivityCard
                                        key={session.id}
                                        session={session}
                                        onClick={() =>
                                            push(`/sessions/${session.id}`)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Quick-add FAB */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                <Button
                    size="lg"
                    className="pointer-events-auto shadow-lg rounded-full px-6 h-12"
                    onClick={() =>
                        push('/sessions/new', {
                            state: { prefill: { horseId: id } },
                        })
                    }
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Log Session
                </Button>
            </div>
        </div>
    );
}
