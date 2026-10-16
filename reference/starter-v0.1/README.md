# Color Me Back! — all-chapter 3D starter game

This is **starter source code**, not a polished commercial game. It includes a playable 3D scene for each of the four story chapters, character choice with visible boy/girl character-reference cards, a companion, dialogue, 3 interactive objectives per primary chapter, 6 final stations, primary-color restoration, secondary-color mixing and powers, saving, keyboard/touch buttons and a simple ending.

## Run in Claude Code or on your computer

Install Node.js 20.19+ or 22.12+ with npm. From `02_Game_Code`:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates a distributable site in `dist`.

> Dependencies could not be downloaded in the asset-creation environment. Syntax validation and five Node content tests passed, but a browser playtest and production acceptance test must be completed on a connected computer before claiming the game has no errors.

## Controls

- WASD or arrow keys: move
- Space: jump
- E: Wonderbrush interact
- M: paint mixing palette
- Shift: Crimson Dash after Red
- G: Bubble Glide while falling after Blue
- F: Sunbeam hint after Yellow (visual/audio implementation still to improve)
- 1: Purple Portal Hop near a portal
- 2: Orange Super Bounce near a pad
- 3: Green Vine Grow near a vine
- H: help

Touch screens: movement/jump/interact on-screen buttons. Full touch usability and controller support remain follow-up tasks.

## Scope and known limitations

- All chapters have functioning core objectives and progression, but **the full multi-phase boss battles, cinematic cutscenes, character skin customization, polished animations, and multiplayer are NOT implemented**. The large guardians are procedural placeholder models.
- Hush Hollow and all chapters use original procedural geometry, not the 2D SVG concept images. Provide the visual pack to Claude as *art direction*, not as game-ready 3D models.
- The girl reference is a newly constructed 2D vector design, intended to replace the blank image from the earlier concept presentation.
- Music, voice acting, narration, performance testing, localization and device-specific accessibility testing are not complete.
- Game saves progress locally in a browser, and there is no account, chat, ads, or purchase flow.

## Suggested tasks for Claude

1. Install dependencies and run the build and browser.
2. Confirm that character selection, transitions and all 4 chapters run from start to finish.
3. Improve player camera/collision, puzzle feedback and save-game resilience.
4. Replace boss placeholders with complete three-phase encounters designed in `03_Story_and_Game_Design`.
5. Integrate 3D characters/world assets consistent with the reference pack, and add cinematic restoration sequences.
6. Playtest with adults first and with children only under appropriate consent/supervision.

## Visual note
The selection screen uses the real corrected girl character preview and matching boy character preview from `public/assets/characters`. In-world characters remain original procedural 3D placeholders; Claude should model/rig polished 3D equivalents following those references.

### Test game data locally

```bash
npm run check
npm test
```

The five content tests passed during packaging; this does **not** establish gameplay or visual correctness.
