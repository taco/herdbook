import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Calendar, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import FilterChip from '@/components/ui/FilterChip';
import PickerSheet from '@/components/ui/PickerSheet';
import ActivityCard from '@/components/ActivityCard';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import useSessionFilters, { type DatePreset } from '@/hooks/useSessionFilters';
import { WorkType, WORK_TYPE_LABELS } from '@/lib/constants';
import { GET_HORSES_QUERY } from '@/lib/queries';
import type {
    GetHorsesQuery,
    GetHorsesQueryVariables,
} from '@/generated/graphql';

const PAGE_SIZE = 20;

const SESSIONS_QUERY = gql`
    query GetSessions(
        $limit: Int
        $offset: Int
        $horseId: ID
        $workType: WorkType
        $dateFrom: DateTime
        $dateTo: DateTime
    ) {
        sessions(
            limit: $limit
            offset: $offset
            horseId: $horseId
            workType: $workType
            dateFrom: $dateFrom
            dateTo: $dateTo
        ) {
            id
            date
            durationMinutes
            workType
            notes
            horse {
                name
            }
            rider {
                name
            }
        }
    }
`;

interface SessionItem {
    id: string;
    date: string;
    durationMinutes: number;
    workType: string;
    notes: string;
    horse: { name: string };
    rider: { name: string };
}

interface SessionsData {
    sessions: SessionItem[];
}

type FilterSheet = 'horse' | 'workType' | 'dateRange' | null;

const WORK_TYPE_ITEMS = Object.values(WorkType).map((wt) => ({
    key: wt,
    label: WORK_TYPE_LABELS[wt],
}));

const DATE_PRESET_ITEMS: Array<{
    key: DatePreset;
    label: string;
    icon: React.ReactNode;
}> = [
    {
        key: 'thisWeek',
        label: 'This week',
        icon: <Calendar className="w-4 h-4 text-muted-foreground" />,
    },
    {
        key: 'thisMonth',
        label: 'This month',
        icon: <Calendar className="w-4 h-4 text-muted-foreground" />,
    },
    {
        key: 'last30Days',
        label: 'Last 30 days',
        icon: <Calendar className="w-4 h-4 text-muted-foreground" />,
    },
];

function SessionSkeleton(): React.ReactNode {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-md" />
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-full rounded-md" />
            </CardContent>
        </Card>
    );
}

export default function Sessions(): React.ReactNode {
    const { push } = useAppNavigate();
    const filters = useSessionFilters();
    const [openSheet, setOpenSheet] = useState<FilterSheet>(null);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const { data: horsesData } = useQuery<
        GetHorsesQuery,
        GetHorsesQueryVariables
    >(GET_HORSES_QUERY);

    const horses = horsesData?.horses ?? [];

    const { data, loading, fetchMore } = useQuery<SessionsData>(
        SESSIONS_QUERY,
        {
            variables: {
                limit: PAGE_SIZE,
                offset: 0,
                ...filters.queryVariables,
            },
        }
    );

    const sessions = data?.sessions ?? [];
    const hasMore = sessions.length > 0 && sessions.length % PAGE_SIZE === 0;

    const handleLoadMore = (): void => {
        fetchMore({
            variables: {
                limit: PAGE_SIZE,
                offset: sessions.length,
                ...filters.queryVariables,
            },
            updateQuery(prev, { fetchMoreResult }) {
                if (!fetchMoreResult) return prev;
                return {
                    sessions: [...prev.sessions, ...fetchMoreResult.sessions],
                };
            },
        });
    };

    const handleCustomDateApply = (): void => {
        if (customFrom && customTo) {
            filters.setDateRange({
                kind: 'custom',
                from: customFrom,
                to: customTo,
            });
            setOpenSheet(null);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-lg font-semibold">Sessions</h1>

            {/* Filter chip bar */}
            <div
                className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1"
                style={{
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <FilterChip
                    label="Horse"
                    activeLabel={filters.horseLabel}
                    isActive={filters.horse !== null}
                    onPress={() => setOpenSheet('horse')}
                    onClear={() => filters.setHorse(null)}
                />
                <FilterChip
                    label="Work type"
                    activeLabel={filters.workTypeLabel}
                    isActive={filters.workType !== null}
                    onPress={() => setOpenSheet('workType')}
                    onClear={() => filters.setWorkType(null)}
                />
                <FilterChip
                    label="Date"
                    activeLabel={filters.dateRangeLabel}
                    isActive={filters.dateRange !== null}
                    onPress={() => setOpenSheet('dateRange')}
                    onClear={() => filters.setDateRange(null)}
                />
            </div>

            {loading ? (
                <div className="space-y-3">
                    <SessionSkeleton />
                    <SessionSkeleton />
                    <SessionSkeleton />
                </div>
            ) : sessions.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 space-y-3">
                    {filters.hasActiveFilters ? (
                        <>
                            <SlidersHorizontal className="w-8 h-8 mx-auto opacity-40" />
                            <p>No sessions match your filters.</p>
                        </>
                    ) : (
                        <p>No sessions yet.</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <ActivityCard
                            key={session.id}
                            session={session}
                            onClick={() => push(`/sessions/${session.id}`)}
                        />
                    ))}

                    {hasMore && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleLoadMore}
                        >
                            Load more
                        </Button>
                    )}
                </div>
            )}

            {/* Horse filter */}
            <PickerSheet
                open={openSheet === 'horse'}
                onOpenChange={(open) => !open && setOpenSheet(null)}
                title="Filter by Horse"
                items={horses.map((h) => ({ key: h.id, label: h.name }))}
                selectedKey={filters.horse?.id ?? null}
                onSelect={(key) => {
                    const horse = horses.find((h) => h.id === key);
                    if (horse)
                        filters.setHorse({ id: horse.id, name: horse.name });
                    setOpenSheet(null);
                }}
            />

            {/* Work type filter */}
            <PickerSheet
                open={openSheet === 'workType'}
                onOpenChange={(open) => !open && setOpenSheet(null)}
                title="Filter by Work Type"
                items={WORK_TYPE_ITEMS}
                selectedKey={filters.workType}
                onSelect={(key) => {
                    filters.setWorkType(key as WorkType);
                    setOpenSheet(null);
                }}
            />

            {/* Date range filter */}
            <PickerSheet
                open={openSheet === 'dateRange'}
                onOpenChange={(open) => !open && setOpenSheet(null)}
                title="Filter by Date"
                items={DATE_PRESET_ITEMS}
                selectedKey={
                    filters.dateRange?.kind === 'preset'
                        ? filters.dateRange.preset
                        : null
                }
                onSelect={(key) => {
                    filters.setDateRange({
                        kind: 'preset',
                        preset: key as DatePreset,
                    });
                    setOpenSheet(null);
                }}
            >
                {/* Custom date range */}
                <div className="my-4 border-t border-border" />
                <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground px-1">
                        Custom range
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="date-from"
                                className="text-xs text-muted-foreground px-1"
                            >
                                From
                            </label>
                            <Input
                                id="date-from"
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label
                                htmlFor="date-to"
                                className="text-xs text-muted-foreground px-1"
                            >
                                To
                            </label>
                            <Input
                                id="date-to"
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleCustomDateApply}
                        className="w-full"
                        disabled={!customFrom || !customTo}
                    >
                        Apply range
                    </Button>
                </div>
            </PickerSheet>
        </div>
    );
}
