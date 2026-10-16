/**
 * Ruby Stage 3 — "The Friendly Dragon Dance" — pure rhythm sequencer.
 *
 * Script: three clearly signaled stomp patterns with soft ripples, slow and beat-marked by floor
 * symbols. Move to a raised berry platform, then sweep-paint the last gem when Ruby's final stomp
 * lifts it into view. A player who misses just tries the next cycle (no progress lost).
 */

export interface DanceTuning {
  /** Seconds from a chant starting to its stomp. */
  windup: [number, number, number];
  /** Pause after each stomp before the next chant. */
  gap: number;
  rippleSpeed: number;
  rippleMaxRadius: number;
  /** How long the gem stays in view (paused while the player is sweep-painting). */
  gemWindow: number;
  rest: number;
}

export const DANCE_TUNING: DanceTuning = {
  windup: [1.5, 1.5, 2.6],
  gap: 1.3,
  rippleSpeed: 6.5,
  rippleMaxRadius: 26,
  gemWindow: 7,
  rest: 2.2,
};

export const DANCE_TUNING_ASSIST: DanceTuning = {
  windup: [2.2, 2.2, 3.6],
  gap: 1.8,
  rippleSpeed: 4.5,
  rippleMaxRadius: 26,
  gemWindow: 14,
  rest: 2.5,
};

export type DanceEvent =
  | { type: 'cycleStart'; cycle: number }
  | { type: 'chant'; beat: 1 | 2 | 3 }
  | { type: 'stomp'; beat: 1 | 2 | 3 }
  | { type: 'gemUp' }
  | { type: 'gemDown' };

type Phase = { kind: 'chant'; beat: 1 | 2 | 3 } | { kind: 'gap'; beat: 1 | 2 } | { kind: 'gem' } | { kind: 'rest' } | { kind: 'idle' } | { kind: 'done' };

export interface Ripple {
  beat: 1 | 2 | 3;
  radius: number;
  /** Players already affected by this ripple are not affected again. */
  resolved: boolean;
}

export class DragonDance {
  cycle = 0;
  phase: Phase = { kind: 'idle' };
  ripples: Ripple[] = [];
  private t = 0;
  private gemTime = 0;

  constructor(public tuning: DanceTuning = DANCE_TUNING) {}

  get gemVisible(): boolean {
    return this.phase.kind === 'gem';
  }

  /** Remaining gem window in seconds (for the HUD ring). */
  get gemRemaining(): number {
    return this.phase.kind === 'gem' ? Math.max(0, this.tuning.gemWindow - this.gemTime) : 0;
  }

  start(): DanceEvent[] {
    return this.beginCycle();
  }

  /** `sweeping` pauses the gem window so a child mid-brushstroke never loses the gem. */
  update(dt: number, sweeping: boolean): DanceEvent[] {
    const ev: DanceEvent[] = [];
    for (const r of this.ripples) r.radius += this.tuning.rippleSpeed * dt;
    this.ripples = this.ripples.filter((r) => r.radius < this.tuning.rippleMaxRadius);
    const p = this.phase;
    if (p.kind === 'idle' || p.kind === 'done') return ev;
    this.t += dt;
    if (p.kind === 'chant') {
      if (this.t >= this.tuning.windup[p.beat - 1]) {
        ev.push({ type: 'stomp', beat: p.beat });
        this.ripples.push({ beat: p.beat, radius: 0, resolved: false });
        this.t = 0;
        if (p.beat === 3) {
          this.phase = { kind: 'gem' };
          this.gemTime = 0;
          ev.push({ type: 'gemUp' });
        } else {
          this.phase = { kind: 'gap', beat: p.beat };
        }
      }
    } else if (p.kind === 'gap') {
      if (this.t >= this.tuning.gap) {
        const beat = (p.beat + 1) as 2 | 3;
        this.phase = { kind: 'chant', beat };
        this.t = 0;
        ev.push({ type: 'chant', beat });
      }
    } else if (p.kind === 'gem') {
      if (!sweeping) this.gemTime += dt;
      if (this.gemTime >= this.tuning.gemWindow) {
        ev.push({ type: 'gemDown' });
        this.phase = { kind: 'rest' };
        this.t = 0;
      }
    } else if (p.kind === 'rest') {
      if (this.t >= this.tuning.rest) ev.push(...this.beginCycle());
    }
    return ev;
  }

  finish(): void {
    this.phase = { kind: 'done' };
  }

  private beginCycle(): DanceEvent[] {
    this.cycle++;
    this.t = 0;
    this.phase = { kind: 'chant', beat: 1 };
    return [{ type: 'cycleStart', cycle: this.cycle }, { type: 'chant', beat: 1 }];
  }
}

/** Does a ripple ring (thickness ±0.9) overlap a point at distance `d` from Ruby? */
export const rippleTouches = (ripple: Ripple, d: number): boolean => Math.abs(ripple.radius - d) < 0.9;
