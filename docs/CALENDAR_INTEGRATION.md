# Calendar entry integration

October 12, 2026, Asia/Manila. Local implementation for review. Updated after the user's correction to remove the separate expansion feature.

The user requested that events, reminders and similar dated entries appear on
Calendar regardless of where they are added, with changes also reflected elsewhere
in the app. They also requested an expandable calendar for easier navigation.

## One entry across the app

Calendar, Today and Library already read the same organizer records. Keep this
single source of data: saving or editing an entry changes the same record; there
is no separate calendar copy to become stale or create duplicates.

- Events appear on their scheduled dates, with all-day and timed grouping.
- Tasks appear on their due dates; undated tasks remain in Today/Library.
- Standalone reminders appear on their dates and times. Attached reminders
  appear on their alert dates and link to the original source entry.
- Notes and expenses remain ordinary records; an explicit attached reminder
  can put their alert on Calendar without treating them as scheduled events.
- Existing recurrence, cancelled exceptions, completion and undo still apply.
- Existing account synchronization and offline saves are preserved. This change
  does not introduce immediate cross-device broadcasting or change the backend.

The implementation fixes navigation around the shared records: every Calendar
creation/detail link preserves its selected date. Editing and
deleting retain that context. A calendar-created or moved dated entry returns to
its saved date. Closing an unsaved calendar editor returns
to Calendar after persisting its draft. Calendar stays selected in navigation
while an originating entry is open. Library's search/filter return paths remain
supported. Return destinations are limited to Calendar and Library routes.

Saved scheduled entries have a **View on calendar** action, including tasks and
reminders opened from Library. Notes with attached reminders use the reminder
date. The editor explains that saved events, reminders and dated tasks appear
on Calendar. Deleting an entry removes it from every view; Undo restores it.

## Calendar controls

The user noticed that tapping the existing month/date heading already opens the
month picker and asked to remove the separate expansion control. The inline month
view, its toggle, additional previews and obsolete styles have been removed.
The normal week strip and date-picker dialog remain, with previous/next month,
Today, direct-date input, arrows, Home/End and Page Up/Down. Old `view=month` URLs
show the regular calendar; selecting another day returns to the normal date URL.
One picker day stays in the keyboard tab order; closing restores trigger focus.

The main **Add entry** button and agenda footer open a choice of **Event**, **Task**
or **Reminder**. Each starts the existing editor with the selected date and a
calendar return path. The dedicated task/reminder plus controls remain shortcuts.
Generic capture elsewhere keeps notes and expenses as well. Completed tasks stay
available for reopening without inflating outstanding counts. Shared entries,
both themes, Lucide icons and Manrope typography are retained.

## Verification and release

Verification covers shared creation/editing/deletion, absence of duplicate records,
reminder-time/date changes, Today/Library reflection, task completion/reopening,
selected date through refresh/edit/close, keyboard/month/date navigation and
phone/tablet/desktop layouts in both themes. Tests use isolated preview/synthetic
records and mocked account sessions rather than production data. Final results
are recorded in [Implementation status](IMPLEMENTATION_STATUS.md).

This feature remains local pending a new commit/push instruction. The previous
authorization released the palette and earlier page redesigns; it does not
automatically publish this subsequent feature.
