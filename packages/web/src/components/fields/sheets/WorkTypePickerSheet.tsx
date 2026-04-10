import PickerSheet from '@/components/ui/PickerSheet';
import { WorkType } from '@/generated/graphql';
import { WORK_TYPE_OPTIONS } from '@/lib/constants';

import { FieldSheetProps } from './types';

export default function WorkTypePickerSheet({
    open,
    onOpenChange,
    value,
    onSave,
}: FieldSheetProps<WorkType | null>) {
    return (
        <PickerSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Select Work Type"
            items={WORK_TYPE_OPTIONS.map(({ value, label }) => ({
                key: value,
                label,
            }))}
            selectedKey={value}
            onSelect={(key) => onSave(key as WorkType)}
        />
    );
}
