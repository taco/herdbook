import PickerSheet from '@/components/ui/PickerSheet';

import { FieldSheetProps } from './types';

interface HorsePickerSheetProps extends FieldSheetProps<string | null> {
    horses: ReadonlyArray<{ id: string; name: string }>;
}

export default function HorsePickerSheet({
    open,
    onOpenChange,
    value,
    onSave,
    horses,
}: HorsePickerSheetProps) {
    return (
        <PickerSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Select Horse"
            items={horses.map((h) => ({ key: h.id, label: h.name }))}
            selectedKey={value}
            onSelect={onSave}
        />
    );
}
