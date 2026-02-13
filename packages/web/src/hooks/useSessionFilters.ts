import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { WorkType, WORK_TYPE_LABELS } from '@/lib/constants';

// --- Date range types ---

export type DatePreset = 'thisWeek' | 'thisMonth' | 'last30Days';

export type DateRangeValue =
    | { kind: 'preset'; preset: DatePreset }
    | { kind: 'custom'; from: string; to: string };

const DATE_PRESETS: DatePreset[] = ['thisWeek', 'thisMonth', 'last30Days'];

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
    thisWeek: 'This week',
    thisMonth: 'This month',
    last30Days: 'Last 30 days',
};

function isDatePreset(value: string): value is DatePreset {
    return (DATE_PRESETS as string[]).includes(value);
}

function resolveDateRange(value: DateRangeValue): {
    dateFrom: string;
    dateTo: string;
} {
    if (value.kind === 'custom') {
        return {
            dateFrom: new Date(value.from).toISOString(),
            dateTo: new Date(`${value.to}T23:59:59`).toISOString(),
        };
    }

    const now = new Date();
    const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
    );

    let start: Date;

    switch (value.preset) {
        case 'thisWeek': {
            const day = now.getDay();
            const diff = day === 0 ? 6 : day - 1; // Monday = start of week
            start = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - diff
            );
            break;
        }
        case 'thisMonth':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'last30Days':
            start = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 30
            );
            break;
    }

    return {
        dateFrom: start.toISOString(),
        dateTo: endOfToday.toISOString(),
    };
}

// --- Horse filter type ---

export interface HorseFilter {
    id: string;
    name: string;
}

// --- Hook return type ---

interface SessionFiltersResult {
    horse: HorseFilter | null;
    workType: WorkType | null;
    dateRange: DateRangeValue | null;

    queryVariables: {
        horseId?: string;
        workType?: WorkType;
        dateFrom?: string;
        dateTo?: string;
    };

    horseLabel: string | null;
    workTypeLabel: string | null;
    dateRangeLabel: string | null;

    setHorse: (horse: HorseFilter | null) => void;
    setWorkType: (type: WorkType | null) => void;
    setDateRange: (range: DateRangeValue | null) => void;

    hasActiveFilters: boolean;
}

// --- Read filters from URL search params ---

function parseHorse(params: URLSearchParams): HorseFilter | null {
    const id = params.get('horseId');
    const name = params.get('horseName');
    return id && name ? { id, name } : null;
}

function parseWorkType(params: URLSearchParams): WorkType | null {
    const raw = params.get('workType');
    if (raw && Object.values(WorkType).includes(raw as WorkType)) {
        return raw as WorkType;
    }
    return null;
}

function parseDateRange(params: URLSearchParams): DateRangeValue | null {
    const preset = params.get('datePreset');
    if (preset && isDatePreset(preset)) {
        return { kind: 'preset', preset };
    }
    const from = params.get('dateFrom');
    const to = params.get('dateTo');
    if (from && to) {
        return { kind: 'custom', from, to };
    }
    return null;
}

export default function useSessionFilters(): SessionFiltersResult {
    const [searchParams, setSearchParams] = useSearchParams();

    // Derive filter state from URL
    const horse = useMemo(() => parseHorse(searchParams), [searchParams]);
    const workType = useMemo(() => parseWorkType(searchParams), [searchParams]);
    const dateRange = useMemo(
        () => parseDateRange(searchParams),
        [searchParams]
    );

    // Helper: update params with replace (don't push history entries for filter changes)
    const updateParams = useCallback(
        (updater: (prev: URLSearchParams) => URLSearchParams) => {
            setSearchParams(
                (prev) => {
                    return updater(new URLSearchParams(prev));
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const setHorse = useCallback(
        (h: HorseFilter | null) => {
            updateParams((p) => {
                if (h) {
                    p.set('horseId', h.id);
                    p.set('horseName', h.name);
                } else {
                    p.delete('horseId');
                    p.delete('horseName');
                }
                return p;
            });
        },
        [updateParams]
    );

    const setWorkType = useCallback(
        (wt: WorkType | null) => {
            updateParams((p) => {
                if (wt) {
                    p.set('workType', wt);
                } else {
                    p.delete('workType');
                }
                return p;
            });
        },
        [updateParams]
    );

    const setDateRange = useCallback(
        (dr: DateRangeValue | null) => {
            updateParams((p) => {
                p.delete('datePreset');
                p.delete('dateFrom');
                p.delete('dateTo');
                if (dr) {
                    if (dr.kind === 'preset') {
                        p.set('datePreset', dr.preset);
                    } else {
                        p.set('dateFrom', dr.from);
                        p.set('dateTo', dr.to);
                    }
                }
                return p;
            });
        },
        [updateParams]
    );

    const queryVariables = useMemo(() => {
        const vars: SessionFiltersResult['queryVariables'] = {};
        if (horse) vars.horseId = horse.id;
        if (workType) vars.workType = workType;
        if (dateRange) {
            const resolved = resolveDateRange(dateRange);
            vars.dateFrom = resolved.dateFrom;
            vars.dateTo = resolved.dateTo;
        }
        return vars;
    }, [horse, workType, dateRange]);

    const horseLabel = horse?.name ?? null;
    const workTypeLabel = workType ? WORK_TYPE_LABELS[workType] : null;

    const dateRangeLabel = useMemo(() => {
        if (!dateRange) return null;
        if (dateRange.kind === 'preset') {
            return DATE_PRESET_LABELS[dateRange.preset];
        }
        const from = new Date(dateRange.from);
        const to = new Date(dateRange.to);
        const fmt = (d: Date): string =>
            d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `${fmt(from)} – ${fmt(to)}`;
    }, [dateRange]);

    const hasActiveFilters =
        horse !== null || workType !== null || dateRange !== null;

    return {
        horse,
        workType,
        dateRange,
        queryVariables,
        horseLabel,
        workTypeLabel,
        dateRangeLabel,
        setHorse,
        setWorkType,
        setDateRange,
        hasActiveFilters,
    };
}
