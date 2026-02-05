// Re-export WorkType from generated GraphQL types (source: schema.graphql)
export { WorkType } from '@/generated/graphql';
import { WorkType } from '@/generated/graphql';

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
    [WorkType.Flatwork]: 'Flatwork',
    [WorkType.Jumping]: 'Jumping',
    [WorkType.Groundwork]: 'Groundwork',
    [WorkType.InHand]: 'In Hand',
    [WorkType.Trail]: 'Trail',
    [WorkType.Other]: 'Other',
};

export const getWorkTypeLabel = (workType: string): string => {
    return WORK_TYPE_LABELS[workType as WorkType] || workType;
};
