import { useState, useEffect } from 'react';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface BarnNameEditSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
    onSave: (name: string) => void;
    saving: boolean;
}

export default function BarnNameEditSheet({
    open,
    onOpenChange,
    currentName,
    onSave,
    saving,
}: BarnNameEditSheetProps): React.ReactNode {
    const [name, setName] = useState(currentName);

    useEffect(() => {
        setName(currentName);
    }, [currentName, open]);

    const trimmed = name.trim();
    const canSave = trimmed.length > 0 && trimmed.length <= 100 && !saving;

    const handleSave = (): void => {
        if (canSave) {
            onSave(trimmed);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="[&>button]:hidden">
                <SheetHeader>
                    <SheetTitle>Rename Barn</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 pt-4">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        autoFocus
                        placeholder="Barn name"
                    />
                    <Button
                        className="w-full"
                        disabled={!canSave}
                        onClick={handleSave}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
