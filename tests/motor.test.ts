import { describe, expect, it } from 'vitest';
import { PhysicsWorld, pushOut, toLocal, toWorldDir } from '../src/systems/physics';
import { CharacterMotor, EXPLORER_TUNING, type MotorInput } from '../src/systems/CharacterMotor';

const idle: MotorInput = { moveX: 0, moveZ: 0, jumpPressed: false, jumpHeld: false, dashPressed: false };
const run = (m: CharacterMotor, seconds: number, input: Partial<MotorInput> = {}, fps = 60) => {
  const evs: string[] = [];
  for (let i = 0; i < Math.round(seconds * fps); i++) evs.push(...m.step(1 / fps, { ...idle, ...input }).map((e) => e.type));
  return evs;
};

function flatWorld(): PhysicsWorld {
  const w = new PhysicsWorld();
  w.box(0, 0, 60, 60, -1, 0);
  return w;
}

describe('physics helpers', () => {
  it('local/world yaw transforms are inverse', () => {
    const yaw = 0.7;
    const [lx, lz] = toLocal(3, -2, 1, 1, yaw);
    const [wx, wz] = toWorldDir(lx, lz, yaw);
    expect(wx + 1).toBeCloseTo(3);
    expect(wz + 1).toBeCloseTo(-2);
  });

  it('pushes a circle out of a box and a cylinder', () => {
    const [bx] = pushOut({ kind: 'box', cx: 0, cz: 0, hx: 1, hz: 1, yaw: 0, y0: 0, y1: 2 }, 1.2, 0, 0.4);
    expect(bx).toBeCloseTo(0.2);
    const [cx, cz] = pushOut({ kind: 'cyl', cx: 0, cz: 0, r: 1, y0: 0, y1: 2 }, 0, 1.2, 0.4);
    expect(cx).toBeCloseTo(0);
    expect(cz).toBeCloseTo(0.2);
  });
});

describe('character motor', () => {
  it('lands on the floor and stays grounded', () => {
    const m = new CharacterMotor(flatWorld());
    m.teleport(0, 2, 0);
    const evs = run(m, 1);
    expect(evs).toContain('land');
    expect(m.grounded).toBe(true);
    expect(m.pos.y).toBeCloseTo(0);
  });

  it('jumps to roughly the tuned height and comes back down', () => {
    const m = new CharacterMotor(flatWorld());
    m.teleport(0, 0, 0);
    run(m, 0.2);
    let peak = 0;
    m.step(1 / 60, { ...idle, jumpPressed: true, jumpHeld: true });
    for (let i = 0; i < 90; i++) {
      m.step(1 / 60, { ...idle, jumpHeld: true });
      peak = Math.max(peak, m.pos.y);
    }
    const expected = EXPLORER_TUNING.jumpVelocity ** 2 / (2 * EXPLORER_TUNING.gravity);
    expect(peak).toBeGreaterThan(expected * 0.85);
    expect(peak).toBeLessThan(expected * 1.1);
    expect(m.grounded).toBe(true);
  });

  it('walls stop the explorer (no walking through trees or houses)', () => {
    const w = flatWorld();
    w.box(0, 5, 10, 1, 0, 3); // wall across +Z
    w.cyl(-6, 0, 1, 0, 4); // tree trunk
    const m = new CharacterMotor(w);
    m.teleport(0, 0, 0);
    run(m, 3, { moveZ: 1 });
    expect(m.pos.z).toBeLessThan(5 - 0.5 + 0.01);
    m.teleport(-3, 0, 0);
    run(m, 3, { moveX: -1 });
    expect(m.pos.x).toBeGreaterThan(-6 + 1 + 0.37);
  });

  it('walks up small steps but must jump onto tall ledges', () => {
    const w = flatWorld();
    w.box(0, 5, 6, 5, 0, 0.3); // small step, z ∈ [2.5, 7.5]
    w.box(0, 14, 6, 13, 0, 1.0); // tall ledge right after it, z ∈ [7.5, 20.5]
    const m = new CharacterMotor(w);
    m.teleport(0, 0, 0);
    run(m, 1.2, { moveZ: 1 });
    expect(m.pos.y).toBeCloseTo(0.3);
    run(m, 2, { moveZ: 1 });
    expect(m.pos.y).toBeCloseTo(0.3); // blocked by the 1.0 ledge
    m.step(1 / 60, { ...idle, moveZ: 1, jumpPressed: true, jumpHeld: true });
    run(m, 1.5, { moveZ: 1, jumpHeld: true });
    expect(m.pos.y).toBeCloseTo(1.0);
  });

  it('walks up ramps', () => {
    const w = flatWorld();
    w.ramp(0, 6, 6, 3, 0, 1.5, -Math.PI / 2); // local +X points to world +Z
    const m = new CharacterMotor(w);
    m.teleport(0, 0, 2);
    run(m, 1.2, { moveZ: 1 });
    expect(m.pos.y).toBeGreaterThan(0.5);
  });

  it('falling into a gap respawns at the last safe ground (no death)', () => {
    const w = new PhysicsWorld();
    w.box(0, 0, 6, 6, -1, 0);
    const m = new CharacterMotor(w);
    m.teleport(0, 0, 0);
    run(m, 0.5);
    const evs = run(m, 3, { moveZ: 1 });
    expect(evs).toContain('fell');
    m.respawn();
    run(m, 0.5);
    expect(m.grounded).toBe(true);
    expect(Math.abs(m.pos.z)).toBeLessThan(3);
  });

  it('hazard floors report a gentle respawn event', () => {
    const w = flatWorld();
    w.box(0, 8, 4, 4, -2, -0.8, { hazard: true });
    w.box(0, 8, 4, 4, -0.8, 0, { enabled: false }); // a hole in the floor is represented by the hazard below
    const m = new CharacterMotor(w);
    m.teleport(0, 1, 8);
    // floor box covers the whole area, so disable it locally by moving over the hazard-only region
    w.colliders[0]!.enabled = false;
    const evs = run(m, 1);
    expect(evs).toContain('hazard');
  });

  it('dash is unavailable until allowed, then moves a short distance with a cooldown', () => {
    const m = new CharacterMotor(flatWorld());
    m.teleport(0, 0, 0);
    run(m, 0.2);
    run(m, 0.05, { moveZ: 1, dashPressed: true });
    expect(m.dashActive).toBe(false);
    m.dashAllowed = true;
    const z0 = m.pos.z;
    const evs = run(m, 0.5, { moveZ: 0.01, dashPressed: false });
    m.step(1 / 60, { ...idle, moveZ: 1, dashPressed: true });
    evs.push(...run(m, 0.45, { moveZ: 0 }));
    expect(m.pos.z - z0).toBeGreaterThan(3.5);
    expect(m.dashCooldownLeft).toBeGreaterThan(0);
    // pressing again during cooldown does nothing
    m.step(1 / 60, { ...idle, moveZ: 1, dashPressed: true });
    expect(m.dashActive).toBe(false);
  });

  it('a grounded dash stops at a ledge instead of going over it', () => {
    const w = new PhysicsWorld();
    w.box(0, 0, 4, 8, -1, 0); // platform spans z ∈ [-4, 4]
    const m = new CharacterMotor(w);
    m.dashAllowed = true;
    m.teleport(0, 0, 2.5);
    run(m, 0.3);
    const evs: string[] = [];
    evs.push(...m.step(1 / 60, { ...idle, moveZ: 1, dashPressed: true }).map((e) => e.type));
    evs.push(...run(m, 0.4));
    expect(evs).toContain('dashEnd');
    expect(m.pos.z).toBeLessThan(4);
    expect(m.grounded).toBe(true);
  });

  it('a dash stops at walls', () => {
    const w = flatWorld();
    w.box(0, 3, 10, 1, 0, 3);
    const m = new CharacterMotor(w);
    m.dashAllowed = true;
    m.teleport(0, 0, 0);
    run(m, 0.2);
    m.step(1 / 60, { ...idle, moveZ: 1, dashPressed: true });
    run(m, 0.5);
    expect(m.pos.z).toBeLessThan(2.5);
  });

  it('rides moving platforms', () => {
    const w = flatWorld();
    const plat = w.box(0, 0, 3, 3, 0, 0.5);
    const m = new CharacterMotor(w);
    m.teleport(0, 0.5, 0);
    run(m, 0.2);
    for (let i = 0; i < 60; i++) {
      plat.shape.kind === 'box' && (plat.shape.cx += 0.02);
      plat.delta.x = 0.02;
      m.step(1 / 60, idle);
    }
    expect(m.pos.x).toBeGreaterThan(1.0);
  });
});
