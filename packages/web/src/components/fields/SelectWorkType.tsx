import { WorkType } from '@/generated/graphql';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const WORK_TYPE_OPTIONS: Array<{ value: WorkType; label: string }> = [
    { value: WorkType.Flatwork, label: 'Flatwork' },
    { value: WorkType.Groundwork, label: 'Groundwork' },
    { value: WorkType.InHand, label: 'In-hand' },
    { value: WorkType.Jumping, label: 'Jumping' },
    { value: WorkType.Trail, label: 'Trail' },
    { value: WorkType.Other, label: 'Other' },
];

export default function SelectWorkType({
    value,
    onChange,
    id,
}: {
    value: WorkType | null;
    onChange: (value: WorkType) => void;
    id: string;
}) {
    return (
        <Select value={value ?? ''} onValueChange={onChange}>
            <SelectTrigger id={id}>
                <SelectValue placeholder="Select a work type" />
            </SelectTrigger>
            <SelectContent>
                {WORK_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
