# Finn chat — clearer sending and motion

October 12, 2026, Asia/Manila. Local implementation for review.

The user requested an improved Finn chat page and animation, and reported that
their submitted message stayed in the textbox while Finn was thinking. The
previous implementation cleared it only after an answer was received and saved.

## Sending and recovery

| State | Conversation | Composer and actions |
| --- | --- | --- |
| Before sending | Welcome or existing chat. | Draft remains editable. |
| Accepted by the app | User message appears immediately with Waiting status; Finn's thinking indicator appears. | Submitted text clears immediately. Another draft can be written; Send is disabled while this request is active. |
| Reply received | Saved user message and Finn's reply appear once. | A newly typed draft stays untouched. Send is available immediately, including during Finn's reply wave. |
| Failed request | Message remains with Not answered and an explicit retry. | Restore its text only if the composer is empty. Preserve a newer draft. Retry resends the failed message, not that newer draft. |
| Navigation or reload interrupted a request | Saved unfinished message shows Interrupted. | Retry is explicit; no automatic provider request or permanent thinking state. |

The user message is saved locally before requesting a reply. Retry reuses its ID
and places the attempt at the end of the conversation rather than duplicating the
message. Successful replies retain sources, proposals and existing memory receipts.
Only successful assistant receipts enter follow-up history. In-flight navigation
aborts the client request; reopening does not automatically resend it. Provider
errors retain immediate explicit retry, with no cooldown or countdown. The existing
45-second request timeout remains a recovery bound, not an artificial send delay.

Local chat updates now accept a function of the latest stored conversation. This
prevents an older captured array from replacing a newer update. The reload checks
also exposed a pre-existing loading race: synchronization could begin from an empty
snapshot before IndexedDB loaded. Transactions and synchronization now require the
current account's local snapshot to be ready, preserving chats/drafts on refresh.
No cloud schema or provider configuration changes are required.

Starting fresh and applying a proposal are guarded while a reply is in flight.
Source links, proposal review and confirmation-only changes remain connected.
The conversation dialog counts user messages rather than dividing an array length
that can now contain an unanswered message.

## Page and animation

- A larger header identity and welcome mascot keep Finn visible without extra
  introductory copy. Three icon-led starter questions keep their existing prompts.
- User bubbles, message spacing and source chips use the shared yellow/white and
  red/near-black themes. The composer remains outside the scrollable conversation.
- New messages enter with a short 220 ms fade and rise. Stored history does not
  replay the entrance animation on reopening.
- A larger thinking sprite uses the existing head-tilt/blink frames in a 1.2-second
  cycle, a restrained sway and animated dots. The send button shows a spinner.
- Successful replies trigger the supplied one-shot wave. The wave never blocks
  sending another message or adds a wait before the provider request.
- Device and app Reduce motion stop the sprite, sway, dots, spinner and message
  entrance movement; written thinking/error state remains visible.
- Chat follows recent activity while the reader is at the bottom. Reading older
  messages preserves that position when a reply arrives. Latest messages returns
  to the newest reply and stays above the composer/error area.
- The chat shell follows the visual viewport's height and vertical offset, so
  opening the keyboard leaves the composer, confirmation note and navigation
  together at the visible bottom. Only the conversation scrolls; the document
  stays fixed. Leaving Finn restores the normal page layout and scrolling.
- Compact spacing and a shorter navigation row keep portrait and landscape
  layouts usable, including a 844 × 260 viewport. Resize preserves the latest
  message when following it and preserves the reading position in older history.
  Browser checks also simulate a keyboard shrinking and panning the visual
  viewport without resizing the layout viewport, then dismissing it. Physical
  iPhone keyboard verification remains outstanding.

The user's supplied spritesheet remains unchanged. Finn's server personality,
model/provider, source grounding and proposal approval are unchanged. The new
motion is scoped to Finn's chat; Today keeps its existing character playback.

## Verification and release

New isolated browser scenarios exercise delayed replies, immediate input clearing,
pending display, next-draft preservation, failure/retry without duplicate messages,
reload recovery, successful receipt history, actual rendered thinking pixels,
reduced-motion behavior, short viewports and reading-position preservation.
Existing sprite, retry, source/proposal and organizer editing checks remain relevant.
Final results appear in [Implementation status](IMPLEMENTATION_STATUS.md).

All 76 existing automated checks, the final production build and all 11 applicable
unique browser scenarios pass across the regression/focused runs. One production-
only offline-sprite case is skipped on development. Thinking-frame capture uses a
fixed screenshot clip so the intended continuous sway does not wait for stability.
Phone/desktop welcome, thinking and reply previews were inspected in both themes.

Previews use isolated account sessions and mocked AI responses; no production
records or paid model requests are used. This revision remains local pending
explicit commit/push authorization.
