import { useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SummaryRow from '@/components/session/SummaryRow';
import NotesSection from '@/components/session/NotesSection';
import { formatSessionDateTime } from '@/lib/dateUtils';
import { Intensity, WorkType } from '@/generated/graphql';
import IntensitySelector from '@/components/session/IntensitySelector';
import RatingSelector from '@/components/session/RatingSelector';

import DateTimeSheet from '@/components/fields/sheets/DateTimeSheet';
import DurationSheet from '@/components/fields/sheets/DurationSheet';
import HorsePickerSheet from '@/components/fields/sheets/HorsePickerSheet';
import NotesSheet from '@/components/fields/sheets/NotesSheet';
import RiderPickerSheet from '@/components/fields/sheets/RiderPickerSheet';
import WorkTypePickerSheet from '@/components/fields/sheets/WorkTypePickerSheet';

import { useFieldEditor } from '@/hooks/useFieldEditor';

const WORK_TYPE_LABELS: Record<WorkType, string> = {
    [WorkType.Flatwork]: 'Flatwork',
    [WorkType.Groundwork]: 'Groundwork',
    [WorkType.InHand]: 'In-hand',
    [WorkType.Jumping]: 'Jumping',
    [WorkType.Trail]: 'Trail',
    [WorkType.Other]: 'Other',
};

export interface SessionValues {
    horseId: string | null;
    riderId: string | null;
    dateTime: string; // datetime-local format
    durationMinutes: number | null;
    workType: WorkType | null;
    intensity: Intensity | null;
    rating: number | null;
    notes: string;
}

interface Horse {
    id: string;
    name: string;
}

interface Rider {
    id: string;
    name: string;
}

type FieldType =
    | 'horse'
    | 'rider'
    | 'workType'
    | 'duration'
    | 'dateTime'
    | 'notes';

interface SessionEditorProps {
    initialValues: SessionValues;
    horses: Horse[];
    riders: Rider[];
    onSave: (values: SessionValues) => void;
    onBack: () => void;
    title: string;
    saving: boolean;
    showRiderPicker?: boolean;
    extraActions?: React.ReactNode;
    error?: string | null;
}

export default function SessionEditor({
    initialValues,
    horses,
    riders,
    onSave,
    onBack,
    title,
    saving,
    showRiderPicker = true,
    extraActions,
    error,
}: SessionEditorProps): React.ReactNode {
    const [values, setValues] = useState<SessionValues>(initialValues);
    const [formError, setFormError] = useState<string | null>(null);

    const { editField, sheetProps } = useFieldEditor<FieldType>();

    const horseName = horses.find((h) => h.id === values.horseId)?.name ?? null;
    const riderName = riders.find((r) => r.id === values.riderId)?.name ?? null;
    const workTypeLabel = values.workType
        ? WORK_TYPE_LABELS[values.workType]
        : null;
    const durationDisplay =
        values.durationMinutes !== null
            ? `${values.durationMinutes} min`
            : null;

    let dateDisplay: string | null = null;
    if (values.dateTime) {
        try {
            dateDisplay = formatSessionDateTime(new Date(values.dateTime));
        } catch {
            dateDisplay = null;
        }
    }

    const canSave =
        values.horseId !== null &&
        values.dateTime.length > 0 &&
        values.durationMinutes !== null &&
        values.workType !== null &&
        values.notes.trim().length > 0;

    const handleSave = (): void => {
        if (!canSave) {
            setFormError('Please fill in all required fields.');
            return;
        }
        setFormError(null);
        onSave(values);
    };

    return (
        <div className="min-h-dvh bg-background">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="h-10 w-10"
                    aria-label="Go back"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-semibold">{title}</h1>
            </div>

            {/* Main content */}
            <div className="p-4">
                <Card className="w-full max-w-md mx-auto">
                    <CardContent className="pt-6">
                        <div className="space-y-0">
                            <SummaryRow
                                label="Horse"
                                value={horseName}
                                onClick={() => editField('horse')}
                            />
                            {showRiderPicker && (
                                <SummaryRow
                                    label="Rider"
                                    value={riderName}
                                    onClick={() => editField('rider')}
                                />
                            )}
                            <SummaryRow
                                label="Work Type"
                                value={workTypeLabel}
                                onClick={() => editField('workType')}
                            />
                            <SummaryRow
                                label="Duration"
                                value={durationDisplay}
                                onClick={() => editField('duration')}
                            />
                            <SummaryRow
                                label="Date & Time"
                                value={dateDisplay}
                                onClick={() => editField('dateTime')}
                            />
                        </div>

                        <div className="mt-4">
                            <span className="text-sm text-muted-foreground mb-2 block">
                                Intensity
                            </span>
                            <IntensitySelector
                                value={values.intensity}
                                onChange={(intensity) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        intensity,
                                    }))
                                }
                            />
                        </div>

                        <div className="mt-4">
                            <span className="text-sm text-muted-foreground mb-2 block">
                                Rating
                            </span>
                            <RatingSelector
                                value={values.rating}
                                onChange={(rating) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        rating,
                                    }))
                                }
                            />
                        </div>

                        <NotesSection
                            notes={values.notes}
                            onClick={() => editField('notes')}
                        />

                        {formError && (
                            <p className="text-sm text-red-500 mt-4">
                                {formError}
                            </p>
                        )}
                        {error && (
                            <p className="text-sm text-red-500 mt-4">{error}</p>
                        )}

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
                            {extraActions}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <HorsePickerSheet
                horses={horses}
                {...sheetProps('horse', {
                    value: values.horseId,
                    onSave: (horseId) =>
                        setValues((prev) => ({ ...prev, horseId })),
                })}
            />

            {showRiderPicker && (
                <RiderPickerSheet
                    riders={riders}
                    {...sheetProps('rider', {
                        value: values.riderId,
                        onSave: (riderId) =>
                            setValues((prev) => ({ ...prev, riderId })),
                    })}
                />
            )}

            <WorkTypePickerSheet
                {...sheetProps('workType', {
                    value: values.workType,
                    onSave: (workType) =>
                        setValues((prev) => ({ ...prev, workType })),
                })}
            />

            <DurationSheet
                {...sheetProps('duration', {
                    value: values.durationMinutes,
                    onSave: (durationMinutes) =>
                        setValues((prev) => ({ ...prev, durationMinutes })),
                })}
            />

            <DateTimeSheet
                {...sheetProps('dateTime', {
                    value: values.dateTime,
                    onSave: (dateTime) =>
                        setValues((prev) => ({ ...prev, dateTime })),
                })}
            />

            <NotesSheet
                {...sheetProps('notes', {
                    value: values.notes,
                    onSave: (notes) =>
                        setValues((prev) => ({ ...prev, notes })),
                })}
            />
        </div>
    );
}
