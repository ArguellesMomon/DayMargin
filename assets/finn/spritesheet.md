# Finn — supplied spritesheet

Selected by the user on October 11, 2026, Asia/Manila.

Source: the user's `samo.zip`, containing `pet.json` and `spritesheet.webp`.
Metadata identifies the source character as Samo, a fluffy white Samoyed.
Daymargin keeps the name Finn and his personal bro-dude voice, using this supplied
dog without adding glasses. This supersedes the earlier Pomeranian-with-glasses
appearance. The original master illustration is retained as design history.

Runtime asset: `public/finn-spritesheet.webp`, copied byte-for-byte from the ZIP.
Dimensions: 1536 × 1872 pixels, RGBA WebP, one sheet rather than an animated WebP.
Grid: eight columns and nine rows, with 192 × 208 pixel cells. The JSON supplied
no animation map or timings; the app's selected mapping is recorded below.

| State | Cells (zero-based row, column) | Playback |
| --- | --- | --- |
| Idle | Row 0: 0, 1, 2, 1, 0 | Brief blink near the end of a six-second cycle. |
| Thinking | Row 0: 3, 4, 3 | Quiet head tilt in a three-second cycle. |
| Reply ready | Row 3: 0, 1, 2, 1, 2, 0, 3; then row 0, column 0 | One 1.1-second wave, then idle. |
| Reduced motion | Row 0, column 0 | Still pose, including while thinking. |

Unused rows remain in the original sheet. CSS uses discrete frame changes rather
than sliding across cells. Reply motion begins only after a successful new reply;
opening stored chat, retrying a failure, or logging an expense does not trigger it.
Written thinking/error states remain independent of the animation.

Both the device's reduced-motion setting and Daymargin's own Reduce motion setting
disable motion. The PWA precaches the sheet for offline views. Playback is local
and makes no AI requests or extra send delays.

The source has some magenta/purple fringe pixels. These are part of the supplied
asset and have not been recolored or regenerated. This record does not establish
the source's authorship or license.
