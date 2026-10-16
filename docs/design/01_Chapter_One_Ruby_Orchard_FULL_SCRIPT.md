# CHAPTER 1 - THE RUBY ORCHARD

**Color restored:** RED | **Boss:** Ruby the Rumble Dragon | **Target playtime:** 18-25 minutes  
**New primary ability:** Crimson Dash | **Gameplay focus:** playful movement, dodging, puzzle telegraphs, cause-and-effect.  
**Level promise:** The orchard is gray, but its silhouettes hint at giant berries, curved tree branches, suspended jam-jar platforms, and a friendly sleeping dragon.

## Scene 1.1 - Into the orchard (arrival and discovery)
**CAM:** The arch opens onto enormous berry bushes that are still gray. Branches sway; fruit hangs like round lanterns. Ahead, three faceted gray spell crystals orbit an enormous dragon.  
**MUSIC:** Curious marimba, little hand drums, warm strings.  
**PIP:** "Oh wow! Look at all these berries! Well... I think they're berries. It's hard to tell without red."  
**EXPLORER:** "Is that a dragon?"  
**RUBY (trembling voice):** "A friendly dragon! Mostly! Three silly spell crystals won't let my wings flap."  
**EXPLORER:** "We can help you."  
**RUBY:** "Oh, thank goodness! Please watch out for the bouncing fruit. It has a mind of its own!"

### Traversal section A: The giant berry trail
**Player goal:** Reach the orchard clearing. Jump over two generous gaps with visible safe platforms; push one oversized gray berry onto a floor switch to lower a bridge.  
**Teach:** Walk and jump with on-screen icon prompt, push via Wonderbrush E. No time limit.  
**Hint ladder:** (1) sparkle the berry; (2) Pip: "That round berry might fit on the round picture!"; (3) slow optional guide arrow.  
**Success:** A short path lights with neutral-white guide stars, not yet with red.

## Scene 1.2 - Ruby's clearing / rescue encounter
**Structure:** Three distinct stages, each breaks one of Ruby's three crystals. The player is helping Ruby, not harming her. Show three large gem symbols above Ruby. Each stage ends with a checkpoint. Difficulty adapts with generous timing.

### Stage 1 - The Bouncing Berry Parade
**Telegraph:** Ground circles with berry icons and chime indicate where three giant soft berries will land.  
**Action:** Dodge the bouncy fruit by moving outside circles, then tap the revealed crystal after the fruit rolls away. This is about noticing safe space; a hit simply bounces the Explorer gently backward.  
**RUBY:** "Oh, bother! My berries are bouncing again!"  
**PIP:** "Watch for the circle. A berry's about to land there!"  
**EXPLORER (on successful tap):** "One crystal is free!"  
**RUBY:** "My tail can wiggle! What a marvelous start!"  
**VISUAL:** First crystal cracks into harmless sparkling dots; Ruby's tail has a happy squash-and-stretch animation.  
**Checkpoint:** Stage 2 starts with no time pressure. After 3 missed dodges show a slower version of the sequence.

### Stage 2 - The Mirror Berry Puzzles
**Telegraph:** A painted arrow appears above three round mirrors. White energy travels between them.  
**Action:** Use Wonderbrush to rotate mirrors so a friendly beam points into the second spell crystal. Each tap rotates by 90 degrees; a trail preview shows its direction. All mirrors have large arrows and tactile-looking frame designs.  
**PIP:** "The sparkle keeps missing its mark. Let's give it a new direction!"  
**RUBY:** "Is it working? My left wing just twitched!"  
**EXPLORER (completion):** "Two! Almost there!"  
**VISUAL:** The second gem blossoms into white star particles; the dragon flexes one wing.  
**Hint ladder:** highlight the first mirror -> highlight beam route -> optional single-tap solve.  
**Checkpoint:** Puzzle state saved or reset to a valid initial orientation, never an unsolvable random state.

### Stage 3 - The Friendly Dragon Dance
**Telegraph:** Ruby performs three clearly signaled stomp patterns with soft ripples; rhythm is slow and beat-marked by floor symbols.  
**Action:** Safely move to a raised berry platform, then sweep-paint the last gem when Ruby's final stomp lifts it into view. A player who misses just tries the next cycle.  
**RUBY:** "One big wiggle! Two big wiggles! Here comes my biggest... WIGGLE!"  
**PIP:** "That's our chance - paint the sparkly crystal!"  
**EXPLORER (completion):** "Ruby! You're free!"  
**RUBY:** "My wings! My color! My RAZZLE-DAZZLE!"  
**VISUAL:** Final gem opens like a harmless flower; Ruby's silhouette bounces happily; no dragon damage, no health bar.

## Scene 1.3 - RED RETURNS (signature moment)
**CAM:** Close on Ruby's face. An intense red spark ignites in her chest and flows outward through a network of berry vines. Wide orbit: fruit ripens, poppies bloom, striped awnings turn crimson, and a ribbon of red lights up a scarf on the Explorer. Blue/yellow objects remain mostly gray.  
**MUSIC:** Distinct red motif in warm brass and bells. Optional reduced-motion version uses a soft crossfade instead of sweeping particles.  
**PIP:** "Look! RED! Red is back in the world!"  
**EXPLORER:** "The berries! The flowers! And my scarf!"  
**RUBY:** "You gave me the courage to try again. Let me share a little dragon speed!"  
**UI:** RED restored + star/apple icon, RED swatch, ability card *Crimson Dash*.  
**MECHANIC:** Tap Shift while moving to dash a short, safe distance. Strong cooldown ring. Never dash off unavoidable edges; stop at walls.

## Scene 1.4 - Test the new power
Three wide-spaced platforms and one short dash lane. Safe floor below; optional auto-dash assist.  
**PIP:** "Ready? A dash is a quick WHOOSH! Try it along the sparkly path!"  
**EXPLORER (after dash):** "Whoa! I can move like Ruby!"  
**RUBY:** "There's something strange happening near Whisperwave Bay. I heard a very unhappy 'bloop'!"  
**PIP:** "Then that's our next color!"  
**CHAPTER CARD:** RED FOUND; BLUE AWAITS. Return to hub or exit to Chapter 2.

## Interactions and checkpoints
- Save at chapter entry, after each of 3 stages, after Red reveal, after dash tutorial.
- Red is only awarded on successful stage-3 completion, not on walking near Ruby.
- Players may view checkpoint and help information any time; there is no health, death, or forced restart.
- Optional collectibles: 3 Berry Stickers hidden along the side paths. Cosmetic only; no influence on progression.
- Visual motif: berry outline, heart-shaped leaves, triangular crystal icons; do not rely solely on red color.

## Implementation acceptance tests
1. Complete Stage 1 with keyboard, and verify Stage 2 loads.
2. Fail the Stage 1 dodge deliberately; verify safe bounce, no blocked state.
3. Reorient mirrors from every reset condition; every state remains solvable.
4. Complete all 3 stages; verify Red returns to orchard but Blue and Yellow remain locked.
5. Verify hero outfit gains **only** the red accent and Crimson Dash is available after reloading save.
6. Verify boy/girl choices have equal collision, jump, dash and dialogue.
