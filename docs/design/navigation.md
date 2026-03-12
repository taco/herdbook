# Navigation & Page Architecture

This document defines the navigation patterns, layout system, and UI conventions used across the app. All new pages should follow these standards.

## Two Layout Types

Every authenticated route renders inside one of two layouts. Choose based on the page's role:

| Layout               | When to Use                                             | Has Tab Bar | Has Back Button       | Example Routes                                                          |
| -------------------- | ------------------------------------------------------- | ----------- | --------------------- | ----------------------------------------------------------------------- |
| **TabLayout**        | Top-level browsing destinations                         | Yes (z-30)  | No                    | `/`, `/horses`, `/riders`, `/profile`                                   |
| **FullScreenLayout** | Drill-in pages, create flows, and immersive full-screen | No          | Page provides its own | `/sessions/:id`, `/horses/:id/edit`, `/sessions/new`, `/sessions/voice` |

### When to route vs. use local state

- **Use a route** when the destination has its own URL identity — something a user could deep-link to or navigate back to (e.g., viewing a session, editing a horse).
- **Use local state** when toggling between modes on the _same_ resource — the URL doesn't change (e.g., flipping from view to edit on SessionDetail via `isEditing`).

Rule of thumb: if the user presses the back button, should they leave this page? If yes, it's a route. If they should stay on the page but dismiss something, it's local state.

## Navigation with View Transitions

Page transitions use the browser's **View Transitions API** via `document.startViewTransition()`. The `useAppNavigate` hook wraps `useNavigate()` to provide direction-aware transitions:

```tsx
import { useAppNavigate } from '@/hooks/useAppNavigate';

const { push, back, backTo, navigate } = useAppNavigate();

push('/sessions/123'); // slide forward (new page slides in from right)
back(); // slide back to previous page (current page slides out to right)
backTo('/'); // dismiss to a specific route (back animation — use after saves/deletes)
navigate('/'); // instant navigation (no transition — only for auth redirects)
```

### How it works

1. `push()` / `back()` / `backTo()` set a `data-transition` attribute on `<html>` and call `document.startViewTransition()`.
2. CSS in `index.css` targets `::view-transition-old(root)` and `::view-transition-new(root)` pseudo-elements based on the `data-transition` attribute.
3. Tab switches use the BottomTabBar's own `navigate()` (no transition).

### Graceful degradation

On browsers without View Transitions API support, `viewTransition: true` is ignored — navigation happens instantly with no animation, no crash, no fallback code needed.

## Page Header Pattern

Every full-screen page must render its own inline header. Do not rely on the layout for navigation chrome.

```tsx
<div className="flex items-center gap-2 p-4 border-b">
    <Button
        variant="ghost"
        size="icon"
        onClick={back}
        className="h-10 w-10"
        aria-label="Go back"
    >
        <ChevronLeft className="h-6 w-6" />
    </Button>
    <h1 className="text-lg font-semibold flex-1">{title}</h1>
    {/* Optional: subtle action button */}
    <Button variant="ghost" size="sm" className="text-primary">
        <Edit className="mr-1.5 h-4 w-4" />
        Edit
    </Button>
</div>
```

### Guidelines

- Back button is always the leftmost element, 10x10 touch target, `aria-label="Go back"`.
- Title is `text-lg font-semibold`.
- Optional actions go on the right side. Keep them subtle — `variant="ghost"` and `size="sm"`. Header actions are for secondary operations (edit, share, settings), not primary CTAs.
- Primary CTAs (Save, Create, Delete) go in the page body, not the header.
- The header has `border-b` for visual separation.

## Back Button Behavior

There are two back patterns. Use the right one:

### `back()` — leaving a full-screen page

Calls `useAppNavigate().back()` which triggers a slide-back view transition and navigates to the previous page.

```tsx
const { back } = useAppNavigate();
// In back button onClick:
onClick = { back };
```

### `setState(false)` — dismissing an overlay within a page

Sets local state to close an overlay. Does not navigate. The URL stays the same.

```tsx
// SessionDetail: closing the edit overlay
onClick={() => setIsEditing(false)}
```

### After a successful save

- **Create flows** (`/sessions/new`, `/horses/new`): Dismiss to dashboard with `backTo('/')`. The page slides out to the right.
- **Edit overlays** (editing within a detail page): Close the overlay with `setState(false)`. Stay on the detail page so the user sees their changes.
- **Delete actions**: Dismiss to dashboard with `backTo('/')` after deletion.

## View/Edit Cascade Pattern

For resource detail pages, use the view/edit cascade: a read-only detail view with an edit overlay that slides in on top.

### Structure

```
SessionDetail (route: /sessions/:id)
├── Detail view (read-only, always rendered)
│   ├── Inline header with back + Edit action
│   └── Resource details
└── Edit overlay (fixed inset-0 z-50, conditionally rendered)
    ├── Controlled by isEditing state
    ├── Slides via translate-x-0 / translate-x-full
    └── Contains <SharedEditor /> component
```

### Key rules

- The edit overlay is a `fixed inset-0 z-50` div with CSS transform transition, not a separate route.
- Use `translate-x-0` when active, `translate-x-full` when hidden, with `transition-transform duration-300 ease-out`.
- Only render the editor component when `isEditing` is true (conditional rendering inside the transform wrapper).
- The Edit button in the header is subtle: `variant="ghost" size="sm"`.
- Delete functionality lives inside the edit overlay as a destructive button with an `AlertDialog` confirmation.

### CSS for the edit overlay

```tsx
<div
    className={cn(
        'fixed inset-0 z-50 bg-background transform transition-transform duration-300 ease-out',
        isEditing ? 'translate-x-0' : 'translate-x-full'
    )}
>
    {isEditing && <Editor ... />}
</div>
```

## Drawer-Based Editing (SummaryRow + FieldEditSheet)

For forms with multiple fields, use the drawer pattern instead of traditional form inputs. This is the standard for create and edit flows.

### Components

- **SummaryRow**: Displays a field label and current value. Tapping opens the field editor. Has `aria-label={`Edit ${label}`}` for accessibility and e2e testing.
- **FieldEditSheet**: A bottom sheet (Radix `Sheet` with `side="bottom"`) that renders the appropriate input for the field type.
- **NotesSection**: Specialized display for notes with expand/collapse. Has `aria-label="Edit Notes"` on the edit button.

### How it works

1. Page renders a list of `SummaryRow` components showing current values.
2. Tapping a row opens `FieldEditSheet` for that field.
3. For select-type fields (horse, rider, work type): selection saves immediately and closes the sheet.
4. For input-type fields (duration, date, notes): user edits and taps "Done" to save and close.
5. All field state lives in the parent component. The sheet calls `onSave()` to push values up.

### Creating a shared editor component

When the same form is used for both create and edit (like sessions), extract a shared editor:

```tsx
interface MyEditorProps {
    initialValues: MyValues;
    onSave: (values: MyValues) => void;
    onBack: () => void;
    title: string;
    saving: boolean;
    extraActions?: React.ReactNode; // e.g., delete button for edit mode
}
```

The `extraActions` prop allows the edit flow to inject a delete button without the create flow knowing about it.

## Animations

### Page transitions (View Transitions API)

| Direction | Duration | Easing   | Effect                                            |
| --------- | -------- | -------- | ------------------------------------------------- |
| Forward   | 300ms    | ease-out | New page slides in from right, old slides left    |
| Back      | 250ms    | ease-in  | Current page slides out to right, old slides back |

Exit is slightly faster than enter (250ms vs 300ms) for snappy feel. All transitions are disabled when `prefers-reduced-motion: reduce` is set.

### Edit overlay transitions (CSS transitions)

The view-to-edit cascade uses CSS transitions (not keyframes):

```
transition-transform duration-300 ease-out
translate-x-0 (visible) ↔ translate-x-full (hidden)
```

## Data Flow Between Pages

### Route params — identifying a resource

```tsx
const { id } = useParams<{ id: string }>();
```

Use for: detail pages, edit pages. The ID is the resource identifier.

### Location state — prefilling a create form

```tsx
push('/sessions/new', { state: { prefill: { horseId, workType, ... } } });
```

Use for: passing structured data from one page to a create form (e.g., voice capture results). The receiving page reads `location.state` and merges with defaults.

### localStorage — remembering preferences

```tsx
localStorage.getItem('createSession'); // last-used horse, duration, workType
```

Use for: persisting user preferences across create flows. Merged with location state (location state takes priority).

### Apollo cache — mutation side effects

After mutations, evict affected cache fields so queries refetch:

```tsx
update(cache) {
    cache.evict({ fieldName: 'sessions' });
    cache.evict({ fieldName: 'session' });
    cache.gc();
}
```

## Accessibility Standards

These labels are used by both screen readers and e2e tests. Follow them consistently.

| Element              | aria-label              | Notes                               |
| -------------------- | ----------------------- | ----------------------------------- |
| Back button (header) | `"Go back"`             | Every full-screen page header       |
| SummaryRow           | `` `Edit ${label}` ``   | e.g., "Edit Horse", "Edit Duration" |
| Notes edit button    | `"Edit Notes"`          | In NotesSection component           |
| Delete confirmation  | Uses `alertdialog` role | Radix AlertDialog handles this      |

## Mobile Conventions

- Use `min-h-dvh` (dynamic viewport height) instead of `min-h-screen` to account for mobile browser chrome.
- Touch targets: minimum 44x44px (enforced with `h-10 w-10` or `min-h-[52px]`).
- Safe area: tab bar uses `pb-[env(safe-area-inset-bottom)]` for iPhone notch.
- Active states: use `active:bg-muted/50` or `active:scale-[0.98]` for touch feedback.
- Bottom sheets: `max-h-[80vh] overflow-auto` to prevent sheets from covering the full screen.

## E2E Testing Patterns for Navigation

When writing e2e tests for full-screen pages:

- **Ambiguous elements**: After closing an edit overlay, both the detail header and the (still-in-DOM) overlay may have matching elements. Use `.first()` to target the visible one.
- **Field editing helpers**: Use `aria-label` selectors to open field editors:
    ```ts
    await page.getByLabel('Edit Horse').click();
    await page.getByRole('dialog').getByText('Option').click();
    ```
- **Sheet auto-close**: Select-type fields close the sheet automatically. Assert `await expect(sheet).not.toBeVisible()` after selection.
- **Input-type fields**: Fill the input and click the "Done" button, then assert the sheet closed.

## Checklist for New Pages

- [ ] Decide: TabLayout (browsing) or FullScreenLayout (drill-in / immersive)?
- [ ] Add route to the appropriate layout group in `App.tsx`
- [ ] Render inline header with back button (`aria-label="Go back"`)
- [ ] Use `useAppNavigate().back()` for back navigation
- [ ] Use `useAppNavigate().push()` for forward navigation to sub-pages
- [ ] For detail pages: implement view/edit cascade with `isEditing` state
- [ ] For forms: use SummaryRow + FieldEditSheet drawer pattern
- [ ] Extract shared editor if form is used in both create and edit
- [ ] Use `min-h-dvh flex flex-col` for full-height layout
- [ ] Ensure all interactive elements have 44x44px touch targets
- [ ] Add `aria-label` attributes for e2e testability
- [ ] After mutations: evict relevant Apollo cache fields
