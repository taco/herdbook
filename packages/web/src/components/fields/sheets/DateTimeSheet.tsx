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

export default function DateTimeSheet({
    open,
    onOpenChange,
    value,
    onSave,
}: FieldSheetProps<string>) {
    const [localValue, setLocalValue] = useState<string>(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value, open]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-auto">
                <SheetHeader>
                    <SheetTitle>Date & Time</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                    <Input
                        type="datetime-local"
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
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
