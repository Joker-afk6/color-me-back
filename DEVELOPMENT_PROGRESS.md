# COLOR ME BACK! — Development Progress

**Last updated:** 2026-10-16. **Current state:** milestones M1 (foundation) and M2 (Prologue + Chapter 1) are complete and tested. **Next:** M3 — Chapter 2, Whisperwave Bay.

**Live build:** https://joker-afk6.github.io/color-me-back/. Source: https://github.com/Joker-afk6/color-me-back (public). Each push to `main` runs the tests and redeploys through GitHub Actions.

## Status at a glance
| Milestone | State |
|---|---|
| M1 Audit + shared foundation | ✅ Done ([`docs/AUDIT.md`](docs/AUDIT.md)) |
| M2 Prologue + Chapter 1 (Ruby Orchard) | ✅ Playable start to finish; see [`docs/TEST_LOG.md`](docs/TEST_LOG.md) |
| M3 Chapter 2 (Whisperwave Bay) | ⬜ Next |
| M4 Chapter 3 (Sunflower Skylands) | ⬜ |
| M5 Prism Palace + Rainbow Playground | ⬜ |
| M6 Polish + QA | ⬜ (some performance and visual work already done) |

## Completed

### M1 — Foundation
* **Audit:** all 4 ZIPs (35 PDFs, 11 images) were accessible. The starter was built and playtested, and 14 defects were documented. The starter is preserved unchanged in `reference/starter-v0.1/`.
* **Toolchain:** TypeScript 5.9 (strict), Vite 6.4 (Vite 7 needs Node ≥ 20.19), Three.js 0.180, Vitest 4.1. `npm audit` reports 0 issues. `.npmrc` sets `legacy-peer-deps` to work around an npm 10 crash.
* **Engine:**
  * Level manager with full GPU-resource disposal.
  * Fixed-step-safe loop.
  * Kinematic character motor: boxes, oriented boxes, ramps, cylinders, moving platforms, step-up, coyote time, jump buffer, ledge-guarded dash, safe respawn.
  * Third-person camera: orbit, zoom, collision pull-in, follow helper, cinematic moves.
* **Color restoration:**
  * Color-key paint materials with a per-pixel propagating wave and a reduced-motion crossfade.
  * Per-object reveal hooks.
  * Sky, outlines, procedural textures, static batching.
  * Rig mesh merging, which halves character draw calls.
* **State:**
  * Save v2 (versioned, validated, repaired, v0.1 migration).
  * Pure progression rules.
  * Settings store.
* **Systems and UI:**
  * Input: keyboard, mouse, gamepad, touch. Menus claim their own key presses.
  * Interactions (tap, hold, height-gated), hint ladders, particles, procedural music and SFX, speech read-aloud.
  * UI: title, hero select, HUD, dialogue, captions, toasts, pause, settings, help, mixer (drag + press), sticker book, chapter cards, unlock card, confirmations.
* **Characters:**
  * Girl and Boy Explorer, built from the reference art on one shared rig, with procedural animation.
  * Color-keyed accent slots: scarf (red), shell and ribbon (blue), stitching (yellow).
  * Pip as a paintbrush companion. Ruby the Rumble Dragon.

### M2 — Prologue + Chapter 1
* **Prologue P0–P4** (bedroom cinematic → inspections → Pip → Wonderbrush → Hush Hollow stars → arch). All lines are verbatim from the script.
* **Ruby Orchard:**
  * Arrival cutscene.
  * Raised trail with two gaps.
  * Push-berry switch and drawbridge.
  * White guide stars.
  * Three-stage rescue with telegraphs, safe retries, hint ladders and checkpoints.
  * RED RETURNS wave (reduced-motion crossfade alternative).
  * Crimson Dash with cooldown ring and ledge guard, plus the dash tutorial and auto-dash assist.
  * Chapter-end card.
  * Three cosmetic stickers.
  * Red restored in Hush Hollow afterwards.
* **Saves:** at chapter entry, after each stage, after the Red reveal and after the dash tutorial. Reloading resumes the exact phase, including saved mirror orientations.

## Known issues and limitations
* **Untested:**
  * Real touch devices, physical gamepads, Safari and Firefox.
  * Real mouse drag in the mixing bowl. Press-to-add is tested.
  * Low-end hardware.
* **Art:**
  * The world and characters are procedural and functional, but simpler than a commercial art pass. Hedges and grounds are fairly plain.
  * The Fade, Bloop and Sol are not modeled yet.
* **Audio:**
  * Music and SFX are synthesized.
  * Read-aloud uses browser voices; there is no recorded voice acting.
* **Layout:**
  * On very narrow or portrait windows, HUD panels stack and can cover the top of the view.
  * Designed and tested for desktop landscape.
* **Chapter 2 and later:** the chapter-end card and the hub say plainly that Whisperwave Bay is being built. No placeholder buttons lead there.
* **Prototype save:** the v0.1 save keeps only the explorer choice, because its levels no longer exist.

## Next task (M3 — Whisperwave Bay)
Start with **M3.1–M3.3** in [`docs/ROADMAP.md`](docs/ROADMAP.md): bay environment, arrival cutscene, bobbing stones, bubble lifts and current ribbon.

Then the Bloop model and the three stages, BLUE RETURNS, Bubble Glide, and the interactive Purple mix with Portal Hop. Re-use:
* `CharacterMotor` moving platforms and hazards.
* `ColorRestoration.playWave('blue', …)`.
* `mirrorPuzzle`-style pure logic and tests for the waterway maze.
* The `RescueStage` interface.
* The palette's `mixColors`.

Extend `SaveData` with `bloop` state, and derive `colors.blue` from it in `validate.ts`.
