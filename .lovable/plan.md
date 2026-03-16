

# Fix send-crm-email Edge Function

## Overview
Two bugs: broken auth method (`getClaims` doesn't exist) and email sending via a Lovable-only endpoint. Fix auth to use `getUser()` and switch email delivery to Resend API.

## Changes

### `supabase/functions/send-crm-email/index.ts`

1. **Fix auth (lines 29-38)**: Replace `getClaims(token)` with `supabaseAuth.auth.getUser()` — the standard method that validates the JWT from the Authorization header automatically.

2. **Fix email sending (lines 81-102)**: Replace the `api.lovable.dev/v1/email/send` call with Resend API (`https://api.resend.com/emails`). Uses `RESEND_API_KEY` secret and optional `FROM_EMAIL` env var (defaults to `noreply@resend.dev` for testing).

### Secret needed: `RESEND_API_KEY`
- Sign up at resend.com (free tier: 100 emails/day, no credit card)
- Get API key from dashboard
- Will prompt you to add it as an Edge Function secret

No frontend changes needed.

