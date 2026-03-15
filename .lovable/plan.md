

## Add loading spinners to delete confirmation dialogs

### Summary
Add `disabled` + `Loader2` spinner to every delete confirmation `AlertDialogAction` button across 6 pages. All pages already have the mutation variable available (e.g. `deleteLead`, `deleteCompany`, etc.) with `.isPending`. Only TasksPage needs `Loader2` added to its import.

### Changes

**1. `src/pages/LeadsPage.tsx`** (line 850)
- Single delete: `<AlertDialogAction onClick={handleDelete} disabled={deleteLead.isPending} ...>` with spinner
- Bulk delete (line 868): already has `bulkActionPending` — add spinner icon like other pages

**2. `src/pages/ContactsPage.tsx`** (line 459)
- Single delete: `<AlertDialogAction onClick={handleDelete} disabled={deleteContact.isPending}>` with spinner
- Bulk delete (line 475): already has spinner but missing `disabled` on the action button — add it

**3. `src/pages/CompaniesPage.tsx`** (line 418)
- Single delete: `<AlertDialogAction onClick={handleDelete} disabled={deleteCompany.isPending}>` with spinner
- Bulk delete: already handled

**4. `src/pages/DealsPage.tsx`** (line 656)
- Single delete: `<AlertDialogAction onClick={handleDelete} disabled={deleteDeal.isPending}>` with spinner

**5. `src/pages/TasksPage.tsx`** (line 425)
- Add `Loader2` to lucide-react import (line 28)
- Single delete: `<AlertDialogAction onClick={handleDelete} disabled={deleteTask.isPending}>` with spinner

**6. `src/pages/SettingsPage.tsx`** (line 332)
- `<AlertDialogAction onClick={handleDelete} disabled={deleteRule.isPending}>` with spinner

### Pattern applied to each AlertDialogAction
```tsx
<AlertDialogAction onClick={handleDelete} disabled={mutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
  Delete
</AlertDialogAction>
```

Also disable the Cancel button while pending to prevent closing mid-delete.

### Files changed (6)
- `src/pages/LeadsPage.tsx`
- `src/pages/ContactsPage.tsx`
- `src/pages/CompaniesPage.tsx`
- `src/pages/DealsPage.tsx`
- `src/pages/TasksPage.tsx`
- `src/pages/SettingsPage.tsx`

