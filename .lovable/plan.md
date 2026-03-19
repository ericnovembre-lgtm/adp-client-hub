

## Lead Generation AI Agent — Autonomous Pipeline Orchestrator

### Overview
Build an autonomous lead gen pipeline that chains existing enrichment, scoring, and outreach functions into a 5-stage workflow (Discover → Enrich → Score → Draft → Notify), with human-in-the-loop email approval. Adds 2 new database tables, 1 new edge function, 3 new CRM agent tools, 2 new daily brief checks, and 2 new quick actions.

### 1. Database Migration — Two New Tables

**`lead_gen_runs`** — Pipeline execution tracking with status progression (pending → discovering → enriching → scoring → drafting → review_ready → completed → failed), counters for each stage, config JSONB, error handling. RLS: user_id = auth.uid() for SELECT/UPDATE/DELETE; open INSERT for service role.

**`outreach_queue`** — Drafted emails awaiting review. Stores full lead context (company, competitor, score, grade), email content (subject, body), and lifecycle status (pending_review → approved → sent → skipped → failed). Foreign keys to leads and lead_gen_runs. RLS: user_id = auth.uid().

Indexes on (user_id, status) and (user_id, created_at DESC) for both tables; (run_id) and (lead_id) on outreach_queue.

### 2. New Edge Function: `lead-gen-agent/index.ts`

Autonomous orchestrator running 5 stages sequentially:

- **Stage 1 (Discover)**: Internal fetch to `scheduled-discovery` with forwarded auth header. Updates run status/counts.
- **Stage 2 (Enrich)**: Queries leads with status='new' missing enrichment (no "Waterfall enrichment completed" activity AND no decision_maker_email). Batches up to 10, calls `waterfall-enrich` per lead via internal fetch.
- **Stage 3 (Score)**: Queries lead_scores for enriched leads, filters to grade A/B (score >= 60).
- **Stage 4 (Draft)**: For each qualified lead, generates personalized email via Claude (Anthropic API). Uses competitor-specific angles when current_provider is detected, trigger-based hooks otherwise. Inserts into outreach_queue with status 'pending_review'.
- **Stage 5 (Notify)**: Creates agent_recommendation alerting user that emails are ready for review.

Error handling: partial failures don't stop the pipeline — failed leads are skipped and successful ones proceed.

Config parameters: `{ industry?, state?, headcount_min?, headcount_max?, max_leads?, skip_discovery? }`.

### 3. Update `crm-agent/index.ts` — Three New Tools

Add to CRM_TOOLS array and executeTool switch:

- **`run_lead_gen_pipeline`** (medium risk) — Calls lead-gen-agent via internal fetch, returns run_id
- **`get_lead_gen_status`** (low risk) — Queries lead_gen_runs + outreach_queue counts for a run
- **`get_outreach_queue`** (low risk) — Queries outreach_queue with status filter

Add LEAD GENERATION PIPELINE section to SYSTEM_PROMPT with behavioral instructions for when to use each tool.

### 4. Update `AgentPanel.tsx` — Two New Quick Actions

Add "Run lead gen" and "Review outreach" buttons to QUICK_ACTIONS array. Also add `run_lead_gen_pipeline` and `get_lead_gen_status` to the tool icon mapping.

### 5. Update `agent-daily-brief/index.ts` — Two New Checks

- **CHECK 7 (Unenriched Leads)**: If >= 5 leads exist with no enrichment activity and no email, recommend running the pipeline.
- **CHECK 8 (Stale Outreach Queue)**: If outreach_queue items with status 'pending_review' are > 48 hours old, recommend reviewing them.

### Files Changed
- **Migration**: Create `lead_gen_runs` and `outreach_queue` tables with RLS + indexes
- **`supabase/functions/lead-gen-agent/index.ts`** — New edge function (5-stage orchestrator)
- **`supabase/functions/crm-agent/index.ts`** — Add 3 tools + system prompt update
- **`supabase/functions/agent-daily-brief/index.ts`** — Add checks 7 and 8
- **`src/components/AgentPanel.tsx`** — Add 2 quick actions + tool icon mappings

### Technical Notes
- The lead-gen-agent uses the same auth pattern as existing functions (Bearer token → getUser → service role for DB ops)
- Email drafting uses Anthropic Claude directly (matching the existing crm-agent pattern with ANTHROPIC_API_KEY)
- No emails are sent automatically — all go through outreach_queue for human review
- The OutreachReviewCard component is deferred to a follow-up; initial review happens via agent chat text

