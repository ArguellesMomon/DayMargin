# Daymargin — Product brief

Status: product specification with an initial coded implementation. Created October 10, 2026; updated October 11, 2026, Asia/Manila. See [Implementation status](IMPLEMENTATION_STATUS.md) for completed functionality, checks, and remaining work; requirements below remain the intended product behavior.

**Decision labels:** Required = explicitly requested by the user. Decided = explicitly accepted by the user or selected by the assistant where the user delegated that decision; the source is stated. Proposed = a suggested direction awaiting discussion. Open = a decision that has not been made.

## 1. Purpose

**Required:** Create a website suited to mobile use, using React JS, with a PWA-style experience. It should help users organize everyday information, such as reminders and notes, and make daily life more efficient.

The defining feature is a built-in AI chatbot that can analyze information entered throughout the app and give clear answers or practical advice based on that information.

**Proposed product statement:** A quiet place to capture what matters, see what needs attention today, and ask Finn for help making sense of it.

**Decided:** The audience is general Filipino users. Expense tracking starts with logging and summaries. Finn gives advice and proposes changes that users confirm before they are applied. These decisions were explicitly accepted by the user on October 11.

**Decided under delegated judgment:** Use user accounts with cloud synchronization across devices and offline access for core records. The user asked the assistant to choose the data/device approach; this choice supports continuity across phones and computers. Specific services and synchronization mechanics remain implementation decisions.

**Decided under delegated judgment:** The app name is **Daymargin**, selected by the assistant after the user delegated naming. It describes a personal space for the details of a day: plans, notes, and recorded expenses. Finn remains the AI companion's name.

**Open:** Remaining feature details and final visual execution. The original project folder retains the label finn-daily so existing documentation links continue to work.

### Filipino audience: accepted defaults

**Decided by the user:**

- Currency: Philippine peso (PHP).
- Timezone: Asia/Manila.
- Language: English only throughout the interface and Finn's responses. This supersedes the earlier multilingual proposal.

**Proposed execution details:** Use clear English date/time labels and consistent peso formatting. Treat Asia/Manila as the account's initial timezone; a travel/timezone override remains an open behavior rather than an assumed requirement. Keep the first release focused on PHP; other currencies/conversion remain future decisions.

Users may write their own records in any language. English-only applies to application-authored text, notifications, onboarding, and Finn's generated replies; Finn should not rewrite stored source entries simply to enforce the interface language. Handling ambiguous input remains part of the grounding design.

Use ordinary local expense examples such as food, transport, load/data, and bills, while letting users edit categories. Keep capture short and avoid unnecessary loading, images, and animation.

## 2. User requirements

| Area | Requirement |
| --- | --- |
| Platform | Mobile-first website; React JS frontend; PWA direction. |
| Core utility | Track useful everyday information, with reminders, notes, expense tracking, and a schedule/calendar direction. |
| Audience | General Filipino users. |
| Expense scope | Simple manual logging and summaries for the first version. |
| Finn actions | Advice plus proposed changes that require user confirmation. |
| Data/device approach | Accounts with sync across devices and offline core-record access, selected through delegated judgment. |
| Main feature | A built-in AI chatbot with context from entries across the app. |
| AI output | Clear answers and advice grounded in what the user has entered. |
| Product priorities | Navigability, UI, functionality, organization, and simplicity. |
| Visual quality | Unique, clean, simple, professional, intentionally designed. |
| Typography | Clean and readable. |
| Appearance | Both light and dark modes. |
| Iconography | No emojis. Icons are welcome; Lucide is a candidate. |
| Motion | Animations that support the experience. |
| Character | Finn is an animated 2D white Pomeranian with a witty, smart appearance. Glasses were suggested by the user and are the recommended accessory direction. |
| Localization | PHP, Asia/Manila, and English-only interface/Finn responses. |
| Product name | Daymargin, selected by the assistant under delegated naming authority. |
| Process | Document the discussion first and keep it in a new project folder. |

## 3. Proposed first-version scope

The working scope covers tasks, reminders, notes, simple expenses, an internal calendar, and Finn. The user explicitly accepted expense logging and summaries on October 11, after suggesting expenses and a schedule/calendar. Detailed calendar behavior, recurrence, and other feature interactions remain proposed. Habits are outside the current working scope.

| Feature | Proposed behavior | Purpose |
| --- | --- | --- |
| Quick capture | One entry point for a task, reminder, note, expense, or event; only relevant fields appear. | Capture an idea without navigating several screens. |
| Today | Show upcoming events and due items, a short next-action list, and restrained secondary information. | Make the next useful action obvious. |
| Tasks | Title, optional details, due date, and completion state. | Track actionable work. |
| Reminders | Due date/time, optional repeat rule, clear delivery status. | Help users remember time-sensitive items. |
| Notes | Title or first-line preview, body, search, optional tags, pinned items. | Keep everyday information easy to retrieve. |
| Expenses | Quickly record amount, currency, category, date, and optional description; show totals and category breakdowns. | Understand recorded spending with little entry effort. |
| Calendar | Agenda-first schedule with a month overview, event details, and due tasks/reminders. | See time commitments and deadlines together. |
| Library | Search entries, with clear Tasks, Notes, and Expenses filters and links to matching calendar records. | Find older information without cluttering Today. |
| Finn | Answer questions across entries, explain the evidence, and propose changes in a reviewable preview; apply them only after user confirmation. | Turn recorded information into useful guidance and approved actions. |
| Preferences | Light, dark, or system appearance; reminder preferences; AI context controls. | Give users clear control over the experience. |

**Proposed scope boundary:** Add a new tracker category only when there is a concrete user need. Simple expense logging and summaries are accepted. The internal calendar is part of the working scope, with detailed behavior still under discussion. Bank connections, external calendar sync, wellness, collaboration, and habit tracking remain separate possibilities, not agreed features.

### Expense tracking: accepted scope, proposed details

- Fast manual entry: amount and category up front, current date as a changeable default, optional description, and a clearly displayed currency.
- Browse recorded expenses by day, week, month, or custom range; see period totals and a simple category breakdown.
- Edit or delete an expense and immediately recalculate its totals.
- Accepted currency: PHP. Other currencies and conversion are outside the initial expense scope; do not add different currencies into a single unlabeled total.
- Keep scheduled bills distinct from paid expenses. A reminder that a bill is due does not prove that money was spent.

Budgets, income, receipt scanning, recurring bills, and bank imports are possible later additions. The first version should make manual logging and reviewing expenses effortless before adding those workflows.

### Schedule/calendar tracking: proposed first version

- Default to a readable agenda for mobile, with a compact month view for moving between dates.
- Events contain a title, date, start/end time or all-day status, timezone behavior, and optional location/notes. Selected recurrence design: one-off, daily, weekly, monthly; exact occurrence/series handling is specified in [Screen concepts](SCREEN_CONCEPTS.md).
- Show dated tasks and reminders alongside events using clear type labels. A task deadline does not automatically reserve time on the calendar.
- Surface overlapping timed events so users can resolve them. Editing a repeat offers This occurrence or The series and preserves exceptions; validate recurrence behavior before release.
- Open an item from Today or Calendar into the same underlying record; updates should appear consistently in both places.

Google/Apple calendar sync, shared calendars, and autonomous schedule changes are separate future decisions. User-confirmed schedule changes through Finn are allowed in principle; the supported operations still need definition.

### Why these additions fit

They give Finn context about time and recorded spending, alongside tasks and notes. For example, Finn could explain which categories account for more logged spending or identify a gap between recorded events. It should describe gaps as free according to the recorded calendar, and spending totals as logged expenses, because the app may not contain every commitment or purchase.

## 4. Navigation and information organization

**Selected mobile navigation under delegated design judgment:** Four labeled destinations: Today, Calendar, Library, and Finn. Calendar has a direct destination because planning dates is a distinct frequent action. Expenses have a clearly labeled view within Library, reachable in two taps from any destination. Preferences are accessible from a consistent header control. A consistent Add action offers the supported entry types.

- Today answers: What needs my attention?
- Calendar answers: What is planned, and when?
- Library answers: Where is the thing I saved, and what have I spent?
- Finn answers: What can I learn or do with this information?

Use one consistent entry language throughout the app. Notes, tasks, reminders, expenses, and events should share familiar editing and search patterns while retaining their own meaningful fields. An optional reminder can be attached to a task or note without creating two independently editable copies of the same content.

Keep forms short. Show secondary options when needed. Preserve unsaved input when moving between views. Make completing, undoing, editing, and finding entries predictable.

**Selected through delegated design judgment:** Optional tags and pins for the initial version; no nested folder system. Expenses use editable categories, and scheduled records use dates/times.

## 5. Distinct visual direction

**Selected direction under delegated design judgment: a calm daily notebook with an editorial structure.** Recognizable spacing, typography, and useful hierarchy should carry the identity.

- Light mode: warm paper surfaces, charcoal text, fine dividers, and a restrained muted green accent.
- Dark mode: deep charcoal surfaces, softened light text, and a corresponding muted green accent.
- Typography: Manrope with system sans-serif fallbacks, a small deliberate type scale, comfortable line spacing, and readable timestamps.
- Layout: a clear date and page title, grouped rows, selective cards where grouping helps, and generous space around the primary action.
- Icons: Lucide outline icons with text labels on main navigation, selected for the design direction.
- Motion: short transitions for navigation, expansion, completion, and chat responses. Respect reduced-motion preferences.
- Finn: an animated 2D white Pomeranian with an alert, witty, smart expression. Recommended accessory: small round charcoal glasses. Use pale grey/cream fur shading and a clear outline so the face remains visible in both themes. Keep his placement restrained in chat and selected onboarding moments.

Every decoration should earn its place. Avoid a repeated dashboard-card grid, decorative charts without a purpose, oversized mascot placement, excessive gradients, and unrelated visual effects. Custom copy and a deliberate daily flow should make the app feel specific to this product.

**Decided:** Finn is a white Pomeranian in an animated 2D style, with a smart and witty appearance.

**Proposed execution:** Thin round glasses, expressive eyes, and small purposeful movements. See [Brand and character brief](BRAND_BRIEF.md) for the visual reference specification.

**Selected:** Warm paper and dark graphite surfaces, a muted forest-green accent, Manrope typography, round charcoal glasses, and restrained Finn motion. See [Screen concepts](SCREEN_CONCEPTS.md) for screen-level execution.

**Created:** [Finn master drawing v1](../assets/finn/finn-master-v1.png), an original transparent 2D white Pomeranian with round glasses. The [generation record](../assets/finn/finn-master-v1.prompt.md) preserves the exact prompt.

**Remaining:** Consistent animation states, mobile-size readability/asset tuning, and implementation. The walkthrough's earlier schematic drawing is a separate concept placeholder.

## 6. Finn: AI behavior

**Required:** Finn analyzes entries throughout the app and answers user questions or requests for advice clearly.

**Required language:** English only for all generated replies.

**Updated user direction:** Finn is a smart, witty, supportive personal bro-dude character. He reacts warmly to what the user shares, uses natural “bro” or “dude” and cheeky humor, and offers fuller conversational replies for personal topics instead of cold technical one-liners. Snack-break and glasses quirks provide light character flavor. Stay gentle when needed and precise about saved facts and expenses. Random messages need no saved entries. English only, no emojis, shaming, exaggerated praise or forced catchphrases. The built-in voice examples and privacy-checked follow-up memory are specified in [Finn personality](FINN_PERSONALITY.md).

### Examples of the intended experience

- What should I focus on today? Finn considers due items, unfinished work, and relevant notes, then gives a short prioritized explanation.
- What did I write about my project last week? Finn finds matching entries within that date range and summarizes them with links back to the records.
- Have I been postponing anything? Finn uses recorded due dates, edits, and completion history when available. If the app has not recorded enough history, Finn says so.
- Help me plan tomorrow. Finn proposes a manageable sequence based on tasks and recorded events, and explains which details are assumptions.
- Where did my money go this month? Finn summarizes recorded expenses by category, using calculated totals and links to matching transactions.
- When can I fit in an hour for this task? Finn looks for gaps between recorded timed events, distinguishes due dates from reserved time, and explains any assumptions about availability.

### Proposed grounding contract

1. Retrieve relevant information from every supported entry type within the user's permitted scope. Do not rely only on the current screen or the last message.
2. Respect ownership, private/excluded entries, date ranges, and the user's timezone.
3. Link factual summaries to the entries used. Clearly distinguish recorded facts from inferred advice.
4. State when information is missing or conflicting. Ask a focused follow-up when that would materially improve the answer.
5. Use current saved data after an entry is edited or deleted. Define how linked responses behave when their source disappears.
6. Treat saved entry text as user data, including pasted text, rather than as instructions that can override Finn's behavior or access rules.
7. Show loading, retry, and failure states clearly. Preserve the user's question after a failed response.
8. Use application-calculated expense totals and calendar intervals for numeric answers. State the date range, currency, and relevant timezone rather than asking the model to invent totals or availability.
9. Do not treat an incomplete expense log as a full financial picture or an empty calendar as proof of availability. Advice should stay within the recorded evidence.

The request for answers without problems becomes a quality goal: accurate grounding, clear language, useful recovery, and honest uncertainty. It cannot be a promise that AI never makes a mistake.

### Accepted action authority

**Decided by the user:** Finn gives advice and can propose changes, but changes require explicit user confirmation.

**Proposed interaction:** Finn presents the exact action and affected fields, such as a reminder title and due time, or an event's old/new schedule. The user chooses Apply or Cancel. An ordinary chat question or suggestion does not count as approval to modify records.

Check the record again before applying a confirmed proposal. If it changed after the preview was shown, refresh the proposal instead of silently applying an outdated change. Show a clear result after success or failure. Keep manual entry available independently of Finn.

**Selected under delegated screen/workflow judgment:** Finn may propose creating or editing a single task, reminder, note, expense, or event, with an exact preview and explicit confirmation. Bulk changes/deletion and autonomous background edits are outside the initial design. See [Screen concepts](SCREEN_CONCEPTS.md) for action review and stale-proposal behavior.

## 7. Data and trust

Because the chatbot draws on personal records, context control is part of the product experience.

**Proposed:** Explain what Finn can access, allow selected entries to be excluded, support data deletion/export, and keep any AI service credentials on the server. Define whether chat history becomes future context. An excluded or deleted record should not keep influencing answers through retained derived context.

### Account and synchronization decision

**Decided through delegated judgment:** Accounts with cloud synchronization and offline access for core records. Users should be able to sign in on another device and retrieve their saved data. This adds backend work, which is justified by continuity for a general-user product.

**Proposed behavior:**

- Cache the signed-in user's available records on the device for offline reading; save supported offline creations/edits locally and mark them as waiting to sync.
- Distinguish Saved on this device, Waiting to sync, Synced, and Sync failed. Do not claim a record is backed up until synchronization succeeds.
- Retry queued changes when connected. Preserve conflicting changes for resolution instead of silently overwriting one version.
- Isolate every account's records and clear private cached data when signing out or switching accounts.
- Use the current account's permitted records for Finn. For the planned server-based AI, answering new questions and applying confirmed AI proposals requires connectivity; show a useful offline state.

**Updated by the user on October 11:** Vercel hosting and Neon. The user requested setup of the existing Finn-daily Neon project, then explicitly asked to connect Daymargin. Neon Auth and Neon Postgres replace the previously unconfigured Supabase account/database code. Finn connects to a hosted model API through a server endpoint.

**Required:** Finn's API usage must involve no payment and support lightweight everyday questions/tasks. Groq Free is the researched provider recommendation; keep paid upgrades and paid fallbacks outside this plan. Use short, on-demand answers over relevant permitted records. If free capacity is exhausted, explain that Finn is temporarily unavailable while core organizer features remain usable.

**Open:** Final AI model/account validation, optional guest use, retention implementation, private-entry controls, exact synchronization implementation, and account deletion behavior. See [Technical plan](TECHNICAL_PLAN.md) for the provider recommendation, zero-payment controls, selected services, and proposed mechanics.

## 8. Mobile and PWA requirements to define

**Required direction:** A mobile-first React JS app with a PWA-style experience.

**Decided direction:** Account-based sync and offline access for core records.

**Proposed implementation goals:** Comfortable one-handed use; layouts that handle the mobile keyboard and safe areas; installation support; saved appearance preferences; offline reading and supported editing of locally available records; clear connectivity and sync indicators.

Before implementation, decide and verify:

- Target browsers and devices, especially the intended Android and iPhone experience.
- Exactly what users can read, create, or edit offline.
- How offline edits are saved and reconciled across devices.
- What reminder delivery means: in-app reminders, notifications while open, delivery while closed, or another channel.
- What happens when notifications are denied or delivery is unavailable.
- How chat behaves without connectivity and how users retry.

PWA installation, offline use, reminder delivery, and online AI are separate behaviors. Document each supported behavior explicitly after platform verification.

React JS remains the selected frontend requirement; Vite is proposed for builds. Vercel and Neon are selected for hosting and backend/account data. Finn requires a zero-payment API; Groq Free is recommended, with the final model and account access to validate.

**Required permission flow:** A notification permission pop-up following a user action. Show a brief explanation, then use Enable notifications to invoke the native browser prompt. Granted/denied/deferred states and subscription setup must be explicit. Scheduled closed-app reminders need server dispatch and a service worker/push subscription; permission alone is not the delivery system. The [Technical plan](TECHNICAL_PLAN.md) records the flow and platform guidance.

## 9. Proposed acceptance criteria

- A user can capture an entry, find it later, and act on it without learning a complex navigation system.
- Today surfaces relevant items and has a useful empty state without filler content.
- Editing and deleting entries update the views and Finn's available context consistently.
- Both themes remain readable across forms, navigation, statuses, dialogs, and chat.
- Main actions have clear labels, accessible focus behavior, readable contrast, and comfortable touch targets.
- Animations support orientation and respect reduced-motion preferences.
- The app contains no emojis.
- Application-authored copy, notifications, and Finn replies are English-only; original user records are preserved.
- Expense displays use PHP and initial schedules/reminder interpretation use Asia/Manila consistently.
- Finn appears as a smart, witty animated 2D white Pomeranian; reduced-motion mode supplies a still alternative.
- Finn can answer questions spanning different supported entry types and link to the records behind factual summaries.
- Finn handles missing information, conflicting entries, excluded records, stale records, and failed requests clearly.
- Finn never modifies a record before the user confirms a specific preview; cancelled or stale proposals do not change saved records.
- Signing in on another device retrieves synchronized records, with account data isolated from other users.
- Offline saves show a pending state; reconnecting synchronizes them or presents a clear retry/conflict state. Signing out removes private cached records.
- Expense totals update after edits/deletions, use the selected date range, and keep currencies explicit.
- Calendar, Today, and linked records agree after date or time changes. Due dates and scheduled time remain distinguishable.
- Finn's spending and scheduling answers match calculated records and describe limits in the available data.
- Reminder delivery and offline behavior match the documented device support.

## 10. Next discussion

Audience, expense depth, Finn's confirmation requirement, account/sync direction, localization, naming, visual direction, screen structure, and Finn's styling are settled through user decisions and delegated design judgment. [Screen concepts](SCREEN_CONCEPTS.md) defines the main/supporting pages, capture, recurrence, reminder-channel direction, and AI action review. A mobile concept walkthrough accompanies the discussion.

Next: an implemented mobile prototype and integrations based on the [Technical plan](TECHNICAL_PLAN.md). Vercel and Neon are selected, the native notification-permission flow is defined, and Finn's first master drawing is created. Free AI account/model validation, completed animation, real-device notification verification, and tested synchronization mechanics remain outstanding.
