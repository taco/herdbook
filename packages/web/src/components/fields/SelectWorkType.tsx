import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { WorkType, WORK_TYPE_OPTIONS } from '@/lib/constants';

export default function SelectWorkType({
    value,
    onChange,
    id,
}: {
    value: WorkType | null;
    onChange: (value: WorkType) => void;
    id: string;
}) {
    const selectedOption = WORK_TYPE_OPTIONS.find((o) => o.value === value);

    return (
        <Select
            key={`${WORK_TYPE_OPTIONS.length}-${value ?? ''}`}
            value={value ?? ''}
            onValueChange={onChange}
        >
            <SelectTrigger id={id}>
                <SelectValue placeholder="Select a work type">
                    {selectedOption?.label}
                </SelectValue>
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
