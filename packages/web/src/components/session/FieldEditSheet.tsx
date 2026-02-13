import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PickerSheet from '@/components/ui/PickerSheet';
import {
    WorkType,
    GetHorsesQuery,
    GetHorsesQueryVariables,
    GetRidersQuery,
    GetRidersQueryVariables,
} from '@/generated/graphql';
import { WORK_TYPE_OPTIONS } from '@/lib/constants';
import { GET_HORSES_QUERY, GET_RIDERS_QUERY } from '@/lib/queries';

export type FieldType =
    | 'horse'
    | 'rider'
    | 'workType'
    | 'duration'
    | 'dateTime';

interface FieldEditSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fieldType: FieldType | null;
    value: string | number | WorkType | null;
    onSave: (value: string | number | WorkType | null) => void;
}

const TITLES: Record<FieldType, string> = {
    horse: 'Select Horse',
    rider: 'Select Rider',
    workType: 'Select Work Type',
    duration: 'Duration (minutes)',
    dateTime: 'Date & Time',
};

export default function FieldEditSheet({
    open,
    onOpenChange,
    fieldType,
    value,
    onSave,
}: FieldEditSheetProps) {
    const [localValue, setLocalValue] = useState<
        string | number | WorkType | null
    >(value);

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
        setLocalValue(value);
    }, [value, open]);

    const handleSelect = (key: string) => {
        onSave(key);
        onOpenChange(false);
    };

    const handleSave = () => {
        onSave(localValue);
        onOpenChange(false);
    };

    // List-type fields delegate to PickerSheet
    if (fieldType === 'horse') {
        return (
            <PickerSheet
                open={open}
                onOpenChange={onOpenChange}
                title={TITLES.horse}
                items={horses.map((h) => ({ key: h.id, label: h.name }))}
                selectedKey={(value as string) ?? null}
                onSelect={handleSelect}
            />
        );
    }

    if (fieldType === 'rider') {
        return (
            <PickerSheet
                open={open}
                onOpenChange={onOpenChange}
                title={TITLES.rider}
                items={riders.map((r) => ({ key: r.id, label: r.name }))}
                selectedKey={(value as string) ?? null}
                onSelect={handleSelect}
            />
        );
    }

    if (fieldType === 'workType') {
        return (
            <PickerSheet
                open={open}
                onOpenChange={onOpenChange}
                title={TITLES.workType}
                items={WORK_TYPE_OPTIONS.map((o) => ({
                    key: o.value,
                    label: o.label,
                }))}
                selectedKey={(value as string) ?? null}
                onSelect={handleSelect}
            />
        );
    }

    // Input-type fields use their own Sheet
    const title = fieldType ? TITLES[fieldType] : 'Edit';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-auto">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>

                {fieldType === 'duration' && (
                    <div className="mt-4 space-y-4">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            placeholder="e.g. 45"
                            value={
                                localValue !== null ? String(localValue) : ''
                            }
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw.length === 0) {
                                    setLocalValue(null);
                                    return;
                                }
                                const parsed = Number.parseInt(raw, 10);
                                setLocalValue(
                                    Number.isFinite(parsed) ? parsed : null
                                );
                            }}
                            autoFocus
                        />
                        <Button onClick={handleSave} className="w-full">
                            Done
                        </Button>
                    </div>
                )}

                {fieldType === 'dateTime' && (
                    <div className="mt-4 space-y-4">
                        <Input
                            type="datetime-local"
                            value={
                                typeof localValue === 'string' ? localValue : ''
                            }
                            onChange={(e) => setLocalValue(e.target.value)}
                        />
                        <Button onClick={handleSave} className="w-full">
                            Done
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
