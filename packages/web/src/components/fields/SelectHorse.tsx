import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { GetHorsesQuery, GetHorsesQueryVariables } from '@/generated/graphql';

const GET_HORSES_QUERY = gql`
    query GetHorses {
        horses {
            id
            name
        }
    }
`;

export default function SelectHorse({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const { data, loading } = useQuery<GetHorsesQuery, GetHorsesQueryVariables>(
        GET_HORSES_QUERY
    );

    return (
        <Select value={value} onValueChange={onChange} disabled={loading}>
            <SelectTrigger>
                <SelectValue placeholder="Select a horse" />
            </SelectTrigger>
            <SelectContent>
                {data?.horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                        {horse.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
