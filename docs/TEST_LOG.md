# Test log

Everything below was actually run on 2026-10-16. The setup was macOS, Node 20.14.0, and the Chromium-based browser pane of the Claude desktop app. Where something was **not** tested, it says so.

## Automated

| Check | Result |
|---|---|
| `npm run check` (strict TypeScript) | PASS, 0 errors |
| `npm test` (Vitest 4.1.11) | **PASS, 67/67** across 5 files |
| `npm run build` | PASS. JS 268 KB (91 KB gzip) + Three.js 529 KB (135 KB gzip). No warnings. |
| `npm audit` | 0 vulnerabilities |

### What the unit tests prove
* **Progression** (`tests/progression.test.ts`):
  * Pip arrives after exactly two inspections; the third is optional.
  * The bedroom star needs the Wonderbrush and never restores a color.
  * Village stars work in either order.
  * Ruby Orchard is locked until the prologue is done.
  * Ruby's stages cannot be skipped or repeated.
  * **Two of three stages do NOT award Red; Stage 3 awards Red exactly once** and unlocks Crimson Dash, with Blue and Yellow still locked.
  * Mixing needs both inputs, is order-independent, and is never automatic.
  * Girl and boy progress identically.
* **Saves** (`tests/save.test.ts`):
  * Garbage, corrupt or tampered saves are repaired and never skip locked content.
  * New Game wipes everything, including the old prototype save.
  * The v0.1 save migrates (keeps the explorer only).
  * Private-mode storage failure doesn't crash.
  * Settings are sanitized and persisted.
* **Puzzles** (`tests/puzzles.test.ts`):
  * The color table matches `color_system.json`.
  * **All 64 mirror states are solvable** by the hint logic within 9 taps, and only the intended solution lights the target.
  * Berry Parade waves are deterministic. Standing still → slow mode after 3 misses → assisted reveal after 6. A good dodger clears the wave.
  * The dance cycle runs 1-2-3 → gem up → retry. Sweep-painting pauses the gem timer.
* **Physics** (`tests/motor.test.ts`):
  * Landing, jump height, walls and trees, step-up vs ledges, ramps.
  * Safe respawn, hazard floors, dash gating/cooldown, ledge guard, wall stop, moving platforms.
* **Level solvability** (`tests/levelSolvability.test.ts`), using the real layout numbers:
  * Both trail gaps are jumpable.
  * The dash pads **cannot** be reached by jumping alone but **can** with jump + dash.
  * A grounded dash stops at the edge.
  * Ruby's berry platforms and the village terrace can be climbed.

## Browser playtests (dev server, real key events where noted)

Background-tab note: the browser pane was hidden during testing, which throttles `requestAnimationFrame`. Scripted scenes were therefore driven with the QA hook `__CMB__.step()`. It runs the real game loop in fixed 1/60 s steps. Keyboard input was real `KeyboardEvent`s (W/A/S/D, Space, E, Shift, Escape, M, H).

| Flow | Method | Result |
|---|---|---|
| Boot, title, hero select | Click | PASS: no console errors; both reference cards load |
| P0 opening cinematic | Watched in steps | PASS: drawing fades, ribbons, explorer wakes, both lines verbatim |
| Skip cutscene (Esc) | Key | PASS: valid end state (drawing gray, phase advanced, controls unlocked) |
| P1 inspections | Walk + E | PASS: script lines; Pip entrance after two; third optional |
| P2 Wonderbrush | E | PASS: star blocked until brush taken; brush appears in hand; gray sparkle only (Red still false) |
| Door → Hush Hollow | E | PASS: location saved; arrival line |
| P3 stars + jump step | E + real jumps | PASS: either order; terrace star blocked from ground; arch brightens, blocker removed |
| P4 + arch → Chapter 1 card | Walk | PASS: both lines verbatim; prologue saved complete |
| Scene 1.1 arrival | Steps | PASS: all 5 lines verbatim |
| Berry trail gaps | Real run + jumps | PASS: both gaps crossed; `pastGaps` checkpoint |
| Fall into juice | Walk off | PASS: gentle respawn on the trail + Pip's line |
| Push-berry puzzle | E pushes | PASS: settles on picture in 2 pushes; bridge lowers; checkpoint |
| Stage 1 Berry Parade | Stand still, then dodge | PASS: gentle bounce on hit; reveal after clean wave; tap frees crystal; lines; checkpoint; HUD 1/3 |
| Stage 2 Mirrors | Real E per mirror | PASS: 6 taps; orientation saved per tap; beam solves; wing flex; checkpoint |
| Stage 3 Dance | Stand on platform + hold E | PASS: ripple bounce on ground; gem above platform; hold progress 0→1.2 s; lines; **Red awarded here** |
| Scene 1.3 RED RETURNS | Steps + screenshots | PASS: red berries, vines, poppies, scarf, Pip's red tip turn red; blue/yellow/green stay gray; unlock card |
| Reduced-motion Red | Setting on, reload at `restoreRed` | PASS: crossfade path, card, phase → dash tutorial |
| Scene 1.4 dash tutorial | Real jump + Shift | PASS (after widening pads): both gaps; completion lines verbatim; chapter card with 2 working buttons |
| Ledge guard in game | Real Shift at lane end | PASS: dash stops at the edge |
| Helper-mode auto-dash | Assist on, jump without Shift | PASS: dash added automatically; lands on pad 1 |
| Return to Hush Hollow | Card button | PASS: Red shown in the hub; honest Chapter 2 message |
| Reload at every checkpoint | `__CMB__.load()` crafted saves | PASS: pastGaps, bridgeDown, stage2 (saved mirrors restored), stage3, restoreRed, dashTutorial resume correctly |
| Pause / help / stickers / settings | Esc + clicks | PASS: settings apply live and persist; Esc closes menus (a bug where Esc reopened Pause was found and fixed) |
| Palette | M | PASS: locked drops labeled; Red+Red message; Red+Blue → Purple once (with a test save) |
| Switch explorer, main menu | Pause buttons | PASS |
| Production build | Static server | PASS: boots, no console errors, relative asset paths, Boy Explorer new game |

## Not tested yet (honest list)
* **Real mouse/touch drag** in the mixing bowl. Synthetic pointer capture can't be simulated; the press-to-add path is tested.
* **Touch devices and tablets.** The touch layout exists but is unverified on hardware.
* **Physical gamepads.**
* **Safari and Firefox.** Only Chromium was used.
* **Read-aloud voice quality.** It depends on the OS voices; only its triggering was observed.
* **Low-end hardware performance.** Measured: ~110–360 draw calls and 240–360K triangles per frame in the orchard on this Mac.
* **Children's playtesting**, which needs adult supervision and consent (Bible §9).
