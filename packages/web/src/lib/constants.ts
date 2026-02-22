// Re-export WorkType and Intensity from generated GraphQL types (source: schema.graphql)
export { WorkType, Intensity } from '@/generated/graphql';
import { Intensity, WorkType } from '@/generated/graphql';

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
    [WorkType.Flatwork]: 'Flatwork',
    [WorkType.Jumping]: 'Jumping',
    [WorkType.Groundwork]: 'Groundwork',
    [WorkType.InHand]: 'In-hand',
    [WorkType.Trail]: 'Trail',
    [WorkType.Other]: 'Other',
};

export const WORK_TYPE_OPTIONS: Array<{ value: WorkType; label: string }> = [
    { value: WorkType.Flatwork, label: WORK_TYPE_LABELS[WorkType.Flatwork] },
    {
        value: WorkType.Groundwork,
        label: WORK_TYPE_LABELS[WorkType.Groundwork],
    },
    { value: WorkType.InHand, label: WORK_TYPE_LABELS[WorkType.InHand] },
    { value: WorkType.Jumping, label: WORK_TYPE_LABELS[WorkType.Jumping] },
    { value: WorkType.Trail, label: WORK_TYPE_LABELS[WorkType.Trail] },
    { value: WorkType.Other, label: WORK_TYPE_LABELS[WorkType.Other] },
];

export const getWorkTypeLabel = (workType: string): string => {
    return WORK_TYPE_LABELS[workType as WorkType] || workType;
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
    [Intensity.Light]: 'Light',
    [Intensity.Moderate]: 'Mod',
    [Intensity.Hard]: 'Hard',
    [Intensity.VeryHard]: 'V.Hard',
};

export const INTENSITY_FULL_LABELS: Record<Intensity, string> = {
    [Intensity.Light]: 'Light',
    [Intensity.Moderate]: 'Moderate',
    [Intensity.Hard]: 'Hard',
    [Intensity.VeryHard]: 'Very Hard',
};

export const getIntensityLabel = (intensity: string): string => {
    return INTENSITY_FULL_LABELS[intensity as Intensity] || intensity;
};
