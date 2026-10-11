# Daymargin

A mobile-first daily organizer for Filipino users, with notes, reminders, schedules, expenses, and Finn: an animated 2D white Pomeranian companion.

**Daymargin** is the app name selected under the user's delegated naming decision. The project folder retains its original label, finn-daily, to preserve existing file links.

The [DayMargin GitHub repository](https://github.com/ArguellesMomon/DayMargin) contains this app at the repository root. Use that root as the Vercel project directory.

## Current stage

React/Vite PWA with Neon Auth, server-authenticated Neon Postgres saving, offline record queues, conflict review, themes, and Groq-backed Finn chat. The user authorized replacing the unconfigured Supabase backend with Neon on October 11, 2026. [Production Daymargin](https://daymargin.vercel.app) is hosted on Vercel, with verified signup, sign-in, cloud saving and live AI replies. Checks and connection details are recorded in Implementation status. Scheduled notification delivery remains unfinished.

See [Implementation status](docs/IMPLEMENTATION_STATUS.md) for the specification mapping, completed checks, and remaining work. See [Setup](docs/SETUP.md) to run locally and connect the selected services.

## Run locally

```powershell
npm install
npm run dev
```

Open the printed local URL. With no service configuration, choose Explore Daymargin for an explicitly labeled local preview with editable sample entries. Production accounts start with an empty library. No AI answer is simulated.

```powershell
npm test
npm run build
npm run test:e2e
```

Browser checks expect the dev server to be running and use installed Microsoft Edge by default. Offline PWA checks use a production preview on port 4173; instructions are in Setup. Dependencies are pinned by package-lock.json.

## Settled product direction

As of October 11, 2026:

- Audience: general Filipino users.
- Expenses: simple logging and summaries initially.
- Finn: an upbeat, witty hype bro for casual chat, saved-entry questions, and advice; proposed changes require user confirmation. See [Finn personality](docs/FINN_PERSONALITY.md).
- Data: accounts with cloud sync across devices and offline core-record access, selected under the user's delegated judgment.

- Localization: PHP, Asia/Manila, and English only, including Finn's replies.
- Finn's appearance: animated 2D white Pomeranian, witty and smart, with round charcoal glasses selected through delegated design judgment.
- App name: Daymargin, selected under delegated judgment.

- Design: four main destinations, warm paper/graphite themes, muted green, Manrope typography, light organization through tags and pins.

- Hosting/backend: Vercel and Neon. The user requested Neon setup and subsequently authorized connecting Daymargin to it, superseding the earlier Supabase choice.
- AI: zero-payment, lightweight everyday chat through an authenticated server endpoint connected to Groq Free. Casual messages and recent follow-ups are supported; provider limits still apply. No paid fallback.
- Notifications: a user-triggered native browser permission pop-up, backed by a scheduled Web Push delivery design.

Screen concepts and a technical plan are documented. Finn's first transparent master drawing is integrated. Thinking uses a small CSS tilt with a still reduced-motion alternative; distinct blink/nod artwork and scheduled notification delivery remain to complete and validate.

## Documentation

- [Product brief](docs/PRODUCT_BRIEF.md): user requirements, proposed experience, visual direction, AI behavior, and success criteria.
- [Discussion log](docs/DISCUSSION_LOG.md): what has been stated, what is proposed, and the decisions still open.
- [Brand and character brief](docs/BRAND_BRIEF.md): naming rationale, copy direction, Finn's appearance, and animation direction.
- [Screen concepts](docs/SCREEN_CONCEPTS.md): every main/supporting screen, its layout and interactions, and the complete Finn concept.
- [Technical plan](docs/TECHNICAL_PLAN.md): Vercel/Neon, the AI endpoint, notification permission/delivery, and proposed synchronization.
- [Implementation status](docs/IMPLEMENTATION_STATUS.md): what is coded, how the original documents informed it, validation, and limits.
- [Setup](docs/SETUP.md): local use, Neon migration, environment configuration, and Vercel deployment instructions.
- [Finn master drawing](assets/finn/finn-master-v1.png) and [generation record](assets/finn/finn-master-v1.prompt.md).

## Working rules

1. Keep user requirements separate from proposals and unresolved decisions.
2. Update the discussion log when a decision changes, then reconcile the product brief.
3. Prioritize navigation, interface quality, useful functionality, organization, and simplicity.
4. Use no emojis in the product, documentation, or project communication.
5. Keep the experience mobile-first, with coherent light and dark modes.
6. Build the frontend with React JS. Define PWA behavior before implementation.

Created: October 10, 2026, Asia/Manila.
