import { useState, useEffect } from 'react';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

interface TextEditSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string;
    onSave: (value: string) => void;
    placeholder?: string;
}

export default function TextEditSheet({
    open,
    onOpenChange,
    value,
    onSave,
    placeholder = 'Write your notes...',
}: TextEditSheetProps): React.ReactNode {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value, open]);

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            onSave(localValue);
        }
        onOpenChange(nextOpen);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="bottom"
                className="top-0 flex flex-col overflow-hidden [&>button]:hidden"
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>Edit</SheetTitle>
                </SheetHeader>
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => handleOpenChange(false)}
                        className="text-sm font-medium text-primary"
                    >
                        Done
                    </button>
                </div>
                <textarea
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    className="flex-1 min-h-0 resize-none w-full overflow-y-auto bg-transparent text-base outline-none placeholder:text-muted-foreground"
                    placeholder={placeholder}
                />
            </SheetContent>
        </Sheet>
    );
}
