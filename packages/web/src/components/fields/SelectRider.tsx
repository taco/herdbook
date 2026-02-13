import { useQuery } from '@apollo/client/react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { GetRidersQuery, GetRidersQueryVariables } from '@/generated/graphql';
import { GET_RIDERS_QUERY } from '@/lib/queries';

export default function SelectRider({
    value,
    onChange,
    id,
}: {
    value: string;
    onChange: (value: string) => void;
    id: string;
}) {
    const { data, loading } = useQuery<GetRidersQuery, GetRidersQueryVariables>(
        GET_RIDERS_QUERY
    );

    const riders = data?.riders ?? [];
    const selectedRider = riders.find((r) => r.id === value) ?? null;

    return (
        <Select
            key={`${loading ? 'loading' : 'loaded'}-${riders.length}-${value}`}
            value={value}
            onValueChange={onChange}
            disabled={loading}
        >
            <SelectTrigger id={id}>
                <SelectValue placeholder="Select a rider">
                    {selectedRider?.name}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {riders.map((rider) => (
                    <SelectItem key={rider.id} value={rider.id}>
                        {rider.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
