# Calendar — focused interface revision

October 11, 2026, Asia/Manila. Local implementation for review.

The user requested the next page after Today. Calendar continues the shared theme, local Manrope typography and Lucide icons.
The subsequent [color revision](COLOR_SCHEME.md) uses yellow/white in light mode
and red/near-black in dark mode. The
revision is scoped to Calendar and preserves the earlier Today work. No commit,
push or deployment is authorized for this page-by-page UI review.

## Concept

“Your calendar.” A clear week above a readable daily agenda. Time commitments
and deadlines have different places, with no additional main navigation.

1. A concise header keeps Add event visible. It opens the existing editor with
   the selected date, including future and past dates.
2. The Monday-first week strip supports previous/next week, Today and direct day
   selection. Filled dots indicate events; outlined dots indicate outstanding
   tasks or reminders. Accessible date labels include the actual counts.
3. The month button opens a full date picker with previous/next month, adjacent
   month dates, Today and a native direct-date input. Arrow keys, Home/End and
   Page Up/Down browse dates with one date in the keyboard tab order. Enter
   selects. Escape/close returns focus to the month button.
4. The selected-day heading summarizes events and outstanding due items. The
   agenda places all-day commitments first, followed by timed plans showing
   start and end in 12-hour format. Location, recurrence and actual overlap
   labels remain visible. Opening a plan preserves its selected occurrence.
5. Due this day groups tasks separately from standalone and attached reminders.
   Completion updates the counts and date markers; completed tasks stay visible
   for reopening. Undo uses the existing saving flow. Attached reminders open
   the source record's date when an alert precedes that record.
6. Empty days offer event creation without claiming missing data proves free
   time. Tasks and reminders have their own concise empty states and selected-
   date creation links. Reminder display does not promise push delivery.

## Typography and layout

The main heading follows Today's 600-weight, 36–52px desktop / 37px phone scale.
Selected-day titles use 24–27px; section titles use 17px; record titles use
13–15px. Times and dates use tabular numerals. Thin dividers, restrained date
markers and a simple agenda rail provide organization without dashboard cards.

Desktop uses an agenda column with a narrower due-items column. Tablet and
mobile follow one reading order. Date navigation and creation controls retain
44px minimum heights. Titles and locations wrap, both themes inherit the app's
colors, and existing motion preferences apply. No font service, dependency,
backend or schema changes are introduced.

## Record behavior

The date URL remains shareable/bookmarkable as `/calendar?date=YYYY-MM-DD`.
The current Manila day refreshes each minute while visible and on returning to
the page. Explicit date selection stays selected across midnight. The agenda
uses existing daily/weekly/monthly projections, exception edits and cancellation
rules. Monthly navigation clamps a day to the destination month's last day.
Deleted or completed alert sources are omitted; ordinary dated completed tasks
remain available for reopening. Expenses and notes only appear here through
their explicit attached reminder, never as calendar time blocks.

## Validation and release

Logic checks cover year boundaries, short/leap months, recurring exceptions,
all-day/timed grouping, overlap rules and source-linked alerts. Isolated browser
checks cover keyboard/date navigation, selected-date event capture, completion /
undo, empty states, long content, and light/dark layouts at 360, 390, 768 and
1440px. Local screenshots were inspected on phone and desktop in both themes.
Final check results are recorded in [Implementation status](IMPLEMENTATION_STATUS.md).

Review locally at `http://127.0.0.1:5174/calendar`. The deployed website retains
its prior Calendar UI until the user explicitly requests commit/push/deployment.
