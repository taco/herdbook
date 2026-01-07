import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    WorkType,
    CreateSessionMutation,
    CreateSessionMutationVariables,
    Session,
    GetLastSessionForHorseQuery,
    GetLastSessionForHorseQueryVariables,
} from '@/generated/graphql';

import SelectHorse from '@/components/fields/SelectHorse';
import SelectWorkType from '@/components/fields/SelectWorkType';
import { useAuth } from '@/context/AuthContext';
import SelectRider from '@/components/fields/SelectRider';
import ActivityCard from '@/components/ActivityCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';

const REQUIRED_FIELDS_ERROR_MESSAGE = 'Please fill in all required fields.';

function formatAsDateTimeLocalValue(date: Date): string {
    // datetime-local expects local time in "YYYY-MM-DDTHH:mm" (no timezone suffix).
    // short term solution until we migrate to the new DateTime type.
    const tzOffsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

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

export default function CreateSession() {
    const persistedVariables = JSON.parse(
        localStorage.getItem('createSession') || '{}'
    );
    const { riderId: currentRiderId } = useAuth();
    const [riderId, setRiderId] = useState(currentRiderId || '');
    const [horseId, setHorseId] = useState(persistedVariables.horseId || '');

    const {
        loading: lastSessionLoading,
        data: { lastSessionForHorse } = { lastSessionForHorse: null },
    } = useQuery<
        GetLastSessionForHorseQuery,
        GetLastSessionForHorseQueryVariables
    >(GET_LAST_SESSION_FOR_HORSE_QUERY, {
        variables: { horseId },
        skip: !horseId,
    });

    const [date, setDate] = useState(() =>
        formatAsDateTimeLocalValue(new Date())
    );
    const [durationMinutes, setDurationMinutes] = useState<number | null>(
        persistedVariables.durationMinutes || null
    );
    const [workType, setWorkType] = useState<WorkType | null>(
        persistedVariables.workType || null
    );
    const [notes, setNotes] = useState('');
    const navigate = useNavigate();

    const [createSessionMutation, { loading }] = useMutation<
        CreateSessionMutation,
        CreateSessionMutationVariables
    >(CREATE_SESSION_MUTATION);

    const [formError, setFormError] = useState<string | null>(null);

    const handleHorseChange = async (value: string) => {
        setHorseId(value);

        // const result = await getLastSessionForHorseQuery({
        //     variables: {
        //         horseId: value,
        //     },
        // });

        // if (result.data) {
        //     setLastSessionForHorse(result.data.lastSessionForHorse as Session);
        // }
    };

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
            const persistedVariables = {
                horseId,
                durationMinutes,
                workType,
            };
            await createSessionMutation({
                variables: {
                    ...persistedVariables,
                    date: new Date(date).toISOString(),
                    notes: trimmedNotes,
                },
            });

            localStorage.setItem(
                'createSession',
                JSON.stringify(persistedVariables)
            );
            navigate('/');
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : 'An error occurred'
            );
        }
    };

    return (
        <div className="min-h-dvh flex items-start justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Log session</CardTitle>
                    <CardDescription>
                        Record a training session for a horse.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="horseId">Horse</Label>
                            <SelectHorse
                                value={horseId}
                                onChange={setHorseId}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="riderId">Rider</Label>
                            <SelectRider
                                value={riderId}
                                onChange={setRiderId}
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
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="lastSessionForHorse">
                                Previous session
                            </Label>
                            <div className="min-h-[126px]">
                                {lastSessionForHorse && !lastSessionLoading ? (
                                    <ActivityCard
                                        session={lastSessionForHorse}
                                    />
                                ) : (
                                    <Skeleton className="w-full h-[126px]" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notes">Notes</Label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. 'Good session, worked on lateral movement'"
                                required
                                rows={9}
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            />
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
                            <Plus className="mr-2 h-5 w-5" />
                            {loading ? 'Creating…' : 'Log Session'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
