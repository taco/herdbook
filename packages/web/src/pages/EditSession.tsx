import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Save, Plus, Trash2 } from 'lucide-react';

import SelectHorse from '@/components/fields/SelectHorse';
import SelectRider from '@/components/fields/SelectRider';
import SelectWorkType from '@/components/fields/SelectWorkType';
import ActivityCard from '@/components/ActivityCard';
import VoiceRecordButton from '@/components/VoiceRecordButton';
import VoiceSessionButton from '@/components/VoiceSessionButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import {
    WorkType,
    GetSessionForEditQuery,
    GetSessionForEditQueryVariables,
    GetLastSessionForHorseQuery,
    GetLastSessionForHorseQueryVariables,
    CreateSessionMutation,
    CreateSessionMutationVariables,
    UpdateSessionMutation,
    UpdateSessionMutationVariables,
    DeleteSessionMutation,
    DeleteSessionMutationVariables,
    GetHorsesQuery,
    GetHorsesQueryVariables,
    GetRidersQuery,
    GetRidersQueryVariables,
} from '@/generated/graphql';

const REQUIRED_FIELDS_ERROR_MESSAGE = 'Please fill in all required fields.';

interface PrefillData {
    horseId?: string | null;
    riderId?: string | null;
    date?: string | null;
    durationMinutes?: number | null;
    workType?: WorkType | null;
    notes?: string | null;
}

interface LocationState {
    prefill?: PrefillData;
}

function formatAsDateTimeLocalValue(date: Date): string {
    const tzOffsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

const GET_SESSION_FOR_EDIT = gql`
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

const CREATE_SESSION_MUTATION = gql`
    mutation CreateSession(
        $horseId: ID!
        $date: DateTime!
        $durationMinutes: Int!
        $workType: WorkType!
        $notes: String!
    ) {
        createSession(
            horseId: $horseId
            date: $date
            durationMinutes: $durationMinutes
            workType: $workType
            notes: $notes
        ) {
            id
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

const GET_LAST_SESSION_FOR_HORSE_QUERY = gql`
    query GetLastSessionForHorse($horseId: ID!) {
        lastSessionForHorse(horseId: $horseId) {
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

export default function EditSession() {
    const { id } = useParams<{ id: string }>();
    const isEditMode = id !== undefined && id !== 'new';
    const navigate = useNavigate();
    const location = useLocation();
    const { riderId: currentRiderId } = useAuth();
    const locationState = location.state as LocationState | null;
    const prefill = locationState?.prefill;

    const [horseId, setHorseId] = useState('');
    const [riderId, setRiderId] = useState('');
    const [date, setDate] = useState(() =>
        formatAsDateTimeLocalValue(new Date())
    );
    const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
    const [workType, setWorkType] = useState<WorkType | null>(null);
    const [notes, setNotes] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const { data, loading: sessionLoading } = useQuery<
        GetSessionForEditQuery,
        GetSessionForEditQueryVariables
    >(GET_SESSION_FOR_EDIT, {
        variables: { id: id! },
        skip: !isEditMode,
    });

    const {
        loading: lastSessionLoading,
        data: { lastSessionForHorse } = { lastSessionForHorse: null },
    } = useQuery<
        GetLastSessionForHorseQuery,
        GetLastSessionForHorseQueryVariables
    >(GET_LAST_SESSION_FOR_HORSE_QUERY, {
        variables: { horseId },
        skip: !horseId || isEditMode,
    });

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

    useEffect(() => {
        if (isEditMode && data?.session) {
            setHorseId(data.session.horse.id);
            setRiderId(data.session.rider.id);
            const dateValue = Number(data.session.date);
            const dateObj = isNaN(dateValue)
                ? new Date(data.session.date)
                : new Date(dateValue);
            setDate(formatAsDateTimeLocalValue(dateObj));
            setDurationMinutes(data.session.durationMinutes);
            setWorkType(data.session.workType as WorkType);
            setNotes(data.session.notes);
        }
    }, [data, isEditMode]);

    // Initialize create mode from prefill, localStorage, and auth context
    useEffect(() => {
        if (!isEditMode) {
            // Prefill from voice review takes priority
            if (prefill) {
                if (prefill.horseId) setHorseId(prefill.horseId);
                if (prefill.riderId) setRiderId(prefill.riderId);
                if (prefill.date) setDate(prefill.date);
                if (
                    prefill.durationMinutes !== null &&
                    prefill.durationMinutes !== undefined
                )
                    setDurationMinutes(prefill.durationMinutes);
                if (prefill.workType) setWorkType(prefill.workType);
                if (prefill.notes) setNotes(prefill.notes);
            } else {
                // Fall back to localStorage
                const persisted = JSON.parse(
                    localStorage.getItem('createSession') || '{}'
                );
                if (persisted.horseId) setHorseId(persisted.horseId);
                if (persisted.durationMinutes)
                    setDurationMinutes(persisted.durationMinutes);
                if (persisted.workType) setWorkType(persisted.workType);
            }
            // Always set rider from auth context if not prefilled
            if (!prefill?.riderId && currentRiderId) setRiderId(currentRiderId);
        }
    }, [isEditMode, currentRiderId, prefill]);

    const [createSession, { loading: createLoading }] = useMutation<
        CreateSessionMutation,
        CreateSessionMutationVariables
    >(CREATE_SESSION_MUTATION);

    const [updateSession, { loading: updateLoading }] = useMutation<
        UpdateSessionMutation,
        UpdateSessionMutationVariables
    >(UPDATE_SESSION_MUTATION);

    const [deleteSession, { loading: deleteLoading }] = useMutation<
        DeleteSessionMutation,
        DeleteSessionMutationVariables
    >(DELETE_SESSION_MUTATION);

    const loading = createLoading || updateLoading;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);

        const trimmedNotes = notes.trim();

        if (
            !horseId ||
            !date ||
            durationMinutes == null ||
            !workType ||
            !riderId ||
            trimmedNotes.length === 0
        ) {
            setFormError(REQUIRED_FIELDS_ERROR_MESSAGE);
            return;
        }

        try {
            if (isEditMode) {
                await updateSession({
                    variables: {
                        id: id!,
                        horseId,
                        riderId,
                        date: new Date(date).toISOString(),
                        durationMinutes,
                        workType,
                        notes: trimmedNotes,
                    },
                    update(cache) {
                        cache.evict({ fieldName: 'sessions' });
                        cache.evict({ fieldName: 'session' });
                        cache.evict({ fieldName: 'lastSessionForHorse' });
                        cache.gc();
                    },
                });
            } else {
                const persistedVariables = {
                    horseId,
                    durationMinutes,
                    workType,
                };
                await createSession({
                    variables: {
                        ...persistedVariables,
                        date: new Date(date).toISOString(),
                        notes: trimmedNotes,
                    },
                    update(cache) {
                        cache.evict({ fieldName: 'sessions' });
                        cache.evict({ fieldName: 'lastSessionForHorse' });
                        cache.gc();
                    },
                });
                localStorage.setItem(
                    'createSession',
                    JSON.stringify(persistedVariables)
                );
            }
            navigate('/');
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : 'An error occurred'
            );
        }
    };

    const handleDelete = async () => {
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
            navigate('/');
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : 'An error occurred'
            );
        }
    };

    if (isEditMode && sessionLoading) {
        return (
            <div className="min-h-dvh flex items-start justify-center p-4 bg-background">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                            Loading...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isEditMode && !data?.session) {
        return (
            <div className="min-h-dvh flex items-start justify-center p-4 bg-background">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <p className="text-center text-red-500">
                            Session not found.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-dvh flex items-start justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>
                        {isEditMode ? 'Edit session' : 'Log session'}
                    </CardTitle>
                    <CardDescription>
                        {isEditMode
                            ? 'Update session details.'
                            : 'Record a training session for a horse.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isEditMode && (
                        <div className="mb-6 flex flex-col items-center gap-2 p-4 border border-dashed rounded-lg">
                            <VoiceSessionButton
                                horses={horses}
                                riders={riders}
                                onParsed={(fields) => {
                                    if (fields.horseId)
                                        setHorseId(fields.horseId);
                                    if (fields.riderId)
                                        setRiderId(fields.riderId);
                                    if (fields.date) {
                                        setDate(
                                            formatAsDateTimeLocalValue(
                                                new Date(fields.date)
                                            )
                                        );
                                    }
                                    if (fields.durationMinutes !== null) {
                                        setDurationMinutes(
                                            fields.durationMinutes
                                        );
                                    }
                                    if (fields.workType)
                                        setWorkType(fields.workType);
                                    if (fields.notes) setNotes(fields.notes);
                                }}
                            />
                            <span className="text-sm text-muted-foreground">
                                Describe your session with voice
                            </span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="horseId">Horse</Label>
                            <SelectHorse
                                value={horseId}
                                onChange={setHorseId}
                                id="horseId"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="riderId">Rider</Label>
                            <SelectRider
                                value={riderId}
                                onChange={setRiderId}
                                id="riderId"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="date">Date &amp; time</Label>
                            <Input
                                id="date"
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="durationMinutes">
                                Duration (minutes)
                            </Label>
                            <Input
                                id="durationMinutes"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                step={1}
                                placeholder="e.g. 45"
                                value={durationMinutes ?? ''}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw.length === 0) {
                                        setDurationMinutes(null);
                                        return;
                                    }
                                    const parsed = Number.parseInt(raw, 10);
                                    setDurationMinutes(
                                        Number.isFinite(parsed) ? parsed : null
                                    );
                                }}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="workType">Work type</Label>
                            <SelectWorkType
                                value={workType}
                                onChange={setWorkType}
                                id="workType"
                            />
                        </div>

                        {!isEditMode && (
                            <div className="space-y-1.5">
                                <Label>Previous session</Label>
                                <div className="min-h-[126px]">
                                    {lastSessionForHorse &&
                                    !lastSessionLoading ? (
                                        <ActivityCard
                                            session={lastSessionForHorse}
                                        />
                                    ) : (
                                        <Skeleton className="w-full h-[126px]" />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="notes">Notes</Label>
                            <div className="flex gap-2 items-start">
                                <textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. 'Good session, worked on lateral movement'"
                                    required
                                    rows={9}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                                <VoiceRecordButton
                                    onTranscription={(text) => {
                                        // Append to existing notes with a space if not empty
                                        setNotes((prev) =>
                                            prev.trim()
                                                ? `${prev.trim()} ${text}`
                                                : text
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        {formError && (
                            <p className="text-sm text-red-500">{formError}</p>
                        )}

                        <Button
                            className="w-full shadow-lg rounded-full text-base font-medium"
                            size="lg"
                            type="submit"
                            disabled={loading}
                        >
                            {isEditMode ? (
                                <>
                                    <Save className="mr-2 h-5 w-5" />
                                    {loading ? 'Saving...' : 'Save'}
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-5 w-5" />
                                    {loading ? 'Creating...' : 'Log Session'}
                                </>
                            )}
                        </Button>
                    </form>

                    {isEditMode && (
                        <>
                            <Separator className="my-6" />
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-destructive">
                                    Danger Zone
                                </h3>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            disabled={deleteLoading}
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
                                                This action cannot be undone.
                                                This will permanently delete
                                                this training session.
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
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
