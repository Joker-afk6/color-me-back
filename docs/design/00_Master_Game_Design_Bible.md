# COLOR ME BACK! - MASTER GAME DESIGN BIBLE

**Project status:** Full creative and technical design for all chapters; runnable browser-game *starter source*, not a completed production game.  
**Working title:** COLOR ME BACK!  
**Genre:** Family-friendly 3D puzzle-platform adventure with optional future local co-op.  
**Target audience:** Primarily ages 5-10, with an adult-help mode for younger players.  
**Initial platform:** Desktop web browser; later evaluate downloadable PC/tablet edition.  
**Core promise:** Every new color changes the world **and** what the child can do.

## 1. High concept
An adventurous child wakes in a world that has forgotten its colors. A floating brush companion, Pip, helps the player find three enchanted Color Guardians: Ruby (red), Bloop (blue), and Sol (yellow). Freeing each Guardian permanently restores its primary color, unlocks a distinctive skill, and enables new mixed colors. The child ultimately meets the Fade, a shy magical being whose fear of imperfection triggered the loss. The ending rewards curiosity, compassion, and creativity.

## 2. Canon, fairness, and age-safety
- Players choose a boy or girl explorer. Equal speed, jumping, abilities, voice line content, puzzles, costumes, narrative treatment, and camera behaviors. No gender-coded gameplay.
- Start outfit and world mostly grayscale; keep natural skin tones and high-contrast usability cues so the scene is welcoming and legible. Skin color **never** functions as a collectible or reward.
- The protagonist is referred to in scripts as **Explorer**, so lines work for either selection. Optional player name is local-only and must be treated safely if added later.
- Encounters are rescues, not injury or punishment. No gore, frightening death animations, jump scares, loot boxes, ads, public chat, or manipulative rewards.
- When players miss, reset them to nearby safe ground with encouragement and retain checkpoint progress. Never require timed perfection to unlock the story.
- Voice and symbols complement written color names. Avoid challenges that rely on hue alone; shape, icons, position, and spoken labels must also carry information.
- All 3D art is **original**. Reference images in this pack are 2D concept illustrations and are not licensed third-party game screenshots or finished 3D assets.

## 3. Player fantasy and controls
Camera: friendly third-person follow camera, generous framing, optional camera-assist/reduced camera shake.  
Movement: run, jump, interact, paint, and context-specific color powers.  
Desktop controls: WASD/arrow keys move; Space jump; E interact; M palette; Shift Crimson Dash; G Bubble Glide; F Sunbeam; keys 1/2/3 mixed-color powers; Esc pause/settings.  
Touch/gamepad: designed as later milestones; implement and test before public mobile release.

### Wonderbrush verb set
1. **Tap-paint:** Activate symbols, purify spell crystals, color selected interactive scenery.
2. **Sweep-paint:** Link two marked objects to solve light-route or water-route puzzles.
3. **Blend:** Combine unlocked primary colors in an accessible paint palette to release an ability.
4. **Celebrate:** Trace a ribbon of paint when a guardian becomes free; purely celebratory, not a scored dexterity test.

## 4. Progression map

| Sequence | Setting | Primary objective | Permanent unlock | Secondary opportunity |
|---|---|---|---|---|
| Prologue | Bedroom + Hush Hollow | Find Pip and wake two brush stars | Wonderbrush | None |
| Chapter 1 | Ruby Orchard | Free Ruby from three spell crystals | Red + Crimson Dash | None yet |
| Chapter 2 | Whisperwave Bay | Free Bloop from three enchanted bubbles | Blue + Bubble Glide | Red + Blue = Purple + Portal Hop |
| Chapter 3 | Sunflower Skylands | Wake Sol through three reflecting mirrors | Yellow + Sunbeam | Red + Yellow = Orange + Super Bounce; Blue + Yellow = Green + Vine Grow |
| Finale | Prism Palace | Help the Fade illuminate six stations and paint a picture | Rainbow Playground replay area | All six colors, no destructive final boss |

**Important progression rule:** Secondary colors are only unlocked by a voluntary **mixing interaction** after both contributing primary colors are restored. They do not automatically appear merely because one Guardian was rescued.

## 5. Color vocabulary and rules

| Paint combination | Result | Hex swatch | Mechanic | Learning moment |
|---|---|---|---|---|
| Red + Blue | Purple | #A855F7 | Portal Hop | Two paints make a third |
| Red + Yellow | Orange | #F97316 | Super Bounce | Predict then test |
| Blue + Yellow | Green | #22C55E | Vine Grow | Try, notice, repeat |

Primary art keys: Red #EF4444, Blue #3B82F6, Yellow #FACC15. Grayscale background: #A0A7AF. These are **art direction references**, not mathematically exact pigment samples. This game teaches traditional children's paint mixing, **not additive RGB light mixing**. For educational integrity, avoid claiming that RGB screen light obeys the same mixes.

## 6. Chapter escalation and emotional arcs
**Prologue:** Wonder -> concern -> agency; teach moving, inspecting, and pressing E.  
**Chapter 1:** Surprise -> courage -> accomplishment; introduce safe telegraphs and small jumps.  
**Chapter 2:** Discovery -> flexible thinking -> trust; add flow mechanics and color mixing.  
**Chapter 3:** Patience -> pattern recognition -> confidence; combine powers and reflection puzzles.  
**Prism Palace:** Empathy -> creative expression -> belonging; avoid combat resolution.

## 7. Art, sound and camera pillars
- Stylized 3D: smooth rounded geometry, painterly materials, delightfully exaggerated props, readable silhouettes, soft bloom, warm rim-light, restrained particle effects.
- Grayscale phase is still attractive: layered values, tactile textures, illuminated interaction icons, readable pathways, no flat empty levels.
- Returning color is an animated **wave**, moving over environmental elements from the Guardian outward. Trees, berries, coral, clothing accents and UI gain the newly rescued color. Other primary colors remain muted until earned.
- Guardians visibly communicate mood: Ruby anxious then joyful; Bloop sleepy and tangled then buoyant; Sol drowsy then radiant. Avoid threatening closeups.
- Sound: gentle rhythmic score, distinct musical cue for every color, quieter mode, captions for critical cues, optional narration and reduced sound mode.
- Each level has several short safe areas where a player can pause or explore without pressure.

## 8. Mode scopes
**Version 1 - proof of concept:** Desktop web, solo, all chapter hubs, objective loops, basic color restoration and save state.  
**Version 2 - premium vertical slice:** Complete three-phase Ruby encounter, polished protagonist animation, cinematic color wave, accessibility, full playtest.  
**Version 3 - extended game:** Full Bloop and Sol encounters, traversal design, optional co-op, custom art/audio, Prism finale and replay area.  
**Never promise multiplayer, cinematic bosses, polished voice acting, or phone support until built and tested.**

## 9. Quality and acceptance rules
- Each chapter can be completed using **either** explorer. No unwinnable states after loading a save.
- Unlock permissions derive from saved restored colors, not the order of UI visits.
- No unrelated colors are restored during a primary-color reveal. Skin tones and required navigation cues are allowed exceptions.
- Every encounter stage has a visible telegraph, a response window, success feedback, a safe retry and optional hints.
- Story dialogue does not contradict the action, and no key steps require reading fluently.
- Keyboard-only navigation for all menus, focus visibility, audio options, reduced motion, subtitles, and screen-reader labels for web UI.
- Local save survives reload; start a New Game always resets all progression.
- No child data collection, social messaging, ads, or external account requirement in the demo.

## 10. Build contract for Claude
Read `01_Claude_Prompts/00_MASTER_START_HERE.md`, then all chapter scripts and the `04_Visual_References` folder. Use `02_Game_Code` as existing starter code; extend it rather than overwriting working behavior. Run the included tests and Vite build, then open a browser and manually exercise every chapter. Report untested claims and remaining work plainly. Do **not** use the PDF images as though they were 3D models; build original 3D character/scene art consistent with them.
