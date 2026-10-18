# Apex Run

A working 3D canyon racing game built with React, TypeScript, Vite, and Three.js. Race three AI drivers around Copper Canyon for three laps. The complete static site is already included in `dist/`.

## Play

Select a pace, choose a car color, and select **Start race**. Auto-accelerate is on by default. Steer around rivals, brake when needed, and use boost on clear stretches. Boost recharges when released; contact and driving off the asphalt reduce speed.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | Arrow Left / Right or A / D | Hold either steering button |
| Accelerate manually | Arrow Up or W | Hold Accelerate when auto-accelerate is off |
| Brake | Arrow Down or S | Hold Brake |
| Boost | Space or Shift | Hold Boost |
| Pause / resume | P or Escape | Pause button, then Resume race |

The race also pauses when the window loses focus or the tab becomes hidden. Help is available from the header. Results include finishing position, all three lap times, total time, and another-race action. Personal bests are stored separately for Cruise, Sport, and Pro, only in this browser's local storage. There is no shared leaderboard or backend.

## Install and develop

Use Node.js **22.12+** (Node 24 is also supported) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Dependencies are ordinary npm packages pinned by `package-lock.json`; no vendored registry, credentials, environment file, wallet, or external API is required.

## Rebuild and preview

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` runs the TypeScript check and writes the production export to `dist/`. `preview` serves that export. Use an HTTP server rather than opening `index.html` as a `file://` URL.

Vite's base is `./`. Scripts, CSS, fonts, the favicon, and the share image use relative paths. The site is one page and needs no route rewrites. It was tested under `/preview/`, with external runtime requests blocked. To host the finished site, serve the **contents of `dist/`**, including `assets/`, `favicon.svg`, `share-card.png`, and `licenses.txt`.

Keep the source, package files, and finished `dist/` together. Exclude dependency/cache directories at every nesting level when packaging a submission. This delivery installed all dependencies in isolated temporary build directories and includes no dependency tree or package archive.

## Browser validation

```sh
npx playwright install --with-deps chromium webkit
npm run test:browser
```

The validation script starts and closes its own local server, serves the actual export at a subpath, and exercises Chromium and WebKit. It covers setup, keyboard driving, pointer controls, pause/resume, restart, a complete race, replay, record persistence, local-storage failure, and WebGL recovery. It also checks responsive layouts, external/missing requests, page errors, metadata, reduced motion, and selected accessibility states with axe. Reports and screenshots go to `test/scratch/browser-validation/` and are not needed to build the site.

A full browser run takes a few minutes, depending on software/GPU rendering speed. Browser system libraries are test tooling requirements; they are not part of the website's runtime export.

The assignment's pinned taste probe was run separately against the export. That input script is intentionally not copied into the source distribution; its measured results are retained in `docs/validation/taste-checks.json`.

## Structure

- `src/game/model.ts`: deterministic race state and arcade physics; independently tested.
- `src/game/track.ts`: closed 3D circuit, length, sampling, and minimap mapping.
- `src/game/scene.ts`: locally constructed cars, canyon geometry, lighting, and follow camera.
- `src/game/useRacer.ts`: animation loop, keyboard input, focus/visibility pause, sound, and recovery.
- `src/game/storage.ts`: validated local records with unavailable-storage fallback.
- `src/App.tsx` and `src/components/`: garage, game HUD, native dialogs, results, and touch controls.
- `src/styles.css`: tokens and responsive interface styles.
- `tests/`: simulation, track, timing, and storage tests.
- `scripts/`: bounded browser validation server and share-image generation.

To regenerate the social preview from the actual scene:

```sh
npm run build
node scripts/create-share.mjs
npm run build
```

## Design and limitations

[DESIGN.md](DESIGN.md) documents the implemented system. [VALIDATION.md](VALIDATION.md) records review coverage, fixes, commands, evidence, and limits. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) identifies dependency and design-guidance licenses.

The game requires JavaScript and WebGL 2. Driving uses road-following arcade physics, not a rigid-body vehicle simulation. Reduced motion removes camera smoothing and boost zoom; the driving scene still moves. The interface has keyboard-operable menus, named controls, focus handling, and status announcements, but visual driving does not have a screen-reader equivalent. Physical phones, manual screen readers, and native browser zoom were not tested. Sound toggling and synthesis were exercised programmatically; acoustic output was not assessed by listening.

## Recorded results

Checks run on 2026-10-18:

| Check | Result |
| --- | --- |
| Clean `npm ci` | Passed; lockfile resolved successfully |
| `npm run typecheck` | Passed, exit 0 |
| `npm test` | 14/14 passed |
| `npm run build` | Passed, exit 0; complete relative-URL export in `dist/` |
| `npm run test:browser` | 19/19 Chromium/WebKit scenarios passed, including a three-lap race, results, replay, and record persistence |
| `node scripts/validate-layout.mjs` | 4/4 active-game layouts passed, including tablet and landscape controls |
| Pinned taste@1 probe | 16/16 passed at 320, 390, and 1440px; 28 first-screen prose words at 390px |
| axe scans | No violations in the scanned desktop/mobile garage, pause, and results states |

The full gameplay suite completed with the final simulation/input code. A subsequent CSS-only tablet-height fix was rebuilt and checked with the four-layout script and another taste run. Exact coverage and remaining limitations are in [VALIDATION.md](VALIDATION.md), with machine-readable reports and selected screenshots in [docs/validation](docs/validation).


A final-export race after the tablet layout correction also passed: depleted boost returned to normal speed, three laps finished in **1:13.58**, and the player placed **1 / 4**, with no script errors. The delivered export and source match the clean build; see the [integrity manifest](docs/validation/build-integrity.json) and [submission size](docs/validation/submission-size.json).
