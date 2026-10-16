/**
 * Girl and Boy Explorer: original 3D interpretations of
 * docs/reference-art/characters/01_Girl_Explorer_FIXED.png and 02_Boy_Explorer.png.
 *
 * Both share ONE rig, ONE set of proportions and ONE collider (see CharacterMotor), so gameplay is
 * identical. They differ only in hair, a chest/waist detail and their satchel style, like the art.
 * Outfit starts gray; accent slots are color-keyed so they light up as colors return:
 *   scarf → red (Ch1) · shell buttons + ribbon → blue (Ch2) · stitching → yellow (Ch3).
 * Skin always keeps its natural tone (never a reward or collectible — Bible §2).
 */
import * as THREE from 'three';
import type { HeroId } from '../state/SaveData';
import { MaterialLibrary } from '../rendering/paint';
import { addOutlines } from '../rendering/outline';
import { mergeRigMeshes } from '../rendering/batch';
import { UNIT, mesh, strokeGeometry } from '../rendering/shapes';

/** Medium-detail sphere for small parts (eyes, hands, curls) to keep the triangle budget low. */
const SPHERE_S = new THREE.SphereGeometry(1, 16, 12);
SPHERE_S.userData.shared = true;

function headGeometry(): THREE.SphereGeometry {
  const g = new THREE.SphereGeometry(1, 40, 28);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0) {
      const k = -y;
      p.setX(i, p.getX(i) * (1 + 0.1 * k * (1 - k * 0.5)));
      p.setZ(i, p.getZ(i) * (1 + 0.06 * k) + 0.03 * k * k);
      p.setY(i, y * (1 - 0.06 * k));
    }
  }
  g.computeVertexNormals();
  return g;
}

export const EXPLORER_PALETTE = {
  skin: '#E2A57C',
  cheek: '#EE9A8C',
  eye: '#1E2B33',
  brow: '#5A3330',
  mouth: '#7A3B3B',
  hair: '#342A32',
  headband: '#54485A',
  shirt: '#CDD3D9',
  shirtDark: '#AEB7C0',
  pants: '#7D8B98',
  shoe: '#F4F7FA',
  sole: '#56636F',
  white: '#FFFFFF',
  scarf: '#E23B3B', // red-keyed: gray until Red is restored
  shell: '#3B82F6', // blue-keyed
  stitch: '#FACC15', // yellow-keyed
  satchelGirl: '#A9BBC8',
  strapBoy: '#4B5F72',
  bagBoy: '#8E9EAD',
  wood: '#B58B62',
  ferruleGirl: '#F28AA0',
  ferruleBoy: '#7FA8D8',
  bristle: '#FFF1C4',
};

export interface ExplorerRig {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  handR: THREE.Group;
  eyes: THREE.Mesh[];
  mouthSmile: THREE.Mesh;
  mouthOpen: THREE.Mesh;
  brows: THREE.Mesh[];
  brush: THREE.Group;
  brushTip: THREE.Mesh;
  scarfTail: THREE.Group;
}

export function buildExplorer(hero: HeroId, lib: MaterialLibrary): ExplorerRig {
  const P = EXPLORER_PALETTE;
  const M = {
    skin: lib.paint(P.skin, 'neutral', { roughness: 0.7, rim: 0.22 }),
    cheek: lib.paint(P.cheek, 'neutral', { roughness: 0.8, transparent: true, opacity: 0.75 }),
    eye: lib.paint(P.eye, 'neutral', { roughness: 0.25, rim: 0 }),
    white: lib.paint(P.white, 'neutral', { roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.25, rim: 0 }),
    brow: lib.paint(P.brow, 'neutral', { roughness: 0.6, rim: 0 }),
    mouth: lib.paint(P.mouth, 'neutral', { roughness: 0.6, rim: 0 }),
    hair: lib.paint(P.hair, 'neutral', { roughness: 0.55, rim: 0.28, rimColor: '#c9c3ff' }),
    headband: lib.paint(P.headband, 'neutral', { roughness: 0.5 }),
    shirt: lib.paint(P.shirt, 'neutral', { roughness: 0.85, rim: 0.2 }),
    shirtDark: lib.paint(P.shirtDark, 'neutral', { roughness: 0.85 }),
    pants: lib.paint(P.pants, 'neutral', { roughness: 0.9, rim: 0.18 }),
    shoe: lib.paint(P.shoe, 'neutral', { roughness: 0.6 }),
    sole: lib.paint(P.sole, 'neutral', { roughness: 0.7 }),
    scarf: lib.paint(P.scarf, 'red', { roughness: 0.75, rim: 0.2 }),
    shell: lib.paint(P.shell, 'blue', { roughness: 0.4 }),
    stitch: lib.paint(P.stitch, 'yellow', { roughness: 0.6, rim: 0 }),
    satchel: lib.paint(hero === 'girl' ? P.satchelGirl : P.bagBoy, 'neutral', { roughness: 0.85 }),
    strap: lib.paint(P.strapBoy, 'neutral', { roughness: 0.8 }),
    wood: lib.paint(P.wood, 'neutral', { roughness: 0.7 }),
    ferrule: lib.paint(hero === 'girl' ? P.ferruleGirl : P.ferruleBoy, 'neutral', { roughness: 0.35, metalness: 0.2 }),
    bristle: lib.paint(P.bristle, 'neutral', { roughness: 0.6, emissive: '#ffe6a0', emissiveIntensity: 0.55 }),
  };

  const root = new THREE.Group();
  root.name = `explorer-${hero}`;
  const body = new THREE.Group();
  root.add(body);

  // ── Hips + pelvis
  const hips = new THREE.Group();
  hips.position.y = 0.62;
  body.add(hips);
  const pelvis = mesh(UNIT.sphere, M.pants);
  pelvis.scale.set(0.27, 0.16, 0.22);
  pelvis.position.y = 0.02;
  hips.add(pelvis);

  // ── Legs (hip pivot → knee pivot → shoe)
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(0.12 * side, 0, 0);
    hips.add(leg);
    const thigh = mesh(new THREE.CapsuleGeometry(0.105, 0.14, 6, 12), M.pants);
    thigh.position.y = -0.12;
    leg.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.25;
    leg.add(knee);
    const shin = mesh(new THREE.CapsuleGeometry(0.1, 0.1, 6, 12), M.pants);
    shin.position.y = -0.08;
    knee.add(shin);
    // Yellow stitching line down the outer seam (gray until Yellow returns).
    const seam = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), M.stitch, { cast: false });
    seam.position.set(0.104 * side, 0.06, 0);
    shin.add(seam);
    const shoe = new THREE.Group();
    shoe.position.set(0, -0.21, 0.03);
    knee.add(shoe);
    const upper = mesh(UNIT.roundedBox, M.shoe);
    upper.scale.set(0.21, 0.15, 0.33);
    upper.position.set(0, 0.0, 0.03);
    shoe.add(upper);
    const sole = mesh(UNIT.roundedBox, M.sole);
    sole.scale.set(0.215, 0.045, 0.335);
    sole.position.set(0, -0.065, 0.03);
    shoe.add(sole);
    const stripe = mesh(UNIT.box, M.sole, { cast: false });
    stripe.scale.set(0.012, 0.012, 0.16);
    stripe.position.set(0.106 * side, 0.0, 0.05);
    shoe.add(stripe);
    return { leg, knee };
  };
  const L = makeLeg(-1);
  const R = makeLeg(1);

  // ── Spine + torso (pear-shaped lathe, slightly flattened front-to-back)
  const spine = new THREE.Group();
  spine.position.y = 0.0;
  hips.add(spine);
  const profile = [
    [0.0, -0.02],
    [0.2, 0.0],
    [0.245, 0.06],
    [0.252, 0.15],
    [0.238, 0.27],
    [0.205, 0.36],
    [0.13, 0.42],
    [0.0, 0.44],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  const torsoGeo = new THREE.LatheGeometry(profile, 28);
  const torso = mesh(torsoGeo, M.shirt);
  torso.scale.z = 0.82;
  spine.add(torso);
  const hem = mesh(new THREE.TorusGeometry(0.236, 0.022, 8, 32), M.shirtDark);
  hem.rotation.x = Math.PI / 2;
  hem.scale.y = 0.82;
  hem.position.y = 0.035;
  spine.add(hem);
  const hemStitch = mesh(new THREE.TorusGeometry(0.247, 0.006, 6, 40), M.stitch, { cast: false });
  hemStitch.rotation.x = Math.PI / 2;
  hemStitch.scale.y = 0.83;
  hemStitch.position.y = 0.065;
  spine.add(hemStitch);

  // White "W" chevron on the chest (as in both references).
  const zFront = 0.236 * 0.82 * 0.96;
  const w = mesh(
    strokeGeometry([new THREE.Vector3(-0.115, 0.31, zFront - 0.02), new THREE.Vector3(-0.06, 0.22, zFront + 0.005), new THREE.Vector3(0, 0.27, zFront + 0.01), new THREE.Vector3(0.06, 0.22, zFront + 0.005), new THREE.Vector3(0.115, 0.31, zFront - 0.02)], 0.022, 24),
    M.white,
    { cast: false },
  );
  w.userData.noOutline = true;
  spine.add(w);

  if (hero === 'girl') {
    // Soft waist sash, as in the girl reference.
    const sash = mesh(new THREE.CylinderGeometry(0.256, 0.25, 0.09, 32, 1, true), M.shirtDark);
    sash.scale.z = 0.84;
    sash.position.y = 0.11;
    spine.add(sash);
  } else {
    // Pill-shaped chest badge, as in the boy reference.
    const badge = mesh(new THREE.CapsuleGeometry(0.028, 0.1, 4, 10), M.shirtDark, { cast: false });
    badge.rotation.z = Math.PI / 2;
    badge.position.set(0, 0.14, zFront + 0.02);
    spine.add(badge);
  }

  // Red-keyed scarf (Ch1): wrap + tail that flutters.
  const scarf = mesh(new THREE.TorusGeometry(0.15, 0.058, 10, 24), M.scarf);
  scarf.rotation.x = Math.PI / 2;
  scarf.scale.y = 0.85;
  scarf.position.y = 0.41;
  spine.add(scarf);
  const scarfTail = new THREE.Group();
  scarfTail.position.set(-0.09, 0.39, -0.12);
  spine.add(scarfTail);
  const tail = mesh(UNIT.roundedBox, M.scarf);
  tail.scale.set(0.09, 0.22, 0.04);
  tail.position.y = -0.1;
  scarfTail.add(tail);
  scarfTail.rotation.set(0.35, 0, 0.2);

  // Satchel: girl wears a soft cape-satchel behind the right shoulder; boy a strap + hip bag.
  if (hero === 'girl') {
    const bag = mesh(UNIT.sphere, M.satchel);
    bag.scale.set(0.17, 0.2, 0.07);
    bag.position.set(0.12, 0.25, -0.2);
    bag.rotation.z = -0.25;
    spine.add(bag);
    for (const [x, y] of [[0.08, 0.27], [0.16, 0.22]] as const) {
      const shell = mesh(SPHERE_S, M.shell, { cast: false });
      shell.scale.set(0.024, 0.024, 0.012);
      shell.position.set(x, y, -0.27);
      spine.add(shell);
    }
  } else {
    const strap = mesh(new THREE.TorusGeometry(0.255, 0.018, 6, 40, Math.PI * 1.15), M.strap);
    strap.rotation.set(0, 0, -0.85);
    strap.scale.z = 0.82;
    strap.position.set(0, 0.2, 0);
    spine.add(strap);
    const bag = mesh(UNIT.roundedBox, M.satchel);
    bag.scale.set(0.16, 0.13, 0.07);
    bag.position.set(-0.24, 0.02, 0.0);
    bag.rotation.y = Math.PI / 2;
    spine.add(bag);
    const shell = mesh(SPHERE_S, M.shell, { cast: false });
    shell.scale.set(0.024, 0.024, 0.012);
    shell.position.set(-0.28, 0.04, 0.0);
    shell.rotation.y = Math.PI / 2;
    spine.add(shell);
  }
  // Blue-keyed ribbon at the back of the scarf knot.
  const ribbon = mesh(SPHERE_S, M.shell, { cast: false });
  ribbon.scale.set(0.045, 0.03, 0.02);
  ribbon.position.set(0.07, 0.41, -0.15);
  spine.add(ribbon);

  // ── Arms (shoulder → elbow → hand)
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.245 * side, 0.34, 0);
    spine.add(shoulder);
    const puff = mesh(SPHERE_S, M.shirt);
    puff.scale.setScalar(0.085);
    shoulder.add(puff);
    const upper = mesh(new THREE.CapsuleGeometry(0.072, 0.1, 6, 10), M.shirt);
    upper.position.y = -0.09;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.17;
    shoulder.add(elbow);
    const fore = mesh(new THREE.CapsuleGeometry(0.066, 0.07, 6, 10), M.shirt);
    fore.position.y = -0.06;
    elbow.add(fore);
    const cuff = mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), M.shirtDark, { cast: false });
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.115;
    elbow.add(cuff);
    const hand = new THREE.Group();
    hand.position.y = -0.17;
    elbow.add(hand);
    const palm = mesh(SPHERE_S, M.skin);
    palm.scale.set(0.082, 0.088, 0.078);
    hand.add(palm);
    shoulder.rotation.z = 0.12 * side;
    return { shoulder, elbow, hand };
  };
  const AL = makeArm(-1);
  const AR = makeArm(1);

  // ── Neck + head
  const neck = new THREE.Group();
  neck.position.y = 0.42;
  spine.add(neck);
  const neckMesh = mesh(UNIT.cylinder, M.skin);
  neckMesh.scale.set(0.075, 0.08, 0.075);
  neckMesh.position.y = 0.02;
  neck.add(neckMesh);
  const head = new THREE.Group();
  head.position.y = 0.33;
  neck.add(head);
  // One smooth egg-shaped head (fuller cheeks and jaw) — no seams between parts.
  const skull = mesh(headGeometry(), M.skin);
  skull.scale.set(0.4, 0.405, 0.375);
  head.add(skull);

  // Face (front = +Z). Large dark eyes with a white highlight, arched brows, small smile, blush.
  const faceZ = 0.36;
  const eyes: THREE.Mesh[] = [];
  const brows: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    const eye = mesh(SPHERE_S, M.eye, { cast: false });
    eye.scale.set(0.058, 0.074, 0.03);
    eye.position.set(0.135 * side, -0.01, faceZ - 0.01);
    eye.rotation.y = 0.32 * side;
    eye.userData.noOutline = true;
    head.add(eye);
    eyes.push(eye);
    const glint = mesh(SPHERE_S, M.white, { cast: false });
    glint.scale.set(0.38, 0.32, 0.5);
    glint.position.set(0.3, 0.38, 0.75);
    glint.userData.noOutline = true;
    eye.add(glint);
    const brow = mesh(strokeGeometry([new THREE.Vector3(-0.055, -0.012, 0), new THREE.Vector3(0, 0.014, 0.006), new THREE.Vector3(0.055, -0.004, 0)], 0.012, 10), M.brow, { cast: false });
    brow.position.set(0.14 * side, 0.115, faceZ - 0.015);
    brow.rotation.y = 0.32 * side;
    brow.scale.x = side;
    brow.userData.noOutline = true;
    head.add(brow);
    brows.push(brow);
    const cheek = mesh(SPHERE_S, M.cheek, { cast: false });
    cheek.scale.set(0.06, 0.03, 0.02);
    cheek.position.set(0.215 * side, -0.1, 0.3);
    cheek.rotation.y = 0.6 * side;
    cheek.userData.noOutline = true;
    head.add(cheek);
  }
  const mouthSmile = mesh(strokeGeometry([new THREE.Vector3(-0.045, 0.012, 0), new THREE.Vector3(0, -0.016, 0.004), new THREE.Vector3(0.045, 0.012, 0)], 0.011, 12), M.mouth, { cast: false });
  mouthSmile.position.set(0, -0.155, faceZ - 0.008);
  mouthSmile.userData.noOutline = true;
  head.add(mouthSmile);
  const mouthOpen = mesh(SPHERE_S, M.mouth, { cast: false });
  mouthOpen.scale.set(0.04, 0.03, 0.015);
  mouthOpen.position.set(0, -0.16, faceZ - 0.012);
  mouthOpen.visible = false;
  mouthOpen.userData.noOutline = true;
  head.add(mouthOpen);

  if (hero === 'girl') buildGirlHair(head, M.hair, M.headband);
  else buildBoyHair(head, M.hair, M.skin);

  // ── Wonderbrush (hidden until the explorer takes it in the Prologue)
  const brush = new THREE.Group();
  brush.position.set(0, -0.02, 0.03);
  brush.rotation.set(Math.PI * 0.62, 0, -0.55);
  AR.hand.add(brush);
  const handle = mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.42, 10), M.wood);
  handle.position.y = 0.06;
  brush.add(handle);
  const ferrule = mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.08, 12), M.ferrule);
  ferrule.position.y = 0.3;
  brush.add(ferrule);
  const tip = mesh(new THREE.ConeGeometry(0.034, 0.12, 12), M.bristle);
  tip.position.y = 0.39;
  brush.add(tip);
  brush.visible = false;

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = o.castShadow !== false;
    }
  });
  // Animated / referenced parts stay separate; everything else merges per joint.
  for (const o of [mouthSmile, mouthOpen, tip, ...eyes]) o.userData.keep = true;
  mergeRigMeshes(body);
  addOutlines(body, 0.014, '#3a4352');

  return {
    root,
    body,
    hips,
    spine,
    neck,
    head,
    shoulderL: AL.shoulder,
    shoulderR: AR.shoulder,
    elbowL: AL.elbow,
    elbowR: AR.elbow,
    legL: L.leg,
    legR: R.leg,
    kneeL: L.knee,
    kneeR: R.knee,
    handR: AR.hand,
    eyes,
    mouthSmile,
    mouthOpen,
    brows,
    brush,
    brushTip: tip,
    scarfTail,
  };
}

/** Straight shoulder-length hair with fringe and a darker headband (girl reference). */
function buildGirlHair(head: THREE.Group, hair: THREE.Material, band: THREE.Material): void {
  const cap = mesh(UNIT.sphere, hair);
  cap.scale.set(0.43, 0.43, 0.41);
  cap.position.set(0, 0.06, -0.045);
  head.add(cap);
  // Side-swept fringe across the forehead.
  const fringe = mesh(UNIT.sphere, hair);
  fringe.scale.set(0.37, 0.12, 0.2);
  fringe.position.set(0.02, 0.25, 0.25);
  fringe.rotation.z = -0.12;
  head.add(fringe);
  const fringe2 = mesh(UNIT.sphere, hair);
  fringe2.scale.set(0.2, 0.12, 0.16);
  fringe2.position.set(-0.22, 0.15, 0.24);
  fringe2.rotation.z = 0.5;
  head.add(fringe2);
  // Long side locks framing the face down to the shoulders.
  for (const side of [-1, 1] as const) {
    const lock = mesh(new THREE.CapsuleGeometry(0.095, 0.42, 6, 12), hair);
    lock.position.set(0.335 * side, -0.2, 0.04);
    lock.rotation.z = -0.1 * side;
    lock.scale.set(1, 1, 0.75);
    head.add(lock);
    const tip = mesh(SPHERE_S, hair);
    tip.scale.set(0.11, 0.08, 0.08);
    tip.position.set(0.37 * side, -0.47, 0.04);
    head.add(tip);
  }
  // Back volume down to the shoulders.
  const back = mesh(UNIT.roundedBox, hair);
  back.scale.set(0.74, 0.62, 0.3);
  back.position.set(0, -0.16, -0.2);
  head.add(back);
  // Headband over the crown.
  const hb = mesh(new THREE.TorusGeometry(0.43, 0.032, 8, 40, Math.PI), band);
  hb.position.set(0, 0.04, 0.06);
  hb.rotation.set(-0.25, 0, 0);
  head.add(hb);
}

/** Big soft curls on top, side tufts and visible ears (boy reference). */
function buildBoyHair(head: THREE.Group, hair: THREE.Material, skin: THREE.Material): void {
  const cap = mesh(UNIT.sphere, hair);
  cap.scale.set(0.42, 0.37, 0.4);
  cap.position.set(0, 0.11, -0.05);
  head.add(cap);
  const curls: Array<[number, number, number, number]> = [
    [-0.24, 0.27, 0.12, 0.14],
    [-0.06, 0.36, 0.14, 0.16],
    [0.15, 0.33, 0.12, 0.15],
    [0.28, 0.2, 0.1, 0.13],
    [-0.3, 0.12, 0.02, 0.12],
    [0.02, 0.33, -0.2, 0.15],
    [-0.2, 0.25, -0.22, 0.14],
    [0.22, 0.25, -0.2, 0.14],
    [0.0, 0.14, -0.33, 0.15],
  ];
  for (const [x, y, z, r] of curls) {
    const c = mesh(SPHERE_S, hair);
    c.scale.set(r, r * 0.88, r);
    c.position.set(x, y, z);
    head.add(c);
  }
  // Front fringe curls.
  for (const [x, y] of [[-0.16, 0.21], [0.02, 0.24], [0.18, 0.2]] as const) {
    const c = mesh(SPHERE_S, hair);
    c.scale.set(0.11, 0.08, 0.08);
    c.position.set(x, y, 0.28);
    head.add(c);
  }
  // Pointed side tufts by the ears.
  for (const side of [-1, 1] as const) {
    const tuft = mesh(UNIT.cone, hair);
    tuft.scale.set(0.07, 0.24, 0.07);
    tuft.position.set(0.355 * side, 0.02, 0.06);
    tuft.rotation.set(Math.PI, 0, 0.12 * side);
    head.add(tuft);
    const ear = mesh(SPHERE_S, skin);
    ear.scale.set(0.05, 0.085, 0.04);
    ear.position.set(0.395 * side, -0.03, 0.0);
    head.add(ear);
  }
}
