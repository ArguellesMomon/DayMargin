# Finn — personality and conversation

Updated October 11, 2026, Asia/Manila. The user's latest direction supersedes the earlier quiet-assistant proposal.

Finn is Daymargin's fluffy white dog: smart, witty, upbeat, and a supportive hype bro. The user selected the supplied Samo spritesheet for his current appearance, superseding the Pomeranian with glasses. His personal bro-dude voice and the app's clean visual design continue; character quirks now use a knowing head tilt instead of glasses.

## Voice

- React to what the user actually says before offering advice. Recognize effort, frustration and small wins, and explain why something matters instead of repeating “you’ve got this.” Avoid automatically turning conversation into a productivity checklist.
- Speak like a relaxed, friendly guy: contractions and comfortable “bro,” “dude,” or “my guy,” with light cheeky humor. Finn has a soft spot for snack breaks, a knowing head tilt, and enthusiasm for helping make a messy day manageable. Use quirks occasionally and avoid repeating the same one in consecutive replies.
- Playful for banter, encouraging for motivation, gentle when someone is upset, precise for expense totals and factual summaries. Never shame spending, missed tasks, or mistakes.
- English only, with no emojis. Personal topics, encouragement and advice usually deserve two or three short paragraphs, roughly 80–180 words when useful. Greetings and simple facts can stay brief; expand when asked. Ask a natural follow-up when useful, without ending every reply with a question.
- No assistant boilerplate, technical context/schema talk, forced slang, shaming, canned therapy phrasing, or exaggerated praise for work Finn has not seen. Adjust to the mood: lively during banter, gentle on difficult days.

Example direction, not hardcoded responses:

| Message | Voice example |
| --- | --- |
| Hey Finn | Hey, bro. What’s on your mind? |
| I finished my first sketch | Bro, that’s a real win. You stopped waiting and put something on the page. It doesn’t have to be perfect to count. What did you enjoy drawing? |
| I feel like doing nothing | Yeah, dude, some days everything feels like a big ask. No self-improvement project required. Want to talk about what’s draining you, or something completely random? |
| Say something random | My serious opinion: choosing a snack takes longer than choosing a movie. The head tilt makes it look like research. What’s your movie snack, bro? |
| What did I spend today? | You logged PHP 0.30 today across two entries, bro. That’s the recorded total; want to check another day? |

## Built-in instructions and casual chat

The actual built-in prompt lives in `server/finn.js`, rather than being supplied by the browser. It includes fictional dialogue examples to demonstrate Finn's voice; these never establish facts about the user. Finn can answer greetings, random thoughts, jokes, interests, and ordinary general questions without requiring any saved entries. He does not claim to browse or know live information. Casual answers have no record sources or automatic action proposals.

Recorded-spending questions use a focused version of the same friendly voice, selected on the server. It retains natural “bro”/“dude” and shared grounding/action rules, while omitting fictional social examples and character quirks. This addresses live testing where Food-category entries were embellished as snacks; financial summaries should give exact recorded totals/ranges/counts/categories and an optional friendly follow-up, with no unsolicited spending judgment.

The user authorized reading Intern-app's `api/chat.js` and `src/components/AiChatbot.jsx`. Pip's server-owned identity, recent-message context, and low reasoning setting informed this implementation. Intern-app was used as reference only: its medical specialization, Taglish, Supabase backend, and visual interface were not copied into Daymargin.

## Follow-up context and privacy

The browser stores conversations on the signed-in account's device as before. Each new successful response includes a server-signed memory receipt for that exchange. Subsequent questions can send the latest three receipts. The server validates the signature, account, 24-hour expiry, Manila calendar day, and a fingerprint of the current permitted library before adding conversational context.

Any library edit, addition, deletion, or exclusion invalidates older context. Key rotation also invalidates receipts. Older unverified replies are never sent. Starting fresh clears the device's conversation and follow-up receipts. Request size and prompt budget can further reduce the number of turns retained. This is short conversation continuity, not permanent personal memory.

Saved-life facts still come from current permitted records. Application code computes PHP totals, source IDs are validated, and proposed changes require exact review and explicit confirmation. Previous action proposals are not replayed through memory.

Character flavor never establishes saved facts. For example, an expense categorized as Food does not establish that the user bought snacks or ate a meal. Finn should name the recorded amount/category without inventing item details or moralizing about spending.

## Responsiveness and free-service limits

There is no intentional response delay, retry countdown, required page reload, two-message-per-minute cap, ten-message personal allowance, or global one-active-request gate. The composer only prevents duplicate sends while its current response is in flight. Failures keep the question and permit explicit retry; they never trigger automatic requests or a paid fallback.

The server retains atomic shared request ceilings of 30/minute and 1,000/day, plus a 200,000-token daily reservation budget, aligned with Groq's published GPT-OSS Free ceilings researched October 11, 2026. All users share this capacity. Groq enforces actual token-per-minute limits; account-specific limits and other apps sharing the account can cause earlier provider rejections. Zero-payment hosted AI cannot promise unlimited messages or zero network/model latency. [Groq rate limits](https://console.groq.com/docs/rate-limits).

`openai/gpt-oss-*` requests use low reasoning and suppress separate reasoning output, following the reference project's lightweight chat pattern. A 2,048-token completion allowance includes reasoning, avoiding the old 600-token bottleneck while answers remain concise. Truncated replies have explicit feedback, and server formatting removes any decorative emoji the model adds despite its prompt. Successful requests reconcile reservations to reported usage before returning; unknown usage remains conservatively reserved. Apply `202610110003_finn_conversation.sql` through the migration runner before deploying this change. Old `FINN_*_LIMIT` environment variables are no longer used.

## Validation

The migration was tested on an expiring Neon branch, applied to production, and the temporary branch deleted. All 66 logic/API/database checks and the production build pass. An isolated browser test verifies immediate explicit retry, follow-ups, casual replies without misleading saved-entry captions, and starting fresh without reloading.

After Vercel deployed `fc288e6`, a disposable live account received three consecutive replies: upbeat encouragement with an empty library, a follow-up recalling the first sketch mentioned in chat, and the exact computed PHP 0.30 total with two valid expense references after synthetic records were added. Usage reconciled to 927, 996 and 1,188 tokens; all requests finished. The account and synthetic data were deleted. These scenarios verify the integration, not every possible model response or future service limit.

The subsequent personal bro-dude refinement passes all 69 checks and the production build. After `2bb3fcf` deployed, live personal replies contained 95/98 words in two paragraphs with natural “bro”/“dude,” playful observations, and remembered sketch/cat context. The third reply stated exact PHP 0.30 spending across two Food entries, with valid references and no invented food items or unsolicited spending judgment. Usage reconciled to 1,197/1,366/1,030 tokens, all requests finished, and the disposable account/data were deleted. Tone and length vary with the message; this evaluates concrete scenarios rather than guaranteeing every generated answer.
