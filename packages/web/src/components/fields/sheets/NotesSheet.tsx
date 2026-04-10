import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

import { FieldSheetProps } from './types';

export default function NotesSheet({
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
            <SheetContent
                side="bottom"
                className="top-0 flex flex-col overflow-hidden [&>button]:hidden"
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>Notes</SheetTitle>
                </SheetHeader>
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSave(localValue)}
                        className="h-11 px-4 text-base font-medium text-primary"
                    >
                        Done
                    </Button>
                </div>
                <textarea
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    className="flex-1 min-h-0 resize-none w-full overflow-y-auto bg-transparent text-base outline-none placeholder:text-muted-foreground"
                    placeholder="Write your notes..."
                />
            </SheetContent>
        </Sheet>
    );
}
