

## Enhance SearchableSelect component

The existing `SearchableSelect` works well but could be improved with features that would benefit current and future consumers (Prompts 5, 7, 14).

### Enhancements

1. **`disabled` prop** — Disable the trigger button when the form/field is disabled
2. **`allowNone` prop** (default `true`) — Control whether the "None" clear option appears; some fields are required
3. **`popoverWidth` prop** — Allow callers to override the hardcoded `w-[300px]`; currently mismatches trigger width on wider/narrower inputs
4. **Match trigger width by default** — Use `w-[--radix-popover-trigger-width]` (like `CompanyCombobox` does) instead of hardcoded 300px, with optional override

### File changed
- `src/components/ui/SearchableSelect.tsx` — Add props, apply defaults, wire into component

### Interface after changes
```typescript
interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;       // new
  allowNone?: boolean;      // new, default true
}
```

No changes to existing consumers — all new props are optional with backward-compatible defaults.

