# Apex Run design system

## Overview

Apex Run is a single-page, three-lap browser racer for keyboard and touch players. The visual idea is a sunlit, low-poly canyon seen through a dark racing interface. The actual WebGL scene is the opening screen's main visual and becomes the playable circuit without a page transition.

The garage groups the title, pace selector, and start action on the left, with circuit information on the right and car settings below. During play, instruments move to the edges so the driving line stays visible. This arrangement belongs to the game, rather than being a generic layout for every future page.

Source of truth: `src/styles.css` for interface tokens and layout; `src/App.tsx` for composition; `src/game/scene.ts` for the 3D artwork. There is one dark interface theme.

## Colors

Primitive values and semantic roles are defined at the top of `src/styles.css`. Components use the semantic roles.

| Semantic token | Primitive | Value | Use |
| --- | --- | --- | --- |
| `--color-background` | `--ink-950` | `#171b1a` | Garage footer, dialogs, neutral controls |
| `--color-surface` | `--ink-900` | `#202623` | Subtle hover surface |
| `--color-hover` | `--ink-800` | `#303833` | Selected pace, secondary button, boost track |
| `--color-border` | `--ink-700` | `#515c54` | Structural separators and keycaps |
| `--color-muted` | `--ink-300` | `#b5bdb2` | Supporting copy and selected pace outline |
| `--color-text` | `--ink-100` | `#f3f1e8` | Main text and icons |
| `--color-accent` | `--orange-400` | `#ff915c` | Primary action, boost, player marker, headline detail |
| `--color-accent-hover` | `--orange-300` | `#ffad84` | Primary hover |
| `--color-focus` | `--orange-300` | `#ffad84` | Two-pixel keyboard focus ring |

Orange ties the car and game indicators to the primary action. Gameplay status also has text: “Off road”, “Contact”, and “Boost engaged”. Selected paint has a check mark; pace uses an outlined segment and a native checked radio.

The solid pairs were calculated using WCAG relative luminance: main text/background 15.36:1; muted text/background 9.01:1; dark primary label/orange fill 7.83:1; muted selected outline/selected fill 6.26:1. These are identified solid token pairs, not a claim about every pixel of the moving canvas. The validation record distinguishes those measurements from image-backed text.

Scene colors are intentionally separate art materials: asphalt `0x424b49`, warm shoulders `0x9e8c74`, muted stone shades, cream/orange curbs, and three paint choices. They do not substitute for interface semantic tokens.

## Typography

Fonts are bundled locally through `@fontsource` imports in `src/main.tsx`.

- **Barlow**, with Arial/sans-serif fallbacks: interface prose, labels, controls, timers. Loaded normal weights: 400, 600, 700.
- **Barlow Condensed**, with Impact/sans-serif fallbacks: title, countdown, large speed, and dialog headings. Loaded weight/style: 700 italic.
- `font-synthesis: none` prevents fabricated font faces. The wordmark inherits Barlow; headings use the actual condensed italic face.

| Token | Default size | Role |
| --- | --- | --- |
| `--text-small` | 0.75rem / 12px | Hints, track metadata, keycaps |
| `--text-label` | 0.875rem / 14px | Utilities, pace choices, supporting labels |
| `--text-body` | 1rem / 16px | Primary buttons and prose |
| `--text-title` | 1.5rem / 24px | Circuit title, compact instruments |
| `--text-heading` | 2.5rem / 40px | Dialog headings and mobile headline |
| `--text-display` | 5.5rem / 88px | Desktop headline and speed |

The display token becomes 4.5rem / 72px at 1100px and below. The mobile title explicitly uses the 40px heading role; the countdown retains display size. At any measured width there are at most six used sizes and three weights.

Body line-height is 1.5; short display headings use 0.96–1.1. The main heading has -0.025em tracking. Labels use natural spacing. Headings balance their wrapping, descriptions use `text-wrap: pretty`, and changing numbers use `font-variant-numeric: tabular-nums`. There is no truncation of controls, results, or record times.

## Layout

The declared spacing steps are 4, 8, 12, 16, 24, 32, and 48px (`--space-*`). Component rules follow this small scale, with optical exceptions such as 20/22px button insets and scene-specific distances. Default page gutters are 48px, dropping to 32px at 1100px and 24px at 800px. The narrowest 360px breakpoint uses 16px gutters. Above 1600px, gutters grow to keep the composition centered around a 1500px content area.

The canvas fills an absolutely positioned `.scene-host`; text stays in normal flow or stable game chrome. `.game-shell` uses a minimum viewport height, permitting vertical scrolling rather than clipping content. The header wraps when enlarged text cannot fit.

- **Above 800px:** two-column garage composition, horizontal footer, desktop keyboard hints.
- **800px and below:** tighter scene/circuit layout, on-screen driving controls, smaller race map.
- **620px and below:** stacked garage, 40px headline, full-width start action, circuit description below the visible car, and a two-column footer with the car picker spanning both columns. Local gradient backings follow the text height so enlarged text stays readable.
- **360px and below:** 16px gutters, smaller preview map, less secondary track metadata, compact but distinct driving controls.
- **Short landscape (height at most 560px, width above 620px):** the race uses viewport height with compact instruments and a 120px-wide map above them. Dialogs scroll within the viewport.
- **Coarse pointers above 800px:** on-screen driving controls remain available on larger touch devices.

Opening layouts were inspected at 320, 390, 800, and 1440px. At 390 × 844, the main action ends at about y=355px. A 200% root text-size emulation also reflows; this is not a native zoom or physical-device claim.

## Elevation & Depth

The interface uses flat surfaces and structural borders, without card shadows. The scene supplies depth through perspective, fog, lighting, terrain geometry, and shadows.

`.scene-shade` establishes broad contrast regions. Mobile intro/circuit pseudo-elements add text-sized gradient backings. `.driving-instruments` has a 92% opaque dark backing. Native dialogs use a dim, blurred `::backdrop` and a solid dark panel. The dialog top layer makes the underlying UI inert.

The renderer caps pixel ratio at 1.7. Static scenery shadows are rendered once at 1024px; moving cars use contact patches. Ready, paused, and finished scenes redraw only when dirty or changing phase. There is no idle camera fly-through.

## Shapes

Controls use `--radius-control: 6px`; dialogs use `--radius-panel: 16px`. Keycaps have a 4px radius, selected pace segments 3px, and touch driving buttons 10px. Car paint swatches and the throttle switch use circular forms. The game artwork is intentionally angular.

## Components

| Pattern | Source | Behavior and states |
| --- | --- | --- |
| Primary / secondary / text buttons | `src/styles.css`, `src/App.tsx` | Orange primary, neutral secondary, underlined exit action; hover, focus, active and disabled/loading states. One main filled action per screen. |
| Pace selector | `src/App.tsx`, `.segmented` | Native radio group in a fieldset; checked segment has a high-contrast outline. Arrow keys work through native radio behavior. |
| Paint picker | `src/App.tsx`, `.swatch` | Three 44×44px buttons with names and `aria-pressed`; selected outline and check mark. Updates the real car material. |
| Auto-accelerate | `src/App.tsx`, `.auto-throttle` | Native labeled checkbox; on by default. Off exposes the manual accelerator on touch layouts. |
| `Icon` | `src/components/Icon.tsx` | Local SVG paths, `currentColor`, 1.7px stroke, decorative icons hidden from assistive technology. Text or an accessible name labels the parent control. |
| `TrackMap` | `src/components/TrackMap.tsx` | Derived from the actual circuit curve; preview and race variants. Player and rival dots use live race distances. |
| `TouchControls` | `src/components/TouchControls.tsx` | Pointer capture for holds; release, cancellation, and blur clear input. Enter/Space also operate buttons. |
| `Modal` | `src/components/Modal.tsx` | Native modal dialog for help/records, Escape and close button, focus containment and restoration. Closing help during a race restores the pause action. |
| `RaceOverlay` | `src/components/RaceOverlay.tsx` | Native pause/results dialog. Resume, restart, race again, and garage actions; Escape resumes pause or exits results. |
| Race instruments / results | `src/App.tsx` | Position, laps, timers, speed, real boost meter, live map and textual driving status. Stable live region announces phase/lap changes without announcing every timer tick. |
| Graphics recovery | `src/game/useRacer.ts`, `src/App.tsx` | Disabled start plus a plain explanation and reload action when WebGL cannot start or its context is lost. Sound failure is nonblocking. |

Only button background/transform properties transition, for 120ms. Press scale is 0.96 and only enabled without reduced motion. Reduced motion disables camera smoothing and boost field-of-view changes; essential driving movement remains. The race has a visible pause control and pauses on tab/window deactivation.

## Do's and Don'ts

- Reuse the six type roles, semantic color tokens, 44px utility targets, and existing button styles.
- Keep controls outside the driving line and preserve a visible primary action on the first phone screen.
- Put directions next to controls. Describe records explicitly as local to this browser.
- Use native controls and dialogs; keep keyboard focus visible and restore it after closing an overlay.
- Keep scene art separate from UI colors and preserve local, relative asset URLs.
- Do not add an idle camera animation, extra slogan stack, competing accent, remote font, or simulated online leaderboard.

For another help/settings surface, compose the existing `Modal`, its heading, a short paragraph, native inputs, and one primary button. Use the page's tokens and recheck 320px reflow, focus, and enlarged text before introducing another breakpoint.

Guidance attribution and license references are in `THIRD_PARTY_NOTICES.md`. Review evidence and remaining verification limits are in `VALIDATION.md`.
