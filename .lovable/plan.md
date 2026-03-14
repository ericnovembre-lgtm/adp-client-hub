

## Plan: Global Command Palette (Cmd+K Search)

### 1. Create `src/components/CommandPalette.tsx`

New component using the existing `CommandDialog` from `src/components/ui/command.tsx`.

**Behavior:**
- `useEffect` listens for `Cmd+K` / `Ctrl+K` to toggle `open` state
- Debounced search input (200ms) triggers 4 parallel Supabase queries (leads, contacts, companies, deals) with `ilike`, limit 5 each
- Results grouped under `CommandGroup` headers with icons (Users, Building2, Handshake, Target)
- Clicking a result navigates via `wouter`'s `useLocation` and closes the dialog
- Bottom section: quick actions — "New Lead", "New Contact", "New Company", "New Deal" (navigate to respective pages)
- Empty state when no results

### 2. Update `src/components/TopBar.tsx`

- Add a search button (Search icon from lucide) next to ThemeToggle that opens the palette
- Show `⌘K` shortcut hint as a `<kbd>` badge next to/inside the button
- Import and render `<CommandPalette open={open} onOpenChange={setOpen} />`

### Files changed
- `src/components/CommandPalette.tsx` (new, ~120 lines)
- `src/components/TopBar.tsx` (add search button + render CommandPalette)

