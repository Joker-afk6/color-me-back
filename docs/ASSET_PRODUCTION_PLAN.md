# Chapter 1 Asset Production Plan — PROPOSED

**Status: proposal.** Waiting for creator approval before any major art change. It follows Director Script §11 and §15 ("ONE at a time for approval"; "Never generate huge asset batches before creator signs off on hero, Ruby and one environment style") and the Round 01 README approval order.

## Pipeline for every asset
Each step has a gate: do not move to the next step until the current one is signed off.
1. **Model-design approval sheet:**
   * Front, side, back and 3/4 views with the same lens, light and background.
   * Expression or pose set.
   * Scale lineup beside the Explorer, Pip and Ruby.
   * Grayscale silhouette test.
   * Before/after colour states, if colour-keyed.
   * **Gate: creator approval note.**
2. **Greybox in engine:** placeholder proportions on the real collider, viewed from the gameplay camera. Check readability at gameplay distance and with low VFX. **Gate: creator OK on scale and framing.**
3. **Final mesh:**
   * Modelling with sensible topology and UVs.
   * Textured materials using paint-key tags (`red | blue | yellow | neutral`), so restoration keeps working.
   * Collision proxy.
   * GLB/glTF export with compressed textures.
   * For characters: rig plus the animation set.
4. **Integration:**
   * Swap the procedural placeholder behind the same interface. For example, `ExplorerModel` keeps its API, so gameplay code does not change.
   * Profile draw calls and triangles against the current budget (about 110–360 calls).
   * Run tests and a browser playtest.
5. **In-engine approval render:** for colour-keyed assets, before and after from the **same camera**. Record the result in `VISUAL_ASSET_MANIFEST.md`.

Tooling note: right now everything is procedural Three.js. When we move to authored GLBs, we need a modelling tool (Blender is free) plus `GLTFLoader` and `KTX2`/Draco. That decision comes after the hero sheets are approved, not before.

## Exact order (modelling and integration)

| Step | Asset (script request ID) | Why at this point | Depends on |
|---|---|---|---|
| 1 | **Boy Explorer base turntable** (`CMB_HERO_BOY_BASE_TURNTABLE_v01`) | The hero is on screen 100% of the time and sets the scale for everything else | — |
| 2 | **Girl Explorer base turntable** (`CMB_HERO_GIRL_…`) | Must match the boy's rig, height and grip exactly | 1 |
| 3 | **Shared Explorer rig + animation set:** idle, walk, jog, start-stop, jump, land, **dash**, tap, sweep, turn mirror, bounce, high-five, victory | Prologue gameplay needs these; the dash is now in the prologue | 1, 2 |
| 4 | **Pip turntable** (`CMB_COMPANION_PIP_…`) | On screen from P01. A brush, not a dragon. | 1 (scale) |
| 5 | **Wonderbrush prop + action sheet** (`CMB_PROP_WONDERBRUSH_ACTION_v01`) | Picked up in P01, used for every tap | 3 |
| 6 | **Ruby corrupted/restored** (`CMB_LORD_RUBY_CORRUPTED_RESTORED_v01`) | Centerpiece. Approval is a sign-off gate before Chapter 2. | 1 (scale) |
| 7 | **Hush Hollow wide, gray** (`CMB_ENV_HUSH_HOLLOW_WIDE_GRAY_v01`), then the modular kit: 6 toy houses, plaza tiles, berry arch, 2 star seals, dash stripe, Clockbird sign, market cart | This is the "one environment style" gate. It is small, and it is the first world the player walks in. | 1–5 |
| 8 | **Bedroom set:** teddy, mirror, window with berry/wave/sun cutouts, crayon tray, Wonderbrush cradle | No reference was supplied (crop 08 is mislabelled), so it needs its own sheet | 7 (material language) |
| 9 | **Ruby Orchard wide, gray** (`CMB_ENV_RUBY_ORCHARD_WIDE_GRAY_v01`) | Defines the orchard kit | 7 |
| 10 | **Orchard path layout** (`…_PATH_LAYOUT_v01`): Berrybell Tree, 5 berry types, 3 branch platforms, 2 fences, 4 jam signs, ink twig, rolling berry | R02 gameplay | 9 |
| 11 | **Mirror + telegraph props** (`CMB_PROP_MIRROR_AND_TELEGRAPH_v01`) | R03 and R06 | 9 |
| 12 | **Arena top-down, 3 phases** (`…_ARENA_TOPDOWN_3PHASE_v01`) | R05–R07 | 6, 11 |
| 13 | **Jam-Jar Jester** (`CMB_NPC_JAM_JAR_JESTER_BASE_v01`) | R04 | 9 |
| 14 | **Matched before/after orchard** (`…_BEFORE_AFTER_v01`) | Proves the restoration in engine. Only possible once 9–12 exist. | 9–12 |
| 15 | Flame Courtyard: 3 wax seals, torch switch, berry lane, reward altar; Ruby Ember Dye glyph | R09 | 6, 14 |
| 16 | Optional villager NPC ("shy flower") | P02 optional callback | 7 |

**Integration order in code** (no gameplay rewrites):
1. `ExplorerModel` / `ExplorerAnimator`.
2. `Pip`.
3. The Wonderbrush in the hero's hand.
4. `HushHollowLevel` kit.
5. `BedroomLevel` kit.
6. Orchard kit (`OrchardWorld`).
7. `RubyDragon`.
8. Stage props.

Each step is one commit, with tests and a browser check after it.

## Effects list (Director Script §10)
1. Brush tap
2. Sweep
3. Neutral preview beam
4. Telegraph ring
5. Berry squish
6. Crystal petal dissolve
7. Red paint wave
8. Ruby wing shimmer
9. Flame Burst trail
10. Wax melt
11. Checkpoint confirmation
12. **A low-VFX version of every one of the above**

**Already in the build (procedural):** 1, 2, 3 (mirror beam), 4, 7, 11, and reduced-motion variants of 7 and 11. **Not built:** 6 (as specified), 8, 9, 10.

## What I will NOT do without approval
* Replace the Explorer, Pip or Ruby models.
* Restyle the environments.
* Import any concept image as a texture.
* Generate a batch of assets.

The procedural placeholders stay until the step-1 approval comes back.
