import { Check } from 'lucide-react';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

export interface PickerSheetItem {
    key: string;
    label: string;
    icon?: React.ReactNode;
}

interface PickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    items: PickerSheetItem[];
    selectedKey: string | null;
    onSelect: (key: string) => void;
    children?: React.ReactNode;
}

export default function PickerSheet({
    open,
    onOpenChange,
    title,
    items,
    selectedKey,
    onSelect,
    children,
}: PickerSheetProps): React.ReactNode {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-auto">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="space-y-1 mt-4">
                    {items.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onSelect(item.key)}
                            className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted active:bg-muted transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                {item.icon}
                                <span className="text-base">{item.label}</span>
                            </div>
                            {selectedKey === item.key && (
                                <Check className="h-5 w-5 text-primary" />
                            )}
                        </button>
                    ))}
                </div>
                {children}
            </SheetContent>
        </Sheet>
    );
}
