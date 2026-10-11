# Daymargin — Brand and character brief

Created October 11, 2026, Asia/Manila. Finn now uses the user's supplied spritesheet; the latest decision at the end supersedes the earlier master-drawing direction.

## Name and purpose

**Selected through delegated judgment:** Daymargin.

The name pairs the day with the margin of a personal notebook: a space to collect the details that help someone stay organized. It accommodates plans, notes, and recorded expenses, with a personal, restrained tone. Use the spelling Daymargin consistently. Finn is the companion's name.

**Proposed short descriptor:** Your daily organizer.

Name selection included a preliminary web check. Dayfold was ruled out because an [existing personal organizer](https://dayfold.app/) already uses it. Searches for Daymargin surfaced an [artist](https://music.apple.com/us/artist/daymargin/1780573327) and an unrelated [financial-service page](https://www.riyadcapital.com/information/special-pages/daymargin). The selected name is not a claim of exclusivity; domain ownership and formal name clearance have not been established.

## Product voice and localization

**Confirmed:** English only for product-authored text and Finn's generated replies. PHP is the expense currency, and Asia/Manila is the initial timezone.

Use clear sentences and short, concrete labels. Professional here means useful, respectful, and easy to understand. Finn can express wit through a small observation when appropriate; numeric summaries and explanations should stay direct. Preserve original user-entered text.

Suggested copy examples:

- Capture: Add an entry.
- Expense summary: Recorded spending this month.
- Calendar empty state: No events scheduled for this day.
- Finn greeting: A plan, a random thought, or a little motivation? I’m in. Let’s work it through.
- Confirmed-action preview: Move this task to tomorrow at 9:00 AM?
- Offline state: Saved on this device. Waiting to sync.

## Finn's agreed identity

**Confirmed by the user:** An animated 2D white Pomeranian who looks witty and smart.

**Latest conversation direction:** A personal bro-dude character: warm, cheeky, supportive, and able to sustain casual conversation. Fuller responses for personal topics, comfortable “bro”/“dude,” and small glasses/snack-break quirks make Finn recognizable. The professional typography and restrained motion stay consistent; factual summaries stay precise. See [Finn personality](FINN_PERSONALITY.md) for the built-in dialogue examples and follow-up privacy rules.

**Selected accessory direction under delegated design judgment:** Small round charcoal glasses. The user suggested glasses and later delegated the character concept. Exact proportions will be refined in the production drawing.

### Proposed appearance

- Recognizable Pomeranian silhouette: small upright ears, a fluffy cheek/chest shape, and a compact muzzle.
- White fur with limited soft cream and pale-grey shading. A defined outline keeps white fur readable against light surfaces.
- Attentive eyes, slight asymmetry in the eyebrow/fur expression, and a subtle closed-mouth smile communicate intelligence and quiet wit.
- Round glasses frame the eyes without obscuring them. Keep lenses clear, highlights restrained, and the bridge visible at a small display size.
- Clean 2D linework and a few deliberate color shapes. Avoid unnecessary costume detail so the face carries the character.
- Use the same core drawing and color identity in both themes; tune the surrounding surface and silhouette contrast as needed.

### Proposed placement

Finn's primary home is chat. Use a small avatar beside his identity and a larger illustration only where it helps onboarding or an empty state. Give his messages ordinary readable layouts, source links, and action previews. User attention should stay on useful information and available actions.

The app wordmark and installation icon remain separate design decisions. Finn can identify chat without having to become the app's entire visual identity.

### Proposed animation states

| State | Motion | Purpose |
| --- | --- | --- |
| Idle | Occasional blink; very small breathing movement. | Keep the character present without constant distraction. |
| Thinking | Brief head tilt or glance; a small glasses adjustment at most once per response. | Acknowledge that Finn is working. |
| Answer ready | Settle into an attentive pose. | Hand attention back to the response. |
| Confirmed success | One subtle nod. | Acknowledge a successful applied action. |
| Clarification or error | Calm attentive pose beside clear written guidance. | Make the next step easy to understand. |

Keep motion short and quiet. Do not use celebration for ordinary expense logging or exaggerated reactions to spending. Respect reduced-motion preferences with a still pose; written status must remain available independently of animation.

### Asset brief for later production

Create a consistent master character, a compact avatar, a readable still pose, and the few animation states above. Check the drawing in light and dark themes and at its actual mobile display size. Final dimensions, SVG/raster delivery, and animation format remain implementation decisions.

## Selected visual identity

Retain the calm notebook direction with the user's revised palette: yellow accents and white surfaces in light mode, red accents and near-black surfaces in dark mode. Use Manrope sans-serif typography and fine neutral separators. This supersedes the earlier muted-green palette; see [Color scheme](COLOR_SCHEME.md). A margin line or small page marker could become a consistent signature detail if it helps grouping or orientation. Evaluate it in the wireframe rather than adding decoration to every screen.

## Next design deliverable

The [screen concepts](SCREEN_CONCEPTS.md) now specifies the four destinations, supporting pages, capture, and action confirmation. A mobile concept walkthrough illustrates the selected direction and Finn placement. Production artwork and an implemented prototype follow during implementation planning.

## First master drawing — October 11, 2026

Created [Finn master v1](../assets/finn/finn-master-v1.png) using the built-in image_gen tool. The white Pomeranian has thin round charcoal glasses, an attentive expression, a subtle smile, and a recognizable fluffy silhouette. The PNG has a transparent alpha channel and is saved in the project. The [exact prompt and method](../assets/finn/finn-master-v1.prompt.md) are recorded beside it.

This is a still master character design, not an animated asset. Consistent blink, thinking/head-tilt, and nod states plus integration are the next asset work.

## First coding milestone

The original master PNG is now integrated into welcome, Today, and Finn chat. The coded interface uses local Manrope fonts, Lucide icons, warm paper/graphite themes, muted green, and margin markers. A CSS portrait crop improves the compact avatar, and a small thinking tilt respects reduced motion. Separate blink/nod/glasses-adjustment artwork remains outstanding; transforming the still image is not a claim that those assets are complete. See [Implementation status](IMPLEMENTATION_STATUS.md).

## Supplied spritesheet decision — October 11, 2026

The user chose to keep `samo.zip`'s spritesheet for Finn after reviewing how it differs from the original design. The current runtime appearance is a fluffy white dog without glasses; the ZIP metadata calls the source character Samo, a Samoyed. Daymargin retains the name Finn and his warm personal bro-dude voice. This decision supersedes the earlier Pomeranian-with-glasses asset direction below. The master PNG and generation record remain as design history.

The original WebP is used unchanged with a mapped idle blink, thinking/head tilt, and one brief wave after a successful new reply. Written status remains visible, reduced-motion preferences keep Finn still, and the PWA caches the sheet for offline screens. Source fringe pixels remain in the supplied artwork. See [sprite asset record](../assets/finn/spritesheet.md).
