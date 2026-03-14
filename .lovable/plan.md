

## Plan: Extract shared SearchableSelect component

### 1. Create `src/components/ui/SearchableSelect.tsx`
Extract the duplicated component with standardized prop names:
- `options` (was `items`) — `Array<{ value: string; label: string }>`
- `value: string`
- `onValueChange` (was `onChange`) — `(value: string) => void`
- `placeholder?: string`
- `searchPlaceholder?: string`
- `emptyMessage?: string` (default "No results.")
- `className?: string`

Named export: `export function SearchableSelect(...)`. Includes its own imports for Popover, Command, Button, Check, ChevronsUpDown, cn.

### 2. Update `src/pages/DealsPage.tsx`
- Remove lines 110-158 (local SearchableSelect definition)
- Add import: `import { SearchableSelect } from "@/components/ui/SearchableSelect"`
- Update 2 usage sites (lines 247, 252): rename `items` → `options`, `onChange` → `onValueChange`
- Remove now-unused imports: `Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, ChevronsUpDown, Check` (if not used elsewhere in the file)

### 3. Update `src/pages/TasksPage.tsx`
- Remove lines 87-127 (local SearchableSelect definition)
- Add import: `import { SearchableSelect } from "@/components/ui/SearchableSelect"`
- Update 2 usage sites (lines 247, 252): rename `items` → `options`, `onChange` → `onValueChange`
- Remove now-unused imports: `Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, ChevronsUpDown, Check`

No visual or behavioral changes.

