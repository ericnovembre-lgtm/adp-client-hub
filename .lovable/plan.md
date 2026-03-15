

## Plan: Make Contact and Company Names Clickable in DealsPage and DealDetailSheet

### `src/pages/DealsPage.tsx`

**Import**: Add `Link` from `wouter` (or use `useLocation` — `Link` is simpler).

**ListView** (lines 492-493): Replace plain text contact/company cells with clickable links:
- Contact cell: `<Link href="/contacts" className="text-primary hover:underline">{name}</Link>` (when contact_id exists)
- Company cell: `<Link href="/companies" className="text-primary hover:underline">{name}</Link>` (when company_id exists)

**KanbanView** (lines 357-358): Same treatment in `renderDealCard` — wrap company/contact `<p>` text in `<Link>` with `text-primary hover:underline` styling. Add `e.stopPropagation()` on click to prevent card click from firing.

### `src/components/DealDetailSheet.tsx`

**Import**: Add `Link` from `wouter`.

**View mode only** (lines 218, 233): Replace the plain `contactName` and `companyName` values in `InfoRow` with `<Link>` elements:
- Contact: `<Link href="/contacts" className="text-primary hover:underline">{contactName}</Link>`
- Company: `<Link href="/companies" className="text-primary hover:underline">{companyName}</Link>`

### Files changed
- `src/pages/DealsPage.tsx` — add Link import, update 4 locations
- `src/components/DealDetailSheet.tsx` — add Link import, update 2 locations

No database or dependency changes needed.

