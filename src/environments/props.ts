/**
 * Prop library for the stylized world (original procedural art, interpreting the 2D references):
 * rounded houses with steep gables, leafless and leafy trees, giant berries, bushes, poppies,
 * mushrooms, fences, lamps, rocks, clouds, Wonderbrush stars on pedestals, arches, paths.
 *
 * Every surface gets a color key so it stays gray until its color is earned:
 * berries/poppies/awnings → red · water/glass → blue · lamps/sun → yellow · leaves/grass → green ·
 * wood/trunks → orange · whites, stone and magic cues → neutral.
 */
import * as THREE from 'three';
import type { ColorKey } from '../data/colors';
import { MaterialLibrary } from '../rendering/paint';
import { UNIT, at, blobGeometry, mesh, RoundedBoxGeometry, starGeometry, starOutlineGeometry, taperedTube } from '../rendering/shapes';
import { Rng } from '../utils/rng';
import { stripeTexture } from '../rendering/textures';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PAL = {
  grass: '#8DBE6E',
  grassDark: '#6FA35A',
  leaf: '#4F9C58',
  leafDark: '#3E7F48',
  trunk: '#8A6446',
  wood: '#B88A5E',
  woodDark: '#7A5A43',
  berry: '#E5383B',
  berryPink: '#F07A8C',
  berryDeep: '#B91C1C',
  wall: '#F4F0E8',
  wallShade: '#E4DED2',
  roofRed: '#D6453F',
  roofBlue: '#4A7FC1',
  roofYellow: '#E8B931',
  roofPurple: '#8E62C9',
  roofOrange: '#E8793A',
  door: '#7A5A43',
  glass: '#BFE0F2',
  stone: '#C9C7C2',
  stoneDark: '#A7A6A1',
  rock: '#B4B3AE',
  metal: '#59616B',
  cream: '#FFF3C9',
  white: '#FFFFFF',
  water: '#5AA6E0',
  sun: '#FACC15',
};

const rngFor = (seed: number) => new Rng(seed * 9301 + 49297);

// ───────────────────────────── Trees & plants ─────────────────────────────

export interface TreeOptions {
  height?: number;
  canopy?: number;
  leafColor?: string;
  leafKey?: ColorKey;
  fruit?: { color: string; key: ColorKey; count: number; size?: number } | null;
}

/** Round, friendly tree with a gently curved trunk and a lumpy canopy (optionally fruit). */
export function roundTree(lib: MaterialLibrary, seed: number, o: TreeOptions = {}): THREE.Group {
  const r = rngFor(seed);
  const g = new THREE.Group();
  const h = o.height ?? r.range(3.2, 4.4);
  const lean = r.range(-0.35, 0.35);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.3, h * 0.45, 0.1), new THREE.Vector3(lean, h, 0)]);
  const trunk = mesh(taperedTube(curve, 0.32, 0.18, 12, 8), lib.paint(PAL.trunk, 'orange', { roughness: 0.9 }));
  g.add(trunk);
  const top = curve.getPoint(1);
  const canopyR = o.canopy ?? r.range(1.5, 2.1);
  const leafMat = lib.paint(o.leafColor ?? PAL.leaf, o.leafKey ?? 'green', { roughness: 0.85, rim: 0.18 });
  const leafMat2 = lib.paint(PAL.leafDark, o.leafKey ?? 'green', { roughness: 0.85, rim: 0.12 });
  const blobs = 3 + r.int(0, 2);
  for (let i = 0; i < blobs; i++) {
    const b = mesh(blobGeometry(seed * 13 + i, 2, 0.15), i % 2 ? leafMat2 : leafMat);
    const s = canopyR * r.range(0.62, 0.95);
    b.scale.set(s, s * 0.88, s);
    const a = (i / blobs) * Math.PI * 2 + r.range(0, 1);
    b.position.set(top.x + Math.cos(a) * canopyR * 0.45, top.y + r.range(-0.1, 0.5) + (i === 0 ? 0.35 : 0), top.z + Math.sin(a) * canopyR * 0.45);
    g.add(b);
  }
  if (o.fruit) {
    const fm = lib.paint(o.fruit.color, o.fruit.key, { roughness: 0.4, rim: 0.25 });
    for (let i = 0; i < o.fruit.count; i++) {
      const a = r.range(0, Math.PI * 2);
      const y = top.y + r.range(-0.7, 0.4);
      const f = mesh(UNIT.sphereTiny, fm, { cast: false });
      f.scale.setScalar(o.fruit.size ?? 0.2);
      f.position.set(top.x + Math.cos(a) * canopyR * 0.95, y, top.z + Math.sin(a) * canopyR * 0.95);
      g.add(f);
    }
  }
  return g;
}

/** Leafless silhouette tree (Hush Hollow, Prologue P3). */
export function leaflessTree(lib: MaterialLibrary, seed: number, height = 3.6): THREE.Group {
  const r = rngFor(seed);
  const g = new THREE.Group();
  const mat = lib.paint('#7D6553', 'orange', { roughness: 0.92 });
  const trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(r.range(-0.2, 0.2), height * 0.5, 0), new THREE.Vector3(r.range(-0.3, 0.3), height, r.range(-0.2, 0.2))]);
  g.add(mesh(taperedTube(trunkCurve, 0.24, 0.07, 14, 7), mat));
  const branches = 4 + r.int(0, 2);
  for (let i = 0; i < branches; i++) {
    const t = r.range(0.45, 0.92);
    const base = trunkCurve.getPoint(t);
    const a = r.range(0, Math.PI * 2);
    const len = r.range(0.8, 1.6) * (1.1 - t * 0.4);
    const end = base.clone().add(new THREE.Vector3(Math.cos(a) * len, len * r.range(0.5, 1.1), Math.sin(a) * len));
    const mid = base.clone().lerp(end, 0.5).add(new THREE.Vector3(0, -0.15, 0));
    const c = new THREE.CatmullRomCurve3([base, mid, end]);
    g.add(mesh(taperedTube(c, 0.09 * (1.1 - t * 0.5), 0.025, 8, 5), mat));
    // a tiny curl at the tip
    const curlEnd = end.clone().add(new THREE.Vector3(Math.cos(a + 1.4) * 0.3, 0.18, Math.sin(a + 1.4) * 0.3));
    g.add(mesh(taperedTube(new THREE.CatmullRomCurve3([end, end.clone().lerp(curlEnd, 0.5).add(new THREE.Vector3(0, 0.12, 0)), curlEnd]), 0.028, 0.012, 6, 4), mat));
  }
  return g;
}

/** A giant soft berry (lantern-sized), with a little leaf crown and shine. */
export function berry(lib: MaterialLibrary, radius = 0.5, color = PAL.berry, key: ColorKey = 'red'): THREE.Group {
  const g = new THREE.Group();
  const big = radius >= 0.6;
  const body = mesh(big ? UNIT.sphere : UNIT.sphereLow, lib.paint(color, key, { roughness: 0.38, rim: 0.3, rimColor: '#ffd9d9' }));
  body.scale.set(radius, radius * 0.94, radius);
  g.add(body);
  const leafMat = lib.paint(PAL.leaf, 'green', { roughness: 0.7 });
  const leaves = big ? 4 : 3;
  for (let i = 0; i < leaves; i++) {
    const leaf = mesh(UNIT.sphereLow, leafMat, { cast: big });
    const a = (i / leaves) * Math.PI * 2;
    leaf.scale.set(radius * 0.28, radius * 0.08, radius * 0.14);
    leaf.position.set(Math.cos(a) * radius * 0.2, radius * 0.92, Math.sin(a) * radius * 0.2);
    leaf.rotation.y = -a;
    leaf.rotation.z = 0.35;
    g.add(leaf);
  }
  const stem = mesh(UNIT.cylinderLow, leafMat);
  stem.scale.set(radius * 0.06, radius * 0.3, radius * 0.06);
  stem.position.y = radius * 1.08;
  g.add(stem);
  // seeds (raspberry-ish dimples) — only on big berries, where they can actually be seen
  if (!big) return g;
  const seedMat = lib.paint(PAL.cream, 'neutral', { roughness: 0.6, rim: 0 });
  const rs = rngFor(Math.round(radius * 100));
  for (let i = 0; i < 8; i++) {
    const u = rs.range(-0.75, 0.6);
    const a = rs.range(0, Math.PI * 2);
    const rr = Math.sqrt(1 - u * u);
    const s = mesh(UNIT.sphereLow, seedMat, { cast: false });
    s.scale.setScalar(radius * 0.05);
    s.position.set(Math.cos(a) * rr * radius * 0.99, u * radius * 0.94, Math.sin(a) * rr * radius * 0.99);
    g.add(s);
  }
  return g;
}

/** Enormous berry bush: lumpy leafy mounds dotted with big berries. */
export function berryBush(lib: MaterialLibrary, seed: number, size = 1.6, berries = 6): THREE.Group {
  const r = rngFor(seed);
  const g = new THREE.Group();
  const leafA = lib.paint(PAL.leaf, 'green', { roughness: 0.88, rim: 0.16 });
  const leafB = lib.paint(PAL.leafDark, 'green', { roughness: 0.88, rim: 0.12 });
  const lumps = 3 + r.int(0, 2);
  for (let i = 0; i < lumps; i++) {
    const b = mesh(blobGeometry(seed * 7 + i, 2, 0.16), i % 2 ? leafA : leafB);
    const s = size * r.range(0.6, 0.95);
    b.scale.set(s, s * 0.8, s);
    const a = (i / lumps) * Math.PI * 2 + r.range(0, 0.7);
    b.position.set(Math.cos(a) * size * 0.45, s * 0.55, Math.sin(a) * size * 0.45);
    g.add(b);
  }
  const bm = lib.paint(PAL.berry, 'red', { roughness: 0.38, rim: 0.3, rimColor: '#ffd9d9' });
  const bm2 = lib.paint(PAL.berryPink, 'red', { roughness: 0.4, rim: 0.3 });
  for (let i = 0; i < berries; i++) {
    const a = r.range(0, Math.PI * 2);
    const y = r.range(0.4, 1.3) * size;
    const d = size * r.range(0.8, 1.05);
    const f = mesh(UNIT.sphereTiny, i % 3 === 0 ? bm2 : bm, { cast: false });
    f.scale.setScalar(size * r.range(0.16, 0.24));
    f.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
    g.add(f);
  }
  return g;
}

export interface Poppy {
  group: THREE.Group;
  head: THREE.Group;
  /** 0 = closed bud, 1 = fully open. */
  setBloom(t: number): void;
}

/** Poppy flower that blooms when Red returns (Scene 1.3). Three meshes: stem, petal cup, centre. */
export function poppy(lib: MaterialLibrary, seed: number, scale = 1): Poppy {
  const r = rngFor(seed);
  const group = new THREE.Group();
  const stemMat = lib.paint(PAL.leafDark, 'green', { roughness: 0.8 });
  const h = r.range(0.55, 0.9) * scale;
  const stem = mesh(UNIT.cylinderLow, stemMat, { cast: false });
  stem.scale.set(0.025 * scale, h, 0.025 * scale);
  stem.position.y = h / 2;
  group.add(stem);
  const head = new THREE.Group();
  head.position.set(0, h, 0);
  group.add(head);
  // Petal cup: a lathe with a wavy rim so it reads as five soft petals.
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    prof.push(new THREE.Vector2(0.02 + Math.sin(t * Math.PI * 0.5) * 0.16, t * 0.12));
  }
  const cupGeo = new THREE.LatheGeometry(prof, 15);
  const pos = cupGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + Math.cos(a * 5) * 0.12 * (pos.getY(i) / 0.12);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  cupGeo.computeVertexNormals();
  const cup = mesh(cupGeo, lib.paint(PAL.berry, 'red', { roughness: 0.55, rim: 0.25, side: THREE.DoubleSide }), { cast: false });
  cup.scale.setScalar(scale);
  head.add(cup);
  const centre = mesh(UNIT.sphereTiny, lib.paint('#2F2A33', 'neutral', { roughness: 0.6 }), { cast: false });
  centre.scale.setScalar(0.045 * scale);
  centre.position.y = 0.05 * scale;
  head.add(centre);
  const setBloom = (t: number) => {
    // bud: tall and narrow → open: wide and flat
    cup.scale.set(scale * (0.45 + 0.75 * t), scale * (1.6 - 0.8 * t), scale * (0.45 + 0.75 * t));
  };
  setBloom(0.15);
  return { group, head, setBloom };
}

export function mushroom(lib: MaterialLibrary, seed: number, size = 0.5): THREE.Group {
  const r = rngFor(seed);
  const g = new THREE.Group();
  const stem = mesh(UNIT.cylinder, lib.paint('#F1ECE2', 'neutral', { roughness: 0.8 }));
  stem.scale.set(size * 0.22, size * 0.5, size * 0.22);
  stem.position.y = size * 0.25;
  g.add(stem);
  const cap = mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), lib.paint(PAL.berry, 'red', { roughness: 0.45, rim: 0.25 }));
  cap.scale.set(size * 0.55, size * 0.4, size * 0.55);
  cap.position.y = size * 0.45;
  g.add(cap);
  const dot = lib.paint(PAL.white, 'neutral', { roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const a = r.range(0, Math.PI * 2);
    const u = r.range(0.25, 0.8);
    const d = mesh(UNIT.sphereLow, dot, { cast: false });
    d.scale.setScalar(size * 0.07);
    d.position.set(Math.cos(a) * Math.sqrt(1 - u * u) * size * 0.54, size * 0.45 + u * size * 0.4, Math.sin(a) * Math.sqrt(1 - u * u) * size * 0.54);
    g.add(d);
  }
  return g;
}

/** Flat grass/flower tufts as instanced cones (cheap ground detail). */
export function grassTufts(lib: MaterialLibrary, seed: number, count: number, area: (r: Rng) => [number, number], key: ColorKey = 'green', color = PAL.grassDark): THREE.InstancedMesh {
  const r = rngFor(seed);
  // Soft rounded clumps (three little leaves) — reads as grass, never as spikes.
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 2; k++) {
    const leaf = new THREE.SphereGeometry(0.1, 5, 3);
    leaf.scale(0.7, 1.6, 0.45);
    leaf.rotateZ((k - 0.5) * 0.7);
    leaf.translate((k - 0.5) * 0.08, 0.13, 0);
    leaf.deleteAttribute('uv');
    parts.push(leaf);
  }
  const geo = mergeGeometries(parts) ?? new THREE.SphereGeometry(0.1, 6, 4);
  const im = new THREE.InstancedMesh(geo, lib.paint(color, key, { roughness: 0.9, rim: 0.12 }), count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const [x, z] = area(r);
    q.setFromEuler(new THREE.Euler(r.range(-0.3, 0.3), r.range(0, 6.28), r.range(-0.3, 0.3)));
    const s = r.range(0.6, 1.4);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * r.range(0.8, 1.5), s));
    im.setMatrixAt(i, m);
  }
  im.castShadow = false;
  im.receiveShadow = true;
  im.userData.dynamic = true;
  return im;
}

// ───────────────────────────── Buildings & structures ─────────────────────────────

export interface HouseOptions {
  width?: number;
  depth?: number;
  height?: number;
  roofColor?: string;
  roofKey?: ColorKey;
  doorSide?: 'front';
}

/** Rounded cottage with a steep gable roof, arched door and round windows (Hush Hollow art). */
export function house(lib: MaterialLibrary, seed: number, o: HouseOptions = {}): THREE.Group {
  const r = rngFor(seed);
  const w = o.width ?? r.range(3.4, 4.2);
  const d = o.depth ?? r.range(3.2, 3.8);
  const h = o.height ?? r.range(2.6, 3.1);
  const g = new THREE.Group();
  const wall = mesh(new RoundedBoxGeometry(w, h, d, 3, 0.35), lib.paint(PAL.wall, 'neutral', { roughness: 0.92, rim: 0.12 }));
  wall.position.y = h / 2;
  g.add(wall);
  const base = mesh(new RoundedBoxGeometry(w + 0.2, 0.35, d + 0.2, 2, 0.12), lib.paint(PAL.stoneDark, 'neutral', { roughness: 0.95 }));
  base.position.y = 0.17;
  g.add(base);
  // Gable roof: extruded triangle with soft bevels.
  const roofH = h * r.range(0.95, 1.2);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.45, 0);
  shape.lineTo(0, roofH);
  shape.lineTo(w / 2 + 0.45, 0);
  shape.lineTo(-w / 2 - 0.45, 0);
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3 });
  roofGeo.translate(0, 0, -(d + 0.6) / 2);
  const roof = mesh(roofGeo, lib.paint(o.roofColor ?? PAL.roofRed, o.roofKey ?? 'red', { roughness: 0.75, rim: 0.15 }));
  roof.position.y = h - 0.05;
  g.add(roof);
  // Gable face trim (white triangle inset) front & back.
  const trimShape = new THREE.Shape();
  trimShape.moveTo(-w / 2 + 0.1, 0);
  trimShape.lineTo(0, roofH - 0.55);
  trimShape.lineTo(w / 2 - 0.1, 0);
  const trimMat = lib.paint(PAL.wallShade, 'neutral', { roughness: 0.9, side: THREE.DoubleSide });
  for (const side of [1, -1]) {
    const tri = mesh(new THREE.ShapeGeometry(trimShape), trimMat, { cast: false });
    tri.position.set(0, h - 0.05, side * (d / 2 + 0.31));
    g.add(tri);
  }
  // Arched door
  const doorShape = new THREE.Shape();
  const dw = 0.55;
  const dh = 1.5;
  doorShape.moveTo(-dw, 0);
  doorShape.lineTo(-dw, dh - dw);
  doorShape.absarc(0, dh - dw, dw, Math.PI, 0, true);
  doorShape.lineTo(dw, 0);
  const door = mesh(new THREE.ExtrudeGeometry(doorShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), lib.paint(PAL.door, 'orange', { roughness: 0.8 }));
  door.position.set(0, 0.32, d / 2 - 0.02);
  g.add(door);
  const knob = mesh(UNIT.sphereLow, lib.paint('#E8D9A8', 'yellow', { roughness: 0.3, metalness: 0.6 }), { cast: false });
  knob.scale.setScalar(0.06);
  knob.position.set(0.32, 0.32 + 0.8, d / 2 + 0.09);
  g.add(knob);
  // Round windows
  const glass = lib.paint(PAL.glass, 'blue', { roughness: 0.2, metalness: 0.1, emissive: '#d9ecf7', emissiveIntensity: 0.15 });
  const frame = lib.paint(PAL.white, 'neutral', { roughness: 0.6 });
  for (const side of [-1, 1]) {
    const wx = side * w * 0.3;
    const pane = mesh(UNIT.circle, glass, { cast: false });
    pane.scale.setScalar(0.38);
    pane.position.set(wx, h * 0.62, d / 2 + 0.005);
    g.add(pane);
    const ring = mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 24), frame, { cast: false });
    ring.position.set(wx, h * 0.62, d / 2 + 0.02);
    g.add(ring);
    const bar = mesh(UNIT.box, frame, { cast: false });
    bar.scale.set(0.05, 0.78, 0.03);
    bar.position.set(wx, h * 0.62, d / 2 + 0.02);
    g.add(bar);
  }
  // Chimney
  if (r.next() < 0.7) {
    const ch = mesh(new RoundedBoxGeometry(0.5, 1.2, 0.5, 2, 0.08), lib.paint(PAL.stone, 'neutral', { roughness: 0.95 }));
    ch.position.set(w * 0.22, h + roofH * 0.55, -d * 0.15);
    g.add(ch);
  }
  return g;
}

export function fence(lib: MaterialLibrary, length: number, posts = Math.max(2, Math.round(length / 1.2) + 1)): THREE.Group {
  const g = new THREE.Group();
  const mat = lib.paint('#EFEBE2', 'neutral', { roughness: 0.85 });
  for (let i = 0; i < posts; i++) {
    const x = -length / 2 + (i / (posts - 1)) * length;
    const p = mesh(new RoundedBoxGeometry(0.16, 0.95, 0.16, 2, 0.05), mat);
    p.position.set(x, 0.47, 0);
    g.add(p);
    const tip = mesh(UNIT.cone, mat);
    tip.scale.set(0.11, 0.16, 0.11);
    tip.rotation.y = Math.PI / 4;
    tip.position.set(x, 1.02, 0);
    g.add(tip);
  }
  for (const y of [0.38, 0.72]) {
    const rail = mesh(new RoundedBoxGeometry(length, 0.1, 0.07, 2, 0.03), mat);
    rail.position.y = y;
    g.add(rail);
  }
  return g;
}

export function lampPost(lib: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const metal = lib.paint(PAL.metal, 'neutral', { roughness: 0.5, metalness: 0.4 });
  const post = mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.6, 10), metal);
  post.position.y = 1.3;
  g.add(post);
  const arm = mesh(taperedTube(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.5, 0), new THREE.Vector3(0.25, 2.75, 0), new THREE.Vector3(0.5, 2.6, 0)]), 0.045, 0.035, 8, 5), metal);
  g.add(arm);
  const lamp = mesh(UNIT.sphere, lib.paint('#FFE08A', 'yellow', { roughness: 0.3, emissive: '#ffd36b', emissiveIntensity: 0.25 }));
  lamp.scale.set(0.2, 0.25, 0.2);
  lamp.position.set(0.5, 2.32, 0);
  g.add(lamp);
  const cap = mesh(UNIT.cone, metal);
  cap.scale.set(0.24, 0.16, 0.24);
  cap.position.set(0.5, 2.6, 0);
  g.add(cap);
  return g;
}

export function rock(lib: MaterialLibrary, seed: number, size = 0.8): THREE.Mesh {
  const m = mesh(blobGeometry(seed, 1, 0.22), lib.paint(PAL.rock, 'neutral', { roughness: 0.95, flatShading: true }));
  m.scale.set(size, size * 0.65, size * 0.9);
  m.position.y = size * 0.2;
  return m;
}

export function cloud(lib: MaterialLibrary, seed: number, size = 3): THREE.Group {
  const r = rngFor(seed);
  const g = new THREE.Group();
  const mat = lib.paint('#FFFFFF', 'neutral', { roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.35, rim: 0.2 });
  for (let i = 0; i < 5; i++) {
    const b = mesh(UNIT.sphereLow, mat, { cast: false, receive: false });
    const s = size * r.range(0.4, 0.7);
    b.scale.set(s, s * 0.7, s * 0.8);
    b.position.set((i - 2) * size * 0.45, r.range(0, size * 0.25), r.range(-0.4, 0.4) * size);
    g.add(b);
  }
  return g;
}

/** Big soft background hill. */
export function hill(lib: MaterialLibrary, radius: number, height: number, color = PAL.grass, key: ColorKey = 'green'): THREE.Mesh {
  const m = mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), lib.paint(color, key, { roughness: 0.95, rim: 0.08 }), { cast: false });
  m.scale.set(radius, height, radius);
  return m;
}

// ───────────────────────────── Magic: Wonderbrush stars & arches ─────────────────────────────

export interface WonderStar {
  group: THREE.Group;
  star: THREE.Mesh;
  glowMat: THREE.MeshStandardMaterial;
  /** 0 = sleepy (dim, slow), 1 = awake (bright). */
  setAwake(on: boolean): void;
  update(dt: number, t: number): void;
  readonly awake: boolean;
}

/** Wonderbrush star on a round stone pedestal (Prologue P2–P3). Magic cue: always neutral. */
export function wonderStar(lib: MaterialLibrary, withPedestal = true): WonderStar {
  const group = new THREE.Group();
  if (withPedestal) {
    const ped = mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.9, 20), lib.paint(PAL.stone, 'neutral', { roughness: 0.9 }));
    ped.position.y = 0.45;
    group.add(ped);
    const lip = mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 20), lib.paint(PAL.stoneDark, 'neutral', { roughness: 0.9 }));
    lip.position.y = 0.92;
    group.add(lip);
  }
  const glowMat = lib.unique('#FFF2C2', 'neutral', { roughness: 0.4, emissive: '#fff0b8', emissiveIntensity: 0.25, rim: 0.4 });
  const star = mesh(starGeometry(0.42, 0.19, 0.16), glowMat);
  star.position.y = withPedestal ? 1.65 : 0;
  star.userData.dynamic = true;
  group.add(star);
  let awake = false;
  let k = 0;
  const api: WonderStar = {
    group,
    star,
    glowMat,
    get awake() {
      return awake;
    },
    setAwake(on: boolean) {
      awake = on;
    },
    update(dt: number, t: number) {
      k += ((awake ? 1 : 0) - k) * Math.min(1, dt * 3);
      glowMat.emissiveIntensity = 0.25 + k * 1.4 + Math.sin(t * (awake ? 4 : 1.5)) * (awake ? 0.2 : 0.08);
      star.rotation.y += dt * (0.4 + k * 1.6);
      star.position.y = (withPedestal ? 1.65 : 0) + Math.sin(t * 1.8) * 0.08 + k * 0.15;
      const s = 1 + k * 0.15 + Math.sin(t * 2) * 0.03;
      star.scale.setScalar(s);
    },
  };
  return api;
}

export interface Arch {
  group: THREE.Group;
  starOutline: THREE.Mesh;
  setBright(k: number): void;
}

/** Welcoming berry-shaped arch with a white star outline that brightens (Prologue P3–P4). */
export function berryArch(lib: MaterialLibrary, label: string | null, labelTex?: THREE.Texture, aspect = 3): Arch {
  const g = new THREE.Group();
  const stone = lib.paint(PAL.stone, 'neutral', { roughness: 0.92 });
  for (const side of [-1, 1]) {
    const pillar = mesh(new RoundedBoxGeometry(0.9, 4, 0.9, 3, 0.2), stone);
    pillar.position.set(side * 2.2, 2, 0);
    g.add(pillar);
    const knob = mesh(UNIT.sphere, stone);
    knob.scale.setScalar(0.5);
    knob.position.set(side * 2.2, 4.2, 0);
    g.add(knob);
  }
  // Berry-shaped top: a big round "berry" ring.
  const ring = mesh(new THREE.TorusGeometry(2.25, 0.42, 14, 40, Math.PI), lib.paint(PAL.berry, 'red', { roughness: 0.45, rim: 0.25 }));
  ring.position.y = 3.9;
  g.add(ring);
  const leafMat = lib.paint(PAL.leaf, 'green', { roughness: 0.75 });
  for (const side of [-1, 1]) {
    const leaf = mesh(UNIT.sphere, leafMat);
    leaf.scale.set(0.9, 0.18, 0.45);
    leaf.position.set(side * 0.65, 6.35, 0);
    leaf.rotation.z = side * -0.45;
    g.add(leaf);
  }
  const starMat = lib.unique('#FFFFFF', 'neutral', { emissive: '#ffffff', emissiveIntensity: 0.05, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
  const starOutline = mesh(starOutlineGeometry(1.15, 0.5, 0.12), starMat, { cast: false });
  starOutline.position.set(0, 4.15, 0.35);
  starOutline.userData.dynamic = true;
  g.add(starOutline);
  if (label && labelTex) {
    const sign = mesh(new RoundedBoxGeometry(aspect * 0.55, 0.62, 0.12, 2, 0.05), lib.paint(PAL.wood, 'orange', { roughness: 0.8 }));
    sign.position.set(0, 2.8, 0.6);
    g.add(sign);
    const face = mesh(UNIT.plane, lib.basic('#ffffff', { map: labelTex, transparent: true }), { cast: false, receive: false });
    face.scale.set(aspect * 0.5, 0.5, 1);
    face.position.set(0, 2.8, 0.67);
    g.add(face);
  }
  const setBright = (k: number) => {
    starMat.emissiveIntensity = 0.05 + k * 1.6;
    starMat.opacity = 0.35 + k * 0.65;
  };
  return { group: g, starOutline, setBright };
}

/** Cobblestone path along a curve (instanced flattened stones). */
export function cobblePath(lib: MaterialLibrary, points: THREE.Vector3[], width: number, seed = 3, y = 0.02): THREE.InstancedMesh {
  const curve = new THREE.CatmullRomCurve3(points);
  const r = rngFor(seed);
  const len = curve.getLength();
  const rows = Math.floor(len / 0.62);
  const perRow = Math.max(2, Math.round(width / 0.62));
  const count = rows * perRow;
  const geo = new THREE.CylinderGeometry(0.3, 0.32, 0.12, 7);
  const im = new THREE.InstancedMesh(geo, lib.paint(PAL.stone, 'neutral', { roughness: 0.95, rim: 0.05 }), count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  let i = 0;
  for (let row = 0; row < rows; row++) {
    const t = (row + 0.5) / rows;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    for (let c = 0; c < perRow; c++) {
      const off = (c - (perRow - 1) / 2) * 0.62 + r.range(-0.08, 0.08) + (row % 2) * 0.15;
      const pos = p.clone().addScaledVector(side, off);
      pos.y = y;
      q.setFromEuler(new THREE.Euler(0, r.range(0, 6.28), 0));
      const s = r.range(0.8, 1.05);
      m.compose(pos, q, new THREE.Vector3(s, r.range(0.8, 1.2), s * r.range(0.85, 1.1)));
      im.setMatrixAt(i++, m);
    }
  }
  im.count = i;
  im.receiveShadow = true;
  im.castShadow = false;
  im.userData.dynamic = true;
  return im;
}

/** Striped market awning (red-keyed stripes — "striped awnings turn crimson", Scene 1.3). */
export function awningStall(lib: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const wood = lib.paint(PAL.wood, 'orange', { roughness: 0.85 });
  for (const [x, z] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]] as const) {
    const post = mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 8), wood);
    post.position.set(x, 1.15, z);
    g.add(post);
  }
  const table = mesh(new RoundedBoxGeometry(2.6, 0.2, 1.4, 2, 0.06), wood);
  table.position.y = 0.95;
  g.add(table);
  // The material library disposes the map together with the material.
  const tex = stripeTexture('#E5383B', '#FFF7EE', 8);
  const canopyMat = lib.paint('#FFFFFF', 'red', { roughness: 0.85, map: tex, side: THREE.DoubleSide });
  const canopy = mesh(new THREE.CylinderGeometry(0.01, 1.75, 0.8, 8, 1, true), canopyMat);
  canopy.rotation.y = Math.PI / 8;
  canopy.scale.set(1, 1, 0.62);
  canopy.position.y = 2.65;
  g.add(canopy);
  // scalloped edge
  const edgeMat = lib.paint(PAL.berry, 'red', { roughness: 0.8 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = mesh(UNIT.sphereLow, edgeMat, { cast: false });
    b.scale.set(0.2, 0.12, 0.08);
    b.position.set(Math.cos(a) * 1.7, 2.22, Math.sin(a) * 1.7 * 0.62);
    b.rotation.y = -a;
    g.add(b);
  }
  // baskets of berries on the table
  for (const x of [-0.7, 0, 0.7]) {
    const basket = mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.22, 12), lib.paint(PAL.woodDark, 'orange', { roughness: 0.9 }));
    basket.position.set(x, 1.16, 0);
    g.add(basket);
    for (let k = 0; k < 4; k++) {
      const b = mesh(UNIT.sphereLow, lib.paint(PAL.berry, 'red', { roughness: 0.4, rim: 0.3 }));
      b.scale.setScalar(0.12);
      b.position.set(x + Math.cos(k * 1.6) * 0.12, 1.32, Math.sin(k * 1.6) * 0.12);
      g.add(b);
    }
  }
  return g;
}

/** A glass jam jar (big enough to stand on) with red jam and a gingham lid cloth. */
export function jamJar(lib: MaterialLibrary, radius = 1.1, height = 1.2): THREE.Group {
  const g = new THREE.Group();
  const glass = mesh(new THREE.CylinderGeometry(radius, radius * 0.96, height, 24), lib.paint('#DCEFF7', 'blue', { roughness: 0.15, transparent: true, opacity: 0.45, rim: 0.4 }));
  glass.position.y = height / 2;
  g.add(glass);
  const jam = mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 0.88, height * 0.7, 24), lib.paint(PAL.berryDeep, 'red', { roughness: 0.3, rim: 0.2 }));
  jam.position.y = height * 0.37;
  g.add(jam);
  const lid = mesh(new THREE.CylinderGeometry(radius * 1.04, radius * 1.04, 0.18, 24), lib.paint(PAL.berry, 'red', { roughness: 0.8 }));
  lid.position.y = height + 0.06;
  g.add(lid);
  const cloth = mesh(new THREE.CylinderGeometry(radius * 1.15, radius * 1.25, 0.12, 24, 1, true), lib.paint('#FFF7EE', 'neutral', { roughness: 0.9, side: THREE.DoubleSide }));
  cloth.position.y = height - 0.02;
  g.add(cloth);
  return g;
}

/** Helper: place an object and return it. */
export function place<T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x: number, y: number, z: number, rotY = 0, s = 1): T {
  at(o, x, y, z, parent);
  o.rotation.y = rotY;
  if (s !== 1) o.scale.multiplyScalar(s);
  return o;
}
