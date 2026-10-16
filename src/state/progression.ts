/**
 * Pure progression rules. Every function takes a save and returns a NEW save (never mutates),
 * so the rules can be unit-tested exactly as the game uses them.
 *
 * Rules enforced here (Design Bible §4, §9; chapter scripts; blueprints JSON):
 *  - A primary color is awarded only by completing its Guardian's Stage 3, and only once.
 *  - Secondary colors unlock only through an explicit mix of two owned primaries; order-independent.
 *  - Abilities derive from owned colors (no separate unlock flags).
 *  - Stages advance strictly in order; a stage cannot be skipped.
 */
import { ABILITIES } from '../data/abilities';
import type { AbilityId, GameColor, PrimaryColor, SecondaryColor } from '../data/colors';
import { mixResult } from '../data/colors';
import type { LocationId } from '../data/chapters';
import {
  BEDROOM_INSPECTABLES,
  STICKERS,
  TRAVERSAL_CHECKPOINTS,
  VILLAGE_STARS,
  phaseIndex,
  prologueAtLeast,
  type BedroomInspectable,
  type MirrorState,
  type SaveData,
  type StickerId,
  type TraversalCheckpoint,
  type VillageStar,
} from './SaveData';

const clone = (s: SaveData): SaveData => structuredClone(s);

export const hasColor = (s: SaveData, c: GameColor): boolean => s.colors[c] === true;
export const hasAbility = (s: SaveData, a: AbilityId): boolean => hasColor(s, ABILITIES[a].color);
export const ownedPrimaries = (s: SaveData): PrimaryColor[] => (['red', 'blue', 'yellow'] as const).filter((c) => s.colors[c]);

// ───────────────────────────── Prologue ─────────────────────────────

export function finishOpening(s: SaveData): SaveData {
  if (s.prologue.phase !== 'opening') return s;
  const n = clone(s);
  n.prologue.phase = 'inspect';
  return n;
}

/** P1: inspect in any order; after two, Pip appears (phase → wonderbrush). The third stays optional. */
export function inspectBedroomObject(s: SaveData, id: BedroomInspectable): { save: SaveData; pipArrives: boolean } {
  if (!BEDROOM_INSPECTABLES.includes(id) || s.prologue.inspected.includes(id)) return { save: s, pipArrives: false };
  const n = clone(s);
  n.prologue.inspected.push(id);
  let pipArrives = false;
  if (n.prologue.phase === 'inspect' && n.prologue.inspected.length >= 2) {
    n.prologue.phase = 'wonderbrush';
    pipArrives = true;
  }
  return { save: n, pipArrives };
}

export function takeWonderbrush(s: SaveData): SaveData {
  if (s.prologue.phase !== 'wonderbrush' || s.prologue.hasWonderbrush) return s;
  const n = clone(s);
  n.prologue.hasWonderbrush = true;
  return n;
}

/** P2: the sleepy star pulses with a local gray sparkle. It does NOT restore any color. */
export function wakeBedroomStar(s: SaveData): SaveData {
  if (s.prologue.phase !== 'wonderbrush' || !s.prologue.hasWonderbrush || s.prologue.bedroomStarAwake) return s;
  const n = clone(s);
  n.prologue.bedroomStarAwake = true;
  return n;
}

export const canLeaveBedroom = (s: SaveData): boolean =>
  s.prologue.phase === 'wonderbrush' && s.prologue.hasWonderbrush && s.prologue.bedroomStarAwake;

export function leaveBedroom(s: SaveData): SaveData {
  if (!canLeaveBedroom(s)) return s;
  const n = clone(s);
  n.prologue.phase = 'village';
  n.location = 'hushHollow';
  return n;
}

/** P3: the two village stars may be woken in either order. */
export function wakeVillageStar(s: SaveData, id: VillageStar): SaveData {
  if (s.prologue.phase !== 'village' || !VILLAGE_STARS.includes(id) || s.prologue.villageStars.includes(id)) return s;
  const n = clone(s);
  n.prologue.villageStars.push(id);
  return n;
}

export const villageStarsComplete = (s: SaveData): boolean => VILLAGE_STARS.every((id) => s.prologue.villageStars.includes(id));

/** P4: walking through the arch. Persists heroChoice, level = Ruby Orchard, villageStarsCompleted. */
export function completePrologue(s: SaveData): SaveData {
  if (s.prologue.phase !== 'village' || !villageStarsComplete(s)) return s;
  const n = clone(s);
  n.prologue.phase = 'complete';
  n.location = 'rubyOrchard';
  return n;
}

// ───────────────────────────── Chapter 1: Ruby Orchard ─────────────────────────────

export const canEnterRubyOrchard = (s: SaveData): boolean => prologueAtLeast(s, 'complete');

export function rubyArrived(s: SaveData): SaveData {
  if (s.ruby.phase !== 'arrive' || !canEnterRubyOrchard(s)) return s;
  const n = clone(s);
  n.ruby.phase = 'traversal';
  return n;
}

/** Traversal checkpoints only move forward. */
export function reachTraversalCheckpoint(s: SaveData, cp: TraversalCheckpoint): SaveData {
  if (s.ruby.phase !== 'traversal') return s;
  if (phaseIndex(TRAVERSAL_CHECKPOINTS, cp) <= phaseIndex(TRAVERSAL_CHECKPOINTS, s.ruby.traversal)) return s;
  const n = clone(s);
  n.ruby.traversal = cp;
  return n;
}

export function startRubyEncounter(s: SaveData): SaveData {
  if (s.ruby.phase !== 'traversal' || s.ruby.traversal !== 'bridgeDown') return s;
  const n = clone(s);
  n.ruby.phase = 'stage1';
  return n;
}

export function markEncounterIntroSeen(s: SaveData): SaveData {
  if (s.ruby.encounterIntroSeen) return s;
  const n = clone(s);
  n.ruby.encounterIntroSeen = true;
  return n;
}

export interface StageResult {
  save: SaveData;
  accepted: boolean;
  /** Set only on the single transition that awards the color. */
  awarded: PrimaryColor | null;
}

/**
 * Complete Ruby's rescue stage `stage`. Rejected unless it is the current stage.
 * Stage 3 awards RED exactly once (and with it, Crimson Dash).
 */
export function completeRubyStage(s: SaveData, stage: 1 | 2 | 3): StageResult {
  if (s.ruby.phase !== `stage${stage}`) return { save: s, accepted: false, awarded: null };
  const n = clone(s);
  let awarded: PrimaryColor | null = null;
  if (stage === 1) n.ruby.phase = 'stage2';
  else if (stage === 2) n.ruby.phase = 'stage3';
  else {
    n.ruby.phase = 'restoreRed';
    if (!n.colors.red) {
      n.colors.red = true;
      awarded = 'red';
    }
  }
  return { save: n, accepted: true, awarded };
}

export function saveRubyMirrors(s: SaveData, mirrors: MirrorState): SaveData {
  if (s.ruby.phase !== 'stage2') return s;
  const n = clone(s);
  n.ruby.mirrors = [...mirrors] as MirrorState;
  return n;
}

export function finishRedReveal(s: SaveData): SaveData {
  if (s.ruby.phase !== 'restoreRed') return s;
  const n = clone(s);
  n.ruby.phase = 'dashTutorial';
  return n;
}

export function finishDashTutorial(s: SaveData): SaveData {
  if (s.ruby.phase !== 'dashTutorial') return s;
  const n = clone(s);
  n.ruby.phase = 'complete';
  return n;
}

// ───────────────────────────── Colors, mixing, collectibles ─────────────────────────────

export interface MixAttempt {
  save: SaveData;
  result: SecondaryColor | null;
  /** True only the first time this secondary is created. */
  discovered: boolean;
  reason: 'ok' | 'same-color' | 'missing-input';
  missing: PrimaryColor[];
}

/** Explicit, order-independent mixing. Never unlocks anything unless both inputs are owned. */
export function mixColors(s: SaveData, a: PrimaryColor, b: PrimaryColor): MixAttempt {
  const result = mixResult(a, b);
  if (!result) return { save: s, result: null, discovered: false, reason: 'same-color', missing: [] };
  const missing = [a, b].filter((c) => !s.colors[c]);
  if (missing.length) return { save: s, result, discovered: false, reason: 'missing-input', missing };
  if (s.colors[result]) return { save: s, result, discovered: false, reason: 'ok', missing: [] };
  const n = clone(s);
  n.colors[result] = true;
  return { save: n, result, discovered: true, reason: 'ok', missing: [] };
}

export function collectSticker(s: SaveData, id: StickerId): { save: SaveData; isNew: boolean } {
  if (!STICKERS.includes(id) || s.collectibles.includes(id)) return { save: s, isNew: false };
  const n = clone(s);
  n.collectibles.push(id);
  return { save: n, isNew: true };
}

export function setLocation(s: SaveData, location: LocationId): SaveData {
  if (s.location === location) return s;
  const n = clone(s);
  n.location = location;
  return n;
}

export function addPlayTime(s: SaveData, seconds: number): SaveData {
  const n = clone(s);
  n.playTimeSeconds = Math.max(0, s.playTimeSeconds + seconds);
  return n;
}
