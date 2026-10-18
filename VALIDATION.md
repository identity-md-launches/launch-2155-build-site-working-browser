# Apex Run validation and design review

Worker-run evidence for the delivered static export, dated 2026-10-18. These checks are not independent certification of browser behavior or accessibility.

## Scope and assumptions

The requested product is a working in-browser 3D racing game. This implementation supplies one real WebGL circuit, three computer-controlled rivals, three laps, three difficulty settings, keyboard and touch driving, rechargeable boost, collisions, off-road penalties, pause/restart, results, and personal bests saved only on the current browser/device. Racing uses road-following arcade physics. No multiplayer, account, wallet, remote service, or owner-provided value was needed.

The visual idea is a low-poly, golden-hour canyon framed by restrained dark racing instruments. The opening scene is the same live 3D world used in play, rather than a screenshot standing in for gameplay.

All six pinned Better Interface domains were read and applied during implementation, followed by a consolidated source and rendered review. The pinned wallet guide was read; wallet infrastructure was not applicable to this game. The prior rejection supplied only `internal_error`, without an actionable trace; this work was created from the clean checkout rather than attributing that unexplained failure to a guessed cause.

## Better Interface coverage

| Domain | Coverage | Evidence and boundaries |
| --- | --- | --- |
| Accessibility | Checked | Native buttons, labeled radio fieldset and checkbox, named paint/drive controls, skip link, stable live region, visible focus, native modal dialogs, keyboard help/drive/pause flows, pointer release/cancel, reduced-motion behavior, and axe scans of desktop/mobile garage, pause, and results. Physical screen readers and acoustic output were not tested. Visual driving has no equivalent nonvisual gameplay mode. |
| Layout | Checked | Production export at 320, 390, 800, and 1440px; real game state on mobile, plus a complete race at 800×600. Screenshots, boxes, scroll width, and a 200% text-size emulation were inspected. The start action ends at y≈355 on the 390×844 first screen. Native browser zoom, translated content, and an RTL mirror were not tested. The product is English-only. |
| Writing | Checked | Actions match handlers; setup and control hints use plain descriptions; graphics/storage/audio errors report what is known and provide a next step. Local records are explicitly described as local. The headline is four words; taste measured 28 prose words on the first 390px screen. |
| Typography | Checked | Local Barlow/Barlow Condensed files loaded successfully. Taste measured two families, weights 400/600/700, and at most six distinct used sizes per viewport. Number fields use tabular figures. Mobile line breaks and text enlargement were viewed. Broad multilingual typography is not implemented. |
| Colors | Checked with limits | Solid CSS roles and selected-state outline were calculated with relative luminance; see `docs/validation/contrast-pairs.json`. Actual rendered solid-text checks passed. The taste probe explicitly excluded 49 text boxes over canvas/gradients, so no universal contrast claim is made for moving imagery. Text backings were strengthened after screenshot review. |
| UI details | Checked | Garage rest/selected states, disabled graphics failure, empty records, countdown, active play, boost, off-road status, pause, restart, results and replay were exercised. Native dialogs visibly contain focus. Hover/pressed transition rules and the short loading state were source-reviewed; a 10%-speed animation-panel session was not performed. There is no idle scene motion and reduced motion removes camera smoothing/boost zoom. |

Not applicable: forms collecting personal data, financial transactions, wallets, theme switching, online leaderboard synchronization, and localization workflows. No unrelated features were added to satisfy those checks.

## Findings and fixes

### 1. High · scene orientation hid the asphalt

- **Source:** `src/game/scene.ts:114`, `src/game/scene.ts:134`; the final triangle order is `[p1, p2, p3, p2, p4, p3]`.
- **Observed:** the first desktop screenshot showed ground where the road should have been. Back-facing strip triangles were culled. The gantry lettering also read backward from the starting camera.
- **Fix:** normalize the strip bounds, correct winding, and rotate the banner toward the starting camera (`src/game/scene.ts:323`). Mesa clearance also accounts for each rock's radius (`src/game/scene.ts:342`).
- **Recheck:** final 390/1440 screenshots show continuous asphalt, curbs, center markings, correctly oriented banner text, and an unobstructed course. Driving exercises the real geometry.

### 2. High · enlarged text overflowed garage chrome

- **Source:** `src/styles.css:168` (`.site-header`), `src/styles.css:421` (`.lobby-footer`), and the mobile grid near `src/styles.css:1266`.
- **Observed:** the first 200% root text-size test reported horizontal overflow at 390px.
- **Fix:** permit header/car-picker wrapping, allow footer content to shrink/wrap with `minmax(0, 1fr)` columns, and let labels wrap without clipping.
- **Recheck:** the same automated reflow assertion passed; the enlarged-text screenshot shows all labels and actions. Normal 320/390/800/1440 layouts also pass.

### 3. High · pause/results needed modal keyboard behavior

- **Source:** `src/components/RaceOverlay.tsx:15`; `src/components/Modal.tsx:15`; `src/App.tsx:362`.
- **Observed:** source review of the initial overlay found ordinary sections without native background inertness or focus containment.
- **Fix:** use `HTMLDialogElement.showModal()`, explicit Escape behavior, focus restoration, and a named primary action. Closing help over a paused race restores the resume action.
- **Recheck:** keyboard and pointer pause/resume/restart pass; active focus is inside the dialog, a visible focus ring was inspected, and the paused-state axe scan reports no violations.

### 4. Medium · mobile headline joined two words

- **Source:** `src/App.tsx:141`, the title's `<br />` and following space.
- **Observed:** hiding the desktop line break on mobile produced “thenext” in the first 390px screenshot.
- **Fix:** preserve a real word separator across the responsive line break.
- **Recheck:** the final screenshot and accessible heading both read “Chase the next corner.”

### 5. Medium · four slogan fragments competed with instructions

- **Source:** `src/App.tsx:145`, the mobile input hint, and `src/game/model.ts` (`MODE_DETAIL`).
- **Observed:** the first taste run passed 15/16, failing `slogans` for four short multi-beat lines.
- **Fix:** the description now says “A 3D arcade racer through Copper Canyon.” Sport says “Quick rivals and a proper canyon challenge.” The mobile hint says “Steer, brake, and boost with on-screen controls.”
- **Recheck:** taste reports one remaining multi-beat line and all 16 checks passing. No extra layout section was introduced.

### 6. Low · paint targets were below the comfortable touch size

- **Source:** `src/styles.css:453`, `.swatch`.
- **Observed:** the first probe reported three 36px-wide controls below its comfortable 44px size, while still passing the 24px baseline.
- **Fix:** make each swatch 44×44px and retain the selected check mark and outline.
- **Recheck:** the final probe reports zero measured controls below 44px.

### 7. Medium · selected pace relied on a weak fill difference

- **Source:** `src/styles.css:298`, `.segmented input:checked + span`.
- **Observed:** the selected fill `#303833` against `#171b1a` calculates to 1.44:1, a weak sole selection cue.
- **Fix:** add a one-pixel `--color-muted` outline, while preserving the native radio state and separate focus outline.
- **Recheck:** outline/fill calculates to 6.26:1, and the selected outline is visible in the final mobile/desktop screenshots.

### 8. Medium · image-backed text needed a local backing

- **Source:** `src/styles.css:625`, `.driving-instruments`; `src/styles.css:1553` and `src/styles.css:1566`, the mobile text backings.
- **Observed:** the enlarged-text screenshot moved circuit copy over lighter terrain, outside the viewport-relative dark region. Instrument text also crosses changing terrain during driving.
- **Fix:** give instruments a 92% opaque backing and tie mobile intro/circuit gradients to their own text regions.
- **Recheck:** final normal and enlarged-text screenshots were inspected. The probe still labels gradient/canvas text unmeasured; these changes are not presented as a measured contrast certification for every game frame.

### 9. High · speed and depleted-boost accounting needed correction

- **Source:** `src/game/model.ts:142`, `aboveLimit` / `effectiveAcceleration`; `tests/model.test.ts`, the speed-limit regression.
- **Observed:** final source review found that normal acceleration (16 m/s²) was added before a smaller 12 m/s² drag correction. This allowed normal throttle to keep increasing speed above its intended limit and retain boost speed.
- **Fix:** above the active limit, deceleration replaces throttle acceleration. Normal throttle caps at 53 m/s; boost caps at 72 m/s, then returns to the normal limit when released.
- **Recheck:** a regression exercises eight seconds of normal throttle, two seconds of boost, then release. All 14 simulation/track/storage tests pass. Review of the race recording also exposed boost refilling while still held; at slow frame rates a partial charge could grant a whole boost frame. Boost now requires the full frame’s charge and recharges only after release. A second regression checks depletion at 60, 50, and 20 simulation steps per second. The production export was rebuilt and browser driving/full-race validation rerun after both corrections.

### 10. Medium · pausing needed to silence audio immediately

- **Source:** `src/game/useRacer.ts:33` and `src/game/useRacer.ts:56`.
- **Observed:** relying solely on the next animation frame to mute the engine could leave audio active when a hidden tab stops receiving frames.
- **Fix:** pause and graphics-failure handlers immediately set the engine gain target to zero, clear controls, and publish the paused state.
- **Recheck:** sound toggles, pause, tab-deactivation handling, and WebGL recovery execute without script errors. Acoustic output was not assessed by listening.

### 11. High · tablet garage height leaked into the race

- **Source:** `src/styles.css:549`, the `.game-shell.phase-*` height rules.
- **Observed:** the 800×600 results capture revealed a 780px game shell inherited from the garage breakpoint, which could put touch controls below the viewport.
- **Fix:** give active race phases their own higher-specificity 600px minimum, while retaining the short-landscape viewport override. The short-landscape minimap is also reduced and moved above the instruments so the two do not overlap.
- **Recheck:** `scripts/validate-layout.mjs` verifies every touch control is at least 44px and within the viewport, checks dialog bounds, and exercises pause/resume at 800×600, 844×390, 390×844, and 320×740. All four pass. The final export was rebuilt and the design probe rerun.

## Verification method and limits

The package was installed with `npm ci` in an isolated temporary project, using the delivered manifest/lockfile. The source was copied into that project, `typecheck`, `test`, and `build` were run, and its clean `dist/` was copied back byte for byte. No package registry, node_modules tree, browser binary, system-library archive, or package-manager cache is included in the deliverable. No ignore file was changed.

Browser tests use the built export at `/preview/`, with external requests blocked, rather than a Vite development server. WebKit initially could not initialize because its test-system libraries were unavailable. Those libraries were installed in a temporary test-only location; actual WebKit rendering and interaction checks then ran. No browser substitute or WebGL mock was used for the successful gameplay tests. The failure-state test deliberately disables WebGL only inside an isolated context to verify the recovery UI.

A post-physics-fix browser run was terminated by the execution environment with exit 143 during its long full-race phase. The final run uses an 800×600 viewport for that phase and steers by the visible race clock rather than wall-clock delay. The game itself is not accelerated or given a test-only state override. Unit tests advance the actual simulation directly, which is appropriate for deterministic physics validation.

The MCP browser inspection reported no console errors or missing resources. It emitted four graphics-driver “GPU stall due to ReadPixels” warnings while taking screenshots; these were not application exceptions. Headless Chromium/WebKit and emulated touch are not physical iPhone/Android tests. No native browser 200% zoom, manual assistive-technology session, or exhaustive moving-background contrast audit was performed. Those limitations remain explicit despite passing automated checks.

## Commands and recorded outcomes

These are the project commands used in the isolated build/test directory; the resulting export was served from the repository's `dist/`.

| Command / check | Actual outcome |
| --- | --- |
| `npm ci --no-audit --no-fund` | Exit 0; manifest and lockfile dependencies match |
| `npm run typecheck` | Exit 0 after the final physics changes; build also reruns the check |
| `npm test` | Exit 0; 14/14 simulation, track, timing, storage, and boost-limit tests |
| `npm run build` | Exit 0 after the last source change; 46 modules transformed, no bundle-size warning |
| `node scripts/validate-browser.mjs --dist dist --out test/scratch/final-browser` | Exit 0; 19/19 scenarios, Chromium and WebKit, zero reported environment limitations after tooling repair |
| `node scripts/validate-layout.mjs --dist dist --out test/scratch/game-layout` | Exit 0; 4/4 viewport cases, all driving targets inside the viewport, pause/resume and bounded dialogs |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline` | Exit 0; 16/16 after final source/export changes. The explicit temporary Playwright module/browser paths were supplied to this pinned probe. |
| Source/export integrity | All delivered source/public/test files match the clean build input; every `dist/` file matches the clean build output byte for byte |

Browser tooling dependencies were kept outside the submission. The isolated WebKit runner used its temporary graphics-library installation; the actual website's code and serving behavior were unchanged. No screen-reader, physical-device, acoustic, or native-zoom claim is inferred from these automated results.

The complete Chromium gameplay scenario finished all three laps in **1:13.07** of game time after the boost corrections, verified three lap entries, replay, and a record surviving reload. Its final UI-only tablet-height correction was separately tested on the rebuilt export; the simulation and input source remained unchanged. The race test uses genuine keyboard events and a visible clock to time steering, not a production test hook.

## Requirement coverage

| Acceptance requirement | Result and implementation |
| --- | --- |
| “a usable website exists with working primary interactions and responsive layouts” | Met: real 3D racing, setup, keyboard/touch driving, pause/restart, result/replay, and local records; tested viewports and interactions above |
| “dist/index.html and its assets … alongside the source and lockfile” with relative URLs | Met in the submission files: `dist/index.html`, all referenced assets, `src/`, `package.json`, and `package-lock.json`; Vite base `./`, subpath validation and no external runtime requests |
| “production build, typecheck and useful interaction validation” with actual results/limits | Met: commands/results above and in README; raw summaries retained under `docs/validation/` |
| Better Interface applied, all six domains reviewed, findings fixed and limits recorded | Met: coverage and eleven concrete findings above; implemented design extracted into `DESIGN.md` |
| First screen at 390px shows product/main action; title, favicon, description, og:title, og:image | Met: actual scene/car and visible start control, y≈355 button bottom at 390×844; all metadata and local image/icon files verified |
| Root `DESIGN.md` documents implemented tokens, type, components and responsiveness | Met: implementation-specific document with source references and no fictional variants |
| README explains install, preview and rebuild | Met: clean installation, development, production preview, static serving, test and share-image commands |

The required export and source are present for the submission system. No `.git/` mutation, publication command, submodule, or ignore-file edit was performed.

## Evidence

- [Browser scenarios](docs/validation/browser-results.json)
- [Active-game layout measurements](docs/validation/game-layout.json)
- [Taste checks](docs/validation/taste-checks.json)
- [Axe violations by state](docs/validation/accessibility-violations.json)
- [Calculated solid contrast pairs](docs/validation/contrast-pairs.json)
- [390px first screen](docs/validation/mobile-390.jpg), [1440px garage](docs/validation/desktop-1440.jpg), [320px layout](docs/validation/mobile-320.jpg)
- [Keyboard-focused pause](docs/validation/pause-desktop.jpg), [mobile driving](docs/validation/race-390.jpg), [200% text enlargement](docs/validation/text-200-percent.jpg)
- [WebKit mobile](docs/validation/webkit-390.jpg), [tablet driving](docs/validation/game-tablet-800.jpg), [landscape driving](docs/validation/game-landscape-844.jpg)

The saved screenshots were inspected, not merely generated. At 390px the product and start action are visible without scrolling. No unresolved high- or medium-impact finding remains within the stated scope; unperformed and image-contrast checks remain limitations rather than claimed passes.


## Final export and completion

After the tablet-height correction, a focused race on the final export verified that depleted boost returns to normal speed in the browser, then completed all three laps in **1:13.58**, finishing **1 / 4**, with no script errors. This used real key events and retained the current results screenshot. See [final-export race](docs/validation/final-export-race.json) and [results](docs/validation/results-800.jpg). This additional check removes any reliance on the earlier results capture for the final layout.

Source/public/test files and the export were compared byte for byte with the clean build directory. [Build integrity](docs/validation/build-integrity.json) records the final source and export hashes. Required entry assets exist, the share image is a real 1200×630 PNG, and the manifest/lockfile agree. The submission file set contains no submodules, dependency directories, package caches, or dependency archives. It is below the 8 MiB budget; the final byte total is recorded in `docs/validation/submission-size.json`.

**Complete for the stated scope.** The requested game, source, lockfile, static export, README, design documentation, validation evidence, and stated limitations are included. Hosting and publication are outside this assignment.
