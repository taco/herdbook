import { useQuery } from '@apollo/client/react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { GetHorsesQuery, GetHorsesQueryVariables } from '@/generated/graphql';
import { GET_HORSES_QUERY } from '@/lib/queries';

export default function SelectHorse({
    value,
    onChange,
    id,
}: {
    value: string;
    onChange: (value: string) => void;
    id: string;
}) {
    const { data, loading } = useQuery<GetHorsesQuery, GetHorsesQueryVariables>(
        GET_HORSES_QUERY
    );

    const horses = data?.horses ?? [];
    const selectedHorse = horses.find((h) => h.id === value) ?? null;

    return (
        <Select
            key={`${loading ? 'loading' : 'loaded'}-${horses.length}-${value}`}
            value={value}
            onValueChange={onChange}
            disabled={loading}
        >
            <SelectTrigger id={id}>
                <SelectValue placeholder="Select a horse">
                    {selectedHorse?.name}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                        {horse.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
