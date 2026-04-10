import PickerSheet from '@/components/ui/PickerSheet';

import { FieldSheetProps } from './types';

interface RiderPickerSheetProps extends FieldSheetProps<string | null> {
    riders: ReadonlyArray<{ id: string; name: string }>;
}

export default function RiderPickerSheet({
    open,
    onOpenChange,
    value,
    onSave,
    riders,
}: RiderPickerSheetProps) {
    return (
        <PickerSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Select Rider"
            items={riders.map((r) => ({ key: r.id, label: r.name }))}
            selectedKey={value}
            onSelect={onSave}
        />
    );
}
