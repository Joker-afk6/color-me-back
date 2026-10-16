/**
 * Kinematic character motor: movement, jumping, collisions, moving platforms, safe respawn.
 * Pure TypeScript (no rendering) so it can be unit-tested. Both explorers use the SAME motor
 * and the same tuning — gameplay is identical for the girl and boy characters.
 */
import { PhysicsWorld, type Collider } from './physics';

export interface MotorTuning {
  radius: number;
  height: number;
  stepUp: number;
  runSpeed: number;
  groundAccel: number;
  airAccel: number;
  gravity: number;
  jumpVelocity: number;
  coyoteTime: number;
  jumpBuffer: number;
  maxFallSpeed: number;
  dashSpeed: number;
  dashTime: number;
  dashCooldown: number;
}

/** One shared tuning for both explorers (Bible §2: equal speed, jumping and abilities). */
export const EXPLORER_TUNING: Readonly<MotorTuning> = Object.freeze({
  radius: 0.38,
  height: 1.7,
  stepUp: 0.34,
  runSpeed: 5.4,
  groundAccel: 34,
  airAccel: 15,
  gravity: 24,
  jumpVelocity: 8.6,
  coyoteTime: 0.14,
  jumpBuffer: 0.14,
  maxFallSpeed: 22,
  dashSpeed: 17,
  dashTime: 0.3,
  dashCooldown: 1.1,
});

export interface MotorInput {
  /** Desired world-space move direction; length 0..1. */
  moveX: number;
  moveZ: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dashPressed: boolean;
}

export type MotorEvent =
  | { type: 'jump' }
  | { type: 'land'; impact: number }
  | { type: 'dashStart' }
  | { type: 'dashEnd'; reason: 'time' | 'wall' | 'ledge' }
  | { type: 'hazard' }
  | { type: 'fell' }
  | { type: 'bumpHead' };

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export class CharacterMotor {
  readonly pos: Vec3 = { x: 0, y: 0, z: 0 };
  readonly vel: Vec3 = { x: 0, y: 0, z: 0 };
  /** Extra velocity from bounces/knockback; decays quickly. */
  readonly push: Vec3 = { x: 0, y: 0, z: 0 };
  grounded = false;
  ground: Collider | null = null;
  facing = 0;
  dashAllowed = false;
  dashActive = false;
  dashCooldownLeft = 0;
  killY = -12;
  /** Movement is frozen (cutscenes, dialogue). Gravity still applies. */
  frozen = false;
  readonly lastSafe: Vec3 = { x: 0, y: 0, z: 0 };
  private coyote = 0;
  private buffer = 0;
  private dashLeft = 0;
  private dashDir = { x: 0, z: 1 };
  private jumpCut = false;
  private safeTimer = 0;

  constructor(
    public world: PhysicsWorld,
    readonly tuning: MotorTuning = EXPLORER_TUNING,
  ) {}

  teleport(x: number, y: number, z: number, facing?: number): void {
    this.pos.x = x;
    this.pos.y = y;
    this.pos.z = z;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.push.x = this.push.y = this.push.z = 0;
    this.dashActive = false;
    this.grounded = false;
    this.ground = null;
    this.lastSafe.x = x;
    this.lastSafe.y = y;
    this.lastSafe.z = z;
    if (facing !== undefined) this.facing = facing;
  }

  /** Gentle bounce (berries, ripples): no damage, just a hop away from `fromX/fromZ`. */
  bounceFrom(fromX: number, fromZ: number, strength = 7, lift = 6): void {
    let dx = this.pos.x - fromX;
    let dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz);
    if (d < 1e-3) {
      dx = Math.sin(this.facing + Math.PI);
      dz = Math.cos(this.facing + Math.PI);
    } else {
      dx /= d;
      dz /= d;
    }
    this.push.x = dx * strength;
    this.push.z = dz * strength;
    this.vel.y = Math.max(this.vel.y, lift);
    this.grounded = false;
    this.ground = null;
    this.dashActive = false;
    this.jumpCut = true; // a bounce is not shortened by releasing Space
  }

  /** Assist helper: start a dash in a world direction if dashing is currently allowed. */
  requestDash(dx: number, dz: number): boolean {
    if (!this.dashAllowed || this.dashActive || this.dashCooldownLeft > 0 || this.frozen) return false;
    const events: MotorEvent[] = [];
    this.tryDash({ moveX: dx, moveZ: dz, jumpPressed: false, jumpHeld: false, dashPressed: true }, events);
    return this.dashActive;
  }

  respawn(): void {
    this.teleport(this.lastSafe.x, this.lastSafe.y + 0.05, this.lastSafe.z);
  }

  step(dtTotal: number, input: MotorInput): MotorEvent[] {
    const events: MotorEvent[] = [];
    const steps = Math.max(1, Math.ceil(dtTotal / (1 / 90)));
    const dt = dtTotal / steps;
    // Edge-triggered inputs only count once per frame.
    if (input.jumpPressed && !this.frozen) this.buffer = this.tuning.jumpBuffer;
    if (input.dashPressed && !this.frozen) this.tryDash(input, events);
    // Ride moving platforms: apply the platform's movement for this frame once.
    if (this.grounded && this.ground) {
      this.pos.x += this.ground.delta.x;
      this.pos.y += this.ground.delta.y;
      this.pos.z += this.ground.delta.z;
    }
    for (let i = 0; i < steps; i++) this.substep(dt, input, events);
    return events;
  }

  private tryDash(input: MotorInput, events: MotorEvent[]): void {
    if (!this.dashAllowed || this.dashActive || this.dashCooldownLeft > 0) return;
    let dx = input.moveX;
    let dz = input.moveZ;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) {
      // Script: "Tap Shift while moving". Standing still dashes the way the explorer faces.
      dx = Math.sin(this.facing);
      dz = Math.cos(this.facing);
    } else {
      dx /= len;
      dz /= len;
    }
    this.dashDir = { x: dx, z: dz };
    this.dashActive = true;
    this.dashLeft = this.tuning.dashTime;
    this.dashCooldownLeft = this.tuning.dashCooldown;
    if (!this.grounded) this.vel.y = Math.max(this.vel.y, 1.5);
    events.push({ type: 'dashStart' });
  }

  private substep(dt: number, input: MotorInput, events: MotorEvent[]): void {
    const t = this.tuning;
    this.dashCooldownLeft = Math.max(0, this.dashCooldownLeft - dt);
    this.coyote = this.grounded ? t.coyoteTime : Math.max(0, this.coyote - dt);
    this.buffer = Math.max(0, this.buffer - dt);

    // Horizontal velocity.
    const mx = this.frozen ? 0 : input.moveX;
    const mz = this.frozen ? 0 : input.moveZ;
    if (this.dashActive) {
      this.vel.x = this.dashDir.x * t.dashSpeed;
      this.vel.z = this.dashDir.z * t.dashSpeed;
      this.dashLeft -= dt;
      if (this.dashLeft <= 0) this.endDash('time', events);
    } else {
      const accel = this.grounded ? t.groundAccel : t.airAccel;
      const tx = mx * t.runSpeed;
      const tz = mz * t.runSpeed;
      this.vel.x = approach(this.vel.x, tx, accel * dt);
      this.vel.z = approach(this.vel.z, tz, accel * dt);
    }
    const inputLen = Math.hypot(mx, mz);
    if (inputLen > 0.1 && !this.dashActive) {
      const target = Math.atan2(mx, mz);
      this.facing = turnToward(this.facing, target, 14 * dt);
    } else if (this.dashActive) {
      this.facing = Math.atan2(this.dashDir.x, this.dashDir.z);
    }

    // Decay knockback push.
    const decay = Math.exp(-5 * dt);
    this.push.x *= decay;
    this.push.z *= decay;

    // Jump (buffered + coyote time for forgiving timing).
    if (this.buffer > 0 && this.coyote > 0 && !this.frozen) {
      this.vel.y = t.jumpVelocity;
      this.grounded = false;
      this.ground = null;
      this.coyote = 0;
      this.buffer = 0;
      this.jumpCut = false;
      events.push({ type: 'jump' });
    }
    // Releasing Space early gives a smaller hop (only for real jumps, never for bounces).
    if (!input.jumpHeld && this.vel.y > 2.5 && !this.jumpCut && !this.grounded) {
      this.vel.y *= 0.6;
      this.jumpCut = true;
    }

    // Ledge guard: a grounded dash stops at an edge instead of running off it.
    let nx = this.pos.x + (this.vel.x + this.push.x) * dt;
    let nz = this.pos.z + (this.vel.z + this.push.z) * dt;
    if (this.dashActive && this.grounded) {
      const ahead = this.world.groundBelow(nx + this.dashDir.x * 0.35, nz + this.dashDir.z * 0.35, 0.1, this.pos.y + t.stepUp);
      if (!ahead || ahead.top < this.pos.y - 0.6) {
        nx = this.pos.x;
        nz = this.pos.z;
        this.vel.x = this.vel.z = 0;
        this.endDash('ledge', events);
      }
    }
    this.pos.x = nx;
    this.pos.z = nz;
    const wall = this.world.resolveHorizontal(this.pos, t.radius, t.height, t.stepUp);
    if (wall.hitWall) {
      // Remove velocity into the wall.
      const into = this.vel.x * wall.nx + this.vel.z * wall.nz;
      if (into < 0) {
        this.vel.x -= into * wall.nx;
        this.vel.z -= into * wall.nz;
      }
      if (this.dashActive && this.dashDir.x * wall.nx + this.dashDir.z * wall.nz < -0.5) this.endDash('wall', events);
    }

    // Vertical.
    const g = this.dashActive ? t.gravity * 0.25 : t.gravity;
    this.vel.y = Math.max(-t.maxFallSpeed, this.vel.y - g * dt);
    const prevY = this.pos.y;
    let ny = prevY + this.vel.y * dt;
    if (this.vel.y > 0) {
      const ceil = this.world.ceilingAbove(this.pos.x, this.pos.z, t.radius, prevY + t.height - 0.01);
      if (ceil !== null && ny + t.height > ceil) {
        ny = ceil - t.height;
        this.vel.y = 0;
        events.push({ type: 'bumpHead' });
      }
    }
    const ground = this.world.groundBelow(this.pos.x, this.pos.z, t.radius * 0.55, prevY + t.stepUp);
    const wasGrounded = this.grounded;
    if (ground && this.vel.y <= 0 && (ny <= ground.top || (wasGrounded && prevY - ground.top < 0.35))) {
      if (!wasGrounded) events.push({ type: 'land', impact: -this.vel.y });
      this.pos.y = ground.top;
      this.vel.y = 0;
      this.grounded = true;
      this.ground = ground.collider;
      if (ground.collider.hazard) {
        events.push({ type: 'hazard' });
      }
    } else {
      this.pos.y = ny;
      this.grounded = false;
      this.ground = null;
    }

    // Track a safe respawn point (static, safe ground, not near an edge).
    this.safeTimer -= dt;
    if (this.grounded && this.ground && this.ground.safe && !this.ground.hazard && this.safeTimer <= 0) {
      this.safeTimer = 0.2;
      if (this.ground.delta.x === 0 && this.ground.delta.z === 0 && this.supportedAround(0.7)) {
        this.lastSafe.x = this.pos.x;
        this.lastSafe.y = this.pos.y;
        this.lastSafe.z = this.pos.z;
      }
    }
    if (this.pos.y < this.killY) events.push({ type: 'fell' });
  }

  private supportedAround(r: number): boolean {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const g = this.world.groundBelow(this.pos.x + Math.cos(a) * r, this.pos.z + Math.sin(a) * r, 0.05, this.pos.y + 0.05);
      if (!g || Math.abs(g.top - this.pos.y) > 0.05 || g.collider.hazard) return false;
    }
    return true;
  }

  private endDash(reason: 'time' | 'wall' | 'ledge', events: MotorEvent[]): void {
    if (!this.dashActive) return;
    this.dashActive = false;
    // Keep a little momentum so the dash flows into running.
    this.vel.x *= 0.45;
    this.vel.z *= 0.45;
    events.push({ type: 'dashEnd', reason });
  }
}

function approach(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(target, v + maxDelta);
  return Math.max(target, v - maxDelta);
}

function turnToward(current: number, target: number, maxStep: number): number {
  let d = (target - current) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  const k = Math.min(1, maxStep);
  return current + d * k;
}
