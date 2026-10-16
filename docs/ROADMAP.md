# COLOR ME BACK! — Development Roadmap

Source of truth for story, dialogue and stage rules: `docs/design/*.md` (copied verbatim from the handoff).
Each milestone ends with: type check, unit tests, production build, a browser playtest, and an update to `DEVELOPMENT_PROGRESS.md`.

Legend: **[M#.n]** task id · ✅ done · 🔶 partial · ⬜ not started

---

## M1 — Project audit and shared foundation — ✅ done (2026-10-16)
| Id | Task | Acceptance |
|---|---|---|
| M1.1 | Audit uploads and starter code; report (`docs/AUDIT.md`) | Every file listed as accessible or not; defects with evidence |
| M1.2 | TypeScript + Vite 6 + Three.js r180 scaffold; strict TS; Vitest; relative `base` for static hosting | `npm run check`, `npm test`, `npm run build` pass |
| M1.3 | Core loop, renderer, level manager with full GPU-resource disposal | No geometry/material growth across level reloads |
| M1.4 | Input: keyboard (layout-independent codes), mouse orbit/zoom, gamepad, touch buttons, edge-triggered actions | All actions reachable by keyboard only |
| M1.5 | Kinematic character controller: boxes, oriented boxes, ramps, cylinders, moving platforms, step-up, coyote time, jump buffer, safe respawn | Unit tests for landing, walls, step-up |
| M1.6 | Third-person camera: follow, orbit, zoom, collision pull-in, auto-recenter assist, cinematic moves, shake respecting settings | Camera never ends up inside walls in the shipped levels |
| M1.7 | Color-key paint materials: per-pixel propagating restoration wave, reduced-motion crossfade, per-object reveal hooks | Only the restored key saturates |
| M1.8 | Save v2: versioned, validated, repaired, migration from starter v1; progression rules (primary only on Stage 3, explicit mixing, order-independent) | Unit tests for every rule in the bible |
| M1.9 | Settings + accessibility: volumes, read-aloud, sound captions, text size, reduced motion, camera shake, sensitivity, invert Y, camera assist, assist mode, high contrast | Persist across reload; applied live |
| M1.10 | Procedural audio: music sequencer per area, SFX set, per-color motif, speech narration | Mute and volume work; no audio before user gesture |
| M1.11 | UI: title, hero select, HUD (objective, colors with shapes, abilities with cooldown), dialogue with typewriter, toasts, pause, settings, help, palette/mixer (drag + buttons), chapter cards, sticker book | Keyboard focus visible and trapped in modals |
| M1.12 | Characters: Girl and Boy Explorer 3D models from references, shared rig, identical collider/stats; animation set; color-accent slots; Pip (paintbrush companion) with follow AI and expressions | Visual check against references |
| M1.13 | Cutscene director (async, skippable, letterbox), dialogue scripting with voice-ready ids | Every cutscene skippable and leaves a valid end state |
| M1.14 | Interaction, hint ladder, checkpoint and collectible systems | Hints escalate on timer or on request |

## M2 — Prologue and Chapter 1 (Ruby Orchard) — ✅ done (2026-10-16, see docs/TEST_LOG.md)
| Id | Task | Script ref |
|---|---|---|
| M2.1 | Bedroom diorama + opening cinematic: drawing loses colors, ribbons fly out the window | P0 |
| M2.2 | Three inspectables (teddy, crayons, window) with star icon + word label; Pip entrance after two; 30 s assist highlight | P1 |
| M2.3 | Wonderbrush pickup, sleepy star tap (local gray sparkle only) | P2 |
| M2.4 | Hush Hollow hub: rounded houses, leafless trees, winding path, two stars in any order, jump step, arch brightens with white star outline | P3 |
| M2.5 | Arch transition dialogue, walk-through choice, Chapter 1 card, checkpoint save | P4 |
| M2.6 | Ruby Orchard environment: giant berry bushes, curved branches, suspended jam-jar platforms, poppies, striped awnings, vines | 1.1 |
| M2.7 | Arrival cutscene with three orbiting crystals | 1.1 |
| M2.8 | Traversal A: two gaps with safe platforms, pushable giant berry onto round switch, bridge lowers, white guide stars, 3-step hint ladder | 1.1 |
| M2.9 | Ruby model + animation (anxious, talk, tail wiggle, wing flex, stomp dance, joyful bounce) | 1.2 |
| M2.10 | Stage 1 Bouncing Berry Parade: telegraph circles + chime, gentle bounce on hit, slower sequence after 3 misses, crystal tap | 1.2 |
| M2.11 | Stage 2 Mirror Berry Puzzle: 3 mirrors, 90° taps, beam + trail preview, hint ladder incl. single-tap solve, saved orientations | 1.2 |
| M2.12 | Stage 3 Friendly Dragon Dance: 3 signaled stomps, beat floor symbols, raised berry platforms, sweep-paint (hold) final gem, retry next cycle | 1.2 |
| M2.13 | RED RETURNS: wave from Ruby through vines, fruit ripens, poppies bloom, awnings, explorer scarf; blue/yellow stay gray; reduced-motion crossfade; red motif | 1.3 |
| M2.14 | Crimson Dash: Shift while moving, cooldown ring, stops at walls, ledge guard, optional auto-dash assist | 1.3 |
| M2.15 | Dash tutorial (3 platforms + dash lane), departure dialogue, chapter card, return to hub | 1.4 |
| M2.16 | 3 Berry Stickers on side paths; sticker book | Interactions |
| M2.17 | Saves at entry, after each stage, after Red reveal, after dash tutorial; reload resumes exact phase | Interactions |

## M3 — Chapter 2 (Whisperwave Bay) — ⬜ next
| Id | Task | Script ref |
|---|---|---|
| M3.1 | Bay environment: suspended paper-sculpture waves, shells, lanternfish, coral, sea lanterns | 2.1 |
| M3.2 | Arrival cutscene and dialogue | 2.1 |
| M3.3 | Traversal: bobbing stepping stones (sine platforms), bubble lifts (vertical platforms), current ribbon (force volume) to coral tunnel; respawn at nearby dock | 2.2 |
| M3.4 | Puzzle 1: rotate current gates to carry a cork to a circular target (arrow signs, water glyphs) | 2.2 |
| M3.5 | Puzzle 2: three rhythm bubbles; after 2 falls Pip offers "steady bubbles" (pause) | 2.2 |
| M3.6 | Bloop model: 8 procedural tentacles, sleepy/tangled → buoyant | 2.3 |
| M3.7 | Stage 1 Cloudy Bubble Matching: shell-symbol bubbles, ride current to matching platform, wrong tap = musical retry + highlight | 2.3 |
| M3.8 | Stage 2 Waterway Maze: 3 rotating water-switch wheels, transparent pipe network with arrows, undo last move, hint ladder; solvability test for all states | 2.3 |
| M3.9 | Stage 3 Ride the Giant Wave: wave-lift, *temporary bubble ride* labeled, 3 platforms, sweep-paint final seal; miss returns to wave start | 2.3 |
| M3.10 | BLUE RETURNS: wave from Bloop → ocean surface, shells, explorer ribbons; reds untouched | 2.4 |
| M3.11 | Bubble Glide (hold G while falling, only with Blue) + practice gap | 2.4 |
| M3.12 | Purple discovery: drag droplets into bowl + two-button fallback, may decline; Portal Hop with paired spiral doors (keyboard + menu); tutorial pair → Purple Sticker + return route | 2.5 |
| M3.13 | Departure dialogue; conditional chapter card line; 3 seashell stickers | 2.6 |
| M3.14 | Hub: Whisperwave arch unlocked by Red | — |
| M3.15 | Tests: blue only on Stage 3; glide gating; purple only after explicit mix; no orange/green; skip-mix path | Tests |

## M4 — Chapter 3 (Sunflower Skylands)
| Id | Task | Script ref |
|---|---|---|
| M4.1 | Sky environment: floating islands, sunflowers, golden bell towers, kites, beehives, sky lanterns, cloud-lift arrival, railings on narrow paths, safe lifts under jumps | 3.1–3.2 |
| M4.2 | Puzzle A: reflector grows a temporary pale light bridge (dynamic collider) | 3.2 |
| M4.3 | Puzzle B: 3 note bells in carved-stone order; tone + symbol confirm | 3.2 |
| M4.4 | Sol model: sleepy face, halo petals, yawns | 3.3 |
| M4.5 | Stage 1 First Glimmer: rotate mirror to sunflower receiver; halo petal 1 lights white | 3.3 |
| M4.6 | Stage 2 Dancing Reflections: two rocking mirrors, numbered stars 1→2, no countdown | 3.3 |
| M4.7 | Stage 3 Wake-Up Melody: SUN/FLOWER/STAR visual + read-aloud pattern; wrong input replays; aim final reflector | 3.3 |
| M4.8 | YELLOW RETURNS: petals, lanterns, beehives, kites, explorer stitching; low-bloom, no strobe | 3.4 |
| M4.9 | Sunbeam (F): activate receptors, reveal hidden markings, show target and range | 3.4 |
| M4.10 | Orange/Green lab: Super Bounce pad, Vine Grow leaf staircase, three-route side garden | 3.5 |
| M4.11 | The Fade glimpse cutscene; Prism Palace unlocked card | 3.6 |
| M4.12 | Tests: yellow only on Stage 3; Orange/Green independent of order; no audio-only puzzle; purple routes still work | Tests |

## M5 — Prism Palace finale and Rainbow Playground
| Id | Task |
|---|---|
| M5.1 | Palace of floating unfinished frames; the Fade (shy, oversized eyes, non-scary) |
| M5.2 | Scene 4.1 dialogue |
| M5.3 | Six stations (RED/apple, BLUE/wave, YELLOW/sun, PURPLE/spiral, ORANGE/spring, GREEN/leaf); in-place mixing for missing secondaries; Fade lines after 2 and 4; missing-primary explanation |
| M5.4 | Sky painting: 6 swatches × 3 brush patterns, tap or drag onto a 3D sky canvas (render target); no score |
| M5.5 | Ending cinematic over all restored areas; ending lines |
| M5.6 | Rainbow Playground: free-play village, decorating zones, creature stickers, paintable houses, scrapbook, local saves only |
| M5.7 | Replay/continue controls; save-safety tests |

## M6 — Polish and quality assurance
| Id | Task |
|---|---|
| M6.1 | Animation polish (blend trees), facial expressions, Pip personality barks |
| M6.2 | Environment art pass, VFX pass, lighting and color grading per area |
| M6.3 | Audio mix and dynamic music layers per restored color; optional recorded voice slot |
| M6.4 | Gamepad menu navigation, touch/tablet layout (test on real devices) |
| M6.5 | Performance: draw-call budget, instancing, shadow budget, quality presets, leak checks on transitions |
| M6.6 | Accessibility audit (WCAG 2.1 AA for UI), keyboard-only full run, screen-reader labels, contrast, no flashing |
| M6.7 | Difficulty tuning + adult-help mode; playtest with adults first |
| M6.8 | End-to-end regression scripts (both heroes, full route), cross-browser (Chrome, Safari, Firefox) |
| M6.9 | Player guide, credits, provenance/license notes, release build |
