

## Add "Score This Lead" Button

Replace the empty-state text on line 98 with a button that dispatches the same `agent-panel-message` custom event used by Re-score, but with a scoring prompt for this specific lead.

### Change

**`src/components/LeadDetailSheet.tsx`** — lines 97-99

Replace the plain text fallback with a styled card containing a "Score This Lead" button:

```tsx
) : (
  <div className="text-center py-4 space-y-3">
    <p className="text-sm text-muted-foreground">No score available yet.</p>
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("agent-panel-message", {
          detail: { message: `Score the lead ${lead.company_name} — evaluate headcount fit, industry knockout rules, trigger event quality, decision maker seniority, and contact completeness` }
        }));
      }}
    >
      <Sparkles className="h-3.5 w-3.5" />
      Score This Lead
    </Button>
  </div>
)}
```

This reuses the existing `agent-panel-message` event pattern and the `Sparkles` icon already imported. No new dependencies needed. One file, ~5 lines changed.

