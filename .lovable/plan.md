

## Plan: Add Drag-and-Drop to Deal Pipeline Kanban

### Dependencies

Add `@dnd-kit/core` and `@dnd-kit/sortable` to `package.json`.

### Changes to `src/pages/DealsPage.tsx` — KanbanView only

**1. Import dnd-kit + GripVertical + useIsMobile**
- `DndContext`, `DragOverlay`, `closestCenter`, `PointerSensor`, `useSensor`, `useSensors` from `@dnd-kit/core`
- `useDraggable`, `useDroppable` from `@dnd-kit/core`
- `GripVertical` from `lucide-react`
- `useIsMobile` from `@/hooks/use-mobile`

**2. Wrap stage columns in `DndContext`**
- Add `PointerSensor` with activation constraint (`distance: 8`) to avoid accidental drags
- `onDragStart` → set `activeDealId` state (for overlay)
- `onDragEnd` → extract deal id from `active.id`, target stage from `over.id`, call existing `moveDeal()`

**3. Make each stage column droppable**
- Extract a `DroppableColumn` wrapper that calls `useDroppable({ id: stage })`
- When `isOver` is true, add a highlight border/bg class (e.g. `ring-2 ring-primary/40 bg-primary/5`)

**4. Make each deal card draggable**
- Extract a `DraggableCard` wrapper that calls `useDraggable({ id: deal.id })`
- Apply transform style from `useDraggable`
- Add `GripVertical` icon as drag handle (left side of card title) — pass `listeners` and `attributes` to the grip icon only
- While dragging, reduce opacity on the original card (`isDragging → opacity-50`)

**5. DragOverlay**
- Render a simplified card clone (title + value) inside `DragOverlay` for smooth visual feedback

**6. Mobile guard**
- Check `useIsMobile()` in KanbanView
- If mobile: skip DndContext wrapper, hide GripVertical icons — dropdown-only fallback

### Files changed
- `package.json` — add 2 dependencies
- `src/pages/DealsPage.tsx` — modify KanbanView component (~80 lines added)

No changes to ListView, DealDetailSheet, or any other file.

