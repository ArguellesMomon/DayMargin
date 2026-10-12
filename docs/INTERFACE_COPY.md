# Interface copy cleanup

October 12, 2026, Asia/Manila. Local implementation for review.

The user felt the app had too much text and asked to remove unnecessary copy,
specifically citing Calendar's “Things to do and remember, without blocking your
time.” The interface now prioritizes headings, records and actions.

## Current direction

- Page headings use Today, Calendar, Library, Expenses and Settings. Forms use
  New/Edit followed by the entry type; account pages use their actual action.
- Remove decorative eyebrows, recurring taglines, explanatory page subtitles,
  sidebar slogans, duplicate item captions and ordinary empty-state paragraphs.
- Empty states identify what is missing, with a short action where helpful:
  No events, No open tasks, No entries yet or No matching entries.
- Capture shows icons and type labels under Add entry. Descriptions of obvious
  record types are removed; Calendar still offers Event, Task and Reminder.
- Today keeps its greeting, actual date/counts, overdue information, plan times,
  locations and note content. The Finn card uses his name, mascot and Ask Finn.
- Finn keeps his mascot, questions, messages, sources and action review. His
  opening screen no longer repeats taglines or paragraphs. The server personality
  and actual replies are unchanged.
- Settings keeps controls and real status. Finn's context explanation is under
  How Finn uses your entries rather than expanded by default.
- Welcome uses one concise product sentence and an explicitly illustrative
  notebook. Repeated feature slogans and footer taglines are removed.

Keep information that affects decisions: input labels, optional-field labels,
dates, PHP amounts, localization, record content, errors, save/sync/offline status,
recurrence exceptions, notification setup/limitations, account data handling,
unsynced-work warnings and confirmation before applying or deleting. Shorter
copy does not remove a function or rewrite user records.

## Layout and verification

Headers and buttons share a row on phones where possible. Removing an eyebrow
must not leave space for an old absolute-positioned action or create an overlap.
The sidebar and Finn card spacing are adjusted for their shorter content.

Existing browser checks are updated to the shorter visible headings and capture
labels. They continue testing saving, category selection, drafts, Calendar return
paths, theme preferences, notifications, account form recovery, Finn proposals and
responsive layout. Sample data and mocked accounts/AI avoid production writes.
Final results are recorded in [Implementation status](IMPLEMENTATION_STATUS.md).

All 25 applicable unique browser scenarios pass across the regression and focused
reruns, with one production-only notification case skipped on development. The
production build passes. Phone/desktop previews were inspected in both themes;
the final Library header and Settings disclosure were also checked separately.

This revision remains local pending explicit commit/push authorization.
