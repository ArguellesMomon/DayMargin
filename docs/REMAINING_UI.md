# Remaining screens — complete interface review

Current palette: yellow/white light mode and red/near-black dark mode. The subsequent [color revision](COLOR_SCHEME.md) supersedes earlier green color references below.

October 11, 2026, Asia/Manila. Local implementation for review.

The user requested all remaining pages after Today and Calendar. The earlier
restriction still applies: no staging, commit, push or deployment until explicitly
requested. This pass completes Library, its task/note/expense views, Finn chat,
all five entry editors, record details, Settings, welcome, sign-in, sign-up,
password recovery/update, first-time setup, and shared capture/review dialogs.

## Shared direction

Manrope, warm paper / graphite surfaces, muted green, thin dividers, Lucide icons
and comfortable touch targets continue across the product. Headers follow
Today's 600-weight scale; ordinary content stays lighter and readable. New
styling lives in `src/workspace-ui.css`, scoped to the remaining screens except
the shared dialogs. Today and Calendar retain their own page styles. There are
no new visual assets, dependencies, emoji, paid services or backend changes.

Supporting entry pages keep their parent destination highlighted. Dialogs
restore focus to their opening control when it remains available. Existing
system and app reduced-motion settings continue to apply to all motion, including
Finn's unchanged supplied spritesheet.

## Library, tasks and notes

A search shelf, four entry-type tabs and contextual secondary filters lead to
dated groups. Pinned records appear first, and the All entries view explicitly
labels each record type. Notes retain their preview; tasks keep independent
completion controls; amounts stay aligned. Search and type/status/tag/category
filters live in the URL. Opening a result, editing it and returning to Library
preserves the original filter selection. Reload also preserves filters. Empty
search results offer Clear filters rather than suggesting another entry is needed.

Recurring-task status checks the current occurrence rather than classifying the
whole series as completed because an older occurrence was finished. Historical
completion dates remain stored. Calendar remains the place to inspect/edit a
specific occurrence.

## Expenses

One prominent exact PHP total labels its range and record count. Directly labeled
category bars double as category filters; no budget or invented comparison is
added. Date-grouped entries, Today/Week/Month/Custom ranges and the existing Finn
handoff remain available. Search/category filtering affects the entry list while
the summary stays the clearly labeled full selected-period total. Maximum amounts
and long category names can wrap. Amount, category and date precede optional
description in expense capture.

## Finn

A compact identity header opens the existing conversation controls. The empty
conversation shows the supplied animated dog, “What’s on your mind?”, warm bro
copy and three purposeful starters for planning, spending and motivation. Starter
questions fill the composer without calling the model automatically. The empty
screen opens at its top instead of scrolling the mascot away.

Messages have a comfortable reading width and paragraph spacing. Saved-entry
references remain plain linked sources, and proposal review retains exact fields,
old/new values, Cancel and Apply. The composer stays outside the scrolling
conversation, above mobile navigation. Busy text, immediate explicit retry,
failed-question retention, follow-up receipts and the confirmation requirement
remain unchanged. No delay, cooldown or automatic provider request is introduced.

## Entry editors and details

Each form has a type-specific header, essential fields first and a clear Save /
Close row with draft status. Notes have a spacious writing area and small heading /
list/checklist tools. More options holds tags, Finn exclusion, optional attached
reminders and note pinning. Existing nonempty optional fields open it immediately;
validation opens it if an optional field needs correction. The existing immediate
draft persistence, recurrence scope selection, permission flow and server
validation remain connected.

Details give the title or amount, metadata and body a clear reading order. Edit,
completion and Ask Finn have primary action placement; pin, exclusion and deletion
remain a quieter secondary row. Saved status and reminder delivery wording remain
accurate. Long titles/body/tags wrap. Delete/Undo and source links preserve their
existing record behavior.

## Settings

Section links jump to Appearance, Reminders, Finn and Account/data. Desktop uses
two readable columns for related preference groups; mobile uses one column.
Appearance choices and motion controls remain explicit, with English/PHP/Manila
defaults shown as fixed defaults. Permission setup stays actionable in unavailable
or denied browsers. Test notifications and scheduled delivery remain distinguished.

Finn's context explanation now matches the implemented three-exchange follow-up
behavior rather than the old claim that previous exchanges never contribute.
Exclusions, sync/conflict controls, export, protected sign-out and account/data
deletion retain their existing behavior and confirmations.

## Welcome and accounts

Welcome keeps one clear Get started action and Sign in, with a notebook specimen
explicitly labeled as illustrative. Three restrained icon lines describe plans,
notes and recorded spending. Desktop account pages place the compact form beside
a quiet Daymargin/Finn introduction; phones give the form full space. Sign-in,
sign-up, recovery and password-update controls retain their existing labels and
handlers, password visibility, account notice and visible errors. Setup has a
short introduction and a clearly grouped localization summary.

## Verification and limits

Isolated browser checks use local preview or synthetic mocked sessions; no real
account registration, record mutation or model call is needed for this UI pass.
Checks cover filter persistence, optional-field validation, drafts, CRUD/Undo,
exact centavos, both themes and 360/390/768/1440px layouts, composer placement,
account form/error recovery, Finn retry/follow-ups, sprite pixels and notification
setup. Production service-worker scenarios require a built preview and are skipped
on the development server. Native mobile keyboards, real-device rendering and
closed-app notification delivery are not established by desktop Edge checks.

Local screenshots include light mobile/desktop, dark mobile, welcome/accounts and
setup. Final results are recorded in [Implementation status](IMPLEMENTATION_STATUS.md).

Review at `http://127.0.0.1:5174/`. This entire UI revision remains local.
