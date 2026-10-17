/**
 * Ruby Orchard map (z decreases toward Ruby). Shared by the world builder, the stages and tests.
 *
 *   z  48 ── arrival arch (back to Hush Hollow)
 *   z  44…30  arrival plaza · stall · Berry Sticker 1 · jam-jar side path (Sticker 2)
 *   z  31…9   raised berry trail over a soft juice canal, two generous gaps
 *   z   9…-2  courtyard: push the giant berry onto the round picture
 *   z  -2…-7  ravine + drawbridge
 *   z  -7…-19 guide-star path
 *   z -19…-46 Ruby's clearing (three-stage rescue)  ·  east exit → dash lane (after Red)
 */
import * as THREE from 'three';
import { RUBY_MIRROR_LAYOUT } from '../../gameplay/mirrorPuzzle';

export const ORCH = {
  spawnPlaza: new THREE.Vector3(0, 0, 38),
  arrivalArchZ: 46.5,
  trail: { halfW: 1.8, top: 1.0, segments: [[28, 22], [20, 16], [13.8, 11.5]] as Array<[number, number]>, rampUp: [31.6, 28] as [number, number], rampDown: [11.5, 9] as [number, number] },
  pastGapsZ: 12.6,
  spawnPastGaps: new THREE.Vector3(0, 1.0, 12.6),
  courtyard: { minX: -5.6, maxX: 5.6, minZ: -2, maxZ: 9.6 },
  berryStart: new THREE.Vector3(-2.6, 0, 4.6),
  berryRadius: 1.1,
  switchPos: new THREE.Vector3(3.0, 0, 0.7),
  ravine: { z0: -7, z1: -2 },
  bridgeHalfW: 1.8,
  spawnAfterBridge: new THREE.Vector3(0, 0, -9),
  arenaCenter: new THREE.Vector3(0, 0, -32),
  arenaRadius: 13,
  arenaEnterZ: -20.5,
  spawnArena: new THREE.Vector3(0, 0, -21.5),
  rubyPos: new THREE.Vector3(0, 0, -46.8),
  gridCell: 3.2,
  beatSpots: [new THREE.Vector3(-3.4, 0, -41.2), new THREE.Vector3(0, 0, -41.8), new THREE.Vector3(3.4, 0, -41.2)],
  dancePlatforms: [new THREE.Vector3(-7.4, 0, -31), new THREE.Vector3(7.4, 0, -31), new THREE.Vector3(0, 0, -24.6)],
  platformTop: 1.25,
  platformRadius: 1.75,
  // Pads are wide (6 m) and the gaps (5 m) are longer than a jump (~3.9 m) but comfortable for
  // jump + Dash (~7–8 m), so the dash is needed and the landing is forgiving.
  lane: { z: -32, halfZ: 3.2, groundX0: 13.5, groundX1: 26, pads: [[31, 37], [43, 49]] as Array<[number, number]>, endX: 51 },
  spawnLane: new THREE.Vector3(15.5, 0, -32),
  stickers: {
    berrySticker1: new THREE.Vector3(-12.6, 1.1, 36.5),
    berrySticker2: new THREE.Vector3(-12.2, 3.7, 22.8),
    berrySticker3: new THREE.Vector3(47.2, 1.2, -32),
  },
} as const;

/** World position of a mirror-grid cell centre (Stage 2). */
export function cellPos(col: number, row: number, y = 0): THREE.Vector3 {
  const c = ORCH.arenaCenter;
  const L = RUBY_MIRROR_LAYOUT;
  return new THREE.Vector3(c.x + (col - (L.cols - 1) / 2) * ORCH.gridCell, y, c.z + (row - (L.rows - 1) / 2) * ORCH.gridCell);
}
