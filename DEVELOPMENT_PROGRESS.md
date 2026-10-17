# COLOR ME BACK! — Development Progress

**Last updated:** 2026-10-17.

**Current state:** Chapter 1 beta, milestone **B1 (audit + P00–P02)** is done and tested. **Stopped at a safe checkpoint, waiting for the creator's CONTINUE and art approvals.**

**Primary spec:** the Director Script, [`docs/design/chapter1-beta/06_COMBINED_CHAPTER_1_CLAUDE_REFERENCE.pdf`](docs/design/chapter1-beta/). Earlier handoff docs in `docs/design/` still apply where the Director Script is silent.

**Safe checkpoint:** git tag **`v0.2-chapter1-alpha`** (commit `004414d`). It is the playable v0.2 (Prologue + Ruby Orchard alpha, Crimson Dash canon) from before this work. It is local only and not pushed yet.

**Live build:** https://joker-afk6.github.io/color-me-back/. It still runs v0.2; B1 is not pushed.

## Status at a glance
| Milestone | State |
|---|---|
| M1 Audit + shared foundation | ✅ Done ([`docs/AUDIT.md`](docs/AUDIT.md)) |
| M2 Prologue + Chapter 1 alpha | ✅ Done (tag `v0.2-chapter1-alpha`) |
| **B1 Chapter 1 beta: source audit + visual review + P00–P02** | ✅ **Done, tested. Awaiting CONTINUE.** |
| B2 R01–R02: orchard arrival + berry trail to the Director Script | ⬜ Next (after CONTINUE) |
| B3 R03 mirror garden · B4 R04 Jam-Jar Jester | ⬜ |
| B5 R05–R07 Ruby phases with active hazards + Story/Adventure/Brave | ⬜ |
| B6 R08 restoration · B7 R09 Flame Courtyard (Flame Burst, Ember Dye) · B8 R10 outro | ⬜ |
| Art pipeline (hero → Pip → Wonderbrush → Ruby → Hush Hollow → …) | ⏸ Waiting on creator approval of model sheets ([`docs/ASSET_PRODUCTION_PLAN.md`](docs/ASSET_PRODUCTION_PLAN.md)) |

## B1 — what was built (2026-10-17)

**Documents:**
* [`docs/CHAPTER1_BETA_AUDIT.md`](docs/CHAPTER1_BETA_AUDIT.md): source audit, conflicts, plan.
* [`VISUAL_ASSET_MANIFEST.md`](VISUAL_ASSET_MANIFEST.md): all 18 images plus documents, with status, conflicts and the 3D work each needs.
* [`docs/VISUAL_STYLE_GUIDE.md`](docs/VISUAL_STYLE_GUIDE.md): proposed.
* [`docs/ASSET_PRODUCTION_PLAN.md`](docs/ASSET_PRODUCTION_PLAN.md): exact modelling and integration order.
* [`docs/CANON_CHANGES.md`](docs/CANON_CHANGES.md): Flame Burst proposal; earlier canon preserved.
* [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md).

**Gameplay (P00–P02), all placeholders labelled:**
* **P00:** the title now offers Start Adventure / Continue (only when a save exists) / Settings / How to Play (/ About). The two explorers stay identical (tested).
* **P01:** Director Script bedroom.
  * Narrator line and the "red crayon" line.
  * Teddy and crayons are optional.
  * The **window** brings Pip, with the full verbatim exchange.
  * Sparkle "arrows" point to the Wonderbrush. The assist icon pulses at 20 s, and Pip hints at 35 s.
  * **Pickup = checkpoint `prologue_bedroom_complete`**, and the door then opens.
  * The old bedroom star is removed.
* **P02:** Hush Hollow.
  * **Tutorial A:** move and camera; a hop over a safe 0.7 m brook; **Basic Dash (Shift), free from a new game**, on a chevron courtyard stripe with a white-gold trail (red stays locked).
  * **B:** first star.
  * **C:** second star, up the terrace with real jumps.
  * Berry stamps on the road.
  * The arch opens with gray petals.
  * The exit camera looks toward a distant berry tree.
  * **Checkpoint `ruby_entry`.**
  * All P02 story lines are verbatim from the Director Script.
* **Canon CC-01 (provisional):** Basic Dash is free. Ruby's Red now grants **Flame Burst** (F). It is declared only, not built; the game says so honestly.
* **Save v3** (`color-me-back-save-v3`):
  * Derived `abilities` and `checkpointId`, never trusted from storage.
  * The v0.2 save is read, migrated with all progress kept, and **left untouched**, so the tagged build can still load it.
  * New Game clears every key.
* **Robustness:**
  * Player physics pause during level loads (a fall/respawn bark during Continue fades was found and fixed).
  * The help screen no longer advertises gamepad or touch (A-07).

**Tests:** 82/82 pass (67 before, plus 15 new): window-triggered Pip, pickup checkpoint, practice memory, ruby_entry, Basic Dash before the boss, Flame Burst only after Stage 3, v0.2 migration (4 cases), untrusted stored flags, idempotent writes, brook clearable, the brook can never swallow a walking child, the dash stays on the stripe. Browser results are in [`docs/TEST_LOG.md`](docs/TEST_LOG.md).

## Earlier milestones (summary)
* **M1:**
  * Toolchain: TypeScript 5.9 strict, Vite 6.4, Three.js 0.180, Vitest 4.1.
  * Engine (level manager, kinematic motor, camera rig), color-restoration shader, saves, input, UI, procedural audio.
  * Girl and Boy Explorer, Pip, Ruby.
* **M2:**
  * Prologue and the Ruby Orchard alpha: trail, push-berry bridge, 3-stage rescue, RED RETURNS wave, dash test, stickers, chapter-end card.
  * Details at tag `v0.2-chapter1-alpha` and in `docs/TEST_LOG.md`.

## Next smallest task (after CONTINUE)
**B2: R01 arrival cinematic to the Director Script.**
* The orchard-entry camera crane.
* Ruby glimpsed curled under **three** dull crystals.
* The five R01 lines verbatim:
  * "Those fruit are behaving like bowling balls!"
  * "I promise I am usually a very polite dragon!"
  * "Ruby? Are you okay?"
  * Ruby's line about worrying over perfect berries.
  * Pip's line about the three crystals.
* Objective HUD "Reach Ruby's crystal grove".
* Save `ruby_entry` → `ruby_trail_clear`.

This reuses the existing orchard and leaves the rescue stages alone. The R02 berry trail with rolling-fruit tells follows after it.

**Separate track (needs the creator):** approve or redirect the Boy Explorer model sheet (Asset plan step 1) and register items A-01 to A-09.
