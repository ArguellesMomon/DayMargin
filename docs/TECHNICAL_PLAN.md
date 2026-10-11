# Daymargin — Technical implementation plan

Updated October 11, 2026, Asia/Manila. Product architecture with a connected Neon implementation; Vercel hosting, Groq setup, and scheduled delivery remain outstanding.

**Connection milestone:** The initial organizer now uses Neon Auth and server-authenticated Neon Postgres endpoints. The user authorized this change after requesting setup of their existing Neon project. Versioned migration files, restricted-role row policies, idempotent saves, conflicts, tombstones, and account-deletion cascades replace the unconfigured Supabase backend. Groq credentials and scheduled push delivery remain outstanding. See [Implementation status](IMPLEMENTATION_STATUS.md) and [Setup](SETUP.md) for precise coverage and connection instructions.

## 1. Selected stack

| Responsibility | Choice | Decision source |
| --- | --- | --- |
| Frontend | React JS; mobile-first PWA. Vite is the proposed build tool. | React/PWA requested by the user; build tool proposed. |
| Hosting | Vercel. | Explicit user choice. |
| Accounts and database | Neon Auth and Neon Postgres. | User requested Neon setup and explicitly authorized the app connection, superseding Supabase. |
| AI | Zero-payment hosted text API behind an authenticated server endpoint; Groq Free recommended for the initial version. | User requires no payment and lightweight everyday questions. Provider recommendation is researched; model/account access still needs validation. |
| Notification permission | Explain the benefit, then trigger the browser's native permission pop-up from a user's Enable notifications action. | Pop-up explicitly requested by the user; flow selected within the existing reminder design. |
| Scheduled push | Protected scheduled server dispatch of Web Push. Scheduler provider remains to implement after the Neon change. | Original Supabase Cron proposal is superseded; permission/subscription remain separate from delivery. |
| Offline records | Device-local IndexedDB cache and a pending-change queue, synchronized through authenticated Neon-backed app endpoints. | Proposed mechanics for the previously agreed offline/sync direction. |
| Character assets | Create Finn's master design, then consistent animation assets. | Explicitly assigned to the assistant by the user. |

Vercel documents [Vite deployment](https://vercel.com/docs/frameworks/frontend/vite) and [server functions](https://vercel.com/docs/functions). Neon provides [React authentication](https://neon.com/docs/auth/quick-start/react) and [JWT verification](https://neon.com/docs/auth/guides/plugins/jwt). The connected app uses same-origin auth cookies and server-only database credentials; no browser-facing Data API is enabled.

## 2. Application and AI flow

1. React authenticates through Neon Auth via the same-origin account proxy. Server endpoints verify the token and load owned records.
2. Ordinary record access uses a restricted transaction-scoped database role and verified owner context. Each record has an owner; database policies enforce access independently of what the interface displays.
3. A Finn question goes to an authenticated server endpoint hosted with the Vercel application. Validate the session before retrieving context.
4. Retrieve relevant allowed records across notes, tasks, reminders, expenses, and events. Compute amounts and time intervals in application/database code. Do not send unrelated or excluded records simply because they exist.
5. Call the chosen AI provider from the server, keeping its API credential in server-only environment configuration. Return an English answer with supporting record references and an optional structured action proposal.
6. Applying a proposal is a separate user-confirmed operation. Revalidate the record, ownership, and expected version before saving. An AI response itself never writes records.

**Required AI cost:** No payment for Finn's API usage. **Recommended provider:** Groq Free. The model, actual account limits, configured data controls, and response quality still need validation. An API is the connection to the model; retrieval, source links, numeric calculations, and action confirmation remain Daymargin's own responsibilities.

### Zero-payment Finn plan

The user wants an everyday assistant for light tasks and questions. Keep the initial integration text-only and on demand: explain priorities, summarize selected notes, answer questions about recorded spending, and suggest a plan using recorded commitments. Ordinary lists, totals, date checks, and reminders work through application logic without model calls. Finn's existing source links and confirmation-only action review remain required.

**Provider recommendation, researched October 11, 2026:** Groq publishes a [Free plan with request and token limits](https://console.groq.com/docs/rate-limits). Those limits apply to the organization, so users of Daymargin share the allowance. Exact account limits take precedence over the public table. A [paid Developer upgrade requires a payment method](https://console.groq.com/docs/billing-faqs); keep this project on Free, without a payment method or paid fallback. Free service availability and terms may change, so zero cost is an application requirement rather than a promise of permanent unlimited access.

Select a production text model available to the actual Free account from the [supported models](https://console.groq.com/docs/models). Do not select a model solely because an old tutorial calls it free. A small model is a candidate for the workload; suitability remains to be tested with Daymargin examples. No account, API key, or live model test has been completed during this documentation step.

**Proposed application controls:**

- Start with concise replies, bounded relevant context, and a per-user daily allowance. A starting allowance of 10 questions per user per day is a proposal to tune after checking real account capacity; it does not reserve provider capacity for each user.
- Enforce per-user and shared request/token limits on the server, with bounded concurrency. Do not send the full record history or analyze every saved entry in the background. Retrieve more relevant records within the context allowance when needed; otherwise explain the coverage limit.
- Preserve the question on a quota error. Display: Finn is temporarily unavailable. Please try again later. Show a retry time only when supplied or reliably known. Respect provider retry timing and avoid repeated automatic calls.
- The implementation now distinguishes app daily allowances, app minute pauses, and provider rate limits. A server-computed or provider-supplied numeric retry time drives an explicit-retry countdown. Reconcile a completed reservation to validated provider input/output usage before returning an answer; unknown usage remains conservatively reserved. Output validation failure does not erase known consumed tokens.
- Leave notes, tasks, expenses, calendar, and ordinary reminders usable when Finn is unavailable. Do not invent a model response or switch to a paid service.
- Keep the API key server-only and validate the signed-in user before each request. Proposed record changes still require a separate user confirmation and validated save.

For personal-record context, enable Groq's documented [Zero Data Retention controls](https://console.groq.com/docs/your-data) before integration and verify the account setting. Groq says inference content is not retained by default, but reliability/abuse exceptions can retain it; ZDR disables that storage. Usage metadata remains collected. Send only permitted, relevant content and explain external processing in Finn's context settings. Do not describe the API as local or completely private.

Before choosing the final model, test concise English answers, source grounding, missing-record handling, expense/date accuracy using supplied application calculations, and safe action proposals. Test quota and outage behavior as well. Provider free access alone does not establish acceptable response quality.

## 3. Notification permission experience

**Selected flow:**

- When a user first enables a device reminder, show a concise app explanation: Enable notifications to receive your reminders on this device.
- Offer Enable notifications and Not now. The latter keeps the saved reminder visible in the app.
- The Enable action invokes the browser's native permission prompt. Its Allow/Block controls and appearance are controlled by the browser/OS; Daymargin controls only its preceding explanation.
- If permission is already granted, show the current status rather than requesting it again. If denied, explain how to change it in the browser/device settings. Do not repeatedly interrupt users.
- After permission is granted, register/confirm the service worker and push subscription, then securely associate that subscription with the signed-in account and device. Permission alone does not complete delivery setup.
- Show permission and subscription/setup status in Settings. If subscription setup fails, preserve the reminder and provide Retry.
- Unsupported/blocked setup remains actionable and explains how to open a supported direct browser or install the iPhone/iPad Home Screen app; it must not silently disable the only control. Refresh permission when users return from device/browser settings. A user-triggered, generic test notification can verify the app-scoped service-worker display path after permission is granted, independently of VAPID/server scheduling.

The permission request should follow a user interaction and run in a secure context. See [MDN requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static). [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) uses a service worker and a push subscription to handle server messages, including when the page is not loaded.

## 4. Reminders while the app is closed

**Proposed implementation:**

- Persist reminder times on the server. Interpret user selections in Asia/Manila and store actual dispatch instants unambiguously; preserve local-time rules for recurrence.
- A scheduled server job will identify due reminders; its deployment is not implemented yet. It invokes a protected dispatch function and sends notifications to active subscriptions belonging to that account.
- Track each reminder occurrence/device dispatch with a unique identity so retrying a job does not create duplicate jobs or repeated sends. Distinguish queued, attempted, accepted by the push service, and failed states; push-service acceptance does not prove the user read a notification.
- Edits, deletions, and completed occurrences cancel obsolete pending notifications. Expired or revoked device subscriptions are retired.
- Clicking a notification opens the corresponding Daymargin record. Authenticate if necessary before revealing its details. Keep lock-screen content minimal by default; personal expense/note content should not be exposed automatically.

The earlier Supabase Cron/Edge Function proposal is superseded by the Neon backend change. A replacement protected dispatcher and scheduler remain to implement; the permission pop-up is separate from that delivery path.

For iPhone/iPad, WebKit documents Web Push for supported [Home Screen web apps](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/). Include relevant installation help when needed and test the intended devices. Delivery timing still depends on connectivity, permissions, and device/browser behavior; do not promise exact notification arrival.

## 5. Offline synchronization mechanics

**Proposed rules:**

- Cache only the current account's allowed records in IndexedDB. Supported offline creations, edits, and deletions become locally saved queued operations with client-generated IDs.
- Include an expected server version on edits/deletions. A server transaction accepts a change only against the expected version and increments it on success.
- Use operation IDs/idempotency so reconnect/retry does not duplicate an expense, event, or note. Use server-generated change ordering rather than assuming device clocks agree.
- Fetch changes since the last acknowledged server position, including deletion markers. Preserve conflicts and offer explicit resolution; never silently resurrect a deleted record from another device's old cache.
- The implemented endpoints refresh full owned records in cursor-based pages every 45 seconds and on reconnect/focus. An incremental server cursor and live subscription remain future optimizations. Reconcile includes deletion markers and protects pending/conflicting changes.
- Clearly show Saved on this device, Waiting to sync, Synced, or Sync failed. Surface unsynced records before sign-out, then clear account-specific local data safely.

These rules now have a Neon-backed implementation. See Implementation status for actual connected validation and remaining limitations.

## 6. Finn asset work

Produce an original 2D white Pomeranian master drawing with round charcoal glasses, attentive eyes, a subtle knowing smile, and a clear fluffy silhouette. Preserve transparent alpha for placement in both themes. Save the selected asset in the project with the exact prompt and generation method.

**Created:** [Finn master v1](../assets/finn/finn-master-v1.png), with transparent alpha verified. The [generation record](../assets/finn/finn-master-v1.prompt.md) preserves the exact prompt and built-in tool method.

The master PNG is a still character design. Blinking, thinking/head tilt, nodding, and optional glasses adjustment are separate animation deliverables that need consistent poses/layers and application integration. Do not describe one generated PNG as a working animation.

## 7. Implementation validation

Before release, exercise the actual user flows: sign-in and recovery, record isolation between accounts, offline capture/reconnect, duplicate/conflicting edits, reminder edits/cancellation, Allow/Block/Not now permission flows, supported Android/iPhone push behavior, current-source Finn answers, and confirmation-only writes. Check mobile keyboard layout, both themes, reduced motion, and the final mascot at real display sizes.

The organizer and Neon connection are implemented. Remaining integration work is Groq Free, scheduled Web Push, production email delivery configuration, Vercel hosting, and actual mobile-device verification.
