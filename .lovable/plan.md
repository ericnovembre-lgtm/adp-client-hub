

## Create `src/hooks/useLeadScores.ts`

### What will be created

A new hook file with two hooks for fetching lead scores from the `lead_scores` table.

### Implementation
- `useLeadScores()`: Fetches all scores via `useQuery(['lead-scores'])`, returns `{ leadScores: Map<string, LeadScore>, isLoading }`
- `useLeadScore(leadId)`: Fetches single score via `useQuery(['lead-score', leadId])`, returns `{ score: LeadScore | null, isLoading }`
- Interfaces: `ScoreFactor` (factor/points/max/reason) and `LeadScore` (id/lead_id/score/grade/factors/scored_at)

### Files
| File | Action |
|------|--------|
| `src/hooks/useLeadScores.ts` | Create |

