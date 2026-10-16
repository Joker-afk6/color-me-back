/**
 * Geometry solvability: uses the real CharacterMotor and the shared Ruby Orchard layout numbers
 * (src/chapters/ruby/layout.ts) to prove every required jump is possible with the explorer's
 * tuning, and that the dash test really needs Crimson Dash.
 */
import { describe, expect, it } from 'vitest';
import { PhysicsWorld } from '../src/systems/physics';
import { CharacterMotor, type MotorInput } from '../src/systems/CharacterMotor';
import { ORCH } from '../src/chapters/ruby/layout';

const idle: MotorInput = { moveX: 0, moveZ: 0, jumpPressed: false, jumpHeld: false, dashPressed: false };

/** Run toward +X (or -Z) and jump when the front reaches `takeoff`; optionally air-dash. */
function runJump(m: CharacterMotor, axis: 'x' | '-z', takeoff: number, dash: boolean, maxSeconds = 4): { landedY: number; landedAt: number; hazard: boolean } {
  const dir = axis === 'x' ? { moveX: 1, moveZ: 0 } : { moveX: 0, moveZ: -1 };
  let jumped = false;
  let dashed = false;
  let airborneFrames = 0;
  let hazard = false;
  for (let i = 0; i < maxSeconds * 60; i++) {
    const pos = axis === 'x' ? m.pos.x : -m.pos.z;
    const press = !jumped && pos >= takeoff;
    if (press) jumped = true;
    if (jumped && !m.grounded) airborneFrames++;
    const doDash = dash && jumped && !dashed && airborneFrames === 8;
    if (doDash) dashed = true;
    const ev = m.step(1 / 60, { ...idle, ...dir, jumpPressed: press, jumpHeld: jumped && airborneFrames < 14, dashPressed: doDash });
    if (ev.some((e) => e.type === 'hazard')) hazard = true;
    if (jumped && airborneFrames > 4 && m.grounded) return { landedY: m.pos.y, landedAt: axis === 'x' ? m.pos.x : m.pos.z, hazard };
  }
  return { landedY: m.pos.y, landedAt: axis === 'x' ? m.pos.x : m.pos.z, hazard };
}

describe('Ruby Orchard berry trail', () => {
  it('both gaps are comfortably jumpable from a run', () => {
    const w = new PhysicsWorld();
    for (const [z0, z1] of ORCH.trail.segments) w.box(0, (z0 + z1) / 2, ORCH.trail.halfW * 2, z0 - z1, -1, ORCH.trail.top);
    w.box(0, 20, 9.8, 22, -1.7, -0.7, { hazard: true, safe: false });
    const m = new CharacterMotor(w);
    m.teleport(0, ORCH.trail.top, 27.5);
    // Gap 1 (z 22 → 20): take off 0.4 m before the edge.
    const g1 = runJump(m, '-z', -22.4, false);
    expect(g1.hazard).toBe(false);
    expect(g1.landedY).toBeCloseTo(ORCH.trail.top);
    expect(g1.landedAt).toBeLessThan(20);
    // Gap 2 (z 16 → 13.8)
    const g2 = runJump(m, '-z', -16.4, false);
    expect(g2.hazard).toBe(false);
    expect(g2.landedY).toBeCloseTo(ORCH.trail.top);
    expect(g2.landedAt).toBeLessThan(13.8);
  });
});

describe('Crimson Dash test lane', () => {
  const laneWorld = () => {
    const w = new PhysicsWorld();
    const L = ORCH.lane;
    w.box((L.groundX0 + L.groundX1) / 2, L.z, L.groundX1 - L.groundX0, L.halfZ * 2, -1, 0);
    w.box((L.groundX1 + L.endX) / 2, L.z, L.endX - L.groundX1, L.halfZ * 2, -1.8, -0.8, { hazard: true, safe: false });
    for (const [x0, x1] of L.pads) w.cyl((x0 + x1) / 2, L.z, (x1 - x0) / 2 + 0.1, -1, 0.05);
    return w;
  };

  it('a plain running jump cannot cross the 5 m gap (the dash is needed)', () => {
    const m = new CharacterMotor(laneWorld());
    m.teleport(20, 0, ORCH.lane.z);
    const r = runJump(m, 'x', ORCH.lane.groundX1 - 0.3, false);
    expect(r.hazard).toBe(true);
  });

  it('jump + Crimson Dash lands safely on each pad', () => {
    const m = new CharacterMotor(laneWorld());
    m.dashAllowed = true;
    m.teleport(20, 0, ORCH.lane.z);
    const a = runJump(m, 'x', ORCH.lane.groundX1 - 0.4, true);
    expect(a.hazard).toBe(false);
    expect(a.landedAt).toBeGreaterThan(ORCH.lane.pads[0]![0]);
    expect(a.landedAt).toBeLessThan(ORCH.lane.pads[0]![1]);
    // let the explorer stop, then cross gap 2
    for (let i = 0; i < 30; i++) m.step(1 / 60, idle);
    m.teleport(ORCH.lane.pads[0]![0] + 1.5, 0.05, ORCH.lane.z);
    for (let i = 0; i < 10; i++) m.step(1 / 60, idle);
    const b = runJump(m, 'x', ORCH.lane.pads[0]![1] - 0.6, true);
    expect(b.hazard).toBe(false);
    expect(b.landedAt).toBeGreaterThan(ORCH.lane.pads[1]![0]);
    expect(b.landedAt).toBeLessThan(ORCH.lane.pads[1]![1]);
  });

  it('a grounded dash at the lane end stops at the edge instead of dropping into the pit', () => {
    const m = new CharacterMotor(laneWorld());
    m.dashAllowed = true;
    m.teleport(ORCH.lane.groundX1 - 2.5, 0, ORCH.lane.z);
    for (let i = 0; i < 10; i++) m.step(1 / 60, idle);
    m.step(1 / 60, { ...idle, moveX: 1, dashPressed: true });
    for (let i = 0; i < 40; i++) m.step(1 / 60, idle);
    expect(m.grounded).toBe(true);
    expect(m.pos.x).toBeLessThan(ORCH.lane.groundX1);
    expect(m.pos.y).toBeCloseTo(0);
  });
});

describe('Ruby Stage 3 berry platforms and the village terrace', () => {
  it('a raised berry platform can be reached with one jump (and the helper step makes it two small hops)', () => {
    const w = new PhysicsWorld();
    w.box(0, 0, 40, 40, -1, 0);
    w.cyl(0, -5, ORCH.platformRadius * 0.92, 0, ORCH.platformTop);
    const m = new CharacterMotor(w);
    m.teleport(0, 0, -1.5);
    const r = runJump(m, '-z', 2.6, false);
    expect(r.landedY).toBeCloseTo(ORCH.platformTop);
  });

  it('Hush Hollow: the 0.55 step and the 1.1 terrace are both jumpable', () => {
    const w = new PhysicsWorld();
    w.box(0, 0, 40, 40, -1, 0);
    w.box(6.55, -7.4, 1.7, 1.7, 0, 0.55);
    w.box(10.5, -8, 6, 5, 0, 1.1);
    const m = new CharacterMotor(w);
    m.teleport(3.5, 0, -7.4);
    const a = runJump(m, 'x', 5.3, false);
    expect(a.landedY).toBeGreaterThanOrEqual(0.55 - 0.01);
    m.teleport(6.55, 0.55, -7.4);
    for (let i = 0; i < 10; i++) m.step(1 / 60, idle);
    const b = runJump(m, 'x', 6.9, false);
    expect(b.landedY).toBeCloseTo(1.1);
  });
});
