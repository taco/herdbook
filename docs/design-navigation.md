# Navigation & Page Architecture

This document defines the navigation patterns, layout system, and UI conventions used across the app. All new pages should follow these standards.

## Three Layout Types

Every authenticated route renders inside one of three layouts. Choose based on the page's role:

| Layout               | When to Use                              | Has Tab Bar           | Has Back Button       | Example Routes                                       |
| -------------------- | ---------------------------------------- | --------------------- | --------------------- | ---------------------------------------------------- |
| **TabLayout**        | Top-level browsing destinations          | Yes (z-30)            | No                    | `/`, `/horses`, `/riders`, `/profile`                |
| **SubPageLayout**    | Drilling into a resource or creating one | No (slides over tabs) | Page provides its own | `/sessions/:id`, `/horses/:id/edit`, `/sessions/new` |
| **FullScreenLayout** | Immersive flows that own all chrome      | No                    | Page provides its own | `/sessions/voice`                                    |

### When to route vs. use local state

- **Use a route** when the destination has its own URL identity — something a user could deep-link to or navigate back to (e.g., viewing a session, editing a horse).
- **Use local state** when toggling between modes on the _same_ resource — the URL doesn't change (e.g., flipping from view to edit on SessionDetail via `isEditing`).

Rule of thumb: if the user presses the back button, should they leave this page? If yes, it's a route. If they should stay on the page but dismiss something, it's local state.

## Sub-Page Overlay System

Sub-pages are the most common pattern for any "drill-in" page. They slide in from the right over the tab content with a parallax background effect.

### How it works

1. `App.tsx` uses `SUB_PAGE_PATTERN` regex to detect sub-page routes.
2. When a sub-page is active, the tab content becomes a fixed background with parallax animation.
3. The sub-page renders in a `fixed inset-0 z-20` overlay with a slide-in animation.
4. A dim layer (`z-10`, 8% opacity black) sits between background and overlay.

### Adding a new sub-page route

1. Add the route inside the `<SubPageLayout>` group in `App.tsx`.
2. Update `SUB_PAGE_PATTERN` regex to match the new path.
3. If the path contains a dynamic segment that could collide with a static segment (like `sessions/voice` vs `sessions/:id`), use a negative lookahead: `sessions\/(?!voice$)[^/]+`.

### Z-index layers

```
z-0   Background (tab routes with parallax)
z-10  Dim overlay (pointer-events-none)
z-20  Sub-page overlay (slides in from right)
z-30  Tab bar (always on top, even behind sub-page since it's in background)
z-50  Edit overlays within sub-pages (fixed inset-0)
```

## Page Header Pattern

Every sub-page must render its own inline header. Do not rely on the layout for navigation chrome.

```tsx
<div className="flex items-center gap-2 p-4 border-b">
    <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
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

### `triggerExit()` — leaving a sub-page

Calls `useSlideTransition().triggerExit` which triggers the exit animation, then navigates back after the animation completes. Use this when the user is leaving the sub-page entirely.

```tsx
const { triggerExit } = useSlideTransition();
// In back button onClick:
onClick = { triggerExit };
```

### `setState(false)` — dismissing an overlay within a sub-page

Sets local state to close an overlay. Does not navigate. The URL stays the same.

```tsx
// SessionDetail: closing the edit overlay
onClick={() => setIsEditing(false)}
```

### After a successful save

- **Create flows** (`/sessions/new`, `/horses/new`): Navigate to dashboard with `navigate('/')`. Skip triggerExit since the user is done with the flow.
- **Edit overlays** (editing within a detail page): Close the overlay with `setState(false)`. Stay on the detail page so the user sees their changes.
- **Delete actions**: Navigate to dashboard with `navigate('/')` after deletion.

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

### Sub-page transitions (CSS keyframes in index.css)

| Animation         | Duration | Easing   | Purpose                              |
| ----------------- | -------- | -------- | ------------------------------------ |
| `slide-in-right`  | 300ms    | ease-out | Overlay enters from right            |
| `slide-out-right` | 250ms    | ease-in  | Overlay exits to right               |
| `parallax-push`   | 300ms    | ease-out | Background recedes (-8%, scale 0.94) |
| `parallax-return` | 250ms    | ease-in  | Background returns to normal         |
| `dim-in`          | 300ms    | ease-out | Dim layer fades to 8%                |
| `dim-out`         | 250ms    | ease-in  | Dim layer fades out                  |

Exit is slightly faster than enter (250ms vs 300ms) for snappy feel.

### Edit overlay transitions (CSS transitions)

The view-to-edit cascade uses CSS transitions (not keyframes):

```
transition-transform duration-300 ease-out
translate-x-0 (visible) ↔ translate-x-full (hidden)
```

### Reduced motion

All animations are disabled when `prefers-reduced-motion: reduce` is set. The `@media` query in `index.css` removes all keyframe animations, and `App.tsx` checks the media query at mount to skip the animation state machine entirely.

## Data Flow Between Pages

### Route params — identifying a resource

```tsx
const { id } = useParams<{ id: string }>();
```

Use for: detail pages, edit pages. The ID is the resource identifier.

### Location state — prefilling a create form

```tsx
navigate('/sessions/new', { state: { prefill: { horseId, workType, ... } } });
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
| Back button (header) | `"Go back"`             | Every sub-page header               |
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

When writing e2e tests for sub-pages:

- **Scoping**: Sub-page content renders on top of background tab content. If text might exist in both layers, scope assertions to the overlay: `page.locator('.fixed.inset-0.z-20')`.
- **Ambiguous elements**: After closing an edit overlay, both the detail header and the (still-in-DOM) overlay may have matching elements. Use `.first()` to target the visible one.
- **Field editing helpers**: Use `aria-label` selectors to open field editors:
    ```ts
    await page.getByLabel('Edit Horse').click();
    await page.getByRole('dialog').getByText('Option').click();
    ```
- **Sheet auto-close**: Select-type fields close the sheet automatically. Assert `await expect(sheet).not.toBeVisible()` after selection.
- **Input-type fields**: Fill the input and click the "Done" button, then assert the sheet closed.

## Checklist for New Pages

- [ ] Decide: TabLayout (browsing), SubPageLayout (drill-in), or FullScreenLayout (immersive)?
- [ ] If sub-page: add route to `<SubPageLayout>` group and update `SUB_PAGE_PATTERN` regex
- [ ] Render inline header with back button (`aria-label="Go back"`)
- [ ] Use `triggerExit()` for back navigation from sub-pages
- [ ] For detail pages: implement view/edit cascade with `isEditing` state
- [ ] For forms: use SummaryRow + FieldEditSheet drawer pattern
- [ ] Extract shared editor if form is used in both create and edit
- [ ] Use `min-h-dvh flex flex-col` for full-height layout
- [ ] Ensure all interactive elements have 44x44px touch targets
- [ ] Add `aria-label` attributes for e2e testability
- [ ] After mutations: evict relevant Apollo cache fields
