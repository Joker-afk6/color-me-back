/**
 * Save validation, repair and migration.
 * Goal: loading ANY stored data yields a consistent, winnable state that never skips locked content.
 */
import { ALL_COLORS, mixInputs, SECONDARY_COLORS } from '../data/colors';
import type { LocationId } from '../data/chapters';
import {
  BEDROOM_INSPECTABLES,
  PROLOGUE_PHASES,
  RUBY_MIRRORS_INITIAL,
  RUBY_PHASES,
  STICKERS,
  TRAVERSAL_CHECKPOINTS,
  VILLAGE_STARS,
  newSave,
  noColors,
  rubyAtLeast,
  type HeroId,
  type MirrorState,
  type Orientation,
  type SaveData,
} from './SaveData';

export interface LoadReport {
  save: SaveData;
  /** Human-readable notes about anything that had to be repaired (shown in the console, never blocks play). */
  repairs: string[];
  migratedFrom: number | null;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const subset = <T extends string>(v: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => typeof x === 'string' && (allowed as readonly string[]).includes(x)))] : [];
const heroOf = (v: unknown): HeroId => (v === 'boy' ? 'boy' : 'girl');

/** Starter prototype (v0.1) saved {levelId, gender, restored[], sigils[]} under this key. */
export const LEGACY_V1_KEY = 'color-me-back-demo-v1';

/**
 * The v0.1 prototype's levels and objectives no longer exist, so its progress cannot be mapped
 * onto the scripted chapters without skipping story. We keep the explorer choice and start fresh.
 */
export function migrateV1(raw: unknown): LoadReport {
  const hero = isObj(raw) ? heroOf(raw.gender) : 'girl';
  return {
    save: newSave(hero),
    repairs: ['Prototype (v0.1) save found: kept your explorer choice and started the new story from the beginning.'],
    migratedFrom: 1,
  };
}

export function validateSave(raw: unknown): LoadReport {
  const repairs: string[] = [];
  if (!isObj(raw) || raw.version !== 2) {
    return { save: newSave(isObj(raw) ? heroOf(raw.hero) : 'girl'), repairs: ['Unrecognized save format; started a new adventure.'], migratedFrom: null };
  }
  const base = newSave(heroOf(raw.hero));
  const s: SaveData = base;

  // ── Prologue
  const p = isObj(raw.prologue) ? raw.prologue : {};
  s.prologue.phase = oneOf(p.phase, PROLOGUE_PHASES, 'opening');
  s.prologue.inspected = subset(p.inspected, BEDROOM_INSPECTABLES);
  s.prologue.hasWonderbrush = p.hasWonderbrush === true;
  s.prologue.bedroomStarAwake = p.bedroomStarAwake === true;
  s.prologue.villageStars = subset(p.villageStars, VILLAGE_STARS);

  const pi = PROLOGUE_PHASES.indexOf(s.prologue.phase);
  if (pi >= PROLOGUE_PHASES.indexOf('wonderbrush') && s.prologue.inspected.length < 2) {
    repairs.push('Prologue: fewer than two inspections recorded; returning to the inspection step.');
    s.prologue.phase = 'inspect';
  }
  if (PROLOGUE_PHASES.indexOf(s.prologue.phase) >= PROLOGUE_PHASES.indexOf('village')) {
    if (!s.prologue.hasWonderbrush || !s.prologue.bedroomStarAwake) {
      // Leaving the bedroom implies both; these flags can safely be implied.
      s.prologue.hasWonderbrush = true;
      s.prologue.bedroomStarAwake = true;
    }
  }
  if (s.prologue.phase === 'complete' && s.prologue.villageStars.length < VILLAGE_STARS.length) {
    repairs.push('Prologue: village stars incomplete; returning to Hush Hollow.');
    s.prologue.phase = 'village';
  }
  if (s.prologue.phase === 'inspect' || s.prologue.phase === 'opening') {
    s.prologue.hasWonderbrush = false;
    s.prologue.bedroomStarAwake = false;
  }
  if (s.prologue.bedroomStarAwake && !s.prologue.hasWonderbrush) s.prologue.bedroomStarAwake = false;

  // ── Ruby Orchard (locked until the prologue is complete)
  const r = isObj(raw.ruby) ? raw.ruby : {};
  s.ruby.phase = oneOf(r.phase, RUBY_PHASES, 'arrive');
  s.ruby.traversal = oneOf(r.traversal, TRAVERSAL_CHECKPOINTS, 'start');
  s.ruby.encounterIntroSeen = r.encounterIntroSeen === true;
  s.ruby.mirrors = validMirrors(r.mirrors) ?? [...RUBY_MIRRORS_INITIAL];
  if (s.prologue.phase !== 'complete' && s.ruby.phase !== 'arrive') {
    repairs.push('Chapter 1 progress found before the prologue was finished; Chapter 1 locked again.');
    s.ruby.phase = 'arrive';
    s.ruby.traversal = 'start';
    s.ruby.encounterIntroSeen = false;
  }
  if (rubyAtLeast(s, 'stage1')) s.ruby.traversal = 'bridgeDown';
  if (s.ruby.phase === 'arrive') s.ruby.traversal = 'start';

  // ── Colors are derived from chapter progress, so they can never be ahead of (or behind) the story.
  const rawColors = isObj(raw.colors) ? raw.colors : {};
  s.colors = noColors();
  s.colors.red = rubyAtLeast(s, 'restoreRed');
  if (rawColors.red === true && !s.colors.red) repairs.push('Red was marked restored without completing Ruby Stage 3; removed.');
  // Chapters 2–3 are not built in this version: Blue and Yellow cannot be owned yet.
  if (rawColors.blue === true || rawColors.yellow === true) repairs.push('Blue/Yellow cannot be restored before their chapters exist; removed.');
  for (const sec of SECONDARY_COLORS) {
    const [a, b] = mixInputs(sec);
    if (rawColors[sec] === true) {
      if (s.colors[a] && s.colors[b]) s.colors[sec] = true;
      else repairs.push(`${sec} requires ${a} + ${b}; removed.`);
    }
  }
  for (const c of ALL_COLORS) if (typeof s.colors[c] !== 'boolean') s.colors[c] = false;

  // ── Location must be reachable from the current story position.
  s.location = repairLocation(raw.location, s);

  s.collectibles = subset(raw.collectibles, STICKERS);
  s.playTimeSeconds = typeof raw.playTimeSeconds === 'number' && Number.isFinite(raw.playTimeSeconds) ? Math.max(0, raw.playTimeSeconds) : 0;
  s.updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : 0;
  return { save: s, repairs, migratedFrom: null };
}

function validMirrors(v: unknown): MirrorState | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  if (!v.every((x) => Number.isInteger(x) && x >= 0 && x <= 3)) return null;
  return v.map((x) => x as Orientation) as MirrorState;
}

function repairLocation(raw: unknown, s: SaveData): LocationId {
  switch (s.prologue.phase) {
    case 'opening':
    case 'inspect':
    case 'wonderbrush':
      return 'bedroom';
    case 'village':
      return 'hushHollow';
    case 'complete':
      return raw === 'hushHollow' || raw === 'rubyOrchard' ? raw : 'rubyOrchard';
  }
}
