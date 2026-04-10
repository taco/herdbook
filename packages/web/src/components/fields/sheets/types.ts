export interface FieldSheetProps<T> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: T;
    onSave: (value: T) => void;
}
