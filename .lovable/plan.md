

## Fix: Replace render-time state initialization with useEffect in DraftEmailDialog

Replace the `initialized` state pattern (lines 36, 52-59) with a `useEffect` keyed on `open`. Remove `initialized` state entirely.

### Changes in `src/components/DraftEmailDialog.tsx`

1. Add `useEffect` to imports (line 1: `import { useState }` → `import { useState, useEffect }`)
2. Remove `const [initialized, setInitialized] = useState(false)` (line 36)
3. Remove the render-time blocks (lines 52-59):
   ```tsx
   // REMOVE:
   if (open && !initialized) { ... }
   if (!open && initialized) { ... }
   ```
4. Add after `applyTemplate` function:
   ```tsx
   useEffect(() => {
     if (open) {
       applyTemplate(EMAIL_TEMPLATES[0].id);
       setCopied(false);
     }
   }, [open]);
   ```

Single file changed: `src/components/DraftEmailDialog.tsx`

