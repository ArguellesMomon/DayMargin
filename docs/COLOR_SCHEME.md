# Daymargin — revised color scheme

October 11, 2026, Asia/Manila. Local implementation for review.

The user selected yellow and white for light mode, red and black for dark mode,
replacing the earlier green palette. Keep the page hierarchy, Manrope typography,
fine separators and existing navigation consistent across both appearances.

## Palette

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#fafaf8`, near-white | `#101012`, near-black |
| Entry surfaces | `#ffffff`, white | `#19191c`, charcoal |
| Sidebar | `#f5f5f1` | `#0c0c0e` |
| Main text | `#242424` | `#f2eeee` |
| Secondary text | `#666660` | `#b0a9ac` |
| Dividers | `#deded6` | `#343237` |
| Primary fills | `#ffda00`, vibrant yellow | `#e85b63`, red |
| Text on primary fills | `#272217` | `#180b0d` |
| Links, selection labels, focus rings | `#806000`, dark amber | `#ff858b`, light red |
| Selection and Finn panel surfaces | `#fff8cc` | `#302024` |
| Destructive/error text | `#b13d32` | `#ffb4a3`, coral |
| Error surfaces | `#ffede9` | `#35221e` |

`--accent-fill` handles primary buttons, selected calendar dates, completed checks
and Finn's send button. `--accent` handles readable accent text, icons, focus and
small markers. Keeping these roles separate avoids yellow text on white or overly
pale red primary controls. Destructive actions and errors keep written labels and
their distinct coral surface treatment.

The shared palette reaches Today, Calendar, Library/expenses, Finn, Settings,
capture and review dialogs, all editors/details, welcome, account forms and setup.
The in-app Daymargin mark uses current theme tokens. Installation/favicon artwork
retains one yellow/charcoal identity across operating systems; PNGs are rendered
from the updated SVG at their existing 192, 512 and 180-pixel sizes. The PWA's
default shell is near-white; the browser theme-color tracks light, dark or device
appearance after preferences load. Finn's original supplied artwork stays intact.

## Review and release

Validation: all 76 existing logic/API/storage/database checks and the production
build pass. An isolated browser review covered 32 combinations: Today, Calendar,
Library, expenses, Finn, Settings, task editor and signup at 390/1440px in both
themes. It checked visible primary/link/selected-label contrast (at least 4.5:1),
horizontal overflow, persisted appearance and live device-theme/browser-color
changes. Phone and desktop screenshots were inspected for Today, Calendar, Finn
and signup. Sample data and mocked account sessions kept production data untouched.
The first sandboxed test attempt hit Windows EPERM before running any tests;
the approved local rerun passed. Existing dependency-annotation and bundle-size
build warnings remain. This review does not establish physical-device rendering.

After the local review, the user requested a more vibrant yellow and explicitly
authorized committing and pushing the full current UI update to GitHub. The new
primary fill is saturated yellow `#ffda00`, replacing the earlier `#f5ce46`.
Dark mode retains its red/near-black palette. Check the implementation at
http://127.0.0.1:5174/ and choose Light, Dark or Device under Settings.
