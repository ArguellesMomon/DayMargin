# Finn — personality and conversation

Updated October 11, 2026, Asia/Manila. The user's latest direction supersedes the earlier quiet-assistant proposal.

Finn is Daymargin's white Pomeranian with round glasses: smart, witty, upbeat, and a supportive hype bro. He sounds like someone in your corner, with enough judgment to know when to keep things serious. His appearance and the app's clean visual design stay consistent.

## Voice

- Warm confidence and specific encouragement. Help the user find one doable next step.
- Occasional “bro” or a quick glasses-related joke when it fits. Vary phrasing; avoid repeated catchphrases, forced slang, barking, shouting, or motivational speeches.
- Playful for banter, encouraging for motivation, gentle when someone is upset, precise for expense totals and factual summaries. Never shame spending, missed tasks, or mistakes.
- English only, with no emojis. Usually keep everyday answers under 150 words; greetings can be one sentence.

Example direction, not hardcoded responses:

| Message | Voice example |
| --- | --- |
| Hey Finn | Hey, bro. What’s on your mind? |
| I can’t get started | Let’s shrink the first step. Pick one task and give it five minutes. You don’t need to finish everything to make a start. |
| Say something random | Octopuses have three hearts. A fairly ambitious setup for someone with no calendar. |
| What did I spend today? | Your recorded spending today is PHP 0.30 across two entries. |

## Built-in instructions and casual chat

The actual built-in prompt lives in `server/finn.js`, rather than being supplied by the browser. Finn can answer greetings, random thoughts, jokes, interests, and ordinary general questions without requiring any saved entries. He does not claim to browse or know live information. Casual answers have no record sources or automatic action proposals.

The user authorized reading Intern-app's `api/chat.js` and `src/components/AiChatbot.jsx`. Pip's server-owned identity, recent-message context, and low reasoning setting informed this implementation. Intern-app was used as reference only: its medical specialization, Taglish, Supabase backend, and visual interface were not copied into Daymargin.

## Follow-up context and privacy

The browser stores conversations on the signed-in account's device as before. Each new successful response includes a server-signed memory receipt for that exchange. Subsequent questions can send the latest three receipts. The server validates the signature, account, 24-hour expiry, Manila calendar day, and a fingerprint of the current permitted library before adding conversational context.

Any library edit, addition, deletion, or exclusion invalidates older context. Key rotation also invalidates receipts. Older unverified replies are never sent. Starting fresh clears the device's conversation and follow-up receipts. Request size and prompt budget can further reduce the number of turns retained. This is short conversation continuity, not permanent personal memory.

Saved-life facts still come from current permitted records. Application code computes PHP totals, source IDs are validated, and proposed changes require exact review and explicit confirmation. Previous action proposals are not replayed through memory.

## Responsiveness and free-service limits

There is no intentional response delay, retry countdown, required page reload, two-message-per-minute cap, ten-message personal allowance, or global one-active-request gate. The composer only prevents duplicate sends while its current response is in flight. Failures keep the question and permit explicit retry; they never trigger automatic requests or a paid fallback.

The server retains atomic shared request ceilings of 30/minute and 1,000/day, plus a 200,000-token daily reservation budget, aligned with Groq's published GPT-OSS Free ceilings researched October 11, 2026. All users share this capacity. Groq enforces actual token-per-minute limits; account-specific limits and other apps sharing the account can cause earlier provider rejections. Zero-payment hosted AI cannot promise unlimited messages or zero network/model latency. [Groq rate limits](https://console.groq.com/docs/rate-limits).

`openai/gpt-oss-*` requests use low reasoning and suppress separate reasoning output, following the reference project's lightweight chat pattern. A 2,048-token completion allowance includes reasoning, avoiding the old 600-token bottleneck while answers remain concise. Truncated replies have explicit feedback, and server formatting removes any decorative emoji the model adds despite its prompt. Successful requests reconcile reservations to reported usage before returning; unknown usage remains conservatively reserved. Apply `202610110003_finn_conversation.sql` through the migration runner before deploying this change. Old `FINN_*_LIMIT` environment variables are no longer used.

## Validation

The migration was tested on an expiring Neon branch, applied to production, and the temporary branch deleted. All 66 logic/API/database checks and the production build pass. An isolated browser test verifies immediate explicit retry, follow-ups, casual replies without misleading saved-entry captions, and starting fresh without reloading.

After Vercel deployed `fc288e6`, a disposable live account received three consecutive replies: upbeat encouragement with an empty library, a follow-up recalling the first sketch mentioned in chat, and the exact computed PHP 0.30 total with two valid expense references after synthetic records were added. Usage reconciled to 927, 996 and 1,188 tokens; all requests finished. The account and synthetic data were deleted. These scenarios verify the integration, not every possible model response or future service limit.
