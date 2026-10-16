/** Reusable procedural geometry for the stylized, rounded art direction. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng } from '../utils/rng';

export { RoundedBoxGeometry };

/** Shared unit geometries (never disposed; they are tiny and reused everywhere). */
export const UNIT = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  sphereLow: new THREE.SphereGeometry(1, 14, 10),
  /** For tiny decorative spheres (berries on bushes, hedge bumps): ~120 triangles. */
  sphereTiny: new THREE.SphereGeometry(1, 10, 7),
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 24),
  cylinderLow: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 20),
  plane: new THREE.PlaneGeometry(1, 1),
  circle: new THREE.CircleGeometry(1, 40),
  torus: new THREE.TorusGeometry(1, 0.25, 12, 36),
  roundedBox: new RoundedBoxGeometry(1, 1, 1, 3, 0.18),
};
for (const g of Object.values(UNIT)) g.userData.shared = true;

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], opts: { cast?: boolean; receive?: boolean; name?: string } = {}): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  if (opts.name) m.name = opts.name;
  return m;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D): T {
  o.position.set(x, y, z);
  parent?.add(o);
  return o;
}

export function scaled<T extends THREE.Object3D>(o: T, x: number, y = x, z = x): T {
  o.scale.set(x, y, z);
  return o;
}

/** Five-point star with soft bevel. */
export function starGeometry(outer = 0.5, inner = 0.22, depth = 0.14, points = 5): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
  g.center();
  return g;
}

/** Star outline ring (for the arch's white star outline). */
export function starOutlineGeometry(outer = 1, inner = 0.45, width = 0.08, points = 5): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  const hole = new THREE.Path();
  const pts = (r0: number, r1: number, target: THREE.Path) => {
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? r0 : r1;
      const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) target.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else target.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    target.closePath();
  };
  pts(outer, inner, s);
  pts(outer - width * 1.6, inner - width * 0.8, hole);
  s.holes.push(hole);
  return new THREE.ShapeGeometry(s);
}

/** Faceted crystal (spell crystals): stretched octahedron with flat shading. */
export function crystalGeometry(radius = 0.6, height = 1.5): THREE.BufferGeometry {
  const g = new THREE.OctahedronGeometry(radius, 0);
  g.scale(1, height / (radius * 2), 1);
  return g.toNonIndexed();
}

/** Lumpy organic blob (bushes, canopy clusters, clouds), deterministic per seed. */
export function blobGeometry(seed: number, detail = 2, amount = 0.14): THREE.BufferGeometry {
  // Weld the icosahedron's vertices so the lumps get smooth (not faceted) shading.
  const ico = new THREE.IcosahedronGeometry(1, detail);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const g = mergeVertices(ico);
  ico.dispose();
  const rng = new Rng(seed);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const offsets = Array.from({ length: 6 }, () => new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize());
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let k = 0;
    for (const o of offsets) k += Math.max(0, v.dot(o)) ** 3;
    v.multiplyScalar(1 + (k / offsets.length) * amount * 4 - amount * 0.4);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Tapered tube along a curve (branches, vines, tails, ribbons). */
export function taperedTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, tubular = 24, radial = 8): THREE.BufferGeometry {
  const g = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const r = r0 + (r1 - r0) * t;
    curve.getPointAt(t, centre);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(centre).multiplyScalar(r).add(centre);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Rounded wing/leaf shape from a 2D outline, softly extruded. */
export function softShape(points: Array<[number, number]>, depth = 0.08, bevel = 0.05): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Smooth closed shape through control points (Catmull-Rom in 2D). */
export function smoothShapePoints(control: Array<[number, number]>, samples = 48): Array<[number, number]> {
  const curve = new THREE.CatmullRomCurve3(control.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
  return curve.getSpacedPoints(samples).slice(0, -1).map((p) => [p.x, p.y]);
}

/** Thin flat arc (eyebrows, smiles, the W chevron) built as a tube along a curve. */
export function strokeGeometry(points: THREE.Vector3[], radius = 0.02, segments = 16): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, segments, radius, 6, false);
}

/** Dispose every non-shared geometry under `root`. Materials are owned by MaterialLibrary. */
export function disposeGeometries(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
  });
}
