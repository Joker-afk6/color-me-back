# Known issues

**Last updated:** 2026-10-17, after the Chapter 1 beta P00–P02 milestone. Newest first. "Untested" means it was never run, not that it is known to be broken.

## Open — story and canon
1. **Flame Burst is granted but not usable.** Ruby's rescue records Flame Burst (canon CC-01, provisional), but R09 Flame Courtyard is not built. Pressing F does nothing. The Red card and help screen say "not built yet". The HUD only shows abilities that are actually built.
2. **The legacy orchard contradicts the new canon.** Ruby still says "Let me share a little dragon speed!", and the Explorer still says "Whoa! I can move like Ruby!" (old script, Scene 1.3–1.4). The orchard's dash-pad test now reuses the free Basic Dash. These lines are kept verbatim from the earlier script until R08–R10 replace them. They need a creator decision (A-01).
3. **Chapter 1 orchard is the earlier 3-stage alpha.** It has no mirror garden (R03), no Jam-Jar Jester (R04), no persistent boss hazards in Adventure mode (A-05), no Ruby Ember Dye and no R10 outro. It is out of scope for this milestone.
4. **The P4 "brave together" exchange is no longer played.** It is not in the Director Script. It is preserved in `docs/design/00_Prologue_Script.md` and `docs/CANON_CHANGES.md`.

## Open — P00–P02 gaps (not built yet)
5. **P00 title art** is not the script's "almost monochrome title with three empty primary sockets". The logo letters are still rainbow-colored, and there is no music-box-note intro sting. This is art, and it waits for approval.
6. **The P01 C04 mirror close-up** and **the window's paper cutouts (berry, wave, sun)** are not built. They need a bedroom art sheet (none was supplied; crop 08 is mislabeled).
7. **The optional P02 villager** ("My little flower is shy…") is not built. It needs an NPC model.
8. **Story / Adventure / Brave difficulty modes** are not built. There is only the existing Helper-mode toggle.
9. **The Wonderbrush "cradle"** is the existing desk stand (placeholder).

## Open — art (placeholders until the model sheets are approved)
10. **Every 3D model is a procedural placeholder.** See `VISUAL_ASSET_MANIFEST.md`.
    * Explorer proportions have not been measured against the 2.7–3.2-head target.
    * The Explorer has a red-keyed scarf instead of the after-Ruby sash.
    * The hedges and grounds are primitive-heavy.
11. **The Tutorial A brook, dash stripe, berry stamps and far berry tree are greybox placeholders**, marked `PLACEHOLDER` in code. The brook is only a faint gap at gameplay distance; its white kerbs carry most of the readability.
12. **The brook is a "visual gap".** At 0.7 m it is narrower than the explorer's collider, so a child can also walk across. This is intentional and matches the script's "safe 0.7-meter visual gap", but it means the hop is encouraged, not required. The "Hop over the little brook" objective stays until a real hop happens near it. The stars are never locked behind it.

## Open — platform and testing
13. **Untested:**
    * Real touch devices, physical gamepads, Safari, Firefox, low-end hardware.
    * Real mouse drag in the mixing bowl.
    * Recorded voice. Read-aloud uses browser voices.

    The help screen no longer advertises gamepad or touch (A-07).
14. **The browser pane was hidden during testing.** Scripted scenes were therefore advanced with the QA stepper (`__CMB__.step`), which runs the real game loop in fixed steps. Keyboard input was real key events. The P02 exit camera move ran, but it was not captured in a screenshot (the chapter card was already up).
15. **Narrow or portrait windows:** HUD panels can stack over the view. The game is designed for desktop landscape.

## Fixed in this milestone
* **The player could fall during a level change.** During Continue/New Game, the player was simulated before the new level's floor existed. Under a slow fade this could cause a fall-and-respawn bark ("Whoops!"). Player physics now pause while a level loads (`Game.tick`). Verified: no barks during a 3.6 s simulated load.
* **The in-memory `checkpointId` lagged** until the next write. `GameState.apply` now refreshes the derived fields.
