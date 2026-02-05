import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    WorkType,
    GetHorsesQuery,
    GetHorsesQueryVariables,
    GetRidersQuery,
    GetRidersQueryVariables,
} from '@/generated/graphql';

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

const WORK_TYPE_OPTIONS: Array<{ value: WorkType; label: string }> = [
    { value: WorkType.Flatwork, label: 'Flatwork' },
    { value: WorkType.Groundwork, label: 'Groundwork' },
    { value: WorkType.InHand, label: 'In-hand' },
    { value: WorkType.Jumping, label: 'Jumping' },
    { value: WorkType.Trail, label: 'Trail' },
    { value: WorkType.Other, label: 'Other' },
];

export type FieldType =
    | 'horse'
    | 'rider'
    | 'workType'
    | 'duration'
    | 'dateTime'
    | 'notes';

interface FieldEditSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fieldType: FieldType | null;
    value: string | number | WorkType | null;
    onSave: (value: string | number | WorkType | null) => void;
}

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

    const handleSelect = (newValue: string | number | WorkType) => {
        onSave(newValue);
        onOpenChange(false);
    };

    const handleSave = () => {
        onSave(localValue);
        onOpenChange(false);
    };

    const getTitle = (): string => {
        switch (fieldType) {
            case 'horse':
                return 'Select Horse';
            case 'rider':
                return 'Select Rider';
            case 'workType':
                return 'Select Work Type';
            case 'duration':
                return 'Duration (minutes)';
            case 'dateTime':
                return 'Date & Time';
            case 'notes':
                return 'Edit Notes';
            default:
                return 'Edit';
        }
    };

    const renderContent = () => {
        switch (fieldType) {
            case 'horse':
                return (
                    <div className="space-y-1 mt-4">
                        {horses.map((horse) => (
                            <button
                                key={horse.id}
                                type="button"
                                onClick={() => handleSelect(horse.id)}
                                className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                            >
                                <span className="text-base">{horse.name}</span>
                                {localValue === horse.id && (
                                    <Check className="h-5 w-5 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                );

            case 'rider':
                return (
                    <div className="space-y-1 mt-4">
                        {riders.map((rider) => (
                            <button
                                key={rider.id}
                                type="button"
                                onClick={() => handleSelect(rider.id)}
                                className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                            >
                                <span className="text-base">{rider.name}</span>
                                {localValue === rider.id && (
                                    <Check className="h-5 w-5 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                );

            case 'workType':
                return (
                    <div className="space-y-1 mt-4">
                        {WORK_TYPE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                            >
                                <span className="text-base">
                                    {option.label}
                                </span>
                                {localValue === option.value && (
                                    <Check className="h-5 w-5 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                );

            case 'duration':
                return (
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
                );

            case 'dateTime':
                return (
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
                );

            case 'notes':
                return (
                    <div className="mt-4 space-y-4">
                        <textarea
                            value={
                                typeof localValue === 'string' ? localValue : ''
                            }
                            onChange={(e) => setLocalValue(e.target.value)}
                            rows={8}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            autoFocus
                        />
                        <Button onClick={handleSave} className="w-full">
                            Done
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-auto">
                <SheetHeader>
                    <SheetTitle>{getTitle()}</SheetTitle>
                </SheetHeader>
                {renderContent()}
            </SheetContent>
        </Sheet>
    );
}
