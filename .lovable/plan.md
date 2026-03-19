

## Store Census API Key

Store the user's Census Data API key as a runtime secret named `CENSUS_API_KEY`, which the Market Intelligence edge function already reads via `Deno.env.get("CENSUS_API_KEY")`.

### Steps
1. Use the `add_secret` tool to prompt for `CENSUS_API_KEY`
2. No code changes needed — the edge function already references this secret

