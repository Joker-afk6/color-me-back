import type { GameColor } from '../data/colors';
import type { LocationId } from '../data/chapters';

export type HeroId = 'girl' | 'boy';

/**
 * Prologue phases. Director Script mapping: opening/inspect = P01 bedroom before Pip,
 * wonderbrush = Pip met (pickup → checkpoint prologue_bedroom_complete), village = P02, complete = arch.
 */
export type ProloguePhase = 'opening' | 'inspect' | 'wonderbrush' | 'village' | 'complete';
export const PROLOGUE_PHASES: readonly ProloguePhase[] = ['opening', 'inspect', 'wonderbrush', 'village', 'complete'];

/** Chapter 1 phases, matching 05_Chapter_Stage_Blueprints.json → ruby_orchard.states. */
export type RubyPhase = 'arrive' | 'traversal' | 'stage1' | 'stage2' | 'stage3' | 'restoreRed' | 'dashTutorial' | 'complete';
export const RUBY_PHASES: readonly RubyPhase[] = ['arrive', 'traversal', 'stage1', 'stage2', 'stage3', 'restoreRed', 'dashTutorial', 'complete'];

/** Checkpoints inside Ruby Orchard traversal section A. */
export type TraversalCheckpoint = 'start' | 'pastGaps' | 'bridgeDown';
export const TRAVERSAL_CHECKPOINTS: readonly TraversalCheckpoint[] = ['start', 'pastGaps', 'bridgeDown'];

export const BEDROOM_INSPECTABLES = ['teddy', 'crayons', 'window'] as const;
export type BedroomInspectable = (typeof BEDROOM_INSPECTABLES)[number];

export const VILLAGE_STARS = ['pathStar', 'terraceStar'] as const;
export type VillageStar = (typeof VILLAGE_STARS)[number];

/** P02 Tutorial A moves the child has practiced (remembered so the tips are not repeated). */
export const PRACTICE_MOVES = ['jump', 'dash'] as const;
export type PracticeMove = (typeof PRACTICE_MOVES)[number];

/**
 * Director Script checkpoint names. Always DERIVED from progress (see `checkpointIdOf`), stored for
 * readability and forward compatibility, never trusted on load. The Ruby Orchard entries map the
 * existing (pre-rebuild) orchard phases onto the nearest Director Script checkpoint.
 */
export type CheckpointId =
  | 'prologue_start'
  | 'prologue_pip_met'
  | 'prologue_bedroom_complete'
  | 'ruby_entry'
  | 'ruby_trail_clear'
  | 'ruby_phase_1'
  | 'ruby_phase_2'
  | 'ruby_restoration_pending'
  | 'ruby_restored'
  | 'chapter_1_complete';

/** Saved ability flags (Director Script §H schema). Derived from progress on every load and write. */
export interface AbilityFlags {
  jump: true;
  basicDash: boolean;
  flameBurst: boolean;
}

export const STICKERS = ['berrySticker1', 'berrySticker2', 'berrySticker3'] as const;
export type StickerId = (typeof STICKERS)[number];

/** Mirror orientation: 0 = north, 1 = east, 2 = south, 3 = west (one tap = +1, clockwise). */
export type Orientation = 0 | 1 | 2 | 3;
export type MirrorState = [Orientation, Orientation, Orientation];
/** Valid, unsolved starting orientation for Ruby's Stage 2 (never randomized). */
export const RUBY_MIRRORS_INITIAL: MirrorState = [2, 3, 0];

export interface PrologueState {
  phase: ProloguePhase;
  inspected: BedroomInspectable[];
  hasWonderbrush: boolean;
  villageStars: VillageStar[];
  practiced: PracticeMove[];
}

export interface RubyState {
  phase: RubyPhase;
  traversal: TraversalCheckpoint;
  mirrors: MirrorState;
  encounterIntroSeen: boolean;
}

export interface SaveData {
  version: 3;
  hero: HeroId;
  /** Where "Continue" resumes. */
  location: LocationId;
  /** Restored primaries and mixed secondaries. Validated against chapter phases on load. */
  colors: Record<GameColor, boolean>;
  prologue: PrologueState;
  ruby: RubyState;
  collectibles: StickerId[];
  /** Derived (never trusted from storage). */
  abilities: AbilityFlags;
  /** Derived (never trusted from storage). */
  checkpointId: CheckpointId;
  playTimeSeconds: number;
  updatedAt: number;
}

export const SAVE_VERSION = 3 as const;

export function noColors(): Record<GameColor, boolean> {
  return { red: false, blue: false, yellow: false, purple: false, orange: false, green: false };
}

/** A brand-new adventure. New Game always starts from exactly this. */
export function newSave(hero: HeroId): SaveData {
  return {
    version: SAVE_VERSION,
    hero,
    location: 'bedroom',
    colors: noColors(),
    prologue: { phase: 'opening', inspected: [], hasWonderbrush: false, villageStars: [], practiced: [] },
    ruby: { phase: 'arrive', traversal: 'start', mirrors: [...RUBY_MIRRORS_INITIAL], encounterIntroSeen: false },
    collectibles: [],
    abilities: { jump: true, basicDash: true, flameBurst: false },
    checkpointId: 'prologue_start',
    playTimeSeconds: 0,
    updatedAt: 0,
  };
}

export const phaseIndex = <T extends string>(order: readonly T[], phase: T): number => order.indexOf(phase);
export const rubyAtLeast = (s: SaveData, phase: RubyPhase): boolean => phaseIndex(RUBY_PHASES, s.ruby.phase) >= phaseIndex(RUBY_PHASES, phase);
export const prologueAtLeast = (s: SaveData, phase: ProloguePhase): boolean =>
  phaseIndex(PROLOGUE_PHASES, s.prologue.phase) >= phaseIndex(PROLOGUE_PHASES, phase);

/** Ability flags implied by progress. Basic Dash is free from a new game (canon CC-01, provisional). */
export const abilityFlagsOf = (s: SaveData): AbilityFlags => ({ jump: true, basicDash: true, flameBurst: s.colors.red === true });

/** The Director Script checkpoint the current progress corresponds to. */
export function checkpointIdOf(s: SaveData): CheckpointId {
  const p = s.prologue;
  if (p.phase === 'opening' || p.phase === 'inspect') return 'prologue_start';
  if (p.phase === 'wonderbrush') return p.hasWonderbrush ? 'prologue_bedroom_complete' : 'prologue_pip_met';
  if (p.phase === 'village') return 'prologue_bedroom_complete';
  switch (s.ruby.phase) {
    case 'arrive':
      return 'ruby_entry';
    case 'traversal':
      return s.ruby.traversal === 'bridgeDown' ? 'ruby_trail_clear' : 'ruby_entry';
    case 'stage1':
      return 'ruby_trail_clear';
    case 'stage2':
      return 'ruby_phase_1';
    case 'stage3':
      return 'ruby_phase_2';
    case 'restoreRed':
      return 'ruby_restoration_pending';
    case 'dashTutorial':
      return 'ruby_restored';
    case 'complete':
      return 'chapter_1_complete';
  }
}

/** Refresh the derived fields (called on load and on every write). */
export function withDerived(s: SaveData): SaveData {
  return { ...s, abilities: abilityFlagsOf(s), checkpointId: checkpointIdOf(s) };
}
