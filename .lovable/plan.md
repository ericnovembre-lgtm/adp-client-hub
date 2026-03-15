

## Replace empty states with ADP TotalSource-specific guidance

Update 6 pages to replace generic empty state messages with ADP-specific copy and add CTA buttons.

### Changes per file

**1. LeadsPage.tsx** (lines 615-619)
Replace generic text. Add CTA buttons for "AI Discovery" (navigate to /ai-discovery) and "Add Lead" (calls `openAdd()`). Import `useNavigate` and `Sparkles` if needed.

**2. DealsPage.tsx** (lines 478-482)
Replace text with ADP pipeline message. CTA: "Add Deal" button calling `openAdd()`.

**3. ContactsPage.tsx** (lines 394-398)
Replace text with ADP decision-makers message. CTA: "Add Contact" button calling `openAdd()`.

**4. CompaniesPage.tsx** (lines 308-312)
Replace text with auto-creation message. CTA: "Add Company" button calling `openAdd()`.

**5. TasksPage.tsx** (lines 406-410)
Replace text with ADP follow-up message. CTA: "Add Task" button calling `openAdd()`.

**6. AIDiscoveryPage.tsx**
Add empty state after manual discovery result area — show message when no discovery has been run yet (check `manualDiscover.isIdle`). No structural changes needed since the page is a form, but add guidance text below the form.

### Pattern for each empty state
```tsx
<Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
<p className="font-medium">No [entity] yet</p>
<p className="text-sm mt-1 max-w-md mx-auto">[ADP-specific message]</p>
<Button onClick={action} className="mt-4" variant="outline" size="sm">
  <Plus className="h-4 w-4 mr-1" />[CTA text]
</Button>
```

### Files changed (6)
- `src/pages/LeadsPage.tsx`
- `src/pages/DealsPage.tsx`
- `src/pages/ContactsPage.tsx`
- `src/pages/CompaniesPage.tsx`
- `src/pages/TasksPage.tsx`
- `src/pages/AIDiscoveryPage.tsx`

