

## Add Tooltips to Copy Buttons in Agent Panel

### What
Add hover tooltips to both copy buttons on assistant messages: "Copy email only" for the mail icon and "Copy full response" for the clipboard icon.

### How

**File: `src/components/AgentPanel.tsx`**

1. Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`
2. Wrap each button in `CopyButton` and `CopyEmailButton` with `<Tooltip>/<TooltipTrigger>/<TooltipContent>`
   - CopyButton tooltip: "Copy full response"
   - CopyEmailButton tooltip: "Copy email only"
3. Add a `<TooltipProvider>` around the message area (or around each bubble's button group)

