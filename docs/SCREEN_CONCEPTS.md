# Daymargin — Screen concepts and Finn

Created October 11, 2026, Asia/Manila. Design specification selected under the user's instruction to decide the screen and character concepts. It defines intended behavior; it is not a claim that the application has been implemented.

An initial coded version now follows this specification. See [Implementation status](IMPLEMENTATION_STATUS.md) for the exact coverage and limits, including the first build's manual-only repeating-series AI edits and unfinished scheduled push delivery.

**Complete local UI review — October 11:** After reviewing Today and Calendar, the user requested all remaining pages. Library now uses dated/pinned groups and URL-persisted filters; expenses have a clearer period summary; Finn has a warmer opening and readable conversation; forms put essentials before More options; details, grouped Settings, welcome, account/recovery and setup screens follow the same Manrope hierarchy. Shared dialogs and parent navigation are also refined. See [remaining screen designs](REMAINING_UI.md) for the current implemented concepts and checks. These local revisions supersede the earlier layout descriptions where different; feature authority, record privacy, recurrence and confirmation rules remain applicable. No commit, push or deployment is authorized by this UI request.

## 1. Overall concept

Daymargin is a personal daily notebook that connects plans, notes, and spending. The interface should make capture and finding information feel immediate. Today answers what matters now; Calendar shows time; Library holds records; Finn helps interpret them.

**Selected design direction:** Yellow and white in light mode, red and near-black in dark mode, fine neutral rules, and a small margin marker for section grouping. Rows carry most information; panels are reserved for summaries and action previews. Use Manrope for clean sans-serif typography, with system sans-serif fallbacks. Titles are confident without being oversized. Amounts and times use aligned numerals.

Light: white entry surfaces, a near-white background, charcoal text and warm yellow primary actions. Dark: near-black background, charcoal surfaces, soft light text and red primary actions. Dark amber/light red handle accent text for contrast; see [Color scheme](COLOR_SCHEME.md). Both themes preserve the same hierarchy, spacing, and actions. The accent identifies selection and primary actions; status always includes words.

**Selected navigation:** Four persistent labeled destinations: Today, Calendar, Library, Finn. Settings opens from the header. Add is a contextual action, not a fifth navigation destination. On narrow screens, secondary filters wrap instead of squeezing text.

**Selected organization:** Optional tags and pins initially; no nested folder system. Expenses use editable categories. Calendar entries use dates and times. Search spans supported record types and clearly labels each result. The main navigation remains stable when opening a supporting page; the active destination reflects its parent.

## 2. Welcome

**Purpose:** Explain the product in one glance before account creation.

**Concept:** A simple Daymargin wordmark, a short descriptor, one compact composition of an agenda line, note, and peso amount, and a small Finn illustration. One primary button: Get started. A secondary Sign in link is clearly visible.

**Copy direction:** Your day, kept in order. Supporting text explains notes, plans, and expenses in one sentence. Avoid a lengthy feature carousel.

**Flow:** Get started opens Create account. Sign in opens the returning-user flow. Support pages remain readable in both themes without main app navigation.

## 3. Sign in and create account

**Purpose:** Give users a reliable way to access synchronized personal records.

**Concept:** The same clean form layout for sign-in and registration: email, password, an explicitly labeled password-visibility control, and one submission button. Registration adds a display name and required account notices. Password recovery has its own short form and a clear return link.

**Selected product direction:** Email/password accounts for the initial design. Neon Auth now implements this flow, superseding the earlier Supabase selection after the user requested the Neon connection. Alternative sign-in providers can be evaluated later.

**Behavior:** Preserve non-sensitive form fields after errors. Use specific field errors and a clear submitting state. First sign-in/account creation requires connectivity. Do not cache passwords as ordinary app records. Completing registration opens setup; returning users open Today.

## 4. First-time setup

**Purpose:** Set essential defaults with minimal effort.

**Concept:** One short page with display name, PHP currency, Asia/Manila timezone, English language, and appearance choice: System, Light, Dark. Show selected localization as clear defaults; avoid implying language or currency options that the first release does not support.

**Flow:** Continue opens Today. Introduce Finn with one sentence explaining that he uses permitted saved records and proposes changes for confirmation. Notification permission is requested later when a user creates a reminder, after explaining the benefit. Installation guidance is contextual rather than a mandatory setup step.

## 5. Today

**Purpose:** Help users decide what to do next.

**Current local concept:** A personal greeting and Manila date under “Your day, in view.” One compact overview links to tasks, the combined timeline and recorded spending. A next-focus highlight shows an ongoing/next recorded plan or the first open task. Your next steps and Today's timeline form the main reading order; Finn and Recent notes provide a quieter supporting column on desktop and follow below on mobile. See [Today UI revision](TODAY_UI.md). This revision is local for review and has not been committed, pushed or deployed.

**Actions:** Add opens quick capture. Tapping an event opens its details. Tasks have a completion control plus an independent detail action. Ask Finn transfers a question into chat without pretending an answer already exists.

**Behavior:** Overdue tasks retain their due dates. All-day events remain clearly labeled, recurring exceptions are respected, and reminders appear at their actual scheduled times. The current-plan highlight refreshes with Manila time. Completion updates the overview and provides Undo. Empty states suggest a useful action. Existing connection/sync feedback is retained. Today remains curated, with a seven-task limit and a link to the full task list.

## 6. Calendar

**Purpose:** Make time commitments and available gaps understandable.

**Concept — local UI revision:** A Monday-first week strip selects dates and marks events versus outstanding tasks/reminders. Previous/next week and Today sit beside a month button that opens a navigable month grid, keyboard date browsing and direct-date input. The selected-day heading summarizes events and outstanding due items. All-day plans sit above a timed agenda with aligned 12-hour start/end times, locations, repeats and overlap labels. A separate Due this day column groups tasks and standalone/attached reminders; on phones it follows the agenda. Typography and colors continue the Today revision. See [Calendar UI](CALENDAR_UI.md). This revision remains local pending explicit commit/push authorization.

**Actions:** Select a date, browse the month, open an event, or create an event/task/reminder for the selected date. Each overlapping event shows a clear label and opens its occurrence details. Task completion updates date indicators and outstanding counts; completed tasks stay visible for reopening and Undo. Attached reminders link to their source record. Editing uses the same event record shown on Today.

**Selected first-release behavior:** One-off and daily/weekly/monthly repeats. A repeating-series edit asks whether to change This occurrence or The series, shows the effect, and preserves exceptions. For a monthly day absent from a month, use that month's last day and explain this in the recurrence preview. Recurrence implementation must validate these rules before release.

**Event details:** Title, date, start/end or all-day status, location, notes, optional reminder, repeat rule. Show Asia/Manila consistently. A due task is not automatically a time block. No event-sharing or external calendar synchronization in the initial design.

## 7. Library

**Purpose:** Find and organize everything saved.

**Concept:** Search at the top, followed by All, Tasks, Notes, Expenses filters. Display type-labeled rows with title, relevant date/amount, and a short preview. Pinned items come first; the remaining records have clear date groups. An event found through search links to Calendar details.

**Actions:** Search text, choose a type, use optional tag/date filters, open a record, pin an item, or add an entry. Remember the current search/filter when returning from details.

**Behavior:** Clearly distinguish an empty library from no search results. Explain when offline search includes only records available on the device. Type-specific pages are accessed here without adding more main navigation tabs.

## 8. Tasks and reminders

**Purpose:** Keep actionable items and alerts organized together.

**Concept:** A focused list with Open, Completed, and Reminders filters. Each task shows a title and optional due date/reminder. Reminders show their scheduled time and delivery status in text. Optional tags provide light organization.

**Editor:** Title first; details, due date, reminder, and repeat options below. A standalone Reminder remains available in Add for an alert that does not need a completion goal. An attached reminder points to its source note/task/event rather than creating an independently editable duplicate.

**Behavior:** Editing due dates updates Today and Calendar. Completion preserves history for later questions. Show Undo for completion/deletion when feasible. Repeating tasks preserve each occurrence's completion history. First-release reminder channels are in-app status plus device notifications when supported and permitted. The user explicitly requires a native browser permission pop-up; show an Enable notifications action before invoking it. Closed-app delivery uses the proposed scheduled Web Push architecture and requires device verification. Show unavailable/denied states clearly.

## 9. Notes and note editor

**Purpose:** Capture useful information without a complicated writing tool.

**Concept:** Notes appear as a title and one-line preview with pin/tag metadata. Opening a note gives the content most of the screen: an optional title, comfortable paragraph spacing, and a simple toolbar for basic headings, lists, and checklists. No bulky formatting ribbon.

**Actions:** Write, save, pin, assign tags, attach a reminder, or Ask Finn about this note. On mobile, the editor expands into a full page so the keyboard does not leave a tiny writing area.

**Behavior:** Show Saved on this device or Synced accurately. Preserve drafts when navigating away. Private/excluded-from-Finn is a clear record setting. If the title is blank, use a first-line preview. Failed saves keep the text available for retry.

## 10. Expenses

**Purpose:** Make logging and understanding recorded spending quick.

**Concept:** A selected period, one prominent recorded-spending total, a compact category breakdown using directly labeled bars, and a date-grouped expense list. Amounts align on the right. Start with the current month; support Today, Week, Month, and a custom range.

**Capture:** PHP amount first, category second, date defaulted to today, description optional. Suggested editable categories: Food, Transport, Bills, Shopping, Load/data, Other. Do not require payment-method or receipt fields.

**Actions:** Add, edit, delete, change period, select a category to filter its entries, or ask Finn about the selected period. A detail view shows amount, category, date, description, and sync/context settings.

**Behavior:** Summaries label their range and include only recorded expenses. Recalculate after edits/deletion. Invalid/negative amounts need specific guidance; refund modeling is outside the initial expense design. No budget gauge is shown because budgets are not part of the accepted first version.

## 11. Quick capture

**Purpose:** Reach the right entry form from any main workflow.

**Concept:** A bottom sheet with five labeled choices: Task, Reminder, Note, Expense, Event. Each choice has one Lucide icon and a short description. Selecting a type opens only that type's required fields. Notes use a full-page editor; short forms use an expanded sheet or full page when the keyboard needs space.

**Behavior:** Default dates from the current context and show them explicitly. A form opened from Calendar uses the selected date; a form from Today uses today. Keep drafts if users switch types. Provide a clear close action and an unsaved-change choice where needed.

The Add trigger sits in the page header/action area and remains accessible within reach; do not float it over chat's composer or cover bottom navigation.

## 12. Record details and editing

**Purpose:** Keep each record's full information and available actions predictable.

**Concept:** A back control, type label, title or amount, primary content, then date/tag/reminder information. Secondary actions are Edit, Pin where appropriate, Exclude from Finn, and Delete. Use the same layout language for tasks, reminders, expenses, and events, with meaningful differences in fields.

**Behavior:** Return to the originating screen with its selection preserved. Save changes to one record so Today, Calendar, Library, summaries, and Finn's permitted context agree. Deleted source links explain that the entry is no longer available rather than inventing its old contents.

## 13. Finn chat

**Purpose:** Help users interpret their records and decide a next action.

**Concept:** A compact header with Finn's avatar, name, and chat-history access. Before a conversation, show three starter questions: What needs my attention today? Summarize my spending this month. I need a little motivation. Personal messages get warm, conversational paragraphs; saved-entry answers include source links and clear facts. The composer stays usable above the keyboard.

**Response structure:** A clear answer first, a short explanation, linked supporting entries, then an optional proposed action. Show which period and records were considered when relevant. Do not turn every response into a large card.

**Selected action scope:** Finn may propose creating or editing tasks, reminders, notes, expenses, and events, including task/event schedule changes. Finn proposes all field values and never writes until confirmation. Initial AI actions operate on a single record at a time; bulk deletion and autonomous background changes are outside this design. Manual editing stays available.

**Behavior:** Current permitted records form the context, including expenses and schedule information. Excluded records do not influence answers. Expense numbers come from application calculations. New replies need connectivity in the planned server-based AI design; users can read cached chats offline. Label stale time-sensitive advice when revisiting old chat and offer a refresh. AI failures preserve the question and provide Retry.

**Zero-payment scope:** Finn handles lightweight everyday questions and fuller personal conversation. Call the model on demand with bounded context; greetings and simple facts can stay brief. Errors preserve the question and provide explicit retry, with known timing when available and no forced countdown. Ordinary organizer screens stay usable. Groq Free is connected; no payment prompts or paid fallback exist. Account-specific capacity and broader model quality need ongoing validation.

## 14. Finn action review

**Purpose:** Make AI-proposed edits concrete and controllable.

**Concept:** A small review panel opened from the proposed action. Show the record type, all values to be created or changed, old/new values for edits, and exact PHP amounts or dates/times. Two actions: Apply change and Cancel.

**Behavior:** Chat wording alone does not apply a change. Validate ownership, fields, connectivity, and record freshness when Apply is pressed. If the underlying entry changed, show the refreshed preview and require confirmation again. Disable duplicate submissions. Report completion or preserve the preview for retry. Link to the saved record after success.

## 15. Settings, account, and data

**Purpose:** Provide control without filling main screens with configuration.

**Concept:** A grouped list: Appearance; Reminders; Finn and context; Account and data. Appearance offers System, Light, Dark and a reduced-motion preference. Localization shows English, PHP, Asia/Manila. Account shows sign-in identity and sync state. Finn settings explain context access and allow inspecting excluded records.

**Data subpage:** Show last successful sync, pending changes, and any conflicts with specific resolution choices. Offer export and account/data deletion with a clear explanation of effect. Before signing out, surface unsynced changes and allow the user to sync or export them; do not silently discard drafts/pending records. Then remove private local records from the device.

**Notifications:** Show permission/channel status and a way to adjust supported reminder behavior. Ask for permission when needed. Missing capability is explained on the setting itself. An installation help entry appears only where useful.

## 16. Shared states

Every screen needs a usable empty state, purposeful loading state, saved/pending/failed status, and a recovery path. Never use unrelated sample records as production filler. Touch targets, focus states, text labels, contrast, and keyboard layout are part of the design. Preserve draft content and navigation context. Motion should acknowledge a change without delaying it; reduced-motion mode keeps all information available.

## 17. Finn: character concept

**Selected appearance:** A small animated 2D white Pomeranian with round charcoal glasses. Fluffy cheeks and chest, upright ears, a compact muzzle, soft cream/grey fur shading, attentive eyes, and a slight knowing smile. The glasses have clear lenses and a thin bridge so expressions stay legible. No costume is needed; the silhouette, eyes, and frames provide the identity.

**Personality:** Smart, warm, cheeky, and a personal bro-dude character. Finn reacts to what the user shares, uses natural “bro” or “dude,” and has light snack-break/glasses quirks. Personal topics usually get two or three conversational paragraphs rather than a technical one-liner or task checklist. He stays precise for expenses and gentle for difficult moments. English only, no emojis or shaming. Recent exchanges can support follow-ups after server privacy checks; see [Finn personality](FINN_PERSONALITY.md).

**Placement:** Small avatar in chat; a larger drawing only in welcome/setup or an empty chat. He does not interrupt logging or sit over controls. In light mode, shading defines the white silhouette; in dark mode, the same white fur carries the character without a glow.

**Animation:** Occasional blink while idle, brief head tilt while thinking, a small nod after a confirmed successful action. One glasses adjustment can mark thinking occasionally. Written status always accompanies important states. Provide a still pose when reduced motion is enabled. Do not present a mascot animation as proof that an AI action succeeded.

**Example reply:** You have two tasks due today. I would start with the application form because it is due at 3:00 PM. Your recorded calendar has a gap from 1:00 to 2:00 PM. Would you like me to prepare a reminder?

**Asset production later:** Master drawing, compact avatar, still pose, and the few animation states. Check actual mobile sizes and both themes before finalizing. The concept walkthrough illustrates placement and expression; it is not the finished mascot artwork.

## 18. What these decisions settle

The four main destinations, supporting screens, initial organization, general visual direction, first-release recurrence rules, reminder-channel direction, Finn's supported single-record actions, and the character styling are selected through the user's delegated design instruction. Vercel and Supabase were initially selected by the user; the account/database choice was subsequently changed to Neon, and the native notification-permission pop-up is required. Finn must use a zero-payment API for lightweight everyday assistance; Groq Free is recommended. [Technical plan](TECHNICAL_PLAN.md) defines the architecture, AI controls, and permission/delivery flow. [Finn's master drawing](../assets/finn/finn-master-v1.png) is now created. Free AI account/model validation, animation assets, real-device notification support, and further mobile synchronization verification remain outstanding; live Neon synchronization is now implemented and tested.

## Supplied spritesheet decision — October 11, 2026

The user chose to keep `samo.zip`'s spritesheet for Finn after reviewing how it differs from the original design. The current runtime appearance is a fluffy white dog without glasses; the ZIP metadata calls the source character Samo, a Samoyed. Daymargin retains the name Finn and his warm personal bro-dude voice. This decision supersedes the earlier Pomeranian-with-glasses asset direction below. The master PNG and generation record remain as design history.

The original WebP is used unchanged with a mapped idle blink, thinking/head tilt, and one brief wave after a successful new reply. Written status remains visible, reduced-motion preferences keep Finn still, and the PWA caches the sheet for offline screens. Source fringe pixels remain in the supplied artwork. See [sprite asset record](../assets/finn/spritesheet.md).
