

## Plan: Replace AI Model Selector with Read-only Info

### Changes

**`src/pages/SettingsPage.tsx`** (4 edits)

1. **Line 355**: Remove `const [aiModel, setAiModel] = useState("gpt-4o-mini");`

2. **Line 381**: Remove `setAiModel(settings.aiModel ?? "gpt-4o-mini");`

3. **Lines 409-410**: Remove `aiModel,` from the `saveSettings` UserSettings object.

4. **Lines 542-557**: Replace the AI Configuration card description and model selector:
   - Change `CardDescription` to just "Configure AI assistant behavior"
   - Replace the model `Select` dropdown (lines 545-557) with a read-only line:
     ```tsx
     <div className="space-y-2">
       <Label>AI Model</Label>
       <div className="flex items-center gap-2">
         <Badge variant="secondary">Gemini 2.5 Flash</Badge>
         <span className="text-xs text-muted-foreground">via Lovable AI Gateway</span>
       </div>
     </div>
     ```

No changes to `useUserSettings.ts`, edge functions, or other pages.

