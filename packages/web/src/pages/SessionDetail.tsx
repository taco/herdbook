import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import {
    Calendar,
    ChevronLeft,
    Clock,
    User,
    Activity,
    Edit,
    Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import SessionEditor from '@/components/session/SessionEditor';
import type { SessionValues } from '@/components/session/SessionEditor';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { cn } from '@/lib/utils';
import {
    parseSessionDate,
    formatSessionTime,
    formatAsDateTimeLocalValue,
} from '@/lib/dateUtils';
import { getWorkTypeLabel } from '@/lib/constants';
import {
    WorkType,
    GetSessionForEditQuery,
    GetSessionForEditQueryVariables,
    UpdateSessionMutation,
    UpdateSessionMutationVariables,
    DeleteSessionMutation,
    DeleteSessionMutationVariables,
    GetHorsesQuery,
    GetHorsesQueryVariables,
    GetRidersQuery,
    GetRidersQueryVariables,
} from '@/generated/graphql';

const GET_SESSION = gql`
    query GetSessionForEdit($id: ID!) {
        session(id: $id) {
            id
            horse {
                id
                name
            }
            rider {
                id
                name
            }
            date
            durationMinutes
            workType
            notes
        }
    }
`;

const UPDATE_SESSION_MUTATION = gql`
    mutation UpdateSession(
        $id: ID!
        $horseId: ID
        $riderId: ID
        $date: DateTime
        $durationMinutes: Int
        $workType: WorkType
        $notes: String
    ) {
        updateSession(
            id: $id
            horseId: $horseId
            riderId: $riderId
            date: $date
            durationMinutes: $durationMinutes
            workType: $workType
            notes: $notes
        ) {
            id
        }
    }
`;

const DELETE_SESSION_MUTATION = gql`
    mutation DeleteSession($id: ID!) {
        deleteSession(id: $id)
    }
`;

const GET_HORSES_QUERY = gql`
    query GetHorses {
        horses {
            id
            name
        }
    }
`;

const GET_RIDERS_QUERY = gql`
    query GetRiders {
        riders {
            id
            name
        }
    }
`;

export default function SessionDetail(): React.ReactNode {
    const { id } = useParams<{ id: string }>();
    const { back, backTo } = useAppNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [shouldMount, setShouldMount] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing) setShouldMount(true);
    }, [isEditing]);

    const handleEditTransitionEnd = (e: React.TransitionEvent): void => {
        if (e.target === e.currentTarget && !isEditing) {
            setShouldMount(false);
        }
    };

    const { data, loading, refetch } = useQuery<
        GetSessionForEditQuery,
        GetSessionForEditQueryVariables
    >(GET_SESSION, { variables: { id: id! } });

    const { data: horsesData } = useQuery<
        GetHorsesQuery,
        GetHorsesQueryVariables
    >(GET_HORSES_QUERY);

    const { data: ridersData } = useQuery<
        GetRidersQuery,
        GetRidersQueryVariables
    >(GET_RIDERS_QUERY);

    const horses = horsesData?.horses ?? [];
    const riders = ridersData?.riders ?? [];

    const [updateSession, { loading: updateLoading }] = useMutation<
        UpdateSessionMutation,
        UpdateSessionMutationVariables
    >(UPDATE_SESSION_MUTATION);

    const [deleteSession] = useMutation<
        DeleteSessionMutation,
        DeleteSessionMutationVariables
    >(DELETE_SESSION_MUTATION);

    const session = data?.session;

    const handleSave = async (values: SessionValues): Promise<void> => {
        setFormError(null);
        try {
            await updateSession({
                variables: {
                    id: id!,
                    horseId: values.horseId,
                    riderId: values.riderId,
                    date: new Date(values.dateTime).toISOString(),
                    durationMinutes: values.durationMinutes,
                    workType: values.workType,
                    notes: values.notes.trim(),
                },
                update(cache) {
                    cache.evict({ fieldName: 'sessions' });
                    cache.evict({ fieldName: 'lastSessionForHorse' });
                    cache.gc();
                },
            });
            setIsEditing(false);
            refetch();
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : 'An error occurred'
            );
        }
    };

    const handleDelete = async (): Promise<void> => {
        try {
            await deleteSession({
                variables: { id: id! },
                update(cache) {
                    cache.evict({ fieldName: 'sessions' });
                    cache.evict({ fieldName: 'session' });
                    cache.evict({ fieldName: 'lastSessionForHorse' });
                    cache.gc();
                },
            });
            backTo('/');
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : 'An error occurred'
            );
        }
    };

    const initialValues: SessionValues | null = session
        ? {
              horseId: session.horse.id,
              riderId: session.rider.id,
              dateTime: formatAsDateTimeLocalValue(
                  parseSessionDate(session.date)
              ),
              durationMinutes: session.durationMinutes,
              workType: session.workType as WorkType,
              notes: session.notes,
          }
        : null;

    // Detail view content — loading, error, or data
    let detailContent: React.ReactNode;
    if (loading) {
        detailContent = (
            <div className="min-h-dvh p-4 flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    } else if (!session) {
        detailContent = (
            <div className="min-h-dvh p-4 flex items-center justify-center">
                <p className="text-red-500">Session not found.</p>
            </div>
        );
    } else {
        const dateObj = parseSessionDate(session.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const formattedTime = formatSessionTime(dateObj);

        detailContent = (
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
                    <h1 className="text-lg font-semibold flex-1">Session</h1>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="text-primary"
                    >
                        <Edit className="mr-1.5 h-4 w-4" />
                        Edit
                    </Button>
                </div>

                <div className="flex-1 p-4">
                    <div className="max-w-md mx-auto">
                        <h2 className="text-xl font-bold mb-1">
                            {session.horse.name}
                        </h2>
                        <p className="flex items-center gap-2 text-muted-foreground mb-6">
                            <Activity className="w-4 h-4" />
                            {getWorkTypeLabel(session.workType)}
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        {formattedDate}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formattedTime}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-muted-foreground" />
                                <p>{session.durationMinutes} minutes</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <User className="w-5 h-5 text-muted-foreground" />
                                <p>{session.rider.name}</p>
                            </div>

                            <Separator />

                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                    Notes
                                </h4>
                                <p className="text-sm whitespace-pre-wrap">
                                    {session.notes}
                                </p>
                            </div>
                        </div>

                        {formError && (
                            <p className="text-sm text-red-500 mt-4">
                                {formError}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-dvh">
            {detailContent}

            {/* Edit overlay — always in DOM so CSS transition can play */}
            <div
                className={cn(
                    'fixed inset-0 z-50 bg-background transform transition-transform duration-300 ease-out',
                    isEditing ? 'translate-x-0' : 'translate-x-full'
                )}
                onTransitionEnd={handleEditTransitionEnd}
            >
                {shouldMount && initialValues && (
                    <SessionEditor
                        initialValues={initialValues}
                        horses={horses}
                        riders={riders}
                        onSave={handleSave}
                        onBack={() => setIsEditing(false)}
                        title="Edit Session"
                        saving={updateLoading}
                        extraActions={
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Session
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Delete session?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This
                                            will permanently delete this
                                            training session.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        }
                    />
                )}
            </div>
        </div>
    );
}
