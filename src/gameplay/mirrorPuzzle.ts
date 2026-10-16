/**
 * Grid beam logic for mirror puzzles (Ruby Stage 2; reused by Sol's mirror stages later).
 * Kid-friendly rule: each mirror shows a big arrow, and ANY beam that touches a mirror leaves in the
 * arrow's direction. One Wonderbrush tap rotates a mirror 90° clockwise.
 * Pure and deterministic, so solvability can be proven by tests for every reachable state.
 */
import type { Orientation } from '../state/SaveData';

export interface Cell {
  col: number;
  row: number;
}

export interface MirrorLayout {
  cols: number;
  rows: number;
  emitter: Cell & { dir: Orientation };
  mirrors: Cell[];
  blockers: Cell[];
  target: Cell;
  solution: Orientation[];
}

export interface BeamTrace {
  /** Cell centres visited, starting at the emitter. */
  path: Cell[];
  /** Indices of mirrors the beam touched, in order. */
  mirrorsHit: number[];
  reachedTarget: boolean;
  /** Why the beam stopped. */
  end: 'target' | 'blocked' | 'edge' | 'loop' | 'emitter';
}

/** Direction vectors: 0 = north (row - 1), 1 = east (col + 1), 2 = south (row + 1), 3 = west (col - 1). */
export const DIR_VECTORS: readonly Cell[] = [
  { col: 0, row: -1 },
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
];

export const rotateCW = (o: Orientation): Orientation => (((o + 1) % 4) as Orientation);
export const tapsBetween = (from: Orientation, to: Orientation): number => (to - from + 4) % 4;

const same = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;

export function traceBeam(layout: MirrorLayout, orientations: readonly Orientation[]): BeamTrace {
  const path: Cell[] = [{ col: layout.emitter.col, row: layout.emitter.row }];
  const mirrorsHit: number[] = [];
  const visited = new Set<string>();
  let dir: Orientation = layout.emitter.dir;
  let cur: Cell = { col: layout.emitter.col, row: layout.emitter.row };
  for (let steps = 0; steps < layout.cols * layout.rows * 4 + 4; steps++) {
    const v = DIR_VECTORS[dir]!;
    cur = { col: cur.col + v.col, row: cur.row + v.row };
    if (cur.col < 0 || cur.row < 0 || cur.col >= layout.cols || cur.row >= layout.rows) {
      return { path, mirrorsHit, reachedTarget: false, end: 'edge' };
    }
    path.push(cur);
    if (same(cur, layout.target)) return { path, mirrorsHit, reachedTarget: true, end: 'target' };
    if (layout.blockers.some((b) => same(b, cur))) return { path, mirrorsHit, reachedTarget: false, end: 'blocked' };
    if (same(cur, layout.emitter)) return { path, mirrorsHit, reachedTarget: false, end: 'emitter' };
    const mi = layout.mirrors.findIndex((m) => same(m, cur));
    if (mi >= 0) {
      const key = `${mi}:${dir}`;
      if (visited.has(key)) return { path, mirrorsHit, reachedTarget: false, end: 'loop' };
      visited.add(key);
      mirrorsHit.push(mi);
      dir = orientations[mi]!;
    }
  }
  return { path, mirrorsHit, reachedTarget: false, end: 'loop' };
}

/**
 * Hint helper: the first mirror along the CURRENT beam whose arrow differs from the solution.
 * If the beam does not reach any wrong mirror, return the first wrong mirror in solution order.
 */
export function nextMirrorToFix(layout: MirrorLayout, orientations: readonly Orientation[]): number | null {
  const trace = traceBeam(layout, orientations);
  for (const mi of trace.mirrorsHit) if (orientations[mi] !== layout.solution[mi]) return mi;
  const wrong = layout.solution.findIndex((o, i) => orientations[i] !== o);
  return wrong >= 0 ? wrong : null;
}

/** The full solution route (for the "show beam route" hint). */
export function solutionPath(layout: MirrorLayout): Cell[] {
  return traceBeam(layout, layout.solution).path;
}

/** Ruby Orchard, Stage 2 layout (5 × 5 grid). A berry boulder blocks the direct shortcut. */
export const RUBY_MIRROR_LAYOUT: MirrorLayout = Object.freeze({
  cols: 5,
  rows: 5,
  emitter: { col: 0, row: 3, dir: 1 as Orientation },
  mirrors: [
    { col: 2, row: 3 },
    { col: 2, row: 1 },
    { col: 4, row: 1 },
  ],
  blockers: [{ col: 3, row: 3 }],
  target: { col: 4, row: 3 },
  solution: [0, 1, 2] as Orientation[],
}) as MirrorLayout;
