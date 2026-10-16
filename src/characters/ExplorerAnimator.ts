/**
 * Procedural animation for the Explorer rig: idle (breathing, blinking, glancing), run cycle,
 * jump / fall / land squash, dash lean, Wonderbrush interact + paint swing, push, sweep-paint hold,
 * celebrate, gentle "bonk" (after a soft berry bounce), talking, and the prologue sit/stretch.
 * Every joint eases toward its target pose, so states blend smoothly.
 */
import type { ExplorerRig } from './ExplorerModel';
import { clamp, damp } from '../utils/math';

export type OneShot = 'interact' | 'brush' | 'push' | 'celebrate' | 'bonk' | 'wave' | 'stretch';
export type Pose = 'normal' | 'sitting' | 'sleeping';

export interface AnimInput {
  /** Horizontal speed in m/s. */
  speed: number;
  runSpeed: number;
  grounded: boolean;
  vy: number;
  dashing: boolean;
  /** Holding a sweep-paint (both hands on the brush, painting motion). */
  sweeping: boolean;
  talking: boolean;
}

interface Joint {
  x: number;
  y: number;
  z: number;
}

export class ExplorerAnimator {
  pose: Pose = 'normal';
  /** Hip height while sitting (0.26 = on the floor; ~0.45 = on the edge of a bed). */
  sitHeight = 0.26;
  private t = 0;
  private phase = 0;
  private blinkIn = 2;
  private blinkT = 0;
  private landSquash = 0;
  private lookYaw = 0;
  private lookYawTarget = 0;
  private lookTimer = 3;
  private shot: { kind: OneShot; t: number; duration: number } | null = null;
  private readonly cur = new Map<string, Joint>();
  private wasGrounded = true;

  constructor(readonly rig: ExplorerRig) {}

  play(kind: OneShot): void {
    const durations: Record<OneShot, number> = { interact: 0.45, brush: 0.6, push: 0.55, celebrate: 1.4, bonk: 0.8, wave: 1.2, stretch: 1.8 };
    this.shot = { kind, t: 0, duration: durations[kind] };
  }

  get busy(): boolean {
    return this.shot !== null;
  }

  landed(impact: number): void {
    this.landSquash = clamp(impact / 14, 0.15, 0.6);
  }

  update(dt: number, a: AnimInput): void {
    this.t += dt;
    const r = this.rig;
    const run = clamp(a.speed / a.runSpeed, 0, 1.3);
    if (a.grounded && run > 0.05) this.phase += dt * (5.5 + run * 7.5);

    // Targets (radians) for every joint, built from the base pose then layered.
    const T = {
      spine: { x: 0, y: 0, z: 0 },
      neck: { x: 0, y: 0, z: 0 },
      head: { x: 0, y: 0, z: 0 },
      shL: { x: 0, y: 0, z: -0.14 },
      shR: { x: 0, y: 0, z: 0.14 },
      elL: { x: -0.15, y: 0, z: 0 },
      elR: { x: -0.15, y: 0, z: 0 },
      legL: { x: 0, y: 0, z: 0 },
      legR: { x: 0, y: 0, z: 0 },
      knL: { x: 0, y: 0, z: 0 },
      knR: { x: 0, y: 0, z: 0 },
    };
    let bob = 0;

    if (this.pose === 'sitting' || this.pose === 'sleeping') {
      T.legL.x = T.legR.x = -1.45;
      T.knL.x = T.knR.x = 1.3;
      T.shL.x = T.shR.x = 0.15;
      T.shL.z = -0.35;
      T.shR.z = 0.35;
      bob = this.sitHeight - 0.62;
      if (this.pose === 'sleeping') {
        T.head.x = 0.35;
        T.head.z = 0.2;
        T.spine.x = 0.15;
      }
    } else if (a.dashing) {
      T.spine.x = 0.55;
      T.head.x = -0.35;
      T.shL.x = T.shR.x = 1.2;
      T.shL.z = -0.5;
      T.shR.z = 0.5;
      T.legL.x = 0.7;
      T.legR.x = -0.5;
      T.knL.x = 0.8;
      T.knR.x = 0.3;
    } else if (!a.grounded) {
      if (a.vy > 0) {
        // Rising: knees tucked, arms up and out.
        T.legL.x = -0.75;
        T.legR.x = -0.15;
        T.knL.x = 1.1;
        T.knR.x = 0.5;
        T.shL.z = -2.3;
        T.shR.z = 2.3;
        T.shL.x = T.shR.x = -0.2;
        T.spine.x = -0.08;
      } else {
        // Falling: arms out for balance, legs reaching down.
        T.legL.x = -0.3;
        T.legR.x = 0.2;
        T.knL.x = 0.4;
        T.knR.x = 0.25;
        T.shL.z = -1.25;
        T.shR.z = 1.25;
        T.spine.x = 0.05;
      }
    } else if (run > 0.05) {
      const s = Math.sin(this.phase);
      const c = Math.cos(this.phase);
      T.legL.x = s * 0.85 * Math.min(1, run);
      T.legR.x = -s * 0.85 * Math.min(1, run);
      T.knL.x = Math.max(0, -c) * 1.0 * run + 0.1;
      T.knR.x = Math.max(0, c) * 1.0 * run + 0.1;
      T.shL.x = -s * 0.8 * run;
      T.shR.x = s * 0.8 * run;
      T.elL.x = T.elR.x = -0.55 * run - 0.2;
      T.shL.z = -0.2;
      T.shR.z = 0.2;
      T.spine.x = 0.16 * run;
      T.spine.y = s * 0.12 * run;
      T.head.x = -0.1 * run;
      bob = Math.abs(Math.cos(this.phase)) * 0.065 * run;
    } else {
      // Idle: breathing sway + occasional glance around.
      const br = Math.sin(this.t * 2.1);
      T.shL.z = -0.14 - br * 0.03;
      T.shR.z = 0.14 + br * 0.03;
      T.spine.x = br * 0.015;
      this.lookTimer -= dt;
      if (this.lookTimer <= 0) {
        this.lookTimer = 2.5 + Math.random() * 3.5;
        this.lookYawTarget = Math.random() < 0.4 ? 0 : (Math.random() - 0.5) * 1.1;
      }
      bob = br * 0.006;
    }

    // Sweep-paint hold: both hands on the brush, painting in big arcs.
    if (a.sweeping) {
      const sw = Math.sin(this.t * 7);
      T.shR.x = -1.35 + sw * 0.35;
      T.shR.z = 0.1 + sw * 0.25;
      T.shL.x = -1.2 + sw * 0.3;
      T.shL.z = -0.05;
      T.elR.x = T.elL.x = -0.35;
      T.spine.y = sw * 0.18;
    }

    // One-shot layers.
    if (this.shot) {
      const s = this.shot;
      s.t += dt;
      const k = clamp(s.t / s.duration, 0, 1);
      const env = Math.sin(Math.PI * k);
      switch (s.kind) {
        case 'interact':
          T.shR.x = -1.5 * env;
          T.elR.x = -0.2;
          T.spine.x += 0.12 * env;
          break;
        case 'brush':
          T.shR.x = -2.2 + k * 2.4;
          T.shR.z = 0.35 - k * 0.5;
          T.elR.x = -0.4;
          T.spine.y = (k - 0.5) * 0.4;
          break;
        case 'push':
          T.shL.x = T.shR.x = -1.45 * env;
          T.elL.x = T.elR.x = -0.2;
          T.spine.x = 0.3 * env;
          break;
        case 'celebrate': {
          T.shL.z = -2.6 * env - 0.2;
          T.shR.z = 2.6 * env + 0.2;
          T.shL.x = T.shR.x = -0.3 * env;
          T.head.x = -0.25 * env;
          bob += Math.abs(Math.sin(k * Math.PI * 2)) * 0.32;
          break;
        }
        case 'bonk':
          T.head.z = Math.sin(s.t * 18) * 0.3 * (1 - k);
          T.shL.z = -1.0 * env - 0.2;
          T.shR.z = 1.0 * env + 0.2;
          T.spine.x = -0.2 * env;
          break;
        case 'wave':
          T.shR.z = 2.5;
          T.shR.x = -0.2;
          T.elR.z = 0;
          T.elR.x = -0.3 + Math.sin(s.t * 12) * 0.4;
          break;
        case 'stretch':
          T.shL.z = -2.9 * env;
          T.shR.z = 2.9 * env;
          T.spine.x = -0.25 * env;
          T.head.x = -0.35 * env;
          break;
      }
      if (s.t >= s.duration) this.shot = null;
    }

    // Talking: little head nods.
    if (a.talking) T.head.x += Math.sin(this.t * 9) * 0.04;
    this.lookYaw = damp(this.lookYaw, run > 0.1 || a.talking ? 0 : this.lookYawTarget, 3, dt);
    T.head.y += this.lookYaw;

    // Ease every joint toward its target.
    const rate = a.dashing ? 22 : 15;
    this.apply('spine', r.spine, T.spine, rate, dt);
    this.apply('neck', r.neck, T.neck, rate, dt);
    this.apply('head', r.head, T.head, rate, dt);
    this.apply('shL', r.shoulderL, T.shL, rate, dt);
    this.apply('shR', r.shoulderR, T.shR, rate, dt);
    this.apply('elL', r.elbowL, T.elL, rate, dt);
    this.apply('elR', r.elbowR, T.elR, rate, dt);
    this.apply('legL', r.legL, T.legL, rate, dt);
    this.apply('legR', r.legR, T.legR, rate, dt);
    this.apply('knL', r.kneeL, T.knL, rate, dt);
    this.apply('knR', r.kneeR, T.knR, rate, dt);

    // Body bob + landing squash-and-stretch.
    if (a.grounded && !this.wasGrounded) this.landSquash = Math.max(this.landSquash, 0.18);
    this.wasGrounded = a.grounded;
    this.landSquash = damp(this.landSquash, 0, 9, dt);
    const stretch = !a.grounded ? clamp(Math.abs(a.vy) / 30, 0, 0.12) : 0;
    const sq = this.landSquash;
    r.body.scale.set(1 + sq * 0.35 - stretch * 0.4, 1 - sq * 0.45 + stretch, 1 + sq * 0.35 - stretch * 0.4);
    r.body.position.y = damp(r.body.position.y, bob, 18, dt);

    // Scarf tail flutters with speed.
    r.scarfTail.rotation.x = 0.35 + run * 0.7 + Math.sin(this.t * 10) * 0.08 * (0.3 + run);
    r.scarfTail.rotation.z = 0.2 + Math.sin(this.t * 7.3) * 0.08;

    // Blinking.
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkT = 0.13;
      this.blinkIn = 2 + Math.random() * 3.5;
    }
    this.blinkT = Math.max(0, this.blinkT - dt);
    const closed = this.pose === 'sleeping' ? 1 : this.blinkT > 0 ? 1 : 0;
    for (const e of r.eyes) e.scale.y = closed ? 0.008 : 0.074;
    // Mouth: open while talking or celebrating.
    const open = a.talking ? Math.abs(Math.sin(this.t * 11)) > 0.35 : this.shot?.kind === 'celebrate';
    r.mouthOpen.visible = !!open;
    r.mouthSmile.visible = !open;
  }

  private apply(id: string, obj: { rotation: { x: number; y: number; z: number } }, target: Joint, rate: number, dt: number): void {
    let c = this.cur.get(id);
    if (!c) {
      c = { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z };
      this.cur.set(id, c);
    }
    c.x = damp(c.x, target.x, rate, dt);
    c.y = damp(c.y, target.y, rate, dt);
    c.z = damp(c.z, target.z, rate, dt);
    obj.rotation.x = c.x;
    obj.rotation.y = c.y;
    obj.rotation.z = c.z;
  }
}
