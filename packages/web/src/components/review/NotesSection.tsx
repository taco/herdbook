import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface NotesSectionProps {
    notes: string | null;
    onEdit: () => void;
}

const MAX_LINES = 4;
const LINE_HEIGHT_PX = 24;
const COLLAPSED_HEIGHT = MAX_LINES * LINE_HEIGHT_PX;

export default function NotesSection({ notes, onEdit }: NotesSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const hasNotes = notes !== null && notes.trim().length > 0;

    // Estimate if notes exceed 4 lines (rough calculation)
    const estimatedLines = hasNotes ? Math.ceil(notes.length / 50) : 0;
    const needsExpand = estimatedLines > MAX_LINES;

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-base font-medium">Notes</span>
                <button
                    type="button"
                    onClick={onEdit}
                    className="text-sm text-primary font-medium"
                >
                    Edit
                </button>
            </div>
            <div
                className="relative bg-muted/50 rounded-lg p-3 cursor-pointer active:bg-muted transition-colors"
                onClick={onEdit}
            >
                {hasNotes ? (
                    <>
                        <div
                            className={`text-base leading-6 whitespace-pre-wrap break-words ${!expanded && needsExpand ? 'line-clamp-4' : ''}`}
                            style={
                                !expanded && needsExpand
                                    ? { maxHeight: COLLAPSED_HEIGHT }
                                    : undefined
                            }
                        >
                            {notes}
                        </div>
                        {needsExpand && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpanded(!expanded);
                                }}
                                className="flex items-center gap-1 text-sm text-primary font-medium mt-2"
                            >
                                {expanded ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" />
                                        Show less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" />
                                        Show more
                                    </>
                                )}
                            </button>
                        )}
                    </>
                ) : (
                    <span className="text-base text-muted-foreground/60">
                        No notes captured
                    </span>
                )}
            </div>
        </div>
    );
}
