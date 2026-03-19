

## Add FROM_EMAIL Secret

This is a single-step configuration change requiring no code modifications.

### What needs to happen

Add a `FROM_EMAIL` secret to your backend with the value set to your verified Resend domain sender address (e.g., `sales@yourdomain.com` or `noreply@yourdomain.com`).

### Prerequisites
- Your domain must be verified in your Resend account
- The sender address must use that verified domain

### How it works
The `send-crm-email` edge function already reads `FROM_EMAIL` from secrets (line 90 of `send-crm-email/index.ts`). If present, it uses that address as the sender. No code changes or redeployment needed — the function picks it up automatically at runtime.

### Steps
1. I will use the secret management tool to prompt you for the `FROM_EMAIL` value
2. You enter your verified sender address (e.g., `outreach@yourdomain.com`)
3. All future emails sent via the Draft Email dialog will use that address

