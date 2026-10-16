import type { GameColor } from '../data/colors';
import type { LocationId } from '../data/chapters';

export type HeroId = 'girl' | 'boy';

/** Prologue phases (script P0–P4). */
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
  bedroomStarAwake: boolean;
  villageStars: VillageStar[];
}

export interface RubyState {
  phase: RubyPhase;
  traversal: TraversalCheckpoint;
  mirrors: MirrorState;
  encounterIntroSeen: boolean;
}

export interface SaveData {
  version: 2;
  hero: HeroId;
  /** Where "Continue" resumes. */
  location: LocationId;
  /** Restored primaries and mixed secondaries. Validated against chapter phases on load. */
  colors: Record<GameColor, boolean>;
  prologue: PrologueState;
  ruby: RubyState;
  collectibles: StickerId[];
  playTimeSeconds: number;
  updatedAt: number;
}

export const SAVE_VERSION = 2 as const;

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
    prologue: { phase: 'opening', inspected: [], hasWonderbrush: false, bedroomStarAwake: false, villageStars: [] },
    ruby: { phase: 'arrive', traversal: 'start', mirrors: [...RUBY_MIRRORS_INITIAL], encounterIntroSeen: false },
    collectibles: [],
    playTimeSeconds: 0,
    updatedAt: 0,
  };
}

export const phaseIndex = <T extends string>(order: readonly T[], phase: T): number => order.indexOf(phase);
export const rubyAtLeast = (s: SaveData, phase: RubyPhase): boolean => phaseIndex(RUBY_PHASES, s.ruby.phase) >= phaseIndex(RUBY_PHASES, phase);
export const prologueAtLeast = (s: SaveData, phase: ProloguePhase): boolean =>
  phaseIndex(PROLOGUE_PHASES, s.prologue.phase) >= phaseIndex(PROLOGUE_PHASES, phase);
