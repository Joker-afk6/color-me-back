/**
 * Ruby Stage 1 — "The Bouncing Berry Parade" — pure rules (no rendering).
 *
 * Script: ground circles with berry icons and a chime show where three giant soft berries will land.
 * Dodge by standing outside the circles; a hit gently bounces the Explorer back (no damage).
 * After a clean wave the crystal is revealed for the Wonderbrush tap.
 * After 3 missed dodges the sequence slows down. Assist fallback: after 6 misses the crystal is
 * revealed anyway so the story can never be blocked (Bible §2: never require timed perfection).
 */
import { Rng } from '../../utils/rng';

export interface Vec2 {
  x: number;
  z: number;
}

export interface ParadeTuning {
  center: Vec2;
  arenaRadius: number;
  circleRadius: number;
  telegraph: number;
  spacing: number;
  slowTelegraph: number;
  slowSpacing: number;
  missesBeforeSlow: number;
  missesBeforeReveal: number;
  /** Calm pause between waves. */
  restTime: number;
}

export const DEFAULT_PARADE_TUNING: ParadeTuning = {
  center: { x: 0, z: 0 },
  arenaRadius: 11,
  circleRadius: 1.7,
  telegraph: 1.9,
  spacing: 0.85,
  slowTelegraph: 2.9,
  slowSpacing: 1.35,
  missesBeforeSlow: 3,
  missesBeforeReveal: 6,
  restTime: 1.6,
};

export interface LandingSpot extends Vec2 {
  /** Seconds after the wave starts when the telegraph circle appears. */
  showAt: number;
  /** Seconds after the wave starts when the berry lands. */
  landAt: number;
}

export type ParadeEvent =
  | { type: 'waveStart'; wave: number; spots: LandingSpot[]; slow: boolean }
  | { type: 'telegraph'; index: number; spot: LandingSpot }
  | { type: 'land'; index: number; spot: LandingSpot; hitPlayer: boolean }
  | { type: 'waveCleared'; wave: number }
  | { type: 'waveMissed'; wave: number; totalMisses: number }
  | { type: 'slowModeOn' }
  | { type: 'reveal'; assisted: boolean };

/** Plan three landing spots: the first aims near the player so they must notice it and step away. */
export function planWave(seed: number, wave: number, player: Vec2, tuning: ParadeTuning, slow: boolean): LandingSpot[] {
  const rng = new Rng(seed * 7919 + wave * 104729 + 17);
  const telegraph = slow ? tuning.slowTelegraph : tuning.telegraph;
  const spacing = slow ? tuning.slowSpacing : tuning.spacing;
  const spots: LandingSpot[] = [];
  const inner = tuning.arenaRadius - tuning.circleRadius - 0.5;
  const clampToArena = (p: Vec2): Vec2 => {
    const dx = p.x - tuning.center.x;
    const dz = p.z - tuning.center.z;
    const d = Math.hypot(dx, dz);
    if (d <= inner) return p;
    return { x: tuning.center.x + (dx / d) * inner, z: tuning.center.z + (dz / d) * inner };
  };
  // Berry 1: near the player (small offset), so the circle visibly appears where they stand.
  const first = clampToArena({ x: player.x + rng.range(-0.6, 0.6), z: player.z + rng.range(-0.6, 0.6) });
  spots.push({ ...first, showAt: 0, landAt: telegraph });
  // Berries 2 and 3: spread around, never overlapping earlier circles, always leaving open ground.
  for (let i = 1; i < 3; i++) {
    let candidate: Vec2 = first;
    for (let attempt = 0; attempt < 40; attempt++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(2.5, 6.5);
      candidate = clampToArena({ x: player.x + Math.cos(a) * r, z: player.z + Math.sin(a) * r });
      if (spots.every((s) => Math.hypot(s.x - candidate.x, s.z - candidate.z) > tuning.circleRadius * 2.3)) break;
    }
    spots.push({ ...candidate, showAt: i * spacing, landAt: i * spacing + telegraph });
  }
  return spots;
}

export const isInsideCircle = (spot: Vec2, p: Vec2, radius: number): boolean => Math.hypot(spot.x - p.x, spot.z - p.z) < radius;

type Phase = 'idle' | 'wave' | 'rest' | 'revealed' | 'done';

/** Deterministic sequencer. The 3D stage feeds it time + player position and reacts to events. */
export class BerryParade {
  phase: Phase = 'idle';
  wave = 0;
  misses = 0;
  slow: boolean;
  private t = 0;
  private spots: LandingSpot[] = [];
  private shown = 0;
  private landed = 0;
  private hitThisWave = false;

  constructor(
    private readonly seed: number,
    readonly tuning: ParadeTuning = DEFAULT_PARADE_TUNING,
    startSlow = false,
  ) {
    this.slow = startSlow;
  }

  get currentSpots(): readonly LandingSpot[] {
    return this.spots;
  }

  start(player: Vec2): ParadeEvent[] {
    this.phase = 'wave';
    return this.beginWave(player);
  }

  update(dt: number, player: Vec2, playerAirborneHigh = false): ParadeEvent[] {
    const events: ParadeEvent[] = [];
    if (this.phase === 'wave') {
      this.t += dt;
      while (this.shown < this.spots.length && this.t >= this.spots[this.shown]!.showAt) {
        events.push({ type: 'telegraph', index: this.shown, spot: this.spots[this.shown]! });
        this.shown++;
      }
      while (this.landed < this.spots.length && this.t >= this.spots[this.landed]!.landAt) {
        const spot = this.spots[this.landed]!;
        const hit = !playerAirborneHigh && isInsideCircle(spot, player, this.tuning.circleRadius);
        if (hit) this.hitThisWave = true;
        events.push({ type: 'land', index: this.landed, spot, hitPlayer: hit });
        this.landed++;
      }
      const last = this.spots[this.spots.length - 1];
      if (this.landed >= this.spots.length && last && this.t >= last.landAt + 0.9) {
        if (!this.hitThisWave) {
          events.push({ type: 'waveCleared', wave: this.wave }, { type: 'reveal', assisted: false });
          this.phase = 'revealed';
        } else {
          this.misses++;
          events.push({ type: 'waveMissed', wave: this.wave, totalMisses: this.misses });
          if (!this.slow && this.misses >= this.tuning.missesBeforeSlow) {
            this.slow = true;
            events.push({ type: 'slowModeOn' });
          }
          if (this.misses >= this.tuning.missesBeforeReveal) {
            events.push({ type: 'reveal', assisted: true });
            this.phase = 'revealed';
          } else {
            this.phase = 'rest';
            this.t = 0;
          }
        }
      }
    } else if (this.phase === 'rest') {
      this.t += dt;
      if (this.t >= this.tuning.restTime) events.push(...this.beginWave(player));
    }
    return events;
  }

  /** Called when the revealed crystal has been tapped with the Wonderbrush. */
  complete(): void {
    this.phase = 'done';
  }

  private beginWave(player: Vec2): ParadeEvent[] {
    this.wave++;
    this.t = 0;
    this.shown = 0;
    this.landed = 0;
    this.hitThisWave = false;
    this.phase = 'wave';
    this.spots = planWave(this.seed, this.wave, player, this.tuning, this.slow);
    return [{ type: 'waveStart', wave: this.wave, spots: this.spots, slow: this.slow }];
  }
}
