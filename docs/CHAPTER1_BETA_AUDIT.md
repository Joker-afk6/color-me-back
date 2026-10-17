# Chapter 1 Beta — Source Audit, Design Conflicts and Plan (2026-10-17)

## 1. Source files reviewed and whether they were accessible

| File | Accessible? | How it was read |
|---|---|---|
| `06_COMBINED_CHAPTER_1_CLAUDE_REFERENCE.pdf` (23 pages) | ✅ Yes, all pages | Full text extraction. Copied to `docs/design/chapter1-beta/`, with the extracted text alongside it. |
| `ColorMeBack_Design_Round01_All_Files.zip` | ✅ Yes, every file | 3 boards, 15 crops (all viewed one by one), 11-page lookbook, 7-sheet tracker, README and status JSON. Copied to `docs/reference-art/round01/`. |
| `ColorMeBack_Chapter1_Design_Lookbook.pdf` (uploaded separately) | ✅ Yes | Same text as the lookbook inside the ZIP. The bytes differ. |
| **Expanded Game Development Bible** (cited by page number throughout the Director Script) | ❌ **Not uploaded** | Only the Director Script's summaries of it are available. |
| Source video (approval item A-09) | ❌ Not uploaded | — |

The Director Script is treated as the primary spec. Where it is silent, the earlier handoff in `docs/design/` still applies.

## 2. Code audit against the Director Script (before this milestone)

| Area | Before | Director Script | Action this milestone |
|---|---|---|---|
| Dash | Crimson Dash, unlocked by Red after Ruby | Basic Dash free from the prologue; F = Flame Burst after Ruby | **Changed** (CC-01, provisional) |
| Prologue lines | Earlier P0–P4 script | New P01/P02 lines | **Changed** to verbatim Director Script lines (CC-02) |
| Pip's arrival | After any two inspections | At the window | **Changed** |
| Bedroom star | A required tap before the door | Not in the script; brush pickup is the checkpoint | **Removed** |
| P02 tutorials | Stars + a jump step | Move, camera, 0.7 m jump, dash stripe, then 2 stars | **Added**: brook, stripe, labels, tips, practice memory |
| Berry stamps, gray petals, exit camera | Missing | Required | **Added** (placeholders) |
| Checkpoints | Phase-based, no names | `prologue_bedroom_complete`, `ruby_entry`, … | **Added** derived `checkpointId` |
| Save schema | v2 | Proposed schema with abilities | **v3**; non-destructive v2 migration |
| Title (P00) | New Adventure / Continue / Settings / About | START ADVENTURE, CONTINUE, SETTINGS, HOW TO PLAY | **Changed** buttons (About kept) |
| Help text | Advertised gamepad and touch | Don't advertise until tested | **Changed** |
| Sunbeam key | F | F = Flame Burst | Sunbeam moved to T (provisional; not built) |
| Explorer outfit | Red-keyed scarf | Red sash after Ruby | **Not changed**: waits for art approval |
| Title logo | Rainbow letters | "Almost monochrome", three empty sockets | **Not changed**: art (see KNOWN_ISSUES) |
| Ruby Orchard R01–R10 | Older 3-stage version (alpha) | Mirror garden, Jester, active hazards, R08–R10 | **Not touched** (out of scope) |
| Difficulty modes (Story/Adventure/Brave) | Helper-mode toggle only | Three modes | Not in this milestone |
| Bedroom mirror shot (C04), window paper cutouts | Missing | In the prop inventory | Not built (needs bedroom art sheet) |
| Optional villager (shy flower) | Missing | Optional | Not built (needs an NPC model) |

## 3. Design conflicts found
**Script ↔ earlier handoff:** these are the A-01 to A-09 items in [`CANON_CHANGES.md`](CANON_CHANGES.md).

**Round 01 art ↔ script:** listed per image in [`VISUAL_ASSET_MANIFEST.md`](../VISUAL_ASSET_MANIFEST.md). The main ones:
* Board 3 shows Pip as a dragon.
* Red scarves and bows appear before Ruby.
* Heroes are about 3.5–4 heads tall instead of 2.7–3.2.
* Ruby is labelled "boss", drawn spiky, and appears only in her restored state.
* Hush Hollow is shown colorful, at night.
* There are no matched before/after pairs.
* Crop 08 is not a bedroom.
* The Jester is a robot with maces in places.
* The world adds castles, waterfalls and windmills that are not in the script.
* Blue skies appear after Red.

**Inside the Director Script itself:**
* The landmark list names a "Hush Hollow Clockbird sign", but the P02 scene text never mentions it (not built yet).
* Its proposed save schema reserves seven Lords, while A-02 is still pending. Not added to the v3 save yet.

None of these block P00–P02.

## 4. Implementation plan (smallest safe steps)
1. ✅ Make a safe checkpoint: git tag `v0.2-chapter1-alpha`.
2. ✅ Write the documents: manifest, style guide, production plan, canon register, this audit.
3. ✅ **P00–P02 milestone** (this batch):
   * Title buttons.
   * Director Script bedroom flow.
   * Free Basic Dash.
   * Tutorial A (brook and stripe).
   * Stars B and C.
   * Berry stamps.
   * Exit to `ruby_entry`.
   * Save v3 with migration.
4. ⏸ **Wait for CONTINUE** and for art approval.
5. Next smallest task: see `DEVELOPMENT_PROGRESS.md`.
