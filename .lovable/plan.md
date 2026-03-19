

## Add Copy-to-Clipboard to CallPrepPanel

### Change

**`src/components/CallPrepPanel.tsx`**
- Import `Copy` and `Check` icons from lucide-react
- Add a "Copy" button next to the "Refresh" button in the header row
- On click, copy the briefing text to clipboard, show toast confirmation, and toggle icon to checkmark for 2 seconds

Single file, ~15 lines added.

