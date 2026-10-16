import { describe, expect, it } from 'vitest';
import { COLOR_INFO, MIX_RULES, mixResult, PRIMARY_COLORS } from '../src/data/colors';
import { nextMirrorToFix, rotateCW, RUBY_MIRROR_LAYOUT as L, solutionPath, traceBeam } from '../src/gameplay/mirrorPuzzle';
import type { Orientation } from '../src/state/SaveData';
import { RUBY_MIRRORS_INITIAL } from '../src/state/SaveData';
import { BerryParade, DEFAULT_PARADE_TUNING, isInsideCircle, planWave } from '../src/chapters/ruby/berryParadeLogic';
import { DANCE_TUNING, DragonDance } from '../src/chapters/ruby/dragonDanceLogic';

const ALL_STATES: Orientation[][] = [];
for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) ALL_STATES.push([a, b, c] as Orientation[]);

describe('color data (from color_system.json)', () => {
  it('has the six art-direction hex keys', () => {
    expect(COLOR_INFO.red.hex).toBe('#EF4444');
    expect(COLOR_INFO.blue.hex).toBe('#3B82F6');
    expect(COLOR_INFO.yellow.hex).toBe('#FACC15');
    expect(COLOR_INFO.purple.hex).toBe('#A855F7');
    expect(COLOR_INFO.orange.hex).toBe('#F97316');
    expect(COLOR_INFO.green.hex).toBe('#22C55E');
  });
  it('every color has a distinct shape symbol (never hue alone)', () => {
    const symbols = Object.values(COLOR_INFO).map((c) => c.symbol);
    expect(new Set(symbols).size).toBe(6);
  });
  it('mixing table matches the combination board, order-independent', () => {
    expect(MIX_RULES).toHaveLength(3);
    expect(mixResult('red', 'blue')).toBe('purple');
    expect(mixResult('blue', 'red')).toBe('purple');
    expect(mixResult('yellow', 'red')).toBe('orange');
    expect(mixResult('yellow', 'blue')).toBe('green');
    for (const p of PRIMARY_COLORS) expect(mixResult(p, p)).toBeNull();
  });
});

describe('Ruby Stage 2 mirror puzzle', () => {
  it('the initial orientation is unsolved', () => {
    expect(traceBeam(L, RUBY_MIRRORS_INITIAL).reachedTarget).toBe(false);
  });

  it('the solution reaches the target', () => {
    const t = traceBeam(L, L.solution);
    expect(t.reachedTarget).toBe(true);
    expect(t.mirrorsHit).toEqual([0, 1, 2]);
    expect(solutionPath(L).at(-1)).toEqual(L.target);
  });

  it('only the intended solution reaches the target (no shortcut past the boulder)', () => {
    const solved = ALL_STATES.filter((s) => traceBeam(L, s).reachedTarget);
    expect(solved).toEqual([L.solution]);
  });

  it('every one of the 64 states can be solved by tapping (always solvable), never needing more than 9 taps', () => {
    for (const start of ALL_STATES) {
      const s = [...start] as Orientation[];
      let taps = 0;
      // Follow the in-game hint logic; each hint step taps the suggested mirror once.
      while (!traceBeam(L, s).reachedTarget) {
        const mi = nextMirrorToFix(L, s);
        expect(mi).not.toBeNull();
        s[mi!] = rotateCW(s[mi!]!);
        taps++;
        expect(taps).toBeLessThanOrEqual(9);
      }
    }
  });

  it('beam simulation always terminates (loops detected)', () => {
    for (const s of ALL_STATES) {
      const t = traceBeam(L, s);
      expect(['target', 'blocked', 'edge', 'loop', 'emitter']).toContain(t.end);
    }
  });
});

describe('Ruby Stage 1 berry parade', () => {
  const T = { ...DEFAULT_PARADE_TUNING };

  it('waves are deterministic for a seed', () => {
    expect(planWave(5, 2, { x: 1, z: 2 }, T, false)).toEqual(planWave(5, 2, { x: 1, z: 2 }, T, false));
  });

  it('three telegraphed landings, inside the arena, spread apart, first one where the player stands', () => {
    for (let w = 1; w < 30; w++) {
      const player = { x: Math.sin(w) * 6, z: Math.cos(w) * 6 };
      const spots = planWave(11, w, player, T, false);
      expect(spots).toHaveLength(3);
      expect(isInsideCircle(spots[0]!, player, T.circleRadius)).toBe(true);
      for (const s of spots) {
        expect(Math.hypot(s.x - T.center.x, s.z - T.center.z)).toBeLessThanOrEqual(T.arenaRadius);
        expect(s.landAt - s.showAt).toBeCloseTo(T.telegraph);
      }
    }
  });

  const run = (p: BerryParade, seconds: number, playerAt: (t: number) => { x: number; z: number }) => {
    const events: string[] = [];
    let t = 0;
    events.push(...p.start(playerAt(0)).map((e) => e.type));
    while (t < seconds && p.phase !== 'revealed') {
      t += 1 / 30;
      events.push(...p.update(1 / 30, playerAt(t)).map((e) => e.type));
    }
    return events;
  };

  it('standing still gets gently bounced; after 3 misses the sequence slows; after 6 the crystal is revealed anyway', () => {
    const p = new BerryParade(3, T);
    const events = run(p, 200, () => ({ x: 0, z: 0 }));
    expect(events).toContain('slowModeOn');
    expect(p.slow).toBe(true);
    expect(p.misses).toBe(T.missesBeforeReveal);
    expect(p.phase).toBe('revealed');
    expect(events.indexOf('slowModeOn')).toBeLessThan(events.lastIndexOf('reveal'));
  });

  it('a player who steps out of every circle clears the wave and reveals the crystal', () => {
    const p = new BerryParade(9, T);
    const events = p.start({ x: 0, z: 0 }).map((e) => e.type);
    let t = 0;
    while (p.phase === 'wave' && t < 20) {
      t += 1 / 30;
      // Always stand at the point farthest from every visible circle (a perfect dodger).
      const spots = p.currentSpots;
      let best = { x: 0, z: 0 };
      let bestD = -1;
      for (let a = 0; a < 64; a++) {
        const c = { x: Math.cos((a / 64) * Math.PI * 2) * 9, z: Math.sin((a / 64) * Math.PI * 2) * 9 };
        const d = Math.min(...spots.map((s) => Math.hypot(s.x - c.x, s.z - c.z)));
        if (d > bestD) {
          bestD = d;
          best = c;
        }
      }
      events.push(...p.update(1 / 30, best).map((e) => e.type));
    }
    expect(events).toContain('waveCleared');
    expect(p.phase).toBe('revealed');
    expect(p.misses).toBe(0);
  });
});

describe('Ruby Stage 3 dragon dance', () => {
  it('runs chant/stomp 1-2-3 then lifts the gem, and restarts the cycle if the gem is missed', () => {
    const d = new DragonDance(DANCE_TUNING);
    const ev: string[] = d.start().map((e) => (e.type === 'chant' || e.type === 'stomp' ? `${e.type}${e.beat}` : e.type));
    for (let i = 0; i < 30 * 40; i++) {
      for (const e of d.update(1 / 30, false)) ev.push(e.type === 'chant' || e.type === 'stomp' ? `${e.type}${e.beat}` : e.type);
      if (d.cycle >= 2) break;
    }
    expect(ev.slice(0, 9)).toEqual(['cycleStart', 'chant1', 'stomp1', 'chant2', 'stomp2', 'chant3', 'stomp3', 'gemUp', 'gemDown']);
    expect(ev).toContain('cycleStart');
    expect(d.cycle).toBe(2);
  });

  it('sweep-painting pauses the gem window so a child never loses a nearly painted gem', () => {
    const d = new DragonDance(DANCE_TUNING);
    d.start();
    let guard = 0;
    while (!d.gemVisible && guard++ < 1000) d.update(1 / 30, false);
    const before = d.gemRemaining;
    for (let i = 0; i < 30 * 30; i++) d.update(1 / 30, true);
    expect(d.gemVisible).toBe(true);
    expect(d.gemRemaining).toBeCloseTo(before);
  });
});
