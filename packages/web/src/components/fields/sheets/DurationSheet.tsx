import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

import { FieldSheetProps } from './types';

export default function DurationSheet({
    open,
    onOpenChange,
    value,
    onSave,
}: FieldSheetProps<number | null>) {
    const [localValue, setLocalValue] = useState<number | null>(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value, open]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-auto">
                <SheetHeader>
                    <SheetTitle>Duration (minutes)</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                    <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        placeholder="e.g. 45"
                        value={localValue !== null ? String(localValue) : ''}
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
                    <Button
                        onClick={() => onSave(localValue)}
                        className="w-full"
                    >
                        Done
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
