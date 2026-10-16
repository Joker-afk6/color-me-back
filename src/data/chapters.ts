import type { PrimaryColor } from './colors';

export type ChapterId = 'prologue' | 'ruby' | 'bloop' | 'sol' | 'prism';

/** Places the player can be in. Hush Hollow doubles as the hub after the prologue. */
export type LocationId = 'bedroom' | 'hushHollow' | 'rubyOrchard';

export interface ChapterInfo {
  id: ChapterId;
  number: number;
  title: string;
  cardTitle: string;
  guardian?: string;
  restores?: PrimaryColor;
  /** True once the chapter is playable in this build. Used to give honest "coming soon" messaging. */
  built: boolean;
}

export const CHAPTERS: Readonly<Record<ChapterId, ChapterInfo>> = Object.freeze({
  prologue: { id: 'prologue', number: 0, title: 'The Day the Colors Disappeared', cardTitle: 'PROLOGUE', built: true },
  ruby: { id: 'ruby', number: 1, title: 'The Ruby Orchard', cardTitle: 'CHAPTER 1 — RUBY ORCHARD', guardian: 'Ruby the Rumble Dragon', restores: 'red', built: true },
  bloop: { id: 'bloop', number: 2, title: 'Whisperwave Bay', cardTitle: 'CHAPTER 2 — WHISPERWAVE BAY', guardian: 'Bloop the Ocean Octopus', restores: 'blue', built: false },
  sol: { id: 'sol', number: 3, title: 'Sunflower Skylands', cardTitle: 'CHAPTER 3 — SUNFLOWER SKYLANDS', guardian: 'Sol the Sleepy Sun', restores: 'yellow', built: false },
  prism: { id: 'prism', number: 4, title: 'Prism Palace', cardTitle: 'FINALE — PRISM PALACE', built: false },
});

export const LOCATION_NAMES: Readonly<Record<LocationId, string>> = Object.freeze({
  bedroom: "Explorer's Bedroom",
  hushHollow: 'Hush Hollow',
  rubyOrchard: 'The Ruby Orchard',
});
