# Canon change register

This file records every story or design change between the earlier handoff and the Chapter 1 Director Script (`docs/design/chapter1-beta/06_COMBINED_CHAPTER_1_CLAUDE_REFERENCE.pdf`). Nothing is deleted. The earlier version is kept in git history (tag **`v0.2-chapter1-alpha`**, commit `004414d`) and in `docs/design/` (the original scripts, unchanged).

## CC-01 — Dash and Ruby's reward (register A-01) — PROVISIONAL, creator approval PENDING

| | Earlier canon (v0.2 alpha) | Proposed canon (Director Script, used provisionally) |
|---|---|---|
| Dash | **Crimson Dash**: Shift. Unlocked only when Red returns after Ruby's rescue. Taught in Scene 1.4 on the berry dash pads. | **Basic Dash**: Shift. **Free from the prologue**, taught in Hush Hollow (P02 Tutorial A). Not tied to any colour. |
| Ruby's reward | Red + Crimson Dash | Red + **Ruby Ember Dye** + **Flame Burst** (F), taught in R09 Flame Courtyard |
| Sources | `docs/design/01_Chapter_One_Ruby_Orchard_FULL_SCRIPT.md` §1.3–1.4; `05_Chapter_Stage_Blueprints.json` | Director Script p.1 (register), p.11 §H "SHIFT basic dash (available from prologue) … F Flame Burst after Ruby"; acceptance test 3 |

**What this build does (2026-10-17):**
* Basic Dash is available from a new game, and the Hush Hollow stripe teaches it.
* Ruby's rescue now records **Flame Burst** as the ability Red grants. **Flame Burst itself is not built**, because R09 is out of this milestone's scope. The game says so honestly: the help screen and the Red card show it as "learned in the Flame Courtyard, not built yet", and pressing F does nothing yet.
* Ruby Ember Dye is not built.
* The **legacy orchard content is untouched**. That covers Scene 1.4 (the dash-pad test) and Ruby's old line "Let me share a little dragon speed!". It now reads as reusing the basic dash, so the old Ruby line is a known inconsistency until R08–R10 replace it (see `KNOWN_ISSUES.md`).
* Save data moves to schema v3 with a non-destructive migration (see CC-04).

**To revert** if the creator keeps Crimson Dash, there are two options:
* In `src/data/abilities.ts`, give the dash `color: 'red'` (rename it back to Crimson Dash) and point `COLOR_INFO.red.ability` at it. Remove the P02 dash stripe tutorial.
* Or check out tag `v0.2-chapter1-alpha`.

Saves stay valid either way, because abilities are always re-derived from story progress.

## CC-02 — Prologue structure and dialogue — follows the Director Script

| | Earlier (P0–P4, `docs/design/00_Prologue_Script.md`) | Director Script (P00–P02) |
|---|---|---|
| Opening | "On a morning that should have been ordinary…" / "My drawing! Where did all the colors go?" | Narrator: "One morning, Hush Hollow forgot how to shine…" / Explorer: "Wait... where did my red crayon go?" |
| Pip's arrival | After any two of the three inspections | When the player inspects the **window**: Pip taps the glass |
| Wonderbrush | Take the brush, then tap a sleepy bedroom star | Pick up the brush from its cradle. Checkpoint `prologue_bedroom_complete`. **There is no bedroom star.** The first tap happens in Hush Hollow. |
| Hush Hollow | Two stars; jump step; P4 "What if I'm not brave enough?" | Tutorial A: move, camera, 0.7 m jump, basic dash stripe. B: first star. C: second star (move + jump + tap). Berry stamps lead to the arch. Exit checkpoint `ruby_entry`. |

The earlier lines remain in `docs/design/00_Prologue_Script.md` and in git history. The P4 "brave together" exchange is **not** in the Director Script, so it is no longer played. It is kept here in case the creator wants it back.

## CC-03 — Visual canon (register A-04 / A-08) — proposal
* The Explorer gets a **red sash after Ruby** instead of a red scarf.
* Proportions of 2.7–3.2 heads.
* The sky stays gray after Red.

**Not changed in code yet.** It waits for model-sheet approval. See `docs/VISUAL_STYLE_GUIDE.md`.

## CC-04 — Save schema v3 (non-destructive)
* New key: `color-me-back-save-v3`.
* The **v2 save (`color-me-back-save-v2`) is read, migrated and left untouched** as a backup. The tagged v0.2 build can still load it.
* v3 adds two fields:
  * `abilities {jump, basicDash, flameBurst}`, always re-derived from progress, so it can never unlock content early.
  * `checkpointId` (Director Script names, e.g. `prologue_bedroom_complete`, `ruby_entry`).
* It drops `prologue.bedroomStarAwake`, since there is no bedroom star any more.
* Old v2 progress is preserved:
  * If a v2 save was in the old "tap the bedroom star" step, the brush pickup already counts as `prologue_bedroom_complete`.
  * Orchard progress maps phase-for-phase.
* New Game still clears every key: v3, v2 and the v0.1 prototype.

## Pending creator decisions (from the Director Script register; all PENDING)
* A-01: Flame Burst vs Crimson Dash.
* A-02: seven Color Lords.
* A-03: chapter length.
* A-04: 3D style.
* A-05: active boss pressure.
* A-06: pet and cosmetic economy (not built).
* A-07: desktop-first platform.
* A-08: art production gates.
* A-09: source video (not received).
