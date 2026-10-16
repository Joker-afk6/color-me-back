# CLAUDE OPUS - MASTER BUILD INSTRUCTIONS

**READ THIS FIRST.** You are acting as an experienced game development team responsible for implementing **COLOR ME BACK!**, an original, child-friendly, third-person 3D fantasy puzzle-platform game. This package contains a creative design bible, complete scripted beats for the prologue, Chapters 1-3, a bonus finale, a multi-scene browser prototype, and original 2D concept images.

## Required first actions
1. Read every Markdown file in `03_Story_and_Game_Design`, especially `00_Master_Game_Design_Bible.md` and Chapter scripts 1-3.
2. Read `02_Game_Code/README.md`, `package.json`, and all existing source files. **Do not delete or blindly replace them.**
3. Inspect the images under `04_Visual_References`: characters, colors, and each environment. Check the PDFs if easier to view. Note that these are **reference illustrations**, NOT ready-made animated 3D models. Recreate their shape language, palette, and mood in original 3D.
4. Summarize the current implementation versus the full scripted vision. Identify exactly what is implemented, missing, and untested. No unsupported claims of perfection.
5. Run `npm install`, `npm run check`, and `npm run build` in `02_Game_Code`. If a command fails, explain why and fix it. Launch the game, check browser console and manually test the full path; if no browser is available, explicitly say it is untested.

## Objective
Implement **all three main chapters**: the Ruby Orchard, Whisperwave Bay, and Sunflower Skylands, with their 3-stage nonviolent boss rescues, primary-color restoration effects, and accessible challenges. Preserve the prologue and Prism Palace conclusion. Aim for a coherent production-ready architecture, but proceed in small verified increments rather than attempting to generate an entire AAA game in one response.

## Non-negotiable player experience
- Choose Boy Explorer or Girl Explorer with **identical mechanics** and both visibly represented (see fixed girl image).
- A welcoming 3D grayscale world, not a flat slideshow, still visually attractive and easy to navigate.
- Pip companion with personality and helpful optional dialogue.
- Real movement, jumping, collisions, interacting and save/load; no fake clickable demo masquerading as a game.
- Three uniquely themed chapters, each with exploration, two environmental puzzles, three varied encounter stages, safe checkpoints, and a cinematic **color restoration**.
- Real color permissions: Red unlocked by Ruby, Blue by Bloop, Yellow by Sol; Purple requires Red+Blue; Orange requires Red+Yellow; Green requires Blue+Yellow. Mixes require an explicit player palette action and persist in local save.
- Powers have real in-world use: Crimson Dash, Bubble Glide, Sunbeam, Portal Hop, Super Bounce, Vine Grow.
- Color accessibility: each has text, shape symbol and optional voice; do not require hue discrimination or hearing.
- No gore, punishment-based game over, harmful dialogue, intrusive monetization, public chat, or child data collection.
- Reduce motion/audio settings, keyboard-friendly menus and controls, safe help hints, clear objective marker and restart/continue.

## Required architecture and code standards
Existing initial stack: Vite + Three.js + JavaScript modules. You may incrementally convert to TypeScript only if a full, working migration is justified and verified; prioritize completeness over an untested rewrite. Use small modules for level data, puzzle state, interactions, save state, abilities, audio, camera, graphics, accessibility, game progression, and boss stage controllers. Keep UI and world state synchronized.

Write state transitions explicitly, with a robust chapter progression state machine. Puzzle and boss stages must be deterministic or seeded; every stage must remain solvable. Avoid placeholder methods that only show toast messages when a real mechanic is promised. Do not break previous chapters while modifying later ones.

## Milestone order (implement ALL, but verify each)
**M0 Audit + build:** Running baseline, known bugs, test report.  
**M1 Foundation:** Correct player characters, camera, controls, checkpoints, palette/save invariants.  
**M2 Chapter 1:** Three Ruby boss stages, engaging Orchard traversal, staged Red restore, functional dash.  
**M3 Chapter 2:** Unique aquatic traversal, three Bloop stages, staged Blue restore, actual glide, Red+Blue interactive Purple mixing and portal traversal.  
**M4 Chapter 3:** Mirrors and rhythm pattern accessible both visually and audibly, three Sol stages, Yellow restore, functional Sunbeam, Orange and Green mechanics.  
**M5 Finale:** Six stations, Fade dialogue, freeform sky painting activity, finale and replay mode.  
**M6 Polish + regression:** 3D art consistency, performance, gamepad/mobile assessment, animated cutscenes, narration options, sound settings, robust saves, end-to-end tests.

After completing each milestone, produce: (a) changed source file list, (b) command results and tests, (c) screenshots or video **only if actually captured**, (d) open issues and the exact next step. Continue with the next milestone once validated.

## Specific acceptance tests to automate where possible
- Both explorer choices start and complete Chapters 1-3 with the same capabilities.
- A new game resets all saved progress; loading existing saves never skips locked chapters.
- Completing two of Ruby's three stages DOES NOT award Red. Stage 3 awards Red exactly once and unlocks dash.
- Similarly Blue only on Bloop Stage 3 and Yellow only on Sol Stage 3.
- Secondary colors never unlock until both inputs are owned AND player mixes them. Order-independent. No duplicate or missing color state.
- A player missing Purple can come back and mix later. No permanently blocked mandatory paths.
- All mini-games are keyboard playable, completable with visual cues, and have a safe retry and assisted hint path.
- No browser console exceptions; scene transitions don't leak 3D assets; performance remains playable on target hardware.
- The finale depicts the Fade as a shy character helped creatively rather than defeated violently.

## Visual and reference treatment
`04_Visual_References/characters/01_Girl_Explorer_FIXED.png` is the corrected girl reference. `02_Boy_Explorer.png` is the boy counterpart. Use equally polished characters. `worlds/` PNGs show conceptual silhouettes for village/three Guardians/secondary abilities/finale; the programmatic vector illustrations are mood boards, not third-party art and not final 3D environments. `colors/01_Color_Combination_Board.png` and `color_system.json` are authoritative for the educational paint combinations.

## Deliverables required from you
A tested, runnable game repository with source and build instructions; all chapter scenes and real puzzle stage logic; characters, environments, UI, save/loading; a short updated gameplay guide; documented remaining work; and a true test log. Do not call the prototype 'perfect' or 'error-free' until cross-browser tests and gameplay acceptance tests pass. If budget/time constraints require reducing scope, state the tradeoff before cutting core chapter mechanics.

**Start now: inspect the existing project, report the audit, run the baseline checks, and implement M1. Do not stop at a general design proposal.**
