# CHAPTER 2 - WHISPERWAVE BAY

**Color restored:** BLUE | **Boss:** Bloop the Ocean Octopus | **Target playtime:** 20-28 minutes  
**New primary ability:** Bubble Glide | **First secondary color:** PURPLE from RED + BLUE; unlock Portal Hop.  
**Gameplay focus:** motion through currents, environmental observation, a first hands-on color-mixing discovery.

## Scene 2.1 - Enter the sleepy sea
**CAM:** Reveal suspended gray waves curling in the sky like soft paper sculptures. The bay's shells, lanternfish and coral are textured in beautiful monochrome. Bloop, a giant round octopus, sits inside three cloudy magical bubbles.  
**SFX/MUSIC:** Soft kalimba, marimba, burbling water, low and comforting pulse.  
**PIP:** "Shh. The whole ocean is holding its breath!"  
**EXPLORER:** "Can an ocean really forget how to wave?"  
**BLOOP:** "Bloop! Apparently! Every bubble I try to blow gets stuck!"  
**PIP:** "Then we'll help the bubbles float free!"

## Scene 2.2 - Travelling the bay
**Traversal:** Safe stepping stones that rise and fall with shallow waves, floating bubble lifts, a current ribbon that carries player toward a coral tunnel.  
**Puzzle 1:** Redirect a mini current to carry a harmless floating cork to a circular target. Use large arrow signs and moving water glyphs.  
**Puzzle 2:** Bounce across three bubbles that change height on a slow repeating rhythm. After 2 falls, Pip offers 'steady bubbles' option that pauses them briefly.  
**PIP (puzzle 1):** "The water wants to help. Point it where we need to go!"  
**EXPLORER (success):** "It moved! Water can be a path!"

## Scene 2.3 - Bloop rescue encounter: three stages
A large three-bubble indicator appears over Bloop. Puzzles free Bloop from the Fade's spell, rather than attacking Bloop. All sections have safe landings and reset options.

### Stage 1 - Pop the Cloudy Bubbles
**Telegraph:** Three bubbles show shell icons; one cloud-symbol bubble is the active target.  
**Action:** Ride a gentle current to the matching platform, then tap the active cloudy bubble with the Wonderbrush. A wrong tap gives a musical "try again" and helpful highlight.  
**BLOOP:** "Every time I wiggle, one of them gets stuck!"  
**PIP:** "Look for the shell symbol that matches the platform!"  
**EXPLORER:** "One bubble free!"  
**VISUAL:** White bubbles fan out; Bloop raises one tentacle and waves.  
**Checkpoint:** First bubble cleared.

### Stage 2 - The Waterway Maze
**Telegraph:** A transparent pipe network appears above the arena, marked with arrows, not only color.  
**Action:** Rotate three water-switch wheels to route a stream to a trapped bubble. Player may test routes without penalty and can undo the last move.  
**PIP:** "Sometimes the shortest way isn't the right way. Let's follow the arrows!"  
**BLOOP:** "I can almost hear the sea again!"  
**EXPLORER (success):** "It reached the bubble!"  
**VISUAL:** Second bubble floats away, accompanied by a gentle wave melody.  
**Hint ladder:** arrow highlight -> preview path -> optional step-by-step solution.

### Stage 3 - Ride the Giant Wave
**Telegraph:** Bloop makes one large, calm rolling wave. Big rising-arrow icons show when to jump or climb onto a bubble platform.  
**Action:** Ride a moving wave-lift, glide between three safe platforms (temporary beginner glide supplied for this stage), then sweep-paint Bloop's final bubble seal. A missed transfer returns to wave start with progress preserved.  
**BLOOP:** "Here's my biggest bubble yet... I hope!"  
**PIP:** "The wave is our friend! Follow its rhythm!"  
**EXPLORER (completion):** "Bloop, you're free!"  
**BLOOP:** "BLOOOOP! What a beautiful splash!"  
**VISUAL:** Third bubble dissolves harmlessly, Bloop waves eight arms in a silly dance.

## Scene 2.4 - BLUE RETURNS
**CAM:** A blue swirl spreads from Bloop to the ocean surface, then into shells and ribbons in the Explorer's clothing. Blue sea lanterns light up; foamy whites and rescued Reds remain as before.  
**MUSIC:** Bright strings, glockenspiel and wave chimes.  
**PIP:** "Blue! That makes two colors rescued!"  
**EXPLORER:** "It looks like the bay is breathing again!"  
**BLOOP:** "And here's a gift! When a jump feels too far, make yourself light as a bubble!"  
**UI:** BLUE restored + bubble/wave icon; unlock Bubble Glide (hold G while falling). A short safe practice gap follows.

## Scene 2.5 - PURPLE DISCOVERY (interactive, never automatic)
**GATE:** Requires `restored.red=true` and `restored.blue=true`. If both exist, Pip gently invites mixing; player can decline and return later.  
**PIP:** "Wait! We have Red AND Blue. What happens if two kinds of paint meet?"  
**EXPLORER:** "Let's find out!"  
**GAMEPLAY:** Two large labeled paint droplets (RED with apple icon, BLUE with wave icon) appear. Player drags or selects both into a big mixing bowl. One wobble, then *plop* - PURPLE swirls into view with a starburst. A non-drag alternative uses two large buttons.  
**PIP:** "PURPLE! You made a whole new color!"  
**BLOOP:** "My favorite for magical shortcuts!"  
**MECHANIC:** Unlock Portal Hop. Enter one purple door to emerge from another; both have matching spiral symbols and visible endpoints.  
**TUTORIAL:** One portal pair leads to a collectible Purple Sticker and a return route; skipping tutorial does not block chapter completion.

## Scene 2.6 - Departure
**BLOOP:** "The sunlight has been much too quiet lately. Can you check on Sol?"  
**PIP:** "Up we go, to Sunflower Skylands!"  
**EXPLORER:** "Come on, Pip. The sky needs its color back."  
**CHAPTER CARD:** BLUE FOUND; PURPLE DISCOVERED (only if player mixed it); YELLOW AWAITS.

## State and anti-softlock rules
- Preserve red restoration on entering the bay and blue restoration on saving. Secondary Purple only unlocked after a successful explicit mix.
- A player can mix Purple any time after unlocking the two inputs; chapter story does not permanently close the palette.
- Tentacle platforms and wave mechanics never toss the player into a death scene. Re-spawn at a nearby dock.
- If a gliding mechanic is introduced in boss Stage 3 before permanent Blue unlock, label it a **temporary bubble ride** to avoid contradiction.
- 3 optional collectible seashell stickers, cosmetic only.

## Implementation acceptance tests
1. Red remains restored, blue is desaturated before Bloop rescue.
2. Every bubble stage has a success path and a safe retry.
3. Blue unlock persists after reload; G gliding works only when Blue is available.
4. Mixing Red + Blue explicitly unlocks Purple, and does not unlock Orange or Green.
5. Purple Portal Hop works with both keyboard and accessible menu alternative.
6. Player who skips mixing can still finish the chapter and discover Purple later.
