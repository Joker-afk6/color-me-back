/**
 * Builds the Ruby Orchard environment: giant gray berry bushes, curved fruit trees, poppies,
 * striped awnings, suspended jam-jar platforms, the raised berry trail over a soft juice canal,
 * the courtyard + drawbridge, Ruby's clearing, berry vines radiating from Ruby, and the dash lane.
 * Returns the handles the chapter logic animates (poppies, berries, vines, bridge, jars...).
 */
import * as THREE from 'three';
import type { Level } from '../../core/Level';
import type { Collider } from '../../systems/physics';
import { UNIT, mesh, RoundedBoxGeometry, taperedTube, starGeometry } from '../../rendering/shapes';
import { iconTexture, paintNoiseTexture, labelTexture } from '../../rendering/textures';
import { batchStatic } from '../../rendering/batch';
import { createSky } from '../../rendering/Sky';
import { Rng } from '../../utils/rng';
import { PAL, awningStall, berry, berryArch, berryBush, cloud, grassTufts, hill, jamJar, mushroom, place, poppy, rock, roundTree, type Arch, type Poppy } from '../../environments/props';
import { ORCH } from './layout';

export interface JamJarPlatform {
  group: THREE.Group;
  collider: Collider;
  base: THREE.Vector3;
  phase: number;
  top: number;
}

export interface OrchardWorld {
  poppies: Poppy[];
  ripenBerries: THREE.Object3D[];
  vines: THREE.Mesh[];
  bridge: THREE.Group;
  bridgeCollider: Collider;
  switchPlate: THREE.Group;
  guideStars: THREE.MeshStandardMaterial[];
  guideStarPositions: THREE.Vector3[];
  jars: JamJarPlatform[];
  arrivalArch: Arch;
  eastGate: THREE.Group;
  eastGateCollider: Collider;
  laneMarkers: THREE.Mesh[];
  vineBridges: Array<{ mesh: THREE.Group; collider: Collider }>;
}

export function buildOrchard(level: Level): OrchardWorld {
  const L = level.lib;
  const P = level.physics;
  const root = level.root;
  const decor = new THREE.Group();
  const rng = new Rng(2024);

  // ── Sky, hills, clouds (peach orchard sky warms up when Red returns)
  const sky = createSky({ zenith: '#f4b6a6', horizon: '#ffe3d6', ground: '#e8d6cf' }, 'red');
  root.add(sky);
  level.track(sky.material as THREE.Material);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    place(root, hill(L, 22 + (i % 3) * 8, 9 + (i % 4) * 3, i % 2 ? PAL.grassDark : PAL.grass), 10 + Math.cos(a) * 80, -0.5, -5 + Math.sin(a) * 85);
  }
  for (let i = 0; i < 9; i++) place(root, cloud(L, 60 + i, 4 + (i % 3)), Math.cos(i * 0.8) * 70, 24 + (i % 3) * 6, Math.sin(i * 0.8) * 70 - 5);

  const groundMat = L.paint(PAL.grass, 'green', { roughness: 0.96, map: paintNoiseTexture(41, 10, 0.16) });
  /** Walkable ground is a collider; the visible ground is one big sheet with real holes (pits). */
  const groundPiece = (x0: number, x1: number, z0: number, z1: number, y = 0) => {
    P.box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, y - 1.5, y);
  };
  const pits: Array<[number, number, number, number, number]> = [];
  const hedgeMat = L.paint(PAL.leafDark, 'green', { roughness: 0.9, rim: 0.12 });
  const hedge = (x0: number, x1: number, z0: number, z1: number, h = 2.2) => {
    const w = x1 - x0;
    const d = z1 - z0;
    const m = mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(0.5, w / 2.2, d / 2.2)), hedgeMat);
    m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    decor.add(m);
    P.box((x0 + x1) / 2, (z0 + z1) / 2, w, d, 0, h, { walkable: false });
    // Leafy bumps along the top so hedges read as plants, not walls.
    const long = Math.max(w, d);
    const n = Math.max(2, Math.round(long / 2.0));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const bump = mesh(UNIT.sphereTiny, hedgeMat, { cast: false });
      const r = Math.min(w, d) * 0.62 + rng.range(-0.08, 0.12);
      bump.scale.set(w > d ? long / n * 0.75 : r, r * 0.7, w > d ? r : long / n * 0.75);
      bump.position.set(w > d ? x0 + w * t : (x0 + x1) / 2, h - 0.05, w > d ? (z0 + z1) / 2 : z0 + d * t);
      decor.add(bump);
    }
    // A few berries tucked into the hedge
    for (let i = 0; i < Math.max(1, Math.round((w + d) / 4)); i++) {
      const b = mesh(UNIT.sphereTiny, L.paint(PAL.berry, 'red', { roughness: 0.4, rim: 0.3 }), { cast: false });
      b.scale.setScalar(0.22);
      const along = rng.next();
      b.position.set(x0 + w * (w > d ? along : rng.next() < 0.5 ? 0 : 1), h * rng.range(0.4, 0.9), z0 + d * (d >= w ? along : rng.next() < 0.5 ? 0 : 1));
      decor.add(b);
    }
  };
  const juiceMat = L.paint('#D9465A', 'red', { roughness: 0.25, metalness: 0.05, emissive: '#5a1020', emissiveIntensity: 0.1 });
  const pitWallMat = L.paint('#B9A28C', 'orange', { roughness: 0.95 });
  /** A soft berry-juice pit: visible hole in the ground, juice surface, gentle-respawn collider. */
  const juice = (x0: number, x1: number, z0: number, z1: number, top: number) => {
    pits.push([x0, x1, z0, z1, top]);
    const j = mesh(UNIT.box, juiceMat, { cast: false });
    j.scale.set(x1 - x0, 0.2, z1 - z0);
    j.position.set((x0 + x1) / 2, top - 0.1, (z0 + z1) / 2);
    decor.add(j);
    P.box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, top - 1, top, { hazard: true, safe: false });
    const depth = -top;
    for (const [cx, cz, w, d] of [[(x0 + x1) / 2, z0, x1 - x0, 0.2], [(x0 + x1) / 2, z1, x1 - x0, 0.2], [x0, (z0 + z1) / 2, 0.2, z1 - z0], [x1, (z0 + z1) / 2, 0.2, z1 - z0]] as const) {
      const wall = mesh(UNIT.box, pitWallMat, { cast: false });
      wall.scale.set(w, depth, d);
      wall.position.set(cx, top / 2, cz);
      decor.add(wall);
    }
  };

  // ── 1. Arrival plaza (+ west nook with the jam jars)
  groundPiece(-17, 17, 30, 50);
  groundPiece(-17, -4.9, 16, 30);
  hedge(-18, -17, 16, 50);
  hedge(17, 18, 30, 50);
  hedge(-17, -4.9, 15, 16);
  hedge(4.9, 17, 29, 30.2);
  hedge(-17, 17, 50, 51);
  const arch = berryArch(L, null);
  place(root, arch.group, 0, 0, ORCH.arrivalArchZ, Math.PI);
  arch.setBright(1);
  for (const s of [-1, 1]) P.box(s * 2.2, ORCH.arrivalArchZ, 0.95, 0.95, 0, 4.4);
  const { texture: signTex, aspect } = labelTexture('HUSH HOLLOW', { color: '#fff7e6' });
  level.track(signTex);
  const sign = mesh(new RoundedBoxGeometry(aspect * 0.5, 0.6, 0.12, 2, 0.05), L.paint(PAL.wood, 'orange'));
  sign.position.set(0, 2.8, ORCH.arrivalArchZ - 0.6);
  decor.add(sign);
  const signFace = mesh(UNIT.plane, L.basic('#ffffff', { map: signTex, transparent: true }), { cast: false, receive: false });
  signFace.scale.set(aspect * 0.46, 0.46, 1);
  signFace.position.set(0, 2.8, ORCH.arrivalArchZ - 0.68);
  signFace.rotation.y = Math.PI;
  decor.add(signFace);
  place(decor, awningStall(L), 9, 0, 38, -0.6);
  P.box(9, 38, 3, 1.8, 0, 2.6, {}, -0.6);
  for (const [x, z, s] of [[-10.5, 36, 1.9], [-7, 42, 1.5], [12.5, 44, 1.7], [13, 33, 1.4], [-13.5, 44.5, 1.6], [6, 45, 1.2]] as const) {
    place(decor, berryBush(L, Math.round(x * 7 + z), s, 7), x, 0, z);
    P.cyl(x, z, s * 1.05, 0, s * 1.6);
  }
  for (let i = 0; i < 8; i++) {
    const x = rng.range(-14, 14);
    const z = rng.range(32, 47);
    if (Math.abs(x) < 3) continue;
    place(decor, mushroom(L, 70 + i, rng.range(0.4, 0.8)), x, 0, z);
  }

  // Jam jars hanging from a giant curved branch (gently swaying platforms)
  const jars: JamJarPlatform[] = [];
  const branchCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-16.5, 0, 25), new THREE.Vector3(-15.8, 5.5, 24.5), new THREE.Vector3(-12, 7.6, 23.5), new THREE.Vector3(-7.5, 7.2, 26)]);
  decor.add(mesh(taperedTube(branchCurve, 0.75, 0.25, 30, 10), L.paint(PAL.trunk, 'orange', { roughness: 0.9 })));
  const jarSpots: Array<[number, number, number]> = [[-7.6, 26.2, 0.9], [-9.9, 24.6, 1.8], [-12.2, 22.8, 2.7]];
  jarSpots.forEach(([x, z, top], i) => {
    const g = new THREE.Group();
    const jar = jamJar(L, 1.05, 1.15);
    jar.position.y = top - 1.25;
    g.add(jar);
    const rope = mesh(new THREE.CylinderGeometry(0.035, 0.035, 7.4 - top, 6), L.paint('#CDB892', 'orange'), { cast: false });
    rope.position.y = top + (7.4 - top) / 2 - 0.1;
    g.add(rope);
    g.position.set(x, 0, z);
    root.add(g);
    const c = P.cyl(x, z, 1.05, top - 1.25, top, { safe: false });
    jars.push({ group: g, collider: c, base: new THREE.Vector3(x, 0, z), phase: i * 1.7, top });
  });

  // ── 2. Raised berry trail over the soft juice canal
  juice(-4.9, 4.9, 9.6, 30, -0.7);
  hedge(-6.2, -4.9, 9.6, 30, 2.6);
  hedge(4.9, 6.2, 9.6, 29, 2.6);
  const trailMat = L.paint('#E9DDCF', 'neutral', { roughness: 0.92, map: paintNoiseTexture(43, 2, 0.16) });
  const trailSide = L.paint('#C9B9A6', 'neutral', { roughness: 0.95 });
  const tw = ORCH.trail.halfW * 2;
  for (const [z0, z1] of ORCH.trail.segments) {
    const len = z0 - z1;
    const top = mesh(new RoundedBoxGeometry(tw, 0.3, len, 2, 0.1), trailMat);
    top.position.set(0, ORCH.trail.top - 0.15, (z0 + z1) / 2);
    decor.add(top);
    const pillar = mesh(new RoundedBoxGeometry(tw * 0.85, 1.7, len * 0.9, 2, 0.2), trailSide);
    pillar.position.set(0, ORCH.trail.top - 1.1, (z0 + z1) / 2);
    decor.add(pillar);
    P.box(0, (z0 + z1) / 2, tw, len, -1, ORCH.trail.top);
    // stepping-stone dots on the trail (visible safe platforms)
    for (let z = z1 + 0.6; z < z0; z += 1.4) {
      const dot = mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 12), L.paint('#FFFFFF', 'neutral', { roughness: 0.7 }), { cast: false });
      dot.position.set(0, ORCH.trail.top + 0.02, z);
      decor.add(dot);
    }
  }
  // Ramps
  const [ru0, ru1] = ORCH.trail.rampUp;
  const rampUp = mesh(new RoundedBoxGeometry(tw, 0.3, Math.hypot(ru0 - ru1, 1), 2, 0.1), trailMat);
  rampUp.position.set(0, 0.45, (ru0 + ru1) / 2);
  rampUp.rotation.x = Math.atan2(1, ru0 - ru1);
  decor.add(rampUp);
  P.ramp(0, (ru0 + ru1) / 2, ru0 - ru1, tw, 0, ORCH.trail.top, Math.PI / 2);
  const [rd0, rd1] = ORCH.trail.rampDown;
  const rampDown = mesh(new RoundedBoxGeometry(tw, 0.3, Math.hypot(rd0 - rd1, 1), 2, 0.1), trailMat);
  rampDown.position.set(0, 0.45, (rd0 + rd1) / 2);
  rampDown.rotation.x = -Math.atan2(1, rd0 - rd1);
  decor.add(rampDown);
  P.ramp(0, (rd0 + rd1) / 2, rd0 - rd1, tw, 0, ORCH.trail.top, -Math.PI / 2);
  // Trail-side berry lanterns
  for (const z of [26, 18, 12.5]) {
    for (const s of [-1, 1]) {
      const b = berry(L, 0.42);
      b.position.set(s * 2.5, 1.6, z);
      decor.add(b);
    }
  }

  // ── 3. Courtyard + switch + ravine + drawbridge
  const cy = ORCH.courtyard;
  groundPiece(cy.minX, cy.maxX, cy.minZ, cy.maxZ);
  hedge(cy.minX - 1.3, cy.minX, ORCH.ravine.z0, cy.maxZ + 0.6, 2.2);
  hedge(cy.maxX, cy.maxX + 1.3, ORCH.ravine.z0, cy.maxZ + 0.6, 2.2);
  hedge(cy.minX, -ORCH.trail.halfW - 0.4, cy.maxZ, cy.maxZ + 0.8, 1.6);
  hedge(ORCH.trail.halfW + 0.4, cy.maxX, cy.maxZ, cy.maxZ + 0.8, 1.6);
  const switchPlate = new THREE.Group();
  const plate = mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.16, 32), L.paint(PAL.stone, 'neutral', { roughness: 0.8 }));
  plate.position.y = 0.08;
  switchPlate.add(plate);
  const picMat = L.track(new THREE.MeshBasicMaterial({ map: iconTexture('berry'), color: '#5d6676', transparent: true, depthWrite: false }));
  const pic = mesh(UNIT.plane, picMat, { cast: false, receive: false });
  pic.rotation.x = -Math.PI / 2;
  pic.scale.setScalar(2.2);
  pic.position.y = 0.17;
  switchPlate.add(pic);
  switchPlate.position.copy(ORCH.switchPos);
  root.add(switchPlate);
  juice(-ORCH.courtyard.maxX - 1.3, ORCH.courtyard.maxX + 1.3, ORCH.ravine.z0, ORCH.ravine.z1, -1.3);
  const bridge = new THREE.Group();
  const bridgeLen = ORCH.ravine.z1 - ORCH.ravine.z0 + 0.4;
  const deck = mesh(new RoundedBoxGeometry(ORCH.bridgeHalfW * 2, 0.22, bridgeLen, 2, 0.06), L.paint(PAL.wood, 'orange', { roughness: 0.85 }));
  deck.position.set(0, -0.11, -bridgeLen / 2);
  bridge.add(deck);
  for (let i = 0; i < 6; i++) {
    const plank = mesh(UNIT.box, L.paint(PAL.woodDark, 'orange'), { cast: false });
    plank.scale.set(ORCH.bridgeHalfW * 2, 0.05, 0.08);
    plank.position.set(0, 0.01, -0.3 - i * (bridgeLen / 6));
    bridge.add(plank);
  }
  for (const s of [-1, 1]) {
    const rail = mesh(new THREE.CylinderGeometry(0.05, 0.05, bridgeLen, 6), L.paint('#CDB892', 'orange'), { cast: false });
    rail.rotation.x = Math.PI / 2;
    rail.position.set(s * ORCH.bridgeHalfW, 0.7, -bridgeLen / 2);
    bridge.add(rail);
  }
  bridge.position.set(0, 0, ORCH.ravine.z1 + 0.2);
  bridge.rotation.x = Math.PI / 2 - 0.05; // raised (points up)
  root.add(bridge);
  const bridgeCollider = P.box(0, (ORCH.ravine.z0 + ORCH.ravine.z1) / 2, ORCH.bridgeHalfW * 2, bridgeLen, -0.4, 0, { enabled: false });
  for (const s of [-1, 1]) {
    const post = mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.6, 10), L.paint(PAL.wood, 'orange'));
    post.position.set(s * (ORCH.bridgeHalfW + 0.3), 0.8, ORCH.ravine.z1 + 0.3);
    decor.add(post);
    P.cyl(s * (ORCH.bridgeHalfW + 0.3), ORCH.ravine.z1 + 0.3, 0.2, 0, 1.6);
  }

  // ── 4. Guide-star path to the clearing
  groundPiece(-7.6, 7.6, -20, ORCH.ravine.z0);
  hedge(-8.9, -7.6, -19, ORCH.ravine.z0, 2.2);
  hedge(7.6, 8.9, -19, ORCH.ravine.z0, 2.2);
  const guideStars: THREE.MeshStandardMaterial[] = [];
  const guideStarPositions: THREE.Vector3[] = [];
  const starGeo = starGeometry(0.3, 0.13, 0.08);
  for (let i = 0; i < 7; i++) {
    const m = L.unique('#FFFFFF', 'neutral', { emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.4 });
    const s = mesh(starGeo, m, { cast: false });
    s.rotation.x = -Math.PI / 2;
    const p = new THREE.Vector3(Math.sin(i * 0.9) * 1.4, 0.06, -8.2 - i * 1.7);
    s.position.copy(p);
    root.add(s);
    guideStars.push(m);
    guideStarPositions.push(p);
  }
  const poppies: Poppy[] = [];
  const addPoppy = (x: number, z: number, s = 1) => {
    const pp = poppy(L, Math.round(x * 31 + z * 17), s);
    pp.group.position.set(x, 0, z);
    root.add(pp.group);
    poppies.push(pp);
  };
  for (let i = 0; i < 16; i++) addPoppy((rng.next() < 0.5 ? -1 : 1) * rng.range(3, 7), rng.range(-19, -8), rng.range(1.0, 1.6));
  for (let i = 0; i < 12; i++) addPoppy(rng.range(-15, 15), rng.range(32, 48), rng.range(1.0, 1.5));

  // ── 5. Ruby's clearing
  const C = ORCH.arenaCenter;
  groundPiece(-17, 17, -50, -20);
  const clearing = mesh(new THREE.CircleGeometry(ORCH.arenaRadius + 0.5, 64), L.paint('#A8CF8B', 'green', { roughness: 0.95, map: paintNoiseTexture(44, 6, 0.12) }), { cast: false });
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.set(C.x, 0.015, C.z);
  decor.add(clearing);
  // Bush ring with a south entrance and an east exit (the dash lane, opened by Red).
  const ringR = ORCH.arenaRadius + 1.6;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2; // a = 0 → +z (south)
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.55) continue; // south entrance
    if (Math.abs(a - Math.PI / 2) < 0.1) continue; // east exit (gate)
    if (Math.abs(a - Math.PI) < 0.5) continue; // Ruby sits here, in full view
    const x = C.x + Math.sin(a) * ringR;
    const z = C.z + Math.cos(a) * ringR;
    const s = rng.range(1.6, 2.1);
    place(decor, berryBush(L, 500 + i, s, 4), x, 0, z);
    P.cyl(x, z, 1.75, 0, 3);
  }
  hedge(-17, 17, -51, -50, 3);
  hedge(-18, -17, -51, -20, 3);
  hedge(17, 18, -51, -36.3, 3);
  hedge(17, 18, -27.7, -20, 3);
  hedge(-17, -8.9, -20.6, -19.4, 2.2);
  hedge(8.9, 17, -20.6, -19.4, 2.2);
  // Ruby's mound
  const mound = mesh(new THREE.SphereGeometry(5.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), L.paint(PAL.grassDark, 'green', { roughness: 0.95 }));
  mound.scale.y = 0.18;
  mound.position.copy(ORCH.rubyPos);
  decor.add(mound);
  P.cyl(ORCH.rubyPos.x, ORCH.rubyPos.z, 3.6, 0, 7, { walkable: false, blocksCamera: false });
  // Berry vines radiating from Ruby through the orchard (Scene 1.3 "network of berry vines")
  const vines: THREE.Mesh[] = [];
  const vineMat = L.paint('#C2334A', 'red', { roughness: 0.6, rim: 0.2 });
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.2 + (i / 8) * 0.6) + (i % 2 ? 0.05 : -0.05);
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 6; k++) {
      const r = 3.5 + k * 3.2;
      pts.push(new THREE.Vector3(ORCH.rubyPos.x - Math.cos(a) * r + Math.sin(k * 1.3 + i) * 0.6, 0.06, ORCH.rubyPos.z + Math.sin(a) * r));
    }
    const v = mesh(taperedTube(new THREE.CatmullRomCurve3(pts), 0.16, 0.06, 40, 6), vineMat, { cast: false });
    root.add(v);
    vines.push(v);
    for (let k = 1; k < 6; k++) {
      const b = berry(L, 0.24);
      b.position.copy(pts[k]!).setY(0.24);
      decor.add(b);
    }
  }
  // Orchard trees with fruit around the clearing and along the path
  const ripenBerries: THREE.Object3D[] = [];
  const treeSpots: Array<[number, number]> = [[-12, -10], [12, -12], [-13, -16], [13.5, -17], [-14.5, 26], [10, 22], [12, 14], [-9, 8], [10, 4], [-12, -40], [12, -44]];
  treeSpots.forEach(([x, z], i) => {
    // Trees are static (batched); their fruit "ripens" through the red color wave itself.
    const t = roundTree(L, 900 + i, { fruit: { color: PAL.berry, key: 'red', count: 9, size: 0.24 } });
    place(decor, t, x, 0, z, i * 0.7);
    P.cyl(x, z, 0.4, 0, 4, { blocksCamera: false });
  });
  // Big lantern berries hanging near the clearing
  for (const [x, z] of [[-9.5, -22.5], [9.5, -22.5], [-14, -33], [14, -36]] as const) {
    const b = berry(L, 0.8);
    b.position.set(x, 0.8, z);
    root.add(b);
    ripenBerries.push(b);
    P.cyl(x, z, 0.8, 0, 1.6);
  }

  // ── 6. Dash lane (east of the clearing, opened by Red)
  const lane = ORCH.lane;
  groundPiece(lane.groundX0, lane.groundX1, lane.z - lane.halfZ, lane.z + lane.halfZ);
  juice(lane.groundX1, lane.endX, lane.z - lane.halfZ, lane.z + lane.halfZ, -0.8);
  hedge(lane.groundX0 + 1, lane.endX + 1, lane.z - lane.halfZ - 1.2, lane.z - lane.halfZ, 2.4);
  hedge(lane.groundX0 + 1, lane.endX + 1, lane.z + lane.halfZ, lane.z + lane.halfZ + 1.2, 2.4);
  hedge(lane.endX, lane.endX + 1, lane.z - lane.halfZ, lane.z + lane.halfZ, 2.4);
  const padMat = L.paint(PAL.berry, 'red', { roughness: 0.45, rim: 0.25 });
  for (const [x0, x1] of lane.pads) {
    const pad = mesh(new THREE.CylinderGeometry((x1 - x0) / 2 + 0.2, (x1 - x0) / 2, 1.0, 28), padMat);
    pad.position.set((x0 + x1) / 2, -0.5, lane.z);
    decor.add(pad);
    const cap = mesh(new THREE.CylinderGeometry((x1 - x0) / 2 + 0.1, (x1 - x0) / 2 + 0.2, 0.1, 28), L.paint('#FFF3E6', 'neutral'));
    cap.position.set((x0 + x1) / 2, 0.0, lane.z);
    decor.add(cap);
    P.cyl((x0 + x1) / 2, lane.z, (x1 - x0) / 2 + 0.1, -1, 0.05);
  }
  const laneMarkers: THREE.Mesh[] = [];
  const markerMat = L.paint(PAL.berry, 'red', { emissive: '#ff6b6b', emissiveIntensity: 0.35, roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const m = mesh(new THREE.ConeGeometry(0.3, 0.6, 3), markerMat, { cast: false });
    m.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    m.scale.set(1, 1, 0.2);
    m.position.set(lane.groundX0 + 2 + i * 1.6, 0.06, lane.z);
    root.add(m);
    laneMarkers.push(m);
  }
  // Vine bridges that grow once the dash test is done (so nobody is ever stuck on the far pad).
  const vineBridges: Array<{ mesh: THREE.Group; collider: Collider }> = [];
  const gapList: Array<[number, number]> = [[lane.groundX1, lane.pads[0]![0]], [lane.pads[0]![1], lane.pads[1]![0]]];
  for (const [x0, x1] of gapList) {
    const g = new THREE.Group();
    const v = mesh(new RoundedBoxGeometry(x1 - x0 + 0.6, 0.2, 1.4, 2, 0.08), L.paint(PAL.leaf, 'green', { roughness: 0.8 }));
    g.add(v);
    g.position.set((x0 + x1) / 2, -0.1, lane.z);
    g.scale.set(0.001, 1, 1);
    g.visible = false;
    root.add(g);
    const c = P.box((x0 + x1) / 2, lane.z, x1 - x0 + 0.6, 1.4, -0.4, 0.0, { enabled: false });
    vineBridges.push({ mesh: g, collider: c });
  }
  // East gate (a sleepy hedge that blooms open when Red returns)
  const eastGate = new THREE.Group();
  const gm = mesh(new RoundedBoxGeometry(1.6, 2.6, 5, 3, 0.5), hedgeMat);
  gm.position.y = 1.3;
  eastGate.add(gm);
  for (let i = 0; i < 5; i++) {
    const b = berry(L, 0.28);
    b.position.set(-0.85, 0.6 + (i % 3) * 0.7, -2 + i);
    eastGate.add(b);
  }
  eastGate.position.set(C.x + ringR - 0.2, 0, C.z);
  root.add(eastGate);
  const eastGateCollider = P.box(C.x + ringR - 0.2, C.z, 1.6, 6.4, 0, 2.6, { walkable: false });

  // Grass detail
  root.add(grassTufts(L, 11, 600, (r) => {
    const zones: Array<[number, number, number, number]> = [[-16, 16, 31, 49], [-7, 7, -19, -8], [-16, 16, -49, -21]];
    const zz = zones[r.int(0, zones.length - 1)]!;
    return [r.range(zz[0], zz[1]), r.range(zz[2], zz[3])];
  }));
  for (let i = 0; i < 10; i++) place(decor, rock(L, 700 + i, rng.range(0.4, 0.9)), rng.range(-15, 15), 0, rng.range(-48, -22));

  // One visible ground sheet with holes for every pit (so pits have real depth).
  const shape = new THREE.Shape();
  shape.absarc(4, -2, 120, 0, Math.PI * 2, false);
  for (const [x0, x1, z0, z1] of pits) {
    const hole = new THREE.Path();
    // Shape space: (x, -z) because the sheet is rotated -90° about X.
    hole.moveTo(x0, -z0);
    hole.lineTo(x0, -z1);
    hole.lineTo(x1, -z1);
    hole.lineTo(x1, -z0);
    hole.lineTo(x0, -z0);
    shape.holes.push(hole);
  }
  const sheet = mesh(new THREE.ShapeGeometry(shape, 48), groundMat, { cast: false });
  sheet.rotation.x = -Math.PI / 2;
  sheet.userData.dynamic = true;
  root.add(sheet);

  batchStatic(decor, root);
  return { poppies, ripenBerries, vines, bridge, bridgeCollider, switchPlate, guideStars, guideStarPositions, jars, arrivalArch: arch, eastGate, eastGateCollider, laneMarkers, vineBridges };
}
