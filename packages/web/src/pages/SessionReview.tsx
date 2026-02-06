import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { Save, ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ParsedSessionFields } from '@/hooks/useRecordingStateMachine';
import SummaryRow from '@/components/review/SummaryRow';
import NotesSection from '@/components/review/NotesSection';
import FieldEditSheet, { FieldType } from '@/components/review/FieldEditSheet';
import { useAuth } from '@/context/AuthContext';
import {
    formatAsDateTimeLocalValue,
    formatSessionDateTime,
} from '@/lib/dateUtils';
import {
    WorkType,
    CreateSessionMutation,
    CreateSessionMutationVariables,
    GetHorsesQuery,
    GetHorsesQueryVariables,
    GetRidersQuery,
    GetRidersQueryVariables,
} from '@/generated/graphql';

function formatDisplayDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    try {
        return formatSessionDateTime(new Date(dateStr));
    } catch {
        return null;
    }
}

const WORK_TYPE_LABELS: Record<WorkType, string> = {
    [WorkType.Flatwork]: 'Flatwork',
    [WorkType.Groundwork]: 'Groundwork',
    [WorkType.InHand]: 'In-hand',
    [WorkType.Jumping]: 'Jumping',
    [WorkType.Trail]: 'Trail',
    [WorkType.Other]: 'Other',
};

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

interface LocationState {
    parsedFields: ParsedSessionFields;
}

export default function SessionReview() {
    const location = useLocation();
    const navigate = useNavigate();
    const { riderId: currentRiderId } = useAuth();
    const state = location.state as LocationState | null;

    // Field state
    const [horseId, setHorseId] = useState<string | null>(null);
    const [riderId, setRiderId] = useState<string | null>(null);
    const [dateTime, setDateTime] = useState<string>('');
    const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
    const [workType, setWorkType] = useState<WorkType | null>(null);
    const [notes, setNotes] = useState<string>('');

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingField, setEditingField] = useState<FieldType | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

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

    const [createSession, { loading: saving }] = useMutation<
        CreateSessionMutation,
        CreateSessionMutationVariables
    >(CREATE_SESSION_MUTATION);

    // Initialize from parsed fields
    useEffect(() => {
        if (state?.parsedFields) {
            const pf = state.parsedFields;
            setHorseId(pf.horseId);
            setRiderId(pf.riderId ?? currentRiderId ?? null);
            setDurationMinutes(pf.durationMinutes);
            setWorkType(pf.workType);
            setNotes(pf.notes ?? '');

            if (pf.date) {
                try {
                    const date = new Date(pf.date);
                    setDateTime(formatAsDateTimeLocalValue(date));
                } catch {
                    setDateTime(formatAsDateTimeLocalValue(new Date()));
                }
            } else {
                setDateTime(formatAsDateTimeLocalValue(new Date()));
            }
        }
    }, [state, currentRiderId]);

    // Redirect if no parsed data
    if (!state?.parsedFields) {
        return <Navigate to="/sessions/voice" replace />;
    }

    const horseName = horses.find((h) => h.id === horseId)?.name ?? null;
    const riderName = riders.find((r) => r.id === riderId)?.name ?? null;
    const workTypeLabel = workType ? WORK_TYPE_LABELS[workType] : null;
    const durationDisplay =
        durationMinutes !== null ? `${durationMinutes} min` : null;
    const dateDisplay = formatDisplayDate(dateTime);

    const openSheet = (field: FieldType) => {
        setEditingField(field);
        setSheetOpen(true);
    };

    const getFieldValue = (): string | number | WorkType | null => {
        switch (editingField) {
            case 'horse':
                return horseId;
            case 'rider':
                return riderId;
            case 'workType':
                return workType;
            case 'duration':
                return durationMinutes;
            case 'dateTime':
                return dateTime;
            case 'notes':
                return notes;
            default:
                return null;
        }
    };

    const handleFieldSave = (value: string | number | WorkType | null) => {
        switch (editingField) {
            case 'horse':
                setHorseId(value as string | null);
                break;
            case 'rider':
                setRiderId(value as string | null);
                break;
            case 'workType':
                setWorkType(value as WorkType | null);
                break;
            case 'duration':
                setDurationMinutes(value as number | null);
                break;
            case 'dateTime':
                setDateTime((value as string) ?? '');
                break;
            case 'notes':
                setNotes((value as string) ?? '');
                break;
        }
    };

    const canSave =
        horseId !== null &&
        dateTime.length > 0 &&
        durationMinutes !== null &&
        workType !== null &&
        notes.trim().length > 0;

    const handleSave = async () => {
        if (!canSave) {
            setFormError('Please fill in all required fields.');
            return;
        }

        setFormError(null);

        try {
            await createSession({
                variables: {
                    horseId: horseId!,
                    date: new Date(dateTime).toISOString(),
                    durationMinutes: durationMinutes!,
                    workType: workType!,
                    notes: notes.trim(),
                },
                update(cache) {
                    cache.evict({ fieldName: 'sessions' });
                    cache.evict({ fieldName: 'lastSessionForHorse' });
                    cache.gc();
                },
            });

            // Persist preferences for next time
            localStorage.setItem(
                'createSession',
                JSON.stringify({
                    horseId,
                    durationMinutes,
                    workType,
                })
            );

            navigate('/');
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : 'An error occurred'
            );
        }
    };

    const handleBack = () => {
        navigate('/sessions/voice');
    };

    return (
        <div className="min-h-dvh flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-10 w-10"
                    aria-label="Go back"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-semibold">Review Session</h1>
            </div>

            {/* Main content */}
            <div className="flex-1 p-4">
                <Card className="w-full max-w-md mx-auto">
                    <CardContent className="pt-6">
                        {/* Summary rows */}
                        <div className="space-y-0">
                            <SummaryRow
                                label="Horse"
                                value={horseName}
                                onClick={() => openSheet('horse')}
                            />
                            <SummaryRow
                                label="Rider"
                                value={riderName}
                                onClick={() => openSheet('rider')}
                            />
                            <SummaryRow
                                label="Work Type"
                                value={workTypeLabel}
                                onClick={() => openSheet('workType')}
                            />
                            <SummaryRow
                                label="Duration"
                                value={durationDisplay}
                                onClick={() => openSheet('duration')}
                            />
                            <SummaryRow
                                label="Date & Time"
                                value={dateDisplay}
                                onClick={() => openSheet('dateTime')}
                            />
                        </div>

                        {/* Notes section */}
                        <NotesSection
                            notes={notes}
                            onEdit={() => openSheet('notes')}
                        />

                        {/* Error message */}
                        {formError && (
                            <p className="text-sm text-red-500 mt-4">
                                {formError}
                            </p>
                        )}

                        {/* Action buttons */}
                        <div className="mt-6 space-y-3">
                            <Button
                                onClick={handleSave}
                                disabled={!canSave || saving}
                                className="w-full rounded-full shadow-lg text-base font-medium"
                                size="lg"
                            >
                                <Save className="mr-2 h-5 w-5" />
                                {saving ? 'Saving...' : 'Save Session'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit sheet */}
            <FieldEditSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                fieldType={editingField}
                value={getFieldValue()}
                onSave={handleFieldSave}
            />
        </div>
    );
}
