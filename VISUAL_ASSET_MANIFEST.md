# Visual Asset Manifest — Chapter 1 (Round 01)

**Created:** 2026-10-17. **Source package:** `ColorMeBack_Design_Round01_All_Files.zip`, copied unchanged into [`docs/reference-art/round01/`](docs/reference-art/round01/). **Rules applied:** the Director Script ([`docs/design/chapter1-beta/`](docs/design/chapter1-beta/)) and golden rule 10, "Creator approves".

**Approval status: nothing is approved yet.** All 18 images are marked `PROPOSAL / NOT APPROVED` in `image_sources_and_status.json`. The Design Tracker lists 25 assets with 0 approved, and approval register items A-01 to A-09 are all PENDING. **None of these images is a 3D asset.** They are 2D mood art. The game's current 3D models are procedural placeholders built in code (see "Current in-game stand-ins" below).

Status key:
* **PROPOSAL**: a mood reference only. Do not model from it until the creator approves a model sheet.
* **CONFLICT**: contradicts the Director Script or the Bible. Use only the parts noted.
* **REJECT-AS-IS**: unusable as a model source without a redraw.

## 1. Documents

| File | What it is | Use |
|---|---|---|
| `docs/design/chapter1-beta/06_COMBINED_CHAPTER_1_CLAUDE_REFERENCE.pdf` (23 pages) | Director Script, plus art/color/camera/asset spec v1.0, plus the approval register | **Primary spec** for Chapter 1 beta. An extracted text copy sits next to it. |
| `round01/ColorMeBack_Chapter1_Visual_Lookbook.pdf` (11 pages) | Lookbook built around the boards | Mood and narrative only. The `Downloads/…Design_Lookbook.pdf` the user uploaded has identical text but different bytes (md5 6de5ff9f… vs 7b507cdc…), most likely re-exported images. Treated as the same document. |
| `round01/03_Design_Tracker.xlsx` (7 sheets) | Asset tracker: START HERE, Asset Tracker (25 rows), Character Designs, Environment Design, Color and Materials, Ten Golden Rules, Art Prompts | Approval bookkeeping. Every row reads "Not approved". |
| `round01/READ_ME_FIRST.txt` | Package notes, listing its own known inconsistencies and the approval order | Followed. |
| `round01/image_sources_and_status.json` | Crop coordinates and the status of each crop | All `PROPOSAL / NOT APPROVED`. |

## 2. Images

| # | File | Shows | Intended use | Status | Conflicts with script/Bible | Required 3D work before it can be used |
|---|---|---|---|---|---|---|
| B1 | `00_Overview_Boards/01_Cinematic_World_Board.png` | Poster, cast, Hush Hollow at night, orchard, Jester, sanctuary, Ruby poses, before/after strip | Overall mood | PROPOSAL + CONFLICT | Hush Hollow shown fully colored at night (Ch1 is daytime gray). The Jester is framed as a mace-holding villain. "Ruby's Lair / final boss" framing. | None directly. Used only to source crops. |
| B2 | `00_Overview_Boards/02_Cast_and_World_Board.png` | Cast lineup, key items, swatch strip | Cast mood | PROPOSAL + CONFLICT | Ruby labeled "CHAPTER 1 BOSS" with spiky crystal armor. Key items say the "Ruby crystal" was "trapped by Jester". UI palette shows blue, yellow and purple. | None directly. |
| B3 | `00_Overview_Boards/03_Character_and_Environments_Board.png` | Turnarounds, environment strip | Character silhouettes | PROPOSAL + CONFLICT | **Labels Pip "THE WONDERBRUSH DRAGON" and draws a dragon. Not canon: Pip is a paintbrush.** | None directly. |
| 01 | `01_Boy_Explorer_Concept.png` | Boy with a red scarf, cargo shorts, backpack | Hero face and outfit mood | PROPOSAL + CONFLICT | Saturated red scarf before Ruby (the spec wants a desaturated outfit and a **red sash only after Ruby**). Proportions about 3.5–4 heads (the spec wants 2.7–3.2). Pixar-like glossy rendering. | Rounder, chubbier redraw at 2.7–3.2 heads. Then turntable model sheet → approval → mesh, UVs, shared rig. |
| 02 | `02_Girl_Explorer_Concept.png` | Girl with a pink/red scarf and bow | Hero mood | PROPOSAL + CONFLICT | Same as 01: early saturated red/pink, proportions too tall. Some makeup-like eye styling, which the spec says to avoid. | Same as 01. Must match the boy's height, pivot and collider exactly. |
| 03 | `03_Pip_Magical_Brush_Concept.png` | Brush with face, metal ferrule, wood handle, red neck ribbon; 6 expressions | **Best Pip reference** (correct species) | PROPOSAL + CONFLICT (minor) | Red ribbon and rainbow/blue/purple magic swirls before Ruby; the spec says magical pigment stays locked. The spec's expression set is different (intrigued, concerned, excited, pointing, relieved). Optional tiny gloved hands and a paint-drop tail are not shown. | Keep the silhouette (cream bristles, steel ferrule, warm wood). Ribbon gray until Ruby. Turntable + 5-expression sheet → approval → floating rig. Size 0.35 hero heights. |
| 04 | `04_Ruby_Friendly_Dragon_Concept.png` | Bright red cute dragon, front | Restored Ruby mood | PROPOSAL + CONFLICT | Restored state only; no corrupted gray-lilac version. Slimmer and less bean-plush than the spec. | Corrupted + restored sheet on the **same mesh**: front, side, back, 3/4, scale beside both heroes, wing-stretch storyboard. |
| 05 | `05_Boy_Explorer_Turnaround.png` | Front, side, back + 5 expressions | Turnaround layout example | PROPOSAL + CONFLICT | Same proportion and red-scarf issues as 01. Back view shows yellow boots (yellow leak). Not a pose-matched rig proof (READ_ME says so). | Re-shoot as a matched-lens turntable after the redesign. |
| 06 | `06_Girl_Explorer_Turnaround.png` | Front, side, back + 5 expressions | Turnaround layout example | PROPOSAL + CONFLICT | Same as 02. | Same as 05. |
| 07 | `07_Ruby_Dragon_Poses.png` | 4 Ruby angles + 5 swatches | Restored Ruby angles | PROPOSAL + CONFLICT | Restored only. Spiky back ridge and wing claws are sharper than "cushiony, horn buds". Swatches include pink, orange, lilac and yellow. | Softer redraw. Corrupted variant. Use as an angle reference only. |
| 08 | `08_Gray_Bedroom_Environment.png` | **Not a bedroom.** An outdoor gray landscape, "THE COLORLESS MORNING", boy plus a dragon-like creature | (filename says bedroom) | **REJECT-AS-IS** (mislabeled) | Not the P01 bedroom. Castles not in the script. The creature beside the boy reads as the "Pip dragon". | No bedroom reference exists. A new bedroom concept is needed (teddy, mirror, window with berry/wave/sun cutouts, crayon tray, Wonderbrush cradle). |
| 09 | `09_Gray_Hush_Hollow_Environment.png` | Village with blue roofs, warm window light, waterfall, windmill; path with red flowers | Hush Hollow building shapes | PROPOSAL + CONFLICT | **Not gray**: blue roofs, warm light, red flowers before Ruby. Waterfalls, windmills and castles are not in the script. The script wants a small square of lumpy clay-sculpted toy houses with felt awnings and round doors. | Gray village concept from one fixed camera. Then modular toy-house kit (6 houses), plaza, berry arch, 2 star seals, dash stripe. |
| 10 | `10_Ruby_Orchard_Restored_Mood.png` | Red trees, castles, waterfall, blue sky | After-restoration mood | PROPOSAL + CONFLICT | Brilliant **blue sky** after Ruby; the spec says the sky stays pearl gray in Ch1. Castles and windmill are not in the script. | Use only as a "how much red" mood. Needs a matched before/after (same camera and geometry). |
| 11 | `11_JamJar_Jester_Concept.png` | Steampunk jam machine full of red jam, lit red | Jam-mill mood | PROPOSAL + CONFLICT | Red jam before Ruby. Mechanical robot, not the spec's "stubby jar, paper crown, jam-splatter bowtie, eyes inside clear jar". B1's version carries maces (golden rule 8: rescue, do not injure). | New Jester concept from the spec text, gray before Ruby, with telegraph sheet. **Out of this milestone's scope (R04).** |
| 12 | `12_Ruby_Sanctuary_Concept.png` | Huge red tree with a crystal gate, temple stairs | Restoration payoff mood | PROPOSAL + CONFLICT | Red everywhere. Temple and castle are not in the script, which wants a "cave-like but daylight-filled nest" inside a crystal ring. | Out of scope (R05–R08). |
| 13 | `13_Before_After_World_Comparison.png` | 4-panel strip: gray world, colorful village at night, orchard before/after | Before/after concept | PROPOSAL + CONFLICT | **Panels are not the same camera or geometry** (READ_ME admits it). Night village colored. | A true matched-camera before/after render of the real 3D orchard (asset request #10). |
| 14 | `14_Chapter_1_Swatch_Reference.png` | Swatch board | Color reference | PROPOSAL | Mostly matches the script's swatches. | Encoded as tokens in [`docs/VISUAL_STYLE_GUIDE.md`](docs/VISUAL_STYLE_GUIDE.md). |
| 15 | `15_Ruby_Orchard_Wide_Mood.png` | Poster: logo, both kids from behind, red tree, valley | Key-art/marketing mood | PROPOSAL + CONFLICT | Red, pink and blue flowers in the foreground before Ruby; blue sky. Red scarves on both kids. | Not a model source. A possible title-screen composition idea after approval. |

### Missing references (needed, none supplied)
1. **P01 bedroom** (crop 08 is mislabeled): teddy, mirror for the C04 close-up, window with three paper cutouts, crayon tray with empty outlines, Wonderbrush cradle.
2. **Wonderbrush prop action sheet** (asset request #4). The tool the hero holds is separate from Pip.
3. **Gray-state Ruby** (corrupted, gray-lilac, crystals floating away from her body).
4. **Gray Hush Hollow from a fixed camera**, including the Clockbird sign, star seals, berry arch and the dash stripe.
5. **Orchard path layout and arena top-down** (requests #8 and #9).
6. **Mirror + telegraph prop sheet**, and the bouncing berry and ink twig.
7. **Explorer red sash** (after Ruby) placement for both heroes.
8. **Grayscale silhouette tests** and **scale lineup** (hero, Pip, Ruby side by side).
9. **Optional villager NPC** for the P02 "shy flower" line.

## 3. Current in-game stand-ins (what the game uses today)

Everything in the game is **procedural geometry built in code**. None of it is approved art. It stays until the creator approves the replacement model sheets.

| In-game asset | File | Status vs Round 01 |
|---|---|---|
| Girl/Boy Explorer | `src/characters/ExplorerModel.ts` | **Placeholder.** Built from the earlier handoff cards. It has a red-keyed **scarf** that turns red with Ruby; the spec wants a **sash** that appears after Ruby. Proportions are not yet measured against 2.7–3.2 heads. |
| Pip | `src/characters/Pip.ts` | **Placeholder**, correct species (paintbrush). Red-keyed bristle tip. |
| Ruby | `src/characters/RubyDragon.ts` | **Placeholder.** Friendly look; uses the gray→red paint shader on one mesh, which matches the spec's "same mesh" requirement. |
| Bedroom, Hush Hollow, Ruby Orchard | `src/environments/*`, `src/chapters/ruby/*` | **Placeholder greybox with a styled pass.** Hush Hollow roofs are color-keyed (red roofs restore with Red; blue, yellow, purple and orange stay gray). |
| Dash stripe, 0.7 m jump gap, berry stamps (P02) | `src/environments/HushHollowLevel.ts` | **New placeholder** in this milestone, labeled in code as `PLACEHOLDER`. |

## 4. How an asset moves to "approved"

Per Director Script §15, each asset needs all of these before it is approved:
* Neutral turntable.
* Coherent 3/4 key art.
* Scale beside the Explorer.
* Gameplay-distance preview.
* Low-VFX view.
* Rights/originality check.
* Creator approval note.

Record the approval in the tracker **and** in this table by changing the status to `APPROVED (date, note)`. Never treat an illustrative image as a rigged 3D asset. The order is in [`docs/ASSET_PRODUCTION_PLAN.md`](docs/ASSET_PRODUCTION_PLAN.md).
