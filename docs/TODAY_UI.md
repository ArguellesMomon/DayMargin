# Today — focused interface revision

Current palette: yellow/white light mode and red/near-black dark mode. The subsequent [color revision](COLOR_SCHEME.md) supersedes earlier green color references below.

October 11, 2026, Asia/Manila. Local implementation for review.

The user requested a page-by-page UI review starting with Today: simpler,
better-organized, more dynamic and immersive, with careful typography. They
explicitly require approval before any Git commit, push or deployment. This
revision stays local and changes only the Today screen, its data presentation,
related checks and documentation.

## Concept

“Your day, in view.” Today is one readable daily page, with immediate attention
on the left and supporting thoughts on the right. It retains Daymargin's warm
paper / graphite palette, muted green, local Manrope fonts and Lucide icons.
It avoids adding charts, badges or generic dashboard cards without a purpose.

1. A personal greeting and Manila date establish the day. Add an entry stays
   visible in the header and opens the existing capture flow.
2. One compact overview links directly to tasks, the timeline and today's
   recorded expenses. Amounts remain exact PHP centavos, with the entry count.
3. A next-focus highlight shows a recorded event in progress, the next timed
   event/reminder, or an all-day commitment. If no plan remains, it surfaces the
   first open task; if neither exists, it offers a simple plan action.
4. Your next steps keeps overdue, today's and undated open tasks visible. The
   list is capped at seven rows with an explicit link to all tasks. Completion,
   independent record navigation and Undo retain the existing save behavior.
5. Today's timeline combines calendar events and standalone/attached reminders
   in time order. All-day records come first. Actual ongoing events get Now;
   earlier records stay readable. Reminder time never implies confirmed delivery.
6. A quiet Finn panel transfers the day's question into chat. Recent notes show
   pinned items first, with short previews and a direct new-note action.

## Typography and mobile layout

The heading uses a 600 weight with a 36–52px desktop scale and 37px phone size.
Section titles use 17–18px with restrained tracking. Task titles use 14px,
with readable secondary dates; amounts and times use tabular numerals. Small
uppercase labels are limited to the focus highlight and Finn's supporting label.
No new font service or dependency is required.

On desktop, main work and supporting notes/Finn occupy two columns. On tablet,
supporting sections form a second row. On phones, everything follows a single
reading order. Actions retain comfortable touch areas; long titles, names and
amounts can wrap. Colors and CSS are scoped to Today so other screens keep their
current design. Finn's established sprite and reduced-motion behavior continue.

## Dynamic behavior and record correctness

The page recomputes as records change and refreshes its clock each minute while
visible, or when returning to the page. Dates and current-plan decisions use
Asia/Manila, including midnight rollover. Recurring exceptions and occurrence
titles are respected, cancelled occurrences are omitted, and completed/deleted
sources do not contribute alerts. Attached reminders keep their source record
link; no duplicate records or AI calls are created by the overview.

## Review status

The first local pass was inspected on mobile and desktop in light and dark mode.
Checks cover task completion/undo, capture, Finn question handoff, empty states,
current-event/reminder ordering, recurrence exceptions, exact totals and Manila
rollover. Final results are recorded in [Implementation status](IMPLEMENTATION_STATUS.md).

Nothing has been committed, pushed or deployed for this revision. The existing
local Daymargin server is available at `http://127.0.0.1:5174/`. Development preview
uses isolated sample entries; production accounts continue using their own records.
