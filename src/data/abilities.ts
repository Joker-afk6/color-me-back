import type { AbilityId, GameColor } from './colors';

export interface AbilityInfo {
  id: AbilityId;
  name: string;
  color: GameColor;
  /** Keyboard key label shown in the HUD. */
  keyLabel: string;
  howTo: string;
  /** Milestone in which the ability's in-world use is implemented (honest status for the HUD/help). */
  implementedIn: 'M2' | 'M3' | 'M4';
}

/** Abilities derive from saved colors; there is no separate "unlocked" flag that could drift out of sync. */
export const ABILITIES: Readonly<Record<AbilityId, AbilityInfo>> = Object.freeze({
  crimsonDash: { id: 'crimsonDash', name: 'Crimson Dash', color: 'red', keyLabel: 'Shift', howTo: 'Tap Shift while moving to dash a short, safe distance.', implementedIn: 'M2' },
  bubbleGlide: { id: 'bubbleGlide', name: 'Bubble Glide', color: 'blue', keyLabel: 'G', howTo: 'Hold G while falling to float like a bubble.', implementedIn: 'M3' },
  sunbeam: { id: 'sunbeam', name: 'Sunbeam', color: 'yellow', keyLabel: 'F', howTo: 'Press F to shine light on receptors and reveal hidden paths.', implementedIn: 'M4' },
  portalHop: { id: 'portalHop', name: 'Portal Hop', color: 'purple', keyLabel: '1', howTo: 'Press 1 beside a purple spiral door to hop to its twin.', implementedIn: 'M3' },
  superBounce: { id: 'superBounce', name: 'Super Bounce', color: 'orange', keyLabel: '2', howTo: 'Press 2 on an orange spring pad to bounce up high.', implementedIn: 'M4' },
  vineGrow: { id: 'vineGrow', name: 'Vine Grow', color: 'green', keyLabel: '3', howTo: 'Press 3 beside a wilted vine to grow leafy stairs.', implementedIn: 'M4' },
});

export const ABILITY_ORDER: readonly AbilityId[] = ['crimsonDash', 'bubbleGlide', 'sunbeam', 'portalHop', 'superBounce', 'vineGrow'];
