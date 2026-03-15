

## Create `src/hooks/useAgentRecommendations.ts`

A new hook that fetches active recommendations from `agent_recommendations`, provides dismiss/act-on mutations, and a manual refresh trigger.

### Implementation
- `useQuery` with key `['agent-recommendations']`, staleTime 60s, fetches non-dismissed recs ordered by priority desc
- `dismissRecommendation(id)` and `markActedOn(id)` as mutation helpers that update the row and invalidate the query
- `refreshBrief()` invokes the `agent-daily-brief` edge function then invalidates
- Computed `count` from the data length

### Files
| File | Action |
|------|--------|
| `src/hooks/useAgentRecommendations.ts` | Create |

