

## Fix: Per-template copied state in EmailTemplatesPage

Change `copied` from a shared boolean to a string storing the copied template ID.

### Changes in `src/pages/EmailTemplatesPage.tsx`

1. **Line 37**: `const [copied, setCopied] = useState(false)` → `const [copiedId, setCopiedId] = useState<string | null>(null)`

2. **Lines 42-43** (in `handleCopy`): Replace `setCopied(true)` / `setCopied(false)` with `setCopiedId(tpl.id)` / `setCopiedId(null)`

3. **Line 110** (card Copy button): `{copied ?` → `{copiedId === tpl.id ?`

4. **Lines 145-147** (dialog Copy button): Add same check using `previewTemplate?.id`:
   ```tsx
   {copiedId === previewTemplate?.id ? (
     <><Check className="h-4 w-4 mr-1" /> Copied!</>
   ) : (
     <><Copy className="h-4 w-4 mr-1" /> Copy to Clipboard</>
   )}
   ```

Single file changed. No other behavior affected.

