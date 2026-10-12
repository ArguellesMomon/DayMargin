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
| Arrival | Same wave cells as reply ready | One 1.1-second wave for medium/large illustrations, then idle. |
| Idle | Row 0: 0, 1, 2, 1, 3, 4, 3, 5, 0 | Blink, attentive pose, head tilt and smile throughout a 3.2-second cycle. |
| Thinking | Row 0: 4, 3, 2, 4 | Immediate head tilt with a blink in a 1.6-second cycle. |
| Reply ready | Row 3: 0, 1, 2, 1, 2, 0, 3; then row 0, column 0 | One 1.1-second wave, then idle. |
| Reduced motion | Row 0, column 0 | Still pose, including while thinking. |

Unused rows remain in the original sheet. CSS uses discrete frame changes rather
than sliding across cells. Medium/large illustrations greet on arrival, including
Today and empty Finn chat. Compact avatars continuously play the idle sequence.
Reply motion begins only after a successful new reply; opening stored chat,
retrying a failure, or logging an expense does not trigger the compact reply wave.
Written thinking/error states remain independent of the animation.

Both the device's reduced-motion setting and Daymargin's own Reduce motion setting
disable motion. The PWA precaches the sheet for offline views. Playback is local
and makes no AI requests or extra send delays.

The source has some magenta/purple fringe pixels. These are part of the supplied
asset and have not been recolored or regenerated. This record does not establish
the source's authorship or license.

## Visible-motion correction

The user reported no apparent motion on Today or Finn. A live real-time probe
confirmed the previous six-second idle sequence showed the same rendered image
for most samples, with only a fleeting blink. The revised sequence moves through
several expressions throughout its cycle and adds an arrival wave. Verification
now samples real rendered avatar screenshots and real-time frame positions on
both pages, rather than relying on an animation name alone.

The user subsequently confirmed Reduce motion was enabled. That setting intentionally
disables sprite playback and needs to be turned off to see normal movement. The
correction preserves the user's preference; it does not silently turn animations on.

## Finn chat presentation update — October 12, 2026

Chat now uses a larger thinking pose with the same mapped frames in a 1.2-second
cycle, a gentle surrounding sway and animated dots. Submitted messages enter the
conversation immediately; new messages have a short fade/rise. A successful reply
still triggers the supplied wave without delaying another send. Both device and
app reduced-motion preferences stop these added movements. Today retains its
existing timing and playback. The original WebP is unchanged. See
[Finn chat UI](../../docs/FINN_CHAT_UI.md) for interaction and verification details.
