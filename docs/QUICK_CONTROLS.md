# Quick entry, expense categories and appearance controls

October 12, 2026, Asia/Manila. Local revision for review.

The user requested removal of the separate Calendar expansion control, an Add
entry chooser on Calendar, all expense categories and a top-bar theme icon.
The existing date heading still opens the full month picker. See
[Calendar entry integration](CALENDAR_INTEGRATION.md) for the shared record flow.

## Expense categories

The old category field was an editable input with a datalist. Because its default
value was Other, browser suggestions could be filtered down to that matching
value. The options existed in code but were not all clearly discoverable.

A native dropdown now always offers Food, Transport, Bills, Shopping, Load/data,
Other and Custom category. Choosing Custom category opens a separate labeled
text input, with the existing 60-character/required-category validation. Saved
custom categories and drafts reopen in that custom field; selecting a standard
category replaces it. No existing category names or expense records are rewritten.

## Top-bar appearance

The top bar has a sun/moon icon next to Settings. In light mode, the moon action
says Switch to dark mode; in dark mode, the sun action says Switch to light mode.
Visible app pages, including editors, share this control. It calls the existing
preference writer, so the choice survives refresh and Settings shows the same
selection. While Device is selected, the icon follows actual device appearance.
Using the toggle selects an explicit Light or Dark preference; Device remains
available in Settings. Reduced-motion and other preferences are preserved.

## Verification and release

Browser checks cover all Calendar chooser options and selected dates, month-picker
keyboard/date/focus behavior, category option visibility and standard/custom values
through save/edit/reload, theme choice persistence, Device appearance changes,
browser theme-color and mobile/tablet/desktop overflow. They use isolated preview
records and mocked account sessions. Final results appear in
[Implementation status](IMPLEMENTATION_STATUS.md). This update remains local;
the user has not requested a commit, push or deployment for this revision.
