

## Add "Copy Email Only" Button to Agent Responses

### What
Add a second copy button (mail icon) next to the existing copy-all button on assistant messages that contain an email draft. This button extracts only the Subject + Body portion, skipping strategy explanations.

### How

**File: `src/components/AgentPanel.tsx`**

1. Add an `extractEmail` utility function that parses assistant message text to find the email portion using these heuristics:
   - Look for "SUBJECT:" (case-insensitive) as the start marker
   - Capture everything from "SUBJECT:" until hitting a section header like "STRATEGY", "WHY THIS WORKS", "KEY POINTS", "NOTES", or end of text
   - Return `null` if no email pattern found

2. Add a `CopyEmailButton` component (mail icon) similar to `CopyButton`:
   - Only rendered when `extractEmail(msg.content)` returns non-null
   - Positioned next to the existing copy button (e.g. `right-8` vs `right-1`)
   - Uses `Mail` icon (already imported), swaps to `Check` on success
   - Tooltip or toast says "Email copied!"

3. Update `MessageBubble` to render both buttons when an email is detected:
   - Existing `CopyButton` (copies full response) stays at `right-1`
   - New `CopyEmailButton` at `right-8`, only shown when email content exists

### Parsing Logic
```text
Response text structure (typical):
  "SUBJECT: ...
   Hi [Name],
   [body paragraphs]

   STRATEGY / WHY THIS WORKS / NOTES:
   [explanation paragraphs]"

extractEmail() grabs from "SUBJECT" to the strategy section break.
```

### Design
- Mail icon button, same ghost styling as existing copy button
- Both buttons visible on hover, mail icon on left, copy-all on right
- Only mail button appears when email content is detected; copy-all always shown

