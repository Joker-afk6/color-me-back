# ACCEPTANCE TEST CHECKLIST - CLIENT DELIVERY

> Important: Mark PASS only after the game is actually run, visually inspected and the gameplay works. Static checks do not prove a browser game works.

## Package and asset checks
- [ ] Unzip on a different computer and confirm folders/PDFs/PNGs are readable.
- [ ] Open the corrected Girl Explorer PNG; confirm a visible fully drawn character.
- [ ] Open the Boy Explorer and all environment images.
- [ ] Review all original artwork for consistency, spelling and correct colors.
- [ ] Open each separate single-image PDF, as well as the collection PDFs.
- [ ] Verify no outside image or game screenshot is misrepresented as original art.

## Build checks
- [ ] `npm install` succeeds in the game-code directory.
- [ ] `npm run check` succeeds.
- [ ] `npm test` succeeds (if the project includes tests).
- [ ] `npm run build` succeeds.
- [ ] Running browser console has zero uncaught errors.

## Prologue & chapter 1
- [ ] Both explorers visible, same speed, controls, powers and dialogue.
- [ ] Prologue and two tutorial stars function.
- [ ] Ruby Stage 1 dodge; Stage 2 mirrors; Stage 3 rhythm and final seal all playable.
- [ ] Red reveal is convincing and limited to Red-relevant props.
- [ ] Crimson Dash works and is retained after reload.

## Chapter 2
- [ ] Safe bubble lifts and flow puzzles work.
- [ ] All three Bloop rescue stages function, with fail-safe retries.
- [ ] Blue restoration persists and Bubble Glide is functional.
- [ ] Red+Blue explicit mixing makes Purple and opens actual portals.

## Chapter 3
- [ ] Mirror puzzles have visual feedback and non-audio alternatives.
- [ ] All three Sol rescue stages function and award Yellow only at the end.
- [ ] Sunbeam activates designated receptors.
- [ ] Red+Yellow makes Orange/bounce; Blue+Yellow makes Green/vine.

## Finale and accessibility
- [ ] All six color stations have shape+word icons and are achievable.
- [ ] Fade resolution is creative and nonviolent.
- [ ] Free painting is functional, and optional replay is saved.
- [ ] Subtitles/visual guidance and keyboard help work.
- [ ] Motion/audio settings work; no mandatory rapid flashing.
- [ ] Child can never become permanently stuck from missed puzzle or broken save.
- [ ] Adult-guided testing with appropriate consent confirms target-age readability.

## Current starter status
Existing source was syntax-checked successfully during packaging. Dependency installation did not complete in the packaging environment; runtime browser behavior and full boss-stage content are **not certified** by this pack. The long-form scripted stages are specifications for Claude to implement, not already completed gameplay.
