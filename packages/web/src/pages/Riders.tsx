import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { GetRidersQuery, GetRidersQueryVariables } from '@/generated/graphql';

const RIDERS_QUERY = gql`
    query GetRiders {
        riders {
            id
            name
        }
    }
`;

export default function Riders() {
    const { data, loading, error } = useQuery<
        GetRidersQuery,
        GetRidersQueryVariables
    >(RIDERS_QUERY);

    if (loading)
        return <div className="p-4 text-center">Loading riders...</div>;
    if (error)
        return (
            <div className="p-4 text-center text-red-500">
                Error loading riders.
            </div>
        );

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-lg font-semibold">Riders</h1>

            {data?.riders.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                    <p>No riders yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {data?.riders.map((rider) => (
                        <div
                            key={rider.id}
                            className="flex items-center p-3 rounded-lg border bg-card"
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-medium mr-3">
                                {rider.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{rider.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
