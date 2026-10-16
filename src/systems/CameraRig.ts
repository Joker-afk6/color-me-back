/**
 * Friendly third-person camera: generous framing, smooth follow, mouse/stick/key orbit, zoom,
 * collision pull-in, optional auto-recenter ("camera assist"), plus cinematic moves for cutscenes.
 */
import * as THREE from 'three';
import { clamp, damp, dampAngle, angleDelta, easeInOutSine } from '../utils/math';
import type { PhysicsWorld } from './physics';

export interface CameraLimits {
  yawMin?: number;
  yawMax?: number;
  pitchMin: number;
  pitchMax: number;
  distMin: number;
  distMax: number;
}

export const DEFAULT_LIMITS: CameraLimits = { pitchMin: 0.12, pitchMax: 1.05, distMin: 4.5, distMax: 13 };

interface Shot {
  fromPos: THREE.Vector3;
  fromLook: THREE.Vector3;
  toPos: THREE.Vector3;
  toLook: THREE.Vector3;
  t: number;
  duration: number;
  ease: (t: number) => number;
  resolve: () => void;
  orbit?: { center: THREE.Vector3; radius: number; height: number; a0: number; a1: number; lookHeight: number };
}

export interface FollowContext {
  target: THREE.Vector3;
  velocity: { x: number; z: number };
  facing: number;
  look: { x: number; y: number };
  zoom: number;
  manual: boolean;
  recenter: boolean;
  assist: boolean;
  invertY: boolean;
  physics: PhysicsWorld | null;
}

export class CameraRig {
  yaw = 0;
  pitch = 0.42;
  distance = 8;
  limits: CameraLimits = { ...DEFAULT_LIMITS };
  mode: 'follow' | 'cinematic' = 'follow';
  shakeEnabled = true;

  private readonly focus = new THREE.Vector3();
  private readonly lookPoint = new THREE.Vector3();
  private readonly pos = new THREE.Vector3();
  private currentDist = 8;
  private idleCameraTime = 10;
  private shot: Shot | null = null;
  private blendFromCinematic = 0;
  private readonly blendPos = new THREE.Vector3();
  private readonly blendLook = new THREE.Vector3();
  private shakeAmp = 0;
  private shakeTime = 0;
  private time = 0;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  /** Snap behind a target (level start / respawn). */
  snapTo(target: THREE.Vector3, yaw?: number): void {
    if (yaw !== undefined) this.yaw = yaw;
    this.focus.copy(target);
    this.currentDist = this.distance;
    this.computeFollowPos(this.focus, this.currentDist, this.pos);
    this.lookPoint.copy(this.focus);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.lookPoint);
    this.blendFromCinematic = 0;
  }

  setLimits(l: Partial<CameraLimits>): void {
    this.limits = { ...DEFAULT_LIMITS, ...l };
    this.distance = clamp(this.distance, this.limits.distMin, this.limits.distMax);
  }

  shake(amount: number, seconds = 0.35): void {
    if (!this.shakeEnabled) return;
    this.shakeAmp = Math.max(this.shakeAmp, amount);
    this.shakeTime = Math.max(this.shakeTime, seconds);
  }

  /** Forward/right basis on the ground for camera-relative movement. */
  basis(): { fx: number; fz: number; rx: number; rz: number } {
    return { fx: -Math.sin(this.yaw), fz: -Math.cos(this.yaw), rx: Math.cos(this.yaw), rz: -Math.sin(this.yaw) };
  }

  // ───────────── Cinematic API (all return promises that resolve when the move ends) ─────────────

  cut(pos: THREE.Vector3, look: THREE.Vector3): void {
    this.cancelShot();
    this.mode = 'cinematic';
    this.camera.position.copy(pos);
    this.lookPoint.copy(look);
    this.camera.lookAt(look);
  }

  moveTo(pos: THREE.Vector3, look: THREE.Vector3, duration: number, ease = easeInOutSine): Promise<void> {
    this.cancelShot();
    this.mode = 'cinematic';
    return new Promise((resolve) => {
      this.shot = { fromPos: this.camera.position.clone(), fromLook: this.lookPoint.clone(), toPos: pos.clone(), toLook: look.clone(), t: 0, duration: Math.max(0.001, duration), ease, resolve };
    });
  }

  orbit(center: THREE.Vector3, radius: number, height: number, a0: number, a1: number, duration: number, lookHeight = 1.5): Promise<void> {
    this.cancelShot();
    this.mode = 'cinematic';
    return new Promise((resolve) => {
      this.shot = {
        fromPos: this.camera.position.clone(),
        fromLook: this.lookPoint.clone(),
        toPos: this.camera.position.clone(),
        toLook: center.clone(),
        t: 0,
        duration,
        ease: (t) => t,
        resolve,
        orbit: { center: center.clone(), radius, height, a0, a1, lookHeight },
      };
    });
  }

  /** Return to gameplay follow, blending smoothly from the current cinematic framing. */
  follow(blendSeconds = 0.9): void {
    this.cancelShot();
    if (this.mode === 'cinematic') {
      this.blendPos.copy(this.camera.position);
      this.blendLook.copy(this.lookPoint);
      this.blendFromCinematic = blendSeconds;
    }
    this.mode = 'follow';
  }

  /** Skip: finish the current shot immediately. */
  finishShot(): void {
    if (!this.shot) return;
    this.shot.t = this.shot.duration;
    this.updateShot(0);
  }

  private cancelShot(): void {
    if (this.shot) {
      const r = this.shot.resolve;
      this.shot = null;
      r();
    }
  }

  update(dt: number, ctx: FollowContext | null): void {
    this.time += dt;
    if (this.mode === 'cinematic') {
      this.updateShot(dt);
    } else if (ctx) {
      this.updateFollow(dt, ctx);
    }
    // Gentle shake (disabled entirely by the camera-shake / reduced-motion settings).
    if (this.shakeTime > 0 && this.shakeEnabled) {
      this.shakeTime -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeTime) * 2.2;
      this.camera.position.x += Math.sin(this.time * 47) * a * 0.08;
      this.camera.position.y += Math.sin(this.time * 61 + 1.3) * a * 0.06;
      if (this.shakeTime <= 0) this.shakeAmp = 0;
    }
  }

  private updateShot(dt: number): void {
    const s = this.shot;
    if (!s) {
      this.camera.lookAt(this.lookPoint);
      return;
    }
    s.t = Math.min(s.duration, s.t + dt);
    const k = s.ease(s.t / s.duration);
    if (s.orbit) {
      const o = s.orbit;
      const a = o.a0 + (o.a1 - o.a0) * k;
      const target = new THREE.Vector3(o.center.x + Math.sin(a) * o.radius, o.center.y + o.height, o.center.z + Math.cos(a) * o.radius);
      // Blend in from wherever the camera was over the first 15% of the orbit.
      const blend = Math.min(1, s.t / Math.max(0.001, s.duration * 0.15));
      this.camera.position.lerpVectors(s.fromPos, target, blend);
      const look = new THREE.Vector3(o.center.x, o.center.y + o.lookHeight, o.center.z);
      this.lookPoint.lerpVectors(s.fromLook, look, blend);
    } else {
      this.camera.position.lerpVectors(s.fromPos, s.toPos, k);
      this.lookPoint.lerpVectors(s.fromLook, s.toLook, k);
    }
    this.camera.lookAt(this.lookPoint);
    if (s.t >= s.duration) {
      this.shot = null;
      s.resolve();
    }
  }

  private updateFollow(dt: number, c: FollowContext): void {
    const L = this.limits;
    // Manual orbit.
    this.yaw -= c.look.x;
    this.pitch = clamp(this.pitch + c.look.y * (c.invertY ? -1 : 1), L.pitchMin, L.pitchMax);
    this.distance = clamp(this.distance + c.zoom, L.distMin, L.distMax);
    if (c.manual) this.idleCameraTime = 0;
    else this.idleCameraTime += dt;

    const speed = Math.hypot(c.velocity.x, c.velocity.z);
    // Camera assist: after a moment without manual input, ease behind the explorer while they run.
    if (c.recenter) {
      this.yaw = c.facing + Math.PI;
      this.idleCameraTime = 10;
    } else if (c.assist && this.idleCameraTime > 1.4 && speed > 2.5) {
      const behind = c.facing + Math.PI;
      if (Math.abs(angleDelta(this.yaw, behind)) < 1.9) this.yaw = dampAngle(this.yaw, behind, 0.9, dt);
    }
    if (L.yawMin !== undefined && L.yawMax !== undefined) {
      this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
      this.yaw = clamp(this.yaw, L.yawMin, L.yawMax);
    }

    // Smooth focus with a little look-ahead in the direction of travel.
    const ahead = new THREE.Vector3(c.target.x + c.velocity.x * 0.12, c.target.y, c.target.z + c.velocity.z * 0.12);
    this.focus.x = damp(this.focus.x, ahead.x, 8, dt);
    this.focus.z = damp(this.focus.z, ahead.z, 8, dt);
    this.focus.y = damp(this.focus.y, ahead.y, 4.5, dt);

    // Collision: pull the camera in front of walls, ease back out when clear.
    let want = this.distance;
    if (c.physics) {
      const dir = this.dirFromFocus();
      const hit = c.physics.raycastCamera(this.focus.x, this.focus.y, this.focus.z, dir.x, dir.y, dir.z, this.distance);
      if (hit !== null) want = Math.max(1.6, hit - 0.35);
    }
    this.currentDist = want < this.currentDist ? damp(this.currentDist, want, 20, dt) : damp(this.currentDist, want, 2.5, dt);

    this.computeFollowPos(this.focus, this.currentDist, this.pos);
    if (this.blendFromCinematic > 0) {
      this.blendFromCinematic = Math.max(0, this.blendFromCinematic - dt);
      const k = 1 - this.blendFromCinematic / 0.9;
      const e = easeInOutSine(Math.min(1, k));
      this.camera.position.lerpVectors(this.blendPos, this.pos, e);
      this.lookPoint.lerpVectors(this.blendLook, this.focus, e);
    } else {
      this.camera.position.copy(this.pos);
      this.lookPoint.copy(this.focus);
    }
    this.camera.lookAt(this.lookPoint);
  }

  private dirFromFocus(): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
  }

  private computeFollowPos(focus: THREE.Vector3, dist: number, out: THREE.Vector3): void {
    const d = this.dirFromFocus();
    out.set(focus.x + d.x * dist, focus.y + d.y * dist, focus.z + d.z * dist);
  }
}
