import { useState } from 'react';

import { FieldSheetProps } from '@/components/fields/sheets/types';

interface FieldEditor<F extends string> {
    editField: (field: F) => void;
    sheetProps: <T>(
        field: F,
        config: {
            value: T;
            onSave: (value: T) => void;
        }
    ) => FieldSheetProps<T>;
}

/**
 * Tracks which field is currently being edited and produces the props for
 * the sheet that edits it. Sheets are opened via `editField`; the hook
 * handles closing automatically on save and on dismiss.
 */
export function useFieldEditor<F extends string>(): FieldEditor<F> {
    const [editingField, setEditingField] = useState<F | null>(null);

    const editField = (field: F): void => {
        setEditingField(field);
    };

    const sheetProps = <T>(
        field: F,
        { value, onSave }: { value: T; onSave: (value: T) => void }
    ): FieldSheetProps<T> => ({
        open: editingField === field,
        // Sheets are opened via editField(); we only handle the dismiss case.
        onOpenChange: (open) => {
            if (!open) {
                setEditingField(null);
            }
        },
        value,
        onSave: (next) => {
            onSave(next);
            setEditingField(null);
        },
    });

    return { editField, sheetProps };
}
