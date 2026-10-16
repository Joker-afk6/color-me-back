/**
 * Traversal section A — push one oversized gray berry onto the round floor switch (the round
 * berry picture) to lower the bridge. Push = Wonderbrush E near the berry. No time limit.
 * The berry rolls with soft friction inside the courtyard; a gentle "magnet" settles it on the
 * picture; if it ever wedges in a corner it floats back to its start, so it can never soft-lock.
 */
import * as THREE from 'three';
import type { Collider, PhysicsWorld } from '../../systems/physics';
import type { MaterialLibrary } from '../../rendering/paint';
import { berry } from '../../environments/props';
import { ORCH } from './layout';

export class PushBerryPuzzle {
  readonly group: THREE.Group;
  private readonly visual: THREE.Group;
  readonly pos = new THREE.Vector2();
  private readonly vel = new THREE.Vector2();
  private readonly collider: Collider;
  solved = false;
  private stuck = 0;
  private returning = 0;
  private readonly start = new THREE.Vector2(ORCH.berryStart.x, ORCH.berryStart.z);
  private readonly target = new THREE.Vector2(ORCH.switchPos.x, ORCH.switchPos.z);
  private settle = 0;
  /** Called once when the berry settles on the picture. */
  onSolved: () => void = () => {};
  /** Called when the berry rolls back home after getting wedged (for a friendly line). */
  onReset: () => void = () => {};
  magnetRadius = 1.35;

  constructor(lib: MaterialLibrary, physics: PhysicsWorld) {
    const r = ORCH.berryRadius;
    this.group = new THREE.Group();
    this.visual = berry(lib, r, '#E5383B', 'red');
    this.visual.position.y = r * 0.94;
    this.group.add(this.visual);
    this.pos.copy(this.start);
    this.group.position.set(this.pos.x, 0, this.pos.y);
    this.collider = physics.cyl(this.pos.x, this.pos.y, r * 0.95, 0, r * 1.9, { safe: false });
  }

  get worldPos(): THREE.Vector3 {
    return new THREE.Vector3(this.pos.x, ORCH.berryRadius, this.pos.y);
  }

  /** Wonderbrush push: roll away from the explorer. */
  push(fromX: number, fromZ: number): void {
    if (this.solved || this.returning > 0) return;
    const d = new THREE.Vector2(this.pos.x - fromX, this.pos.y - fromZ);
    if (d.lengthSq() < 1e-4) d.set(0, -1);
    d.normalize();
    this.vel.copy(d.multiplyScalar(5.8));
  }

  placeSolved(): void {
    this.solved = true;
    this.pos.copy(this.target);
    this.vel.set(0, 0);
    this.sync(0);
  }

  update(dt: number): void {
    if (this.solved) return;
    const c = ORCH.courtyard;
    const r = ORCH.berryRadius;
    if (this.returning > 0) {
      this.returning = Math.max(0, this.returning - dt);
      const k = 1 - this.returning / 1.6;
      this.pos.lerp(this.start, Math.min(1, k * 0.12 + 0.02));
      this.visual.position.y = r * 0.94 + Math.sin(Math.PI * k) * 1.4;
      this.sync(dt);
      return;
    }
    // Integrate with soft rolling friction.
    this.pos.addScaledVector(this.vel, dt);
    this.vel.multiplyScalar(Math.exp(-1.7 * dt));
    // Walls: bounce gently, never pass through. Keep clear of the ravine edge.
    const minX = c.minX + r;
    const maxX = c.maxX - r;
    const minZ = c.minZ + r + 0.3;
    const maxZ = c.maxZ - r - 0.2;
    if (this.pos.x < minX) {
      this.pos.x = minX;
      this.vel.x = Math.abs(this.vel.x) * 0.35;
    }
    if (this.pos.x > maxX) {
      this.pos.x = maxX;
      this.vel.x = -Math.abs(this.vel.x) * 0.35;
    }
    if (this.pos.y < minZ) {
      this.pos.y = minZ;
      this.vel.y = Math.abs(this.vel.y) * 0.35;
    }
    if (this.pos.y > maxZ) {
      this.pos.y = maxZ;
      this.vel.y = -Math.abs(this.vel.y) * 0.35;
    }
    // Magnet: the picture gently "catches" a slow berry.
    const toT = this.target.clone().sub(this.pos);
    const dist = toT.length();
    if (dist < this.magnetRadius && this.vel.length() < 4.5) {
      this.vel.addScaledVector(toT.normalize(), 9 * dt);
      this.vel.multiplyScalar(Math.exp(-3 * dt));
      if (dist < 0.25) {
        this.settle += dt;
        if (this.settle > 0.25) {
          this.placeSolved();
          this.onSolved();
          return;
        }
      }
    } else this.settle = 0;
    // Corner rescue: wedged against two walls and not moving for a while → float back home.
    const inCorner = (this.pos.x <= minX + 0.05 || this.pos.x >= maxX - 0.05) && (this.pos.y <= minZ + 0.05 || this.pos.y >= maxZ - 0.05);
    if (inCorner && this.vel.length() < 0.2) this.stuck += dt;
    else this.stuck = 0;
    if (this.stuck > 3) {
      this.stuck = 0;
      this.returning = 1.6;
      this.vel.set(0, 0);
      this.onReset();
    }
    this.sync(dt);
  }

  private sync(dt: number): void {
    this.group.position.set(this.pos.x, 0, this.pos.y);
    const s = this.collider.shape;
    if (s.kind === 'cyl') {
      s.cx = this.pos.x;
      s.cz = this.pos.y;
    }
    // Roll: rotate about the axis perpendicular to motion.
    const speed = this.vel.length();
    if (speed > 0.01 && dt > 0) {
      const axis = new THREE.Vector3(this.vel.y, 0, -this.vel.x).normalize();
      this.visual.rotateOnWorldAxis(axis, (speed * dt) / ORCH.berryRadius);
    }
  }
}
