/**
 * Color vocabulary and paint-mixing rules.
 * Authoritative source: docs/reference-art/colors/color_system.json and the Game Design Bible §5.
 * This game teaches traditional PAINT mixing, not additive RGB light.
 */

export type PrimaryColor = 'red' | 'blue' | 'yellow';
export type SecondaryColor = 'purple' | 'orange' | 'green';
export type GameColor = PrimaryColor | SecondaryColor;

/** Every paintable material belongs to exactly one key. `neutral` never changes (whites, skin, magic cues). */
export type ColorKey = GameColor | 'neutral';

export type AbilityId = 'basicDash' | 'flameBurst' | 'bubbleGlide' | 'sunbeam' | 'portalHop' | 'superBounce' | 'vineGrow';

/** Shape symbols guarantee no puzzle or menu depends on hue discrimination alone. */
export type ColorSymbol = 'apple' | 'wave' | 'sun' | 'spiral' | 'spring' | 'leaf';

export interface ColorInfo {
  id: GameColor;
  label: string;
  hex: string;
  kind: 'primary' | 'secondary';
  symbol: ColorSymbol;
  /** The power this color's Guardian grants (Ch1: Flame Burst, provisional canon CC-01). */
  ability: AbilityId;
  /** Short spoken/printed description used by UI and read-aloud. */
  phrase: string;
}

export const PRIMARY_COLORS: readonly PrimaryColor[] = ['red', 'blue', 'yellow'];
export const SECONDARY_COLORS: readonly SecondaryColor[] = ['purple', 'orange', 'green'];
export const ALL_COLORS: readonly GameColor[] = [...PRIMARY_COLORS, ...SECONDARY_COLORS];

export const COLOR_INFO: Readonly<Record<GameColor, ColorInfo>> = Object.freeze({
  red: { id: 'red', label: 'Red', hex: '#EF4444', kind: 'primary', symbol: 'apple', ability: 'flameBurst', phrase: 'Red, like an apple' },
  blue: { id: 'blue', label: 'Blue', hex: '#3B82F6', kind: 'primary', symbol: 'wave', ability: 'bubbleGlide', phrase: 'Blue, like a wave' },
  yellow: { id: 'yellow', label: 'Yellow', hex: '#FACC15', kind: 'primary', symbol: 'sun', ability: 'sunbeam', phrase: 'Yellow, like the sun' },
  purple: { id: 'purple', label: 'Purple', hex: '#A855F7', kind: 'secondary', symbol: 'spiral', ability: 'portalHop', phrase: 'Purple, like a magic spiral' },
  orange: { id: 'orange', label: 'Orange', hex: '#F97316', kind: 'secondary', symbol: 'spring', ability: 'superBounce', phrase: 'Orange, like a bouncy spring' },
  green: { id: 'green', label: 'Green', hex: '#22C55E', kind: 'secondary', symbol: 'leaf', ability: 'vineGrow', phrase: 'Green, like a leaf' },
});

export interface MixRule {
  inputs: readonly [PrimaryColor, PrimaryColor];
  result: SecondaryColor;
}

export const MIX_RULES: readonly MixRule[] = Object.freeze([
  { inputs: ['red', 'blue'], result: 'purple' },
  { inputs: ['red', 'yellow'], result: 'orange' },
  { inputs: ['blue', 'yellow'], result: 'green' },
] as const);

/** Order-independent lookup: mixResult('blue','red') === 'purple'. Same color twice → null. */
export function mixResult(a: PrimaryColor, b: PrimaryColor): SecondaryColor | null {
  if (a === b) return null;
  const rule = MIX_RULES.find((r) => (r.inputs[0] === a && r.inputs[1] === b) || (r.inputs[0] === b && r.inputs[1] === a));
  return rule ? rule.result : null;
}

export function mixInputs(result: SecondaryColor): readonly [PrimaryColor, PrimaryColor] {
  const rule = MIX_RULES.find((r) => r.result === result);
  if (!rule) throw new Error(`No mix rule for ${result}`);
  return rule.inputs;
}

export const isPrimary = (c: string): c is PrimaryColor => (PRIMARY_COLORS as readonly string[]).includes(c);
export const isSecondary = (c: string): c is SecondaryColor => (SECONDARY_COLORS as readonly string[]).includes(c);
export const isGameColor = (c: string): c is GameColor => (ALL_COLORS as readonly string[]).includes(c);

/** Neutral grayscale reference for the faded world (Bible §5). */
export const FADED_GRAY = '#A0A7AF';
