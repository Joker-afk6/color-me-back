# CHAPTER 3 - SUNFLOWER SKYLANDS

**Color restored:** YELLOW | **Boss:** Sol the Sleepy Sun | **Target playtime:** 22-30 minutes  
**New primary ability:** Sunbeam | **New secondary colors:** ORANGE from RED + YELLOW; GREEN from BLUE + YELLOW.  
**Gameplay focus:** reflected light, cooperative-feeling companion interactions, pattern recognition and creative combinations.

## Scene 3.1 - Climb into the sleepy sky
**CAM:** The Explorer rises on a soft cloud-lift to floating sunflowers and golden bell towers, all drained to gray. A huge sleepy sun floats beneath translucent mist.  
**MUSIC:** Music-box bells and quiet pizzicato. The tune seems to be missing its ending.  
**PIP:** "I thought the sky would be bright up here. But it's having a very long nap."  
**EXPLORER:** "Sol? Can you hear us?"  
**SOL (half asleep):** "Mm... five more... sunrises..."  
**PIP:** "We'll wake Sol with gentle light, not loud noise!"

## Scene 3.2 - Cloud walkway and mirror garden
**Traversal:** Broad cloud stepping-stones; visible railings on any narrow path, slow moving platforms, and a safe lift beneath each jump.  
**Puzzle A:** Angle one friendly light reflector to grow a temporary bridge of pale-white light. Beam arrow symbol shows direction.  
**Puzzle B:** Match three note-shaped bells in the order indicated by patterns carved into stone. Both tone and visual symbol confirm progress.  
**PIP:** "A light beam is a traveler. We can help it choose the right path!"  
**EXPLORER:** "It's like drawing with sunshine!"  
**Checkpoints:** Gate opened; mirror garden completed.

## Scene 3.3 - Sol rescue encounter: three stages
**Goal:** Rotate three colossal light mirrors to wake Sol. Each mirror has a different mechanic; each success brightens a segment of Sol's halo without globally restoring Yellow until the third is complete.

### Stage 1 - The First Glimmer
**Telegraph:** A pale beam projects slowly from an uncolored star lantern. A mirror displays a carved arrow and a hand icon.  
**Action:** Rotate mirror by 90-degree increments until beam points at a sleeping sunflower-shaped receiver. Subtle line preview helps planning.  
**PIP:** "Can you turn that mirror toward the sleepy flower?"  
**EXPLORER (success):** "The flower is waking!"  
**SOL:** "Mmm... a little warmer..."  
**VISUAL:** First halo petal glows softly in neutral white, not yellow yet.  
**Checkpoint:** First mirror aligned.

### Stage 2 - The Dancing Reflections
**Telegraph:** Two mirrors rock in a repeating, slow, predictable pattern, displaying numbered star symbols 1 and 2.  
**Action:** Redirect beam first to 1, then to 2; a missed connection simply returns the beam to the start. No strict countdown.  
**PIP:** "One reflection, then another. We can take our time."  
**EXPLORER:** "One... two... the light is moving!"  
**SOL:** "Is it morning already?"  
**VISUAL:** Halo second petal glows; clouds part slightly.  
**Hint ladder:** arrows -> path preview -> optional assistance.

### Stage 3 - The Wake-Up Melody
**Telegraph:** Three bells display a visible SUN / FLOWER / STAR symbol pattern, read aloud once.  
**Action:** Tap bells in the displayed sequence to power the final reflector. Wrong input replays the pattern and a gentle chime; it does not reset earlier stages. Use the Wonderbrush to aim the final light toward Sol.  
**PIP:** "Let's give Sol a little melody to wake up to."  
**EXPLORER:** "Sun... flower... star!"  
**SOL (waking):** "GOOD MORNING, EVERYONE! Was I asleep?"  
**PIP:** "Just a tiny bit!"  
**SOL:** "Oh my, the whole sky needs cheering up!"  
**VISUAL:** Sol yawns; halo forms a complete crown of rays. Third spell seal gently opens.

## Scene 3.4 - YELLOW RETURNS
**CAM:** A bright golden wave runs through sunflower petals, sky lanterns, beehives and kites. Yellow stitching appears on the Explorer's outfit, joining the restored red and blue details. The sun radiates warm light, without excessive bloom or flashing.  
**MUSIC:** Sol's tune resolves to a triumphant major chord.  
**PIP:** "YELLOW! All three Great Guardians are free!"  
**EXPLORER:** "The world looks different with every color."  
**SOL:** "Take a little sunbeam with you, brave painter!"  
**UI:** YELLOW restored + sun icon; unlock Sunbeam (F) to activate light receptors and reveal hidden path markings. Clearly display current target and range.

## Scene 3.5 - ORANGE and GREEN laboratory
**PIP:** "We have three primary paints now. That means we can create even more!"  
**PLAYER CHOICE:** Mix Red + Yellow for ORANGE, Blue + Yellow for GREEN, or experiment with Red + Blue for PURPLE if previously missed. Always use large icons/labels and verbal feedback; both secondary powers may be learned in either order.  
**ORANGE MIX:** Red apple icon + Yellow sun icon -> Orange spring icon.  
**PIP:** "ORANGE! Let's bounce!"  
**Mechanic:** An orange bounce pad, activated by the Orange paint selection, launches the player to a high but safe landing platform.  
**GREEN MIX:** Blue wave icon + Yellow sun icon -> Green leaf icon.  
**PIP:** "GREEN! Look, your paint can help plants grow!"  
**Mechanic:** Paint a wilted vine structure; it grows a temporary broad staircase of leaves. Failing a jump returns to the ground safely.  
**Activity:** A three-route side garden lets players choose bounce, vines, or purple portals (if available), reinforcing the purpose of mixed colors. Include optional hints for any skipped mix.

## Scene 3.6 - The secret of the Fade
**CAM:** After returning the last primary, the village map fills with soft color pulses. A lonely floating shadow appears on the horizon by Prism Palace; it looks worried, not evil.  
**SOL:** "Someone made the world quiet because they were afraid of getting it wrong."  
**EXPLORER:** "Then maybe they need a friend."  
**PIP:** "There is one last place to visit. Prism Palace."  
**CHAPTER CARD:** ALL THREE PRIMARY COLORS FOUND; PRISM PALACE UNLOCKED.

## Save-state and tuning
- Yellow restored only when Sol's 3 stages are complete. All previous primary restorations persist.
- Green and Orange require explicit mixes, are order independent, and are available later even if skipped here.
- Do not represent orange and green as extra enemy Guardians. Secondary colors are discoveries, not villains.
- Keep important paths accessible with just primary powers; optional side routes use secondary powers and cosmetic rewards.
- No flashing strobe; give low-bloom and low-motion settings and visual alternatives to audio melody input.

## Implementation acceptance tests
1. Red and Blue stay restored on entry; Yellow remains muted until Stage 3.
2. Every light and bell challenge can be solved without sound perception alone.
3. Sunbeam actually activates appropriate in-world receptors after unlock.
4. Mixing Red + Yellow unlocks Orange and bouncing; Blue + Yellow unlocks Green and vine growth.
5. All previously available Purple routes remain functional.
6. Both hero options can reach the finale from a fresh save, without an unsolvable puzzle.
