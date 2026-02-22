import { useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SummaryRow from '@/components/session/SummaryRow';
import NotesSection from '@/components/session/NotesSection';
import FieldEditSheet, { FieldType } from '@/components/session/FieldEditSheet';
import TextEditSheet from '@/components/TextEditSheet';
import { formatSessionDateTime } from '@/lib/dateUtils';
import { Intensity, WorkType } from '@/generated/graphql';
import IntensitySelector from '@/components/session/IntensitySelector';
import RatingSelector from '@/components/session/RatingSelector';

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
}: SessionEditorProps): React.ReactNode {
    const [values, setValues] = useState<SessionValues>(initialValues);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingField, setEditingField] = useState<FieldType | null>(null);
    const [notesSheetOpen, setNotesSheetOpen] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

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

    const openSheet = (field: FieldType): void => {
        setEditingField(field);
        setSheetOpen(true);
    };

    const getFieldValue = (): string | number | WorkType | null => {
        switch (editingField) {
            case 'horse':
                return values.horseId;
            case 'rider':
                return values.riderId;
            case 'workType':
                return values.workType;
            case 'duration':
                return values.durationMinutes;
            case 'dateTime':
                return values.dateTime;
            default:
                return null;
        }
    };

    const handleFieldSave = (
        value: string | number | WorkType | null
    ): void => {
        setValues((prev) => {
            switch (editingField) {
                case 'horse':
                    return { ...prev, horseId: value as string | null };
                case 'rider':
                    return { ...prev, riderId: value as string | null };
                case 'workType':
                    return { ...prev, workType: value as WorkType | null };
                case 'duration':
                    return { ...prev, durationMinutes: value as number | null };
                case 'dateTime':
                    return { ...prev, dateTime: (value as string) ?? '' };
                default:
                    return prev;
            }
        });
    };

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
                                onClick={() => openSheet('horse')}
                            />
                            {showRiderPicker && (
                                <SummaryRow
                                    label="Rider"
                                    value={riderName}
                                    onClick={() => openSheet('rider')}
                                />
                            )}
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
                            onEdit={() => setNotesSheetOpen(true)}
                        />

                        {formError && (
                            <p className="text-sm text-red-500 mt-4">
                                {formError}
                            </p>
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

            <FieldEditSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                fieldType={editingField}
                value={getFieldValue()}
                onSave={handleFieldSave}
            />

            <TextEditSheet
                open={notesSheetOpen}
                onOpenChange={setNotesSheetOpen}
                value={values.notes}
                onSave={(text) =>
                    setValues((prev) => ({ ...prev, notes: text }))
                }
            />
        </div>
    );
}
