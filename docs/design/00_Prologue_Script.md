# PROLOGUE SCRIPT - THE DAY THE COLORS DISAPPEARED

**Runtime target:** 6-9 minutes | **Location:** Explorer's bedroom, village Hush Hollow | **Tutorial focus:** move, look, jump, brush interact.  
**Cast:** Narrator (optional voiceover), Explorer (boy or girl selection), Pip, Village Creatures (silent).  
**Starting state:** Primary color progress empty; world strongly desaturated; no secondary powers.

## P0. Opening cinematic - bedroom (0:00-1:00)
**CAM:** Float past a child's drawing: blue ocean, red fruit, yellow sun. A soft chime interrupts. Colors withdraw from the paper and travel out the window like fading ribbon. Camera returns to the waking Explorer. Their outfit is gray, but their skin retains a natural tone.  
**SFX/MUSIC:** Music box melody detunes into a soft, mysterious chord. No scream or frightening sound.  
**NARRATOR:** "On a morning that should have been ordinary, something extraordinary had vanished."  
**EXPLORER:** "My drawing! Where did all the colors go?"  
**ACTION:** Player can turn/look around; movement is enabled on the next line.

## P1. First objective: discover three details (1:00-2:30)
A teddy bear, a crayon box and a window each display a small star icon and a word label. Player may inspect in any order. After two inspections, Pip appears; third is optional.  
**EXPLORER (bear):** "Even Teddy looks different."  
**EXPLORER (crayons):** "They are all the same gray!"  
**EXPLORER (window):** "The whole village looks like a pencil drawing."  
**PIP (entrance, playful loop):** "Pssst! Over here! I'm Pip! And yes, I normally look a little more colorful."  
**EXPLORER:** "Can we fix it?"  
**PIP:** "We can try. The colors are waiting for somebody brave enough to find them."  
**Failure assist:** After 30 seconds, Pip gently highlights the closest inspectable object; the player is never graded.

## P2. The Wonderbrush (2:30-3:30)
**CAM:** Pip circles an ordinary-looking brush. Tiny sparks form a friendly star shape.  
**PIP:** "This is the Wonderbrush! It can wake up sleeping magic. Go on - give that sleepy star a tap!"  
**GAMEPLAY:** Player presses E near a glowing star. The star pulses, making a local gray sparkle. The whole world does **not** yet restore red.  
**PIP:** "See? The magic hasn't disappeared. It's just waiting!"  
**Accessibility:** Audio and symbol-based cue; auto-aim assist if close. Optional larger interaction distance.

## P3. Hush Hollow tutorial walk (3:30-6:00)
**ENV:** Rounded houses, leafless silhouettes, winding safe cobblestone path. Two Wonderbrush stars located on ground-level pedestals; optional little step for jump tutorial.  
**PIP:** "The village remembers the colors... even if we can't see them yet."  
**OBJECTIVE 1:** Find and awaken the first village star.  
**OBJECTIVE 2:** Cross a small safe platform step; awaken the second village star.  
**PIP (after first):** "One star awake! I wonder who's behind that berry-shaped arch?"  
**PIP (after second):** "Two stars! Look - a path to the Ruby Orchard!"  
**CAM:** A welcoming arch brightens with a white star outline.

## P4. Transition (6:00-7:00)
**EXPLORER:** "What if I'm not brave enough?"  
**PIP:** "Then we'll be brave together. Besides, the best adventures begin with a tiny first step."  
**PLAYER CHOICE:** Walk through arch. Fade to illustrated chapter card with speech label: CHAPTER 1 - RUBY ORCHARD. Save checkpoint.

## State and production requirements
- Persist `heroChoice`, `level='red'`, `villageStarsCompleted` when exit used.
- Character-selection visuals must not determine movement or capabilities.
- No unsafe disappearance metaphor attached to the child's skin tone; grayscale effect applies to surroundings/outfit, not identity.
- Tutorial interactions use icons, plain labels and short spoken instructions.
- The two required stars may be reached in either order.
