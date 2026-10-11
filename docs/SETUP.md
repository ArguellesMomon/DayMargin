# Daymargin — Running the Neon-connected app

## Local use

Run `npm install` and `npm run dev` inside `finn-daily` with Node.js 22.12 or newer. The development server runs the React app and its API handlers. With Neon configured, Get started creates a real account and Sign in loads synchronized records. Open development preview uses separate editable sample entries and never writes to Neon. Production accounts start empty.

The default development address is `http://127.0.0.1:5174`. That exact origin is registered on the production Auth branch. The dev command uses a fixed port and stops with a clear error if it is occupied, instead of silently moving to an unregistered port. Stop an existing development server before starting another. If you deliberately choose another port, register that exact origin first.

The app folder has its own ignored `.neon` link; the parent Personal folder's setup is separate. Run app commands inside `finn-daily`.

The local API reloads branch settings when Vite reloads `.env.local`, without retaining its previously injected connection values. Explicit environment variables set before starting the server keep Vite's normal precedence. After switching branches, use the current server address and reload the page; a removed branch's Auth endpoint returns 404. Servers started before this correction require one full restart.

## Neon configuration

Project: `morning-bonus-42298277` (Finn-daily). Final branch: `production`. App `neon.ts` declares `{ auth: true }`. No Neon AI Gateway, Object Storage, or Functions are enabled.

For a new local checkout:

1. Install the Neon CLI and sign in. Run `neon link --project-id morning-bonus-42298277 --branch production -y` from the app folder.
2. Run `neon deploy` to reconcile Auth and pull the branch environment into ignored `.env.local`.
3. Run `node scripts/configure-neon-env.mjs` to set the public `VITE_NEON_AUTH_URL` alias.
4. Run `npm run db:migrate` to apply versioned SQL migrations. The script requires direct `DATABASE_URL_UNPOOLED`, tracks checksums, and runs transactionally. Test new migrations on a temporary branch first; create a new file rather than editing an applied migration.

Neon manages `neon_auth`; app tables live in `daymargin`. The older Supabase migration is a legacy test fixture and must not be applied to Neon.

Server variables: pooled `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`. The direct `DATABASE_URL_UNPOOLED` is for migrations. Account deletion also requires server-only `PRIVATE_NEON_API_KEY` scoped to this project, `NEON_PROJECT_ID`, and `NEON_BRANCH_ID`; the endpoint never accepts caller-selected IDs and rechecks the current password. Create that key with `neon api-keys create --name daymargin-account-deletion --project-id morning-bonus-42298277 -o json` and save it privately. Do not put it in the browser or commit it. The managed `/delete-user` endpoint returned 404 during testing, so deletion uses the supported branch management API. The browser receives only `VITE_NEON_AUTH_URL`, never database credentials or CLI keys. `.env.local` and `.neon` are excluded from Git.

Register each actual app origin, including its scheme/port: `neon neon-auth domain add http://127.0.0.1:5174`. Auth's localhost allowance does not substitute for the tested exact 127.0.0.1 origin. Register Vercel production and intended preview origins too.

The same-origin `/api/auth/*` proxy puts account cookies on the app host, supporting browsers that block third-party cookies. API requests retrieve a JWT and verify signature, issuer, audience, expiry and live identity existence. Queries switch to a restricted transaction-scoped database role. Ownership is enforced in queries and row policies. The installed SDK has a `/token` response-cache issue; the app fetches that documented endpoint directly through its session cookie.

Email/password registration, login, setup and password-confirmed deletion use Managed Better Auth. Production email delivery and verification require validating SMTP and verification settings; see [Neon's production checklist](https://neon.com/docs/auth/production-checklist). Recovery email delivery remains unverified until an actual message is received and its flow completed.

## Offline synchronization

Account-scoped IndexedDB holds entries, drafts, chats and queued changes. Each change keeps an operation ID and expected version. Reconnect accepts each valid operation once or presents an explicit conflict. Deletions remain tombstones; keeping a conflicting locally edited deleted record creates a new record only after confirmation.

Record refresh uses cursor-based pages including tombstones. It runs every 45 seconds and on reconnect/focus; it is a full refresh, without a live subscription or incremental feed. Drafts/chats stay device-local. Sign-out surfaces unsynced work and clears that account's local cache. The built PWA supports offline reload; the development server itself cannot serve disconnected page loads.

## Validation

Run `npm test`, `npm run build`, and, with the dev server running, `npm run test:e2e`. Browser tests use installed Microsoft Edge. `DAYMARGIN_TEST_URL` selects another port.

Connected testing is opt-in with `DAYMARGIN_CONNECTED_TESTS=true`. Run `tests/browser/connected.spec.js` against a temporary Neon branch. It creates disposable `@example.test` accounts and tests signup/sign-in, separate-device retrieval, account isolation, offline queues, conflicts, sign-out and deletion. Password-bearing traces/screenshots are disabled.

For the offline production-PWA scenario, build, run `npm run preview -- --port 4173`, set `DAYMARGIN_TEST_URL=http://127.0.0.1:4173`, and run the offline browser check. Install the shell before disconnecting. A configured Neon build also needs `DAYMARGIN_CONNECTED_TESTS=true`; the scenario creates and deletes a disposable account and validates reconnection.

## Finn

Finn reads current permitted records from Neon. The user configured Groq in Vercel, and two consecutive live answers with synthetic entries have been verified. A new deployment/checkout requires server-only `GROQ_API_KEY`, `GROQ_MODEL`, an actual Groq Free account and verified Zero Data Retention. Set `GROQ_FREE_CONFIRMED=true` and `GROQ_ZDR_CONFIRMED=true` only after checking those settings. These flags are operator acknowledgments, not remote account checks. Never paste keys into chat or tracked files. No paid fallback exists.

Apply the new versioned migration `202610110003_finn_conversation.sql` before deploying the personality/conversation update. Shared ceilings now align with published GPT-OSS Free capacity: 30 requests/minute, 1,000/day, and a 200,000-token daily reservation budget. Groq enforces actual token-per-minute capacity. The old `FINN_USER_DAILY_LIMIT`, `FINN_SHARED_DAILY_LIMIT`, and `FINN_SHARED_MINUTE_LIMIT` variables are no longer read and can be removed from Vercel. Failed requests count; no paid fallback exists.

Finn now reconciles a completed reservation to Groq's validated `usage.total_tokens` (input plus all completion/reasoning tokens) before sending a successful answer. Missing/invalid usage or an upstream failure keeps the original reservation; output-validation failures with known usage still count the consumed tokens. The server-only update checks lease ownership and prevents a second reconciliation. This corrects a bug where roughly 3,400 reserved tokens per ordinary question blocked the next question under the 6,000-token minute budget even after a reply finished.

Daily app allowances reset at midnight in Asia/Manila. Groq rate limits have separate wording and preserve numeric retry timing when supplied. Finn keeps failed questions and allows explicit retry without a forced countdown or page reload. Only an in-flight response temporarily disables sending. Free provider capacity and model/network latency remain unavoidable limits.

Finn's built-in personality now supports upbeat hype-bro conversation and random everyday questions. Three recent server-signed exchanges can support follow-ups, subject to account, expiry and current-library checks. Any saved-entry change invalidates old derived context. See [Finn personality](FINN_PERSONALITY.md).

Current model recommendation, researched October 11, 2026: `openai/gpt-oss-20b`, listed in Groq's production models and Free Plan limits. Enable Global/Inference ZDR before setting acknowledgment flags. GPT-OSS requests use low reasoning with a 2,048-token completion allowance (including reasoning). Replies remain concise; decorative emojis are stripped. Live casual conversation, follow-up recall, three consecutive answers, computed PHP totals and saved-record references are verified in Implementation status. Broader quality and outage/quota behavior still need evaluation. Keep credentials server-only and the account on Free.

Proposals are private, expire in ten minutes, and require exact-preview confirmation. Applying rechecks ownership, exclusions, deletion and version. Repeating-series AI edits remain manual in this build.

## Vercel and notifications

When importing `ArguellesMomon/DayMargin` into Vercel, use the repository root (the app is at the root), `npm run build`, and `dist` output. The existing local workspace folder is named `finn-daily`. Configure public Auth and server variables in the intended environments. Public changes require rebuilding. `/api` handlers run as Node functions. Register deployed origins in Neon Auth before login.

The production domain `https://daymargin.vercel.app` is registered on Neon Auth. The auth handler is the flat `api/auth.js` function, with an explicit `/api/auth/:path*` rewrite in `vercel.json`. This is required for nested requests such as `/api/auth/sign-up/email` and `/api/auth/sign-in/email`; a Next.js-style `[...path].js` file alone did not match those nested paths in this Vite deployment. The handler accepts original or rewritten URLs, removes the internal routing parameter, and preserves Auth cookies and recovery query parameters.

Native permission and device subscription registration are implemented; registration uses `/api/push` when `VITE_VAPID_PUBLIC_KEY` is set. Scheduled Web Push dispatch/private key, deduplication/cancellation and real Android/iPhone delivery remain unfinished. Permission alone does not schedule notifications.

Use the deployed HTTPS website directly in a browser tab rather than an embedded preview or in-app browser. In Settings → Reminders, choose Enable notifications and confirm the native Allow prompt. If device APIs are absent, Notification setup remains actionable and explains how to proceed; it cannot manufacture permission support in an unsupported browser. iPhone/iPad users need a supported OS (16.4 or later) and a Home Screen installation. Blocked permissions must be changed in browser/device settings; returning to Daymargin refreshes the displayed permission.

After granting permission, Send test notification issues a generic notification through this app's service worker, without exposing saved entries or requiring a VAPID key. Check device/browser notification settings and Do Not Disturb if it does not appear. This test verifies the permission/display path only, not automatic scheduled or closed-app delivery. A built PWA is required; the development server intentionally disables service-worker registration. If setup is still activating, the action waits at most eight seconds before offering a reload/retry.
