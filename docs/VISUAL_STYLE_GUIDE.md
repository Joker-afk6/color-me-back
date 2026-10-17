# Chapter 1 Visual Style Guide — PROPOSED (not approved)

**Status: proposal for creator approval (register item A-04 / A-08).** Built from Director Script §1–16 (pages 14–19 of `06_COMBINED_CHAPTER_1_CLAUDE_REFERENCE.pdf`), the Round 01 tracker's "Color and Materials" sheet, and what the Round 01 images got right. Where the images and the script disagree, **the script wins**. Swatches are art references, not measured accessibility tests.

## 1. One-sentence look
A handcrafted, toy-scale 3D storybook. It starts as a **beautiful pearl-gray** world, and Red returns only to tagged objects when the child rescues a gentle dragon. Lush and cinematic, but readable and calm for ages 5–10.

## 2. Shape language
* **Rounded and bevelled everywhere.** No sharp spikes, teeth or claws on any character. Houses are lumpy clay towers with round windows and thick trim.
* **Chunky, soft silhouettes** that read at gameplay distance (about 6–10 m). Test every character and prop as a flat gray silhouette.
* **Paths curve in S and C shapes** to reveal landmarks one at a time.
* Scale: the Explorer is about 1.0 world unit tall in the design model; in the engine, keep the existing consistent scale.
  * Berry trees: 6–9 hero heights.
  * Giant berries: big enough to be rolling scenery.
  * Bridges: leaf mats stitched with rope.

## 3. Characters

| Character | Proportions | Must have | Must not have |
|---|---|---|---|
| **Explorer (boy and girl)** | **2.7–3.2 heads tall**. Big head, big eyes, chubby cheeks and limbs. Identical height, pivot, collider, reach, jump and dash. | Practical hoodie/jacket, cuffed trousers or overalls, chunky sneakers. Outfit starts **desaturated**. A **small red sash appears only after Ruby**, mirrored on both heroes. Natural skin tones are never grayed. | Adult proportions, makeup, heels, fashion-model posing, a saturated red scarf before Ruby, gender-dependent stats or lines. |
| **Pip** | **0.35 hero heights.** Floating brush: soft cream bristles, steel ferrule, short warm wooden handle. | Ring eyes, bristle-like eyebrows, optional tiny gloved hands, flexible paint-drop tail. 5 expressions: intrigued, concerned, excited, pointing, relieved. Small rhythmic hover that never blocks the view during jumps or mirrors. | **A dragon body (Pip is a paintbrush).** Rainbow or saturated magic before restoration. A red ribbon before Ruby. |
| **Ruby** | **2–2.8 hero heights** (provisional). Plump bean-shaped plush dragon: thick round muzzle, big eyes, cushiony paws, horn buds, soft broad wings. | **Corrupted:** gray-lilac (#8F8893) with a pale cloudy seal; three spell crystals **floating at a distance, never piercing her**; worried, apologetic face. **Restored:** the same mesh and face, berry-red scales #D94A59, coral underside #F48A7A, embroidered-vein wings, warm cheek glow. | Spikes, armor, a threatening stance, sharp teeth, "BOSS" framing, any damage toward her. |
| **Jam-Jar Jester** (R04, later) | Stubby jar | Paper crown, jam-splatter bowtie, eyes inside the clear jar, rubbery base, spring hop. Gray before Ruby. "Defeat" = harmless berry-mist pop, then relief. | Maces, a toothy grin, villain framing, steampunk-robot styling. |

## 4. Materials
Every scene must show **several material types**:
* Painted plastic (props, berries).
* Sculpted clay (houses, rocks).
* Felt and cloth with stitches (awnings, bridges, characters' clothes).
* Subtle paper (signs, cutouts, the title).
* Polished wood (Pip, the Wonderbrush, fences).

Detail comes from silhouette, layered decals, texture and light, not from clutter on paths. Avoid "default spheres on a flat plane". Engine note: the current color-key paint shader (`src/rendering/paint.ts`) handles before/after on the **same material**, which is what the script asks for.

## 5. Color
Palette hierarchy **before Ruby**: 65% soothing neutral, 25% textured cool/warm gray, 10% tiny UI or glow accents. **After Ruby**, red is the first strong saturated pigment in the world, and only on red-tagged objects. It is never a whole-screen red wash.

| Token | Before Ruby | After Ruby | Note |
|---|---|---|---|
| `sky.haze` | #CAD0D5 pearl | **#CAD0D5 (unchanged)** | The sky does NOT turn blue in Ch1 |
| `stone.path` | #ADB4B9 | #ADB4B9 | Neutral |
| `bark` | #766F70 | #766F70 | Neutral |
| `berry` | #8A858C | #D64F59 | Red-tagged |
| `restore.wave` | warm white-pink | #EF4444 | Wave accent only |
| `roof.redTrim` | neutral plum-gray | #C94D4A | Red-tagged roofs and embroidery |
| `ruby.scales` / `ruby.belly` | #8F8893 | #D94A59 / #F48A7A | Same mesh |
| `ui.symbol` | #F3EEE8 | #F3EEE8 | Accessibility white, never locked |
| `ink.charcoal` | #3A3A40 | #3A3A40 | Outlines and text (tracker) |
| `blush.gray` | #9A8F98 | — | Tracker extra |
| `red.deep` | — | #A92F45 | Shadow side of red (tracker) |

**Never before or during Ch1:** blue skies or water, yellow sunlight or sunflowers, green grass, orange, purple. Grass stays a neutral gray-green value. Natural skin tones and white UI glyphs are exempt from locking. **Color is never the only signal:** every hazard and paint uses text + shape + sound. Shapes are berry/circle, triangle crystal, arrow mirror, star, flame torch, flower check, lock waves and dye vial.

## 6. Light and weather (daytime only; no storms, flicker or glare)

| Scene | Time and weather | Light |
|---|---|---|
| Bedroom (P01) | Clouded midmorning, pearly fog outside | Broad window bounce, soft side shadow |
| Hush Hollow (P02) | Brighter cloud cover | Diffuse neutral key, rim on the player |
| Orchard entrance | Hazy late morning | Soft bands through big trees |
| Mirror garden | Filtered clearing | White reflections, crisp glints |
| Jam mill | Mild breeze, moving cloud shadows | Stronger AO, warm-neutral bounce |
| Ruby arena | Clearing clouds | Big top fill; landing zones always readable |
| Restoration | Local cloud break | Red bounce on nearby geometry, controlled glow |
| Flame Courtyard | Calm afternoon | Crisp friendly key, non-flashing red glyphs |

Weather is mood, never difficulty. Reduced motion simplifies particles, sweeps and the restoration.

## 7. Camera
* Child-height third-person follow, softly damped and collision-aware.
* A minimum pitch so jumps stay visible; big berries must never hide the hero.
* Reveals are long and curved (no repeated hard cuts).
* Puzzles: a slight pan to show the target; the ghost beam is in world space.
* Restoration: 12–18 s from close to wide, skippable, with a reduced-motion path. At least one uncut in-engine shot must show real recoloring.

## 8. UI
Round translucent parchment panels, large outlined lettering, icon + word labels.

HUD layout:
* Top left: task.
* Top right: three phase icons.
* Bottom right: brush / dash / (future) Flame Burst.
* Bottom center: Pip's hint line.

Subtitles have backgrounds. Text must stay readable on both gray and red. The current HUD uses a parchment style; the phase-icon placement still has to be checked against this layout when R05 is built.

## 9. Rejection criteria (Director Script §16)
Reject art that shows any of these:
* Generic block or sphere primitives with no intent.
* Blown-out bloom.
* Adult proportions.
* Anything copied from It Takes Two.
* Color-only threat cues.
* A muddy (not beautiful) gray world.
* Blue or yellow leaking after Ruby.
* A scary or violent Ruby.
* Mismatched hero proportions.
* Concept images presented as finished models.

**Honest note:** today's procedural placeholders would fail several of these (primitive-heavy hedges and grounds; Explorer proportions unmeasured; scarf instead of sash). That is why every one of them is listed as a placeholder in [`VISUAL_ASSET_MANIFEST.md`](../VISUAL_ASSET_MANIFEST.md).
