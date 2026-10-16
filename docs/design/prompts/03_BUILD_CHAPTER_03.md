# CLAUDE IMPLEMENTATION TASK 03 - SUNFLOWER SKYLANDS

Read the master prompt `00_MASTER_START_HERE.md`, the game bible, and `03_Chapter_Three_Sunflower_Skylands_FULL_SCRIPT.md` before coding. Implement THIS chapter in the existing `02_Game_Code` application, preserving all previously working chapters.

## Required finished chapter components
- Original 3D scene corresponding to the chapter visual image and its unique landmarks.
- Complete chapter arrival cutscene and in-game dialogue from the script, with optional captions and voice-ready strings.
- At least two distinct traversal/environment puzzles with interactive feedback, not just tap-to-complete glowing crystals.
- Full **three-stage Guardian rescue encounter** from the script, with telegraphs, reaction, success conditions, safe retries, checkpoint saves and a gentle hint ladder.
- **Yellow restoration** ONLY after completing Stage 3; animate visible propagation across appropriate environment meshes and the explorer's outfit.
- Fully functional primary power (consult the script).
- Any secondary-color mixing that becomes available at the end of this chapter; implement accessible drag-or-button fallback.
- Short celebratory sequence, chapter-end transition, persistence on reload.

## Test before reporting completion
1. Start from a clean save as either explorer.
2. Traverse the level and solve both approach puzzles.
3. Test all three rescue stages; deliberately miss one telegraph and verify safe retry.
4. Reload after each stage; verify state is preserved and no stage is skipped.
5. Confirm Yellow is awarded exactly once and not earlier.
6. Confirm camera, input, pause/help, sound settings, captions and reduced-motion mode are still accessible.
7. Execute `npm run check`, `npm test` (where available), `npm run build`, and browser-playtest the chapter.

**Do not output only a design description. Modify actual source files, run tests, and explain any unfinished details.**
