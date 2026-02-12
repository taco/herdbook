import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { HorseCard } from '@/components/HorseCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import {
    GetHorsesListQuery,
    GetHorsesListQueryVariables,
} from '@/generated/graphql';

const HORSES_QUERY = gql`
    query GetHorsesList {
        horses {
            id
            name
            activity(weeks: 12) {
                weekStart
                count
            }
        }
    }
`;

export default function Horses() {
    const { data, loading, error } = useQuery<
        GetHorsesListQuery,
        GetHorsesListQueryVariables
    >(HORSES_QUERY);
    const { push } = useAppNavigate();

    if (loading)
        return <div className="p-4 text-center">Loading horses...</div>;
    if (error)
        return (
            <div className="p-4 text-center text-red-500">
                Error loading horses.
            </div>
        );

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">Horses</h1>
                <Button size="sm" onClick={() => push('/horses/new')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Horse
                </Button>
            </div>

            {data?.horses.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                    <p>No horses yet.</p>
                    <Button variant="link" onClick={() => push('/horses/new')}>
                        Add your first horse
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {data?.horses.map((horse) => (
                        <HorseCard key={horse.id} horse={horse} />
                    ))}
                </div>
            )}
        </div>
    );
}
