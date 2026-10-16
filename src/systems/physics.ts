/**
 * Lightweight static/kinematic collision world for a stylized platformer.
 * Shapes: yaw-rotated boxes, ramps (box whose top slopes along local +X) and vertical cylinders.
 * The player is a vertical capsule approximated by a circle footprint plus a height span.
 */

export interface BoxShape {
  kind: 'box';
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  yaw: number;
  y0: number;
  y1: number;
}

export interface RampShape {
  kind: 'ramp';
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  yaw: number;
  y0: number;
  /** Top height at local x = -hx and x = +hx. */
  yLow: number;
  yHigh: number;
}

export interface CylShape {
  kind: 'cyl';
  cx: number;
  cz: number;
  r: number;
  y0: number;
  y1: number;
}

export type Shape = BoxShape | RampShape | CylShape;

export interface Collider {
  id: number;
  shape: Shape;
  enabled: boolean;
  /** Blocks horizontal movement. */
  solid: boolean;
  /** Its top can be stood on. */
  walkable: boolean;
  /** Standing here records a respawn point. */
  safe: boolean;
  /** Landing here triggers a gentle respawn (e.g. a soft berry-juice creek). */
  hazard: boolean;
  /** Included in camera collision. */
  blocksCamera: boolean;
  /** Movement applied to anything standing on it this frame (moving platforms). */
  delta: { x: number; y: number; z: number };
  tag: string;
}

export type ColliderInit = Partial<Omit<Collider, 'id' | 'shape' | 'delta'>> & { shape: Shape };

let nextId = 1;

// Local ↔ world helpers for yaw rotation, matching THREE's rotation.y convention:
// world = center + Ry(yaw) * local, with Ry: x' = x cos + z sin, z' = -x sin + z cos.
export function toLocal(px: number, pz: number, cx: number, cz: number, yaw: number): [number, number] {
  const dx = px - cx;
  const dz = pz - cz;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [dx * c - dz * s, dx * s + dz * c];
}

export function toWorldDir(lx: number, lz: number, yaw: number): [number, number] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [lx * c + lz * s, -lx * s + lz * c];
}

/** Top height of a shape at a point (ignores footprint containment). */
export function topAt(shape: Shape, px: number, pz: number): number {
  if (shape.kind === 'ramp') {
    const [lx] = toLocal(px, pz, shape.cx, shape.cz, shape.yaw);
    const t = Math.min(1, Math.max(0, (lx + shape.hx) / (2 * shape.hx)));
    return shape.yLow + (shape.yHigh - shape.yLow) * t;
  }
  return shape.y1;
}

/** Does a circle (px, pz, r) overlap the shape footprint? */
export function footprintOverlaps(shape: Shape, px: number, pz: number, r: number): boolean {
  if (shape.kind === 'cyl') return Math.hypot(px - shape.cx, pz - shape.cz) < shape.r + r;
  const [lx, lz] = toLocal(px, pz, shape.cx, shape.cz, shape.yaw);
  const qx = Math.max(-shape.hx, Math.min(shape.hx, lx));
  const qz = Math.max(-shape.hz, Math.min(shape.hz, lz));
  return Math.hypot(lx - qx, lz - qz) < r;
}

/** Push vector that moves a circle out of a shape footprint (0,0 if not overlapping). */
export function pushOut(shape: Shape, px: number, pz: number, r: number): [number, number] {
  if (shape.kind === 'cyl') {
    const dx = px - shape.cx;
    const dz = pz - shape.cz;
    const d = Math.hypot(dx, dz);
    const min = shape.r + r;
    if (d >= min) return [0, 0];
    if (d < 1e-6) return [min, 0];
    return [(dx / d) * (min - d), (dz / d) * (min - d)];
  }
  const [lx, lz] = toLocal(px, pz, shape.cx, shape.cz, shape.yaw);
  const qx = Math.max(-shape.hx, Math.min(shape.hx, lx));
  const qz = Math.max(-shape.hz, Math.min(shape.hz, lz));
  const ex = lx - qx;
  const ez = lz - qz;
  const d = Math.hypot(ex, ez);
  let plx = 0;
  let plz = 0;
  if (d > 1e-6) {
    if (d >= r) return [0, 0];
    plx = (ex / d) * (r - d);
    plz = (ez / d) * (r - d);
  } else {
    // Centre inside the box: leave along the axis of least penetration.
    const penX = shape.hx - Math.abs(lx) + r;
    const penZ = shape.hz - Math.abs(lz) + r;
    if (penX < penZ) plx = (lx >= 0 ? 1 : -1) * penX;
    else plz = (lz >= 0 ? 1 : -1) * penZ;
  }
  return toWorldDir(plx, plz, shape.yaw);
}

export interface GroundHit {
  top: number;
  collider: Collider;
}

export class PhysicsWorld {
  readonly colliders: Collider[] = [];

  add(init: ColliderInit): Collider {
    const c: Collider = {
      id: nextId++,
      shape: init.shape,
      enabled: init.enabled ?? true,
      solid: init.solid ?? true,
      walkable: init.walkable ?? true,
      safe: init.safe ?? true,
      hazard: init.hazard ?? false,
      blocksCamera: init.blocksCamera ?? false,
      delta: { x: 0, y: 0, z: 0 },
      tag: init.tag ?? '',
    };
    this.colliders.push(c);
    return c;
  }

  /** Axis-aligned box helper: centre (x, z), size (w, d), vertical span [y0, y1]. */
  box(x: number, z: number, w: number, d: number, y0: number, y1: number, extra: Partial<ColliderInit> = {}, yaw = 0): Collider {
    return this.add({ ...extra, shape: { kind: 'box', cx: x, cz: z, hx: w / 2, hz: d / 2, yaw, y0, y1 } });
  }

  cyl(x: number, z: number, r: number, y0: number, y1: number, extra: Partial<ColliderInit> = {}): Collider {
    return this.add({ ...extra, shape: { kind: 'cyl', cx: x, cz: z, r, y0, y1 } });
  }

  ramp(x: number, z: number, length: number, width: number, yLow: number, yHigh: number, yaw: number, extra: Partial<ColliderInit> = {}): Collider {
    return this.add({ ...extra, shape: { kind: 'ramp', cx: x, cz: z, hx: length / 2, hz: width / 2, yaw, y0: Math.min(yLow, yHigh) - 0.5, yLow, yHigh } });
  }

  remove(c: Collider): void {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
  }

  /** Highest walkable top under the footprint that is at or below `maxTop`. */
  groundBelow(px: number, pz: number, footR: number, maxTop: number): GroundHit | null {
    let best: GroundHit | null = null;
    for (const c of this.colliders) {
      if (!c.enabled || !c.walkable) continue;
      if (!footprintOverlaps(c.shape, px, pz, footR)) continue;
      const top = topAt(c.shape, px, pz);
      if (top > maxTop + 1e-4) continue;
      if (!best || top > best.top) best = { top, collider: c };
    }
    return best;
  }

  /**
   * Resolve horizontal overlaps for a body spanning [feet, head]. Shapes whose top is within
   * `stepUp` of the feet are ignored (they are steps the body can walk onto).
   * Returns the total push applied and whether a wall was touched.
   */
  resolveHorizontal(pos: { x: number; y: number; z: number }, r: number, height: number, stepUp: number): { hitWall: boolean; nx: number; nz: number } {
    let hitWall = false;
    let nx = 0;
    let nz = 0;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of this.colliders) {
        if (!c.enabled || !c.solid) continue;
        const s = c.shape;
        if (s.y0 >= pos.y + height) continue;
        // Use the top nearest the body for ramps; flat shapes use y1.
        const top = topAt(s, pos.x, pos.z);
        if (top <= pos.y + stepUp) continue;
        const [dx, dz] = pushOut(s, pos.x, pos.z, r);
        if (dx !== 0 || dz !== 0) {
          pos.x += dx;
          pos.z += dz;
          const len = Math.hypot(dx, dz) || 1;
          nx += dx / len;
          nz += dz / len;
          hitWall = true;
          moved = true;
        }
      }
      if (!moved) break;
    }
    const nl = Math.hypot(nx, nz) || 1;
    return { hitWall, nx: nx / nl, nz: nz / nl };
  }

  /** Lowest ceiling bottom above `fromY` that overlaps the footprint (for head bumps). */
  ceilingAbove(px: number, pz: number, r: number, fromY: number): number | null {
    let best: number | null = null;
    for (const c of this.colliders) {
      if (!c.enabled || !c.solid) continue;
      if (!footprintOverlaps(c.shape, px, pz, r * 0.7)) continue;
      if (c.shape.y0 > fromY && (best === null || c.shape.y0 < best)) best = c.shape.y0;
    }
    return best;
  }

  /** Ray march for camera collision against `blocksCamera` colliders. Returns hit distance or null. */
  raycastCamera(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number): number | null {
    let best: number | null = null;
    for (const c of this.colliders) {
      if (!c.enabled || !c.blocksCamera) continue;
      const t = rayShape(c.shape, ox, oy, oz, dx, dy, dz, maxDist);
      if (t !== null && (best === null || t < best)) best = t;
    }
    return best;
  }
}

function rayShape(s: Shape, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number): number | null {
  if (s.kind === 'cyl') {
    // 2D circle intersection, then height check.
    const fx = ox - s.cx;
    const fz = oz - s.cz;
    const a = dx * dx + dz * dz;
    if (a < 1e-9) return null;
    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - s.r * s.r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
      if (t < 0 || t > maxDist) continue;
      const y = oy + dy * t;
      if (y >= s.y0 && y <= s.y1) return t;
    }
    return null;
  }
  const y1 = s.kind === 'ramp' ? Math.max(s.yLow, s.yHigh) : s.y1;
  const [lox, loz] = toLocal(ox, oz, s.cx, s.cz, s.yaw);
  const c = Math.cos(s.yaw);
  const sn = Math.sin(s.yaw);
  const ldx = dx * c - dz * sn;
  const ldz = dx * sn + dz * c;
  let tmin = 0;
  let tmax = maxDist;
  const slab = (o: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    return tmin <= tmax;
  };
  if (!slab(lox, ldx, -s.hx, s.hx)) return null;
  if (!slab(loz, ldz, -s.hz, s.hz)) return null;
  if (!slab(oy, dy, s.y0, y1)) return null;
  return tmin > 0 ? tmin : null;
}
