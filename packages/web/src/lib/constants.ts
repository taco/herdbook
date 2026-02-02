export enum WorkType {
    FLATWORK = 'FLATWORK',
    JUMPING = 'JUMPING',
    GROUNDWORK = 'GROUNDWORK',
    IN_HAND = 'IN_HAND',
    TRAIL = 'TRAIL',
    OTHER = 'OTHER',
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
    [WorkType.FLATWORK]: 'Flatwork',
    [WorkType.JUMPING]: 'Jumping',
    [WorkType.GROUNDWORK]: 'Groundwork',
    [WorkType.IN_HAND]: 'In Hand',
    [WorkType.TRAIL]: 'Trail',
    [WorkType.OTHER]: 'Other',
};

export const getWorkTypeLabel = (workType: string): string => {
    return WORK_TYPE_LABELS[workType as WorkType] || workType;
};
