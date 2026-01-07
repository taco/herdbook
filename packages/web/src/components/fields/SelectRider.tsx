import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { GetRidersQuery, GetRidersQueryVariables } from '@/generated/graphql';

const GET_RIDERS_QUERY = gql`
    query GetRiders {
        riders {
            id
            name
        }
    }
`;

export default function SelectRider({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const { data, loading } = useQuery<GetRidersQuery, GetRidersQueryVariables>(
        GET_RIDERS_QUERY
    );

    return (
        <Select value={value} onValueChange={onChange} disabled={loading}>
            <SelectTrigger>
                <SelectValue placeholder="Select a rider" />
            </SelectTrigger>
            <SelectContent>
                {data?.riders.map((rider) => (
                    <SelectItem key={rider.id} value={rider.id}>
                        {rider.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
