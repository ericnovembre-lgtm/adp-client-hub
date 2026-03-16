

# Keep ai-chat as-is (Option A)

The `ai-chat` Edge Function has already been migrated to the Anthropic Claude API in a previous fix. It currently works correctly as a lightweight, text-only AI endpoint used solely by `DraftEmailDialog` for email customization.

**Recommendation: No changes needed.** Option A is already in place. The ai-chat function:
- Already uses `ANTHROPIC_API_KEY` and `claude-sonnet-4-20250514`
- Already validates auth via `supabase.auth.getUser()`
- Serves a single, focused purpose (email drafting)
- Has no broken dependencies

Option B (consolidating into crm-agent) would require parsing SSE tool-use events in DraftEmailDialog, adding complexity for no functional gain. The current setup is clean and working.

**No implementation needed.**

