# COLOR ME BACK!

A gentle third-person 3D adventure for children ages 5–10. The colors have vanished from the world (even from your clothes). With Pip the talking paintbrush, you rescue the Color Guardians, bring Red, Blue and Yellow home, and mix them into new colors.

**This build is playable from the Prologue through the end of Chapter 1, The Ruby Orchard.** Chapters 2–4 are planned in [`docs/ROADMAP.md`](docs/ROADMAP.md) and are not built yet. The game says so honestly wherever they would appear.

Built with **TypeScript + Three.js r180 + Vite 6**. All 3D characters, places, music and sound effects are generated in code. No downloaded 3D models or audio files are used.

---

## Run it

Requirements: **Node.js 18 or newer** (tested on Node 20.14) and npm.

```bash
npm install
npm run dev
```

Then open **http://localhost:5310** in a desktop browser (tested in Chromium).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload (port 5310) |
| `npm run check` | TypeScript type check (strict) |
| `npm test` | 67 unit tests (progression rules, saves, puzzles, physics, level solvability) |
| `npm run build` | Type check + production build into `dist/` |
| `npm run preview` | Serve the production build (port 5311) |

The production build uses relative paths, so `dist/` works from any static web host or sub-folder (for example GitHub Pages). Serve it over HTTP; opening `index.html` straight from the file system won't work because of browser module rules.

## Controls

| Keys | Action |
|---|---|
| **W A S D** / arrow keys | Walk and run (camera-relative) |
| **Space** | Jump (hold for a higher jump) |
| **E** or **Enter** | Use the Wonderbrush: look, tap-paint, push. **Hold E** to sweep-paint |
| **Shift** | Crimson Dash (after Red returns). Jump, then Shift, to dash across gaps |
| Mouse drag · **Q** / **R** | Turn the camera · mouse wheel zooms · **C** puts the camera behind you |
| **M** | Paint palette (mixing bowl) |
| **H** | Ask Pip for a hint |
| **Esc** / **P** | Pause: help, settings, sticker book, switch explorer, restart checkpoint, main menu |

A gamepad (standard mapping) and on-screen touch controls are wired in but **not yet tested on real hardware**.

## What's in this build

* **Prologue:** a bedroom cinematic where the drawing's colors fly out the window, three inspectable details, Pip's entrance, and the Wonderbrush. Then Hush Hollow: two stars (one up a jump step) and the berry arch.
* **Chapter 1, Ruby Orchard:**
  * Arrival cutscene.
  * The berry trail with two gaps.
  * Push-the-giant-berry puzzle that lowers a bridge.
  * Ruby's three-stage rescue: Bouncing Berry Parade, Mirror Berry Puzzle, Friendly Dragon Dance.
  * The **RED RETURNS** color wave.
  * Crimson Dash and its tutorial.
  * Three hidden stickers, and the chapter-end card.
* **Shared systems:**
  * Real collision and safe respawn.
  * Third-person camera with collision and an optional follow helper.
  * Checkpoint saves (versioned and validated).
  * Hint ladders.
  * A propagating per-pixel color-restoration shader.
  * Paint mixing (drag or press).
  * Procedural music and SFX.
  * Optional read-aloud (browser speech).
  * Settings and accessibility options.

All dialogue is taken word-for-word from the scripts in [`docs/design/`](docs/design/).

## Accessibility & safety

* Both explorers have identical movement, collider, powers and story (enforced by one shared motor and tested).
* Colors are never shown by hue alone: every color has a word and a shape (apple, wave, sun, spiral, spring, leaf).
* Settings:
  * read-aloud, sound captions, text size (3 sizes)
  * reduced motion (soft crossfade instead of the color wave), camera shake off
  * helper mode (bigger reach, slower patterns, longer windows, auto-dash), camera helper
  * high contrast, graphics quality, volumes
* Menus are keyboard-navigable, with focus trapping and visible focus rings.
* No game over: a miss gently bounces or pops you back to safe ground with encouragement. Every stage has a safe retry and a hint ladder.
* No accounts, ads, chat, tracking or network calls. Progress saves only in this browser (`localStorage`).

## Project structure

```
src/
  core/         Game orchestrator, renderer, Level base, game-time tasks, tweens
  systems/      Input, physics, character motor, camera rig, interactions, hints,
                particles, color restoration
  rendering/    Paint (color-key) materials + shader, sky, outlines, procedural textures,
                geometry helpers, static batching
  characters/   Explorer model + animator (girl/boy), Pip, Ruby the Rumble Dragon
  gameplay/     Player, mirror-beam puzzle logic, stickers
  environments/ Prop library, title stage, bedroom, Hush Hollow, creatures, labels
  chapters/ruby Chapter 1: layout, world, push puzzle, three rescue stages, level flow
  state/        Save format, pure progression rules, validation/migration, settings, store
  audio/        WebAudio synth (music sequencer + SFX), read-aloud narrator
  ui/           HUD, dialogue/captions/toasts, menus, screen stack, touch controls, icons
  data/         Colors and mixing rules, abilities, chapters, speakers, script lines
  debug/        QA hooks (dev builds or ?debug only)
tests/          Vitest unit tests
docs/           Audit, roadmap, test log, gameplay guide, design scripts, reference art
reference/      The original v0.1 starter code, preserved unchanged
```

## Provenance

* The 2D reference art and scripts come from the project handoff (`docs/design/`, `docs/reference-art/`). The hero-select cards show the provided Girl and Boy Explorer images.
* All 3D models are original procedural interpretations of those references, built in code. They are not imported models.
* Font: Fredoka (SIL Open Font License), bundled locally via `@fontsource/fredoka`.

## Developer notes

* Progress status and next tasks: [`DEVELOPMENT_PROGRESS.md`](DEVELOPMENT_PROGRESS.md). What was verified, and how: [`docs/TEST_LOG.md`](docs/TEST_LOG.md).
* In dev builds (or with `?debug`), `window.__CMB__` exposes QA helpers. Examples: `snapshot()`, `step(seconds)` (fixed-step simulation), `hold([...codes], s)`, `tap(code)`, `teleport()`, `load(save)`.
