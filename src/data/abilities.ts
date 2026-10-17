import type { AbilityId, GameColor } from './colors';

export interface AbilityInfo {
  id: AbilityId;
  name: string;
  /** The color whose return grants this ability; `null` = free from the start (never color-locked). */
  color: GameColor | null;
  /** Keyboard key label shown in the HUD. */
  keyLabel: string;
  howTo: string;
  /** Where the ability's in-world use is (or will be) built — honest status for the HUD/help. */
  implementedIn: 'M2' | 'P02' | 'R09' | 'M3' | 'M4';
  /** True only when the ability actually does something in this build. */
  built: boolean;
}

/**
 * Abilities derive from story progress; there is no separate "unlocked" flag that could drift.
 *
 * Canon change CC-01 (docs/CANON_CHANGES.md, register A-01 — PROVISIONAL, creator sign-off pending):
 * the earlier "Crimson Dash after Ruby" is replaced by a free Basic Dash taught in the prologue,
 * and Ruby grants Flame Burst (F). The earlier version is preserved at git tag v0.2-chapter1-alpha.
 */
export const ABILITIES: Readonly<Record<AbilityId, AbilityInfo>> = Object.freeze({
  basicDash: { id: 'basicDash', name: 'Dash', color: null, keyLabel: 'Shift', howTo: 'Tap Shift while moving to dash a short, safe distance. Jump, then Shift, to dash across a gap.', implementedIn: 'P02', built: true },
  flameBurst: { id: 'flameBurst', name: 'Flame Burst', color: 'red', keyLabel: 'F', howTo: 'Ruby will teach you Flame Burst in the Flame Courtyard. (The courtyard is not built yet in this beta.)', implementedIn: 'R09', built: false },
  bubbleGlide: { id: 'bubbleGlide', name: 'Bubble Glide', color: 'blue', keyLabel: 'G', howTo: 'Hold G while falling to float like a bubble.', implementedIn: 'M3', built: false },
  // Key moved off F (now Flame Burst, Director Script §H). Provisional until Chapter 3 is designed.
  sunbeam: { id: 'sunbeam', name: 'Sunbeam', color: 'yellow', keyLabel: 'T', howTo: 'Press T to shine light on receptors and reveal hidden paths.', implementedIn: 'M4', built: false },
  portalHop: { id: 'portalHop', name: 'Portal Hop', color: 'purple', keyLabel: '1', howTo: 'Press 1 beside a purple spiral door to hop to its twin.', implementedIn: 'M3', built: false },
  superBounce: { id: 'superBounce', name: 'Super Bounce', color: 'orange', keyLabel: '2', howTo: 'Press 2 on an orange spring pad to bounce up high.', implementedIn: 'M4', built: false },
  vineGrow: { id: 'vineGrow', name: 'Vine Grow', color: 'green', keyLabel: '3', howTo: 'Press 3 beside a wilted vine to grow leafy stairs.', implementedIn: 'M4', built: false },
});

export const ABILITY_ORDER: readonly AbilityId[] = ['basicDash', 'flameBurst', 'bubbleGlide', 'sunbeam', 'portalHop', 'superBounce', 'vineGrow'];
