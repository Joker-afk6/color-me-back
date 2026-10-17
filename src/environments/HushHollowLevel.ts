/**
 * Director Script P02 — Hush Hollow: the two sleeping stars (and the hub after the prologue).
 *  Tutorial A: move + camera, hop a safe 0.7 m brook (instant ledge reset), Basic Dash along a
 *              broad courtyard stripe (white-gold trail; red stays locked).
 *  Tutorial B: first star — a simple Wonderbrush tap.
 *  Tutorial C: second star — move, jump up a step, tap.
 *  Exit: berry stamps lead to the arch; it opens with gray petals and the camera looks toward the
 *        Orchard. Checkpoint ruby_entry.
 * Geometry marked PLACEHOLDER is greybox for gameplay; final art waits for model-sheet approval
 * (VISUAL_ASSET_MANIFEST.md).
 */
import * as THREE from 'three';
import { Level, type SpawnPoint } from '../core/Level';
import { PROLOGUE, PROLOGUE_PROMPTS } from '../data/script/prologue';
import { completePrologue, markPracticed, villageStarsComplete, wakeVillageStar } from '../state/progression';
import type { PracticeMove, VillageStar } from '../state/SaveData';
import { UNIT, mesh, RoundedBoxGeometry } from '../rendering/shapes';
import { labelTexture, paintNoiseTexture } from '../rendering/textures';
import { createSky } from '../rendering/Sky';
import { batchStatic } from '../rendering/batch';
import { HintLadder } from '../systems/Hints';
import { keycap } from '../ui/icons';
import { Rng } from '../utils/rng';
import { PAL, berry, berryArch, berryBush, cloud, cobblePath, fence, grassTufts, hill, house, lampPost, leaflessTree, place, rock, wonderStar, type Arch, type WonderStar } from './props';
import { PuffBird } from './creatures';
import { wordLabel, type WordLabel } from './labels';
import { BROOK, DASH_STRIPE } from './hushHollowLayout';

const ARCH_Z = -24;
const SPAWN_HOME = new THREE.Vector3(-0.6, 0, 11.4);
const SPAWN_ARCH = new THREE.Vector3(0, 0, -19.5);


interface StarSpot {
  id: VillageStar;
  star: WonderStar;
  pos: THREE.Vector3;
}

export class HushHollowLevel extends Level {
  readonly id = 'hushHollow' as const;
  readonly areaName = 'Hush Hollow';
  override music = 'village';
  override fogColor = '#d3d8de';
  override fogNear = 40;
  override fogFar = 140;

  private stars: StarSpot[] = [];
  private arch!: Arch;
  private archBright = 0;
  private archTarget = 0;
  private archBlocker!: ReturnType<Level['physics']['box']>;
  private mist!: THREE.Mesh;
  private birds: PuffBird[] = [];
  private t = 0;
  private busy = false;
  private leaving = false;
  private terraceTipShown = false;
  private hubNoticeShown = false;
  private brookTipShown = false;
  private dashTipShown = false;
  private dashLabel!: WordLabel;
  private hopLabel!: WordLabel;

  build(): void {
    const L = this.lib;
    const root = this.root;
    const P = this.physics;
    const decor = new THREE.Group();

    const sky = createSky({ zenith: '#a9c6e6', horizon: '#e3eaf1', ground: '#d3d8de' }, 'blue');
    root.add(sky);
    this.track(sky.material as THREE.Material);

    // Ground + boundary. The ground has a hole where the Tutorial A brook is.
    const groundShape = new THREE.Shape();
    groundShape.absarc(0, 0, 36, 0, Math.PI * 2, false);
    const brookHole = new THREE.Path();
    // Shape space: x = world x, y = -world z (the mesh is rotated -90° about X).
    const bz0 = -(BROOK.z + BROOK.width / 2);
    const bz1 = -(BROOK.z - BROOK.width / 2);
    brookHole.moveTo(BROOK.x0, bz0).lineTo(BROOK.x1, bz0).lineTo(BROOK.x1, bz1).lineTo(BROOK.x0, bz1).lineTo(BROOK.x0, bz0);
    groundShape.holes.push(brookHole);
    const groundGeo = new THREE.ShapeGeometry(groundShape, 48);
    const uv = groundGeo.attributes.uv!;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 36) / 72, (uv.getY(i) + 36) / 72);
    const ground = mesh(groundGeo, L.paint(PAL.grass, 'green', { roughness: 0.96, map: paintNoiseTexture(21, 9, 0.16) }), { cast: false });
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);
    // Ground colliders around the brook strip (the original single box spanned x −45..45, z −49..41).
    const bzN = BROOK.z - BROOK.width / 2;
    const bzS = BROOK.z + BROOK.width / 2;
    P.box(0, (-49 + bzN) / 2, 90, bzN + 49, -2, 0);
    P.box(0, (bzS + 41) / 2, 90, 41 - bzS, -2, 0);
    P.box((-45 + BROOK.x0) / 2, BROOK.z, BROOK.x0 + 45, BROOK.width, -2, 0);
    P.box((BROOK.x1 + 45) / 2, BROOK.z, 45 - BROOK.x1, BROOK.width, -2, 0);
    this.buildBrook(decor);
    this.buildDashStripe();
    for (const [x, z, w, d] of [[-25, -4, 1, 60], [25, -4, 1, 60], [0, 22, 52, 1], [0, -34, 52, 1]] as const) P.box(x, z, w, d, 0, 4, { walkable: false });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      place(root, hill(L, 18 + (i % 3) * 6, 7 + (i % 4) * 2.5, i % 2 ? PAL.grassDark : PAL.grass), Math.cos(a) * 58, -0.5, Math.sin(a) * 58);
    }
    for (let i = 0; i < 7; i++) place(root, cloud(L, 40 + i, 3.5 + (i % 3)), Math.cos(i * 0.9) * 55, 20 + (i % 3) * 5, Math.sin(i * 0.9) * 55);

    // Winding cobblestone path from home to the arch
    // (split at the brook so the cobbles never bridge the Tutorial A gap)
    const pathHome = [new THREE.Vector3(0, 0, 14.5), new THREE.Vector3(-2.4, 0, 9.5), new THREE.Vector3(-2.4, 0, BROOK.z + 0.5)];
    const pathPts = [new THREE.Vector3(-2.3, 0, BROOK.z - 0.5), new THREE.Vector3(-1.2, 0, 2), new THREE.Vector3(2.8, 0, -4), new THREE.Vector3(2.2, 0, -10), new THREE.Vector3(-0.8, 0, -16), new THREE.Vector3(0, 0, -21), new THREE.Vector3(0, 0, -30)];
    const dirtMat = L.paint('#D8D2C4', 'neutral', { roughness: 1 });
    for (const [pts, seed] of [[pathHome, 6], [pathPts, 7]] as const) {
      root.add(cobblePath(L, [...pts], 2.6, seed));
      const dirt = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...pts]), 60, 1.7, 8, false), dirtMat, { cast: false });
      dirt.scale.y = 0.02;
      dirt.position.y = -0.01;
      root.add(dirt);
    }
    this.buildBerryStamps(decor, new THREE.CatmullRomCurve3(pathPts));

    // Explorer's home (door faces the path)
    place(decor, house(L, 1, { roofColor: PAL.roofRed, roofKey: 'red', width: 4.4 }), 0, 0, 17.2, Math.PI);
    P.box(0, 17.2, 4.6, 3.9, 0, 6, { blocksCamera: true });
    const houses: Array<[number, number, number, string, 'red' | 'blue' | 'yellow' | 'purple' | 'orange']> = [
      [-11, 9, 0.9, PAL.roofRed, 'red'],
      [11.5, 10, -0.8, PAL.roofBlue, 'blue'],
      [-13, -4, 1.4, PAL.roofYellow, 'yellow'],
      [14, 1.5, -1.5, PAL.roofPurple, 'purple'],
      [-10.5, -15, 0.6, PAL.roofOrange, 'orange'],
      [16, -17, -0.9, PAL.roofRed, 'red'],
    ];
    houses.forEach(([x, z, rot, roof, key], i) => {
      place(decor, house(L, 10 + i, { roofColor: roof, roofKey: key }), x, 0, z, rot);
      P.box(x, z, 4.4, 4.0, 0, 6, { blocksCamera: true }, rot);
    });
    // Leafless silhouettes
    const treeSpots: Array<[number, number]> = [[-6, 12], [6.5, 14], [-16, 13], [17, 12], [-18, 3], [19, -6], [-6.5, -9], [7, -14], [-17, -10], [-4, -21], [5, -21.5], [18.5, -11]];
    treeSpots.forEach(([x, z], i) => {
      place(decor, leaflessTree(L, 100 + i, 3.2 + (i % 3) * 0.6), x, 0, z, i);
      P.cyl(x, z, 0.32, 0, 4, { blocksCamera: false });
    });
    // Bushes, rocks, lamps, fences
    for (const [x, z, s] of [[-4.5, 9.5, 0.9], [4.8, 6, 1.0], [-6, -4, 0.8], [6, -1.5, 0.9], [-3.5, -12, 0.8], [5.5, -18.5, 0.9]] as const) {
      place(decor, berryBush(L, Math.round(x * 10 + z), s, 0), x, 0, z);
      P.cyl(x, z, s * 0.9, 0, s * 1.4);
    }
    for (const [x, z] of [[-3.2, 4.5], [5.2, -7], [-2.5, -18.5], [2.8, 11]] as const) {
      place(decor, lampPost(L), x, 0, z, Math.atan2(-x, 0));
      P.cyl(x, z, 0.15, 0, 2.8);
    }
    for (const [x, z, len, rot] of [[-4.5, 15, 5, 0], [4.5, 15, 5, 0], [-6.8, -1, 6, 1.2], [6.2, 4, 5, 1.6]] as const) {
      place(decor, fence(L, len), x, 0, z, rot);
      P.box(x, z, len, 0.3, 0, 1.0, {}, rot);
    }
    const rr = new Rng(77);
    for (let i = 0; i < 14; i++) {
      const a = rr.range(0, Math.PI * 2);
      const d = rr.range(9, 22);
      place(decor, rock(L, 200 + i, rr.range(0.4, 1.0)), Math.cos(a) * d, 0, Math.sin(a) * d * 0.9, a);
    }
    // A stone well as a landmark next to the first star
    const well = this.buildWell();
    place(decor, well, -8, 0, 5.5);
    P.cyl(-8, 5.5, 1.1, 0, 1.0);
    root.add(grassTufts(L, 5, 520, (r) => {
      const a = r.range(0, Math.PI * 2);
      const d = Math.sqrt(r.next()) * 30;
      return [Math.cos(a) * d, Math.sin(a) * d];
    }));

    // Terrace with a small step (jump tutorial) for the second star
    const stoneMat = L.paint(PAL.stone, 'neutral', { roughness: 0.95, map: paintNoiseTexture(31, 2, 0.18) });
    const terrace = mesh(new RoundedBoxGeometry(6, 1.1, 5, 2, 0.12), stoneMat);
    terrace.position.set(10.5, 0.55, -8);
    decor.add(terrace);
    const terraceTop = mesh(new RoundedBoxGeometry(5.8, 0.12, 4.8, 2, 0.05), L.paint(PAL.grass, 'green', { roughness: 0.95 }));
    terraceTop.position.set(10.5, 1.12, -8);
    decor.add(terraceTop);
    P.box(10.5, -8, 6, 5, 0, 1.1);
    const step = mesh(new RoundedBoxGeometry(1.7, 0.55, 1.7, 2, 0.1), stoneMat);
    step.position.set(6.55, 0.275, -7.4);
    decor.add(step);
    P.box(6.55, -7.4, 1.7, 1.7, 0, 0.55);

    // Stars
    const addStar = (id: VillageStar, x: number, y: number, z: number) => {
      const star = wonderStar(L, true);
      place(root, star.group, x, y, z);
      P.cyl(x, z, 0.68, y, y + 1.0);
      const pos = new THREE.Vector3(x, y + 1.65, z);
      this.stars.push({ id, star, pos });
      this.game.interactions.add({
        id: `star-${id}`,
        position: pos,
        radius: 2.1,
        label: 'Wake the Wonderbrush star',
        enabled: () => this.game.save.prologue.phase === 'village' && !this.game.save.prologue.villageStars.includes(id) && !this.busy,
        minFeetY: y > 0 ? y - 0.05 : undefined,
        blockedText: y > 0 ? 'Hop up onto the terrace first! (Space)' : undefined,
        onInteract: () => void this.wakeStar(id),
      });
    };
    addStar('pathStar', -5, 0, 3);
    addStar('terraceStar', 11, 1.1, -8.6);

    // The berry arch to Ruby Orchard
    const { texture, aspect } = labelTexture('RUBY ORCHARD', { color: '#fff7e6', font: '700 64px Fredoka, system-ui, sans-serif' });
    this.track(texture);
    this.arch = berryArch(L, 'RUBY ORCHARD', texture, aspect);
    place(root, this.arch.group, 0, 0, ARCH_Z);
    for (const side of [-1, 1]) P.box(side * 2.2, ARCH_Z, 0.95, 0.95, 0, 4.4);
    this.archBlocker = P.box(0, ARCH_Z, 3.5, 0.6, 0, 4, { walkable: false });
    this.mist = mesh(UNIT.plane, L.basic('#ffffff', { transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), { cast: false, receive: false });
    this.mist.scale.set(3.6, 3.9, 1);
    this.mist.position.set(0, 1.95, ARCH_Z);
    this.mist.userData.dynamic = true;
    root.add(this.mist);
    // Hedges along the orchard lane beyond the arch
    const hedgeMat = L.paint(PAL.leafDark, 'green', { roughness: 0.9 });
    for (const side of [-1, 1]) {
      const hedge = mesh(new RoundedBoxGeometry(1.4, 1.6, 9, 3, 0.5), hedgeMat);
      hedge.position.set(side * 3.4, 0.8, ARCH_Z - 4.8);
      decor.add(hedge);
      P.box(side * 3.4, ARCH_Z - 4.8, 1.4, 9, 0, 1.6);
      const wing = mesh(new RoundedBoxGeometry(6, 1.6, 1.4, 3, 0.5), hedgeMat);
      wing.position.set(side * 5.8, 0.8, ARCH_Z + 0.3);
      decor.add(wing);
      P.box(side * 5.8, ARCH_Z + 0.3, 6, 1.4, 0, 1.6);
    }

    // PLACEHOLDER: a distant giant berry tree the exit camera looks toward (Orchard landmark).
    const farTree = leaflessTree(L, 911, 9);
    farTree.scale.setScalar(2.2);
    place(decor, farTree, 0, 0, -62);
    for (const [x, y, z] of [[-3, 15, -61], [3.5, 16.5, -63], [0.5, 19, -61.5], [-1.5, 12.5, -64]] as const) place(decor, berry(L, 1.3), x, y, z);

    // Village creatures (silent)
    for (let i = 0; i < 4; i++) {
      const bird = new PuffBird(L, 300 + i, new THREE.Vector3([-3, 6, -9, 9][i]!, 0, [6, 4, -8, -13][i]!));
      root.add(bird.group);
      this.birds.push(bird);
    }

    batchStatic(decor, root);
  }

  /** PLACEHOLDER greybox: the Tutorial A brook — a shallow channel with bright kerbs so the gap reads. */
  private buildBrook(decor: THREE.Group): void {
    const L = this.lib;
    const P = this.physics;
    const len = BROOK.x1 - BROOK.x0;
    const cx = (BROOK.x0 + BROOK.x1) / 2;
    const stone = L.paint(PAL.stoneDark, 'neutral', { roughness: 0.95 });
    // Bed: soft "water" (blue-keyed, so it stays gray until Chapter 2). Touching it = instant ledge reset.
    const bed = mesh(new THREE.BoxGeometry(len, 0.2, BROOK.width), L.paint(PAL.water, 'blue', { roughness: 0.3 }), { cast: false });
    bed.position.set(cx, BROOK.floorY + 0.1, BROOK.z);
    decor.add(bed);
    P.box(cx, BROOK.z, len, BROOK.width, -2, BROOK.floorY, { hazard: true, safe: false });
    for (const side of [-1, 1]) {
      const wall = mesh(new THREE.BoxGeometry(len, -BROOK.floorY, 0.06), stone, { cast: false });
      wall.position.set(cx, BROOK.floorY / 2, BROOK.z + side * (BROOK.width / 2 - 0.03));
      decor.add(wall);
      // Accessible white kerb (#F3EEE8): the edge is visible by value and shape, not hue.
      const kerb = mesh(new RoundedBoxGeometry(len, 0.07, 0.2, 2, 0.03), L.paint('#F3EEE8', 'neutral', { roughness: 0.7 }), { cast: false });
      kerb.position.set(cx, 0.035, BROOK.z + side * (BROOK.width / 2 + 0.1));
      decor.add(kerb);
    }
    for (const x of [BROOK.x0, BROOK.x1]) {
      const cap = mesh(new THREE.BoxGeometry(0.06, -BROOK.floorY, BROOK.width), stone, { cast: false });
      cap.position.set(x, BROOK.floorY / 2, BROOK.z);
      decor.add(cap);
    }
    this.hopLabel = wordLabel(L, 'HOP!  Space');
    this.hopLabel.group.position.set(-2.35, 2.1, BROOK.z);
    this.root.add(this.hopLabel.group);
  }

  /** PLACEHOLDER greybox: the broad courtyard stripe for Basic Dash practice (a felt runner with chevrons). */
  private buildDashStripe(): void {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#E4DFD3';
      ctx.fillRect(0, 0, 128, 512);
      ctx.strokeStyle = '#9A8F98';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 116, 500);
      ctx.fillStyle = '#F3EEE8';
      ctx.strokeStyle = '#3A3A40';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const y = 440 - i * 76;
        ctx.beginPath();
        ctx.moveTo(24, y + 26);
        ctx.lineTo(64, y - 10);
        ctx.lineTo(104, y + 26);
        ctx.lineTo(104, y + 44);
        ctx.lineTo(64, y + 8);
        ctx.lineTo(24, y + 44);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.track(tex);
    const len = DASH_STRIPE.z0 - DASH_STRIPE.z1;
    const stripe = mesh(new THREE.PlaneGeometry(DASH_STRIPE.width, len), this.lib.paint('#ffffff', 'neutral', { roughness: 0.95, map: tex }), { cast: false });
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(DASH_STRIPE.x, 0.075, (DASH_STRIPE.z0 + DASH_STRIPE.z1) / 2);
    this.root.add(stripe);
    this.dashLabel = wordLabel(this.lib, 'DASH  Shift');
    this.dashLabel.group.position.set(DASH_STRIPE.x + 2.2, 1.9, DASH_STRIPE.z0 - 0.6);
    this.root.add(this.dashLabel.group);
  }

  /** PLACEHOLDER: berry stamps on the road from the plaza to the arch (red-keyed: they turn red with Ruby). */
  private buildBerryStamps(decor: THREE.Group, curve: THREE.CatmullRomCurve3): void {
    const L = this.lib;
    const ink = L.paint(PAL.berry, 'red', { roughness: 0.8 });
    const leaf = L.paint('#F3EEE8', 'neutral', { roughness: 0.8 });
    for (let t = 0.42; t <= 0.86; t += 0.055) {
      const pt = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const stamp = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 18), ink, { cast: false });
      stamp.position.set(pt.x, 0.09, pt.z);
      decor.add(stamp);
      const tip = mesh(new THREE.ConeGeometry(0.11, 0.2, 3), leaf, { cast: false });
      tip.rotation.x = -Math.PI / 2;
      tip.rotation.z = -Math.atan2(tan.x, -tan.z);
      tip.position.set(pt.x + tan.x * 0.36, 0.1, pt.z + tan.z * 0.36);
      decor.add(tip);
    }
  }

  private buildWell(): THREE.Group {
    const L = this.lib;
    const g = new THREE.Group();
    const stone = L.paint(PAL.stone, 'neutral', { roughness: 0.95 });
    const ring = mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.9, 20, 1, true), stone);
    ring.position.y = 0.45;
    g.add(ring);
    const lip = mesh(new THREE.TorusGeometry(1.05, 0.14, 8, 24), stone);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.92;
    g.add(lip);
    const water = mesh(UNIT.circle, L.paint(PAL.water, 'blue', { roughness: 0.2 }), { cast: false });
    water.rotation.x = -Math.PI / 2;
    water.scale.setScalar(0.95);
    water.position.y = 0.5;
    g.add(water);
    const wood = L.paint(PAL.wood, 'orange', { roughness: 0.85 });
    for (const s of [-1, 1]) {
      const post = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), wood);
      post.position.set(s * 0.95, 1.8, 0);
      g.add(post);
    }
    const roof = mesh(new THREE.ConeGeometry(1.5, 0.9, 4), L.paint(PAL.roofBlue, 'blue', { roughness: 0.8 }));
    roof.position.y = 3.05;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const bucket = mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.3, 10), wood);
    bucket.position.set(0, 1.6, 0);
    g.add(bucket);
    return g;
  }

  // ───────────────────────────── Flow ─────────────────────────────

  spawn(): SpawnPoint {
    if (this.game.save.prologue.phase === 'complete') return { pos: SPAWN_ARCH.clone(), yaw: 0, cameraYaw: Math.PI };
    // Camera starts behind-right so the front door of home stays out of its way.
    return { pos: SPAWN_HOME.clone(), yaw: Math.PI, cameraYaw: 0.62 };
  }

  objective(): string {
    const s = this.game.save;
    if (s.prologue.phase === 'complete') {
      if (s.ruby.phase === 'complete') return 'Red is back in Hush Hollow! Whisperwave Bay (Chapter 2) is still being built.';
      return 'Walk through the berry arch to the Ruby Orchard';
    }
    const n = s.prologue.villageStars.length;
    if (n === 0 && !s.prologue.practiced.includes('jump')) return 'Hop over the little brook (Space)';
    if (n === 0 && !s.prologue.practiced.includes('dash')) return 'Dash along the stripe (run + Shift)';
    if (n < 2) return `Wake the two Wonderbrush stars (${n}/2)`;
    return PROLOGUE_PROMPTS.arch;
  }

  start(): void {
    const g = this.game;
    const s = g.save;
    for (const spot of this.stars) spot.star.setAwake(s.prologue.villageStars.includes(spot.id) || s.prologue.phase === 'complete');
    if (villageStarsComplete(s) || s.prologue.phase === 'complete') this.openArch(true);
    // Tutorial A labels only matter during the prologue.
    for (const [label, move] of [[this.hopLabel, 'jump'], [this.dashLabel, 'dash']] as const) {
      label.group.visible = s.prologue.phase === 'village';
      label.setDone(s.prologue.practiced.includes(move));
    }
    g.showPip(true);
    if (s.prologue.phase === 'village') {
      this.hints = this.makeHints();
      if (s.prologue.villageStars.length === 0) void this.arrival();
    }
  }

  private async arrival(): Promise<void> {
    const g = this.game;
    g.lock(true);
    await g.wait(0.6);
    await g.say(PROLOGUE.village);
    g.lock(false);
    g.toast(`${keycap('W')}${keycap('A')}${keycap('S')}${keycap('D')} walk · drag the mouse to look · ${keycap('Space')} hop`, 5);
    g.narrator.speak(PROLOGUE_PROMPTS.move);
  }

  private makeHints(): HintLadder {
    const g = this.game;
    const nearestSleeping = () => {
      const p = g.player!.position;
      return this.stars.filter((s) => !g.save.prologue.villageStars.includes(s.id)).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p))[0];
    };
    return new HintLadder('village-stars', [
      {
        after: 35,
        run: () => {
          const s = nearestSleeping();
          if (!s) return;
          g.pip.circle(s.pos);
          g.pipSays(s.id === 'terraceStar' ? 'A sleepy star is up on the stone terrace. Jump up the little step!' : 'There’s a sleepy star near the old well!');
          window.setTimeout(() => g.pip.circle(null), 6000);
        },
      },
      {
        after: 30,
        run: () => {
          const s = nearestSleeping();
          if (!s) return;
          const from = g.player!.position.clone().setY(1);
          for (let i = 1; i <= 8; i++) g.particles.sparkles(from.clone().lerp(s.pos, i / 8), { count: 3, color: '#fff3b0', speed: 0.3, life: 2.2, size: 0.32, gravity: 0, upward: 0.2 });
          g.pipSays('Follow the sparkles!');
        },
      },
      { after: 40, run: () => g.pipSays(this.objective()) },
    ]);
  }

  private async wakeStar(id: VillageStar): Promise<void> {
    const g = this.game;
    const spot = this.stars.find((s) => s.id === id);
    if (!spot || this.busy) return;
    this.busy = true;
    g.player?.play('brush');
    await g.wait(0.25);
    spot.star.setAwake(true);
    g.sfx('starWake');
    // Still no color: a white/gray sparkle (colors return only with the Guardians).
    g.particles.sparkles(spot.pos, { count: 40, colors: ['#ffffff', '#e6e9ee', '#c4cad3'], speed: 2.4, life: 1.3 });
    g.state.apply((s) => wakeVillageStar(s, id), true);
    g.hud.flashCheckpoint();
    this.hints?.progress();
    const count = g.save.prologue.villageStars.length;
    if (count === 1) {
      await g.say(PROLOGUE.firstStar);
      if (!this.game.save.prologue.villageStars.includes('terraceStar')) g.narrator.speak('The other star is up on the stone terrace.');
    } else {
      this.hints?.stop();
      await g.say(PROLOGUE.secondStar);
      await this.archCinematic();
    }
    this.busy = false;
  }

  /** P3 CAM — the welcoming arch brightens with a white star outline. */
  private async archCinematic(): Promise<void> {
    const g = this.game;
    await g.cutscene(async () => {
      const archPos = new THREE.Vector3(0, 3.2, ARCH_Z);
      await g.camera.moveTo(new THREE.Vector3(5, 4.2, ARCH_Z + 12), archPos, 2.2);
      this.openArch(false);
      g.sfx('starWake');
      g.particles.sparkles(new THREE.Vector3(0, 4.2, ARCH_Z + 0.5), { count: 60, colors: ['#ffffff', '#fff6d0'], speed: 3, life: 1.6 });
      this.grayPetals();
      await g.wait(2.2);
    });
  }

  /** Exit beat: curved petals fall silently in grayscale (reduced motion: fewer, slower). */
  private grayPetals(): void {
    const g = this.game;
    const n = g.settings.reducedMotion ? 10 : 28;
    for (let i = 0; i < n; i++) {
      const at = new THREE.Vector3((Math.random() - 0.5) * 4.4, 3.6 + Math.random() * 1.4, ARCH_Z + (Math.random() - 0.5) * 1.2);
      g.particles.puff(at, { count: 1, colors: ['#E6E3EA', '#C9C5CD', '#A9A4AD'], speed: 0.35, upward: 0, size: 0.28, life: 3.2, gravity: 0.35, drag: 1.5 });
    }
  }

  private openArch(instant: boolean): void {
    this.archTarget = 1;
    if (instant) this.archBright = 1;
    this.archBlocker.enabled = false;
  }

  override update(dt: number): void {
    this.t += dt;
    for (const s of this.stars) s.star.update(dt, this.t);
    for (const b of this.birds) b.update(dt, this.game.player?.position ?? null);
    this.hopLabel.update(this.t);
    this.dashLabel.update(this.t);
    this.archBright += (this.archTarget - this.archBright) * Math.min(1, dt * 1.5);
    this.arch.setBright(this.archBright);
    const mm = this.mist.material as THREE.MeshBasicMaterial;
    mm.opacity = 0.5 * (1 - this.archBright) + Math.sin(this.t * 1.3) * 0.04 * (1 - this.archBright);
    this.mist.visible = this.archBright < 0.98;
    this.hints?.update(dt);
    const g = this.game;
    const p = g.player;
    if (!p || g.locked || this.busy) return;
    const s = g.save;
    if (s.prologue.phase === 'village') this.tutorialA();
    // Tutorial C: jump tip near the terrace step (shown once per visit, spoken too).
    if (!this.terraceTipShown && s.prologue.phase === 'village' && !s.prologue.villageStars.includes('terraceStar') && p.position.distanceTo(new THREE.Vector3(6.55, 0, -7.4)) < 3.2) {
      this.terraceTipShown = true;
      g.toast(`${keycap('Space')} Jump up the step!`, 4);
      g.narrator.speak(PROLOGUE_PROMPTS.terrace);
    }
    // Arch still sleepy: a friendly nudge.
    if (s.prologue.phase === 'village' && !villageStarsComplete(s) && p.position.z < ARCH_Z + 2.5 && Math.abs(p.position.x) < 3 && !this.hubNoticeShown) {
      this.hubNoticeShown = true;
      g.pipSays('The arch is still sleepy. Let’s wake both stars first!');
      void this.tasks.wait(8).then(() => (this.hubNoticeShown = false));
    }
    // Walking through the arch
    if (!this.leaving && p.position.z < ARCH_Z - 1.2 && Math.abs(p.position.x) < 2.4) {
      if (s.prologue.phase === 'village' && villageStarsComplete(s)) void this.goToOrchard(true);
      else if (s.prologue.phase === 'complete') void this.goToOrchard(false);
    }
  }

  /** P02 Tutorial A: notice the hop over the brook and a dash on the stripe (tips shown once each). */
  private tutorialA(): void {
    const g = this.game;
    const p = g.player!;
    const s = g.save;
    const pos = p.position;
    const inBrookX = pos.x > BROOK.x0 - 0.2 && pos.x < BROOK.x1 + 0.2;
    if (!s.prologue.practiced.includes('jump')) {
      if (!this.brookTipShown && inBrookX && Math.abs(pos.z - BROOK.z) < 3.2) {
        this.brookTipShown = true;
        g.toast(`${keycap('Space')} Hop over the brook!`, 4);
        g.narrator.speak(PROLOGUE_PROMPTS.jump);
      }
      // A real hop near the brook counts (the ground here is flat at y = 0). Walking across is also
      // safe — the 0.7 m gap is narrower than the explorer's feet — so the tip simply stays up.
      if (inBrookX && Math.abs(pos.z - BROOK.z) < 4 && pos.y > 0.25) this.practiced('jump');
    } else if (!s.prologue.practiced.includes('dash')) {
      const nearStripe = Math.abs(pos.x - DASH_STRIPE.x) < DASH_STRIPE.width / 2 + 2.5 && pos.z < DASH_STRIPE.z0 + 2.5 && pos.z > DASH_STRIPE.z1 - 1;
      if (!this.dashTipShown && nearStripe) {
        this.dashTipShown = true;
        g.toast(`Run along the stripe, then tap ${keycap('Shift')} to dash!`, 4.5);
        g.narrator.speak(PROLOGUE_PROMPTS.dash);
      }
      const onStripe = Math.abs(pos.x - DASH_STRIPE.x) < DASH_STRIPE.width / 2 + 0.4 && pos.z < DASH_STRIPE.z0 + 0.4 && pos.z > DASH_STRIPE.z1 - 0.4;
      if (onStripe && p.motor.dashActive) this.practiced('dash');
    }
  }

  private practiced(move: PracticeMove): void {
    const g = this.game;
    if (!g.state.apply((s) => markPracticed(s, move), true)) return;
    this.hints?.progress();
    const at = g.player!.position.clone().setY(g.player!.position.y + 1);
    g.particles.sparkles(at, { count: 22, colors: ['#ffffff', '#fff1c9'], speed: 1.8, life: 1 });
    g.sfx('chime');
    if (move === 'jump') {
      this.hopLabel.setDone(true);
      g.pipSays('Hop! Just like that!');
    } else {
      this.dashLabel.setDone(true);
      g.pipSays('Whoosh! That’s your Dash. Now, those sleepy stars…');
      g.narrator.speak(PROLOGUE_PROMPTS.stars);
    }
  }

  private async goToOrchard(firstTime: boolean): Promise<void> {
    const g = this.game;
    this.leaving = true;
    g.lock(true);
    if (firstTime) {
      // Director Script checkpoint ruby_entry.
      g.checkpoint(completePrologue);
      // Exit camera: from the Explorer's feet toward the distant giant berry tree and the Orchard.
      await g.cutscene(async () => {
        const feet = g.player!.position.clone();
        g.camera.cut(feet.clone().add(new THREE.Vector3(0.6, 0.6, 2.2)), feet.clone().setY(0.3));
        await g.camera.moveTo(feet.clone().add(new THREE.Vector3(0, 4.5, 3)), new THREE.Vector3(0, 12, -62), 2.6);
        await g.camera.moveTo(new THREE.Vector3(0, 6, ARCH_Z - 14), new THREE.Vector3(0, 14, -62), 1.8);
      });
      await g.chapterCard('Chapter 1', 'The Ruby Orchard', 'Restore Red · Ruby the Rumble Dragon', 'ruby', [], 3.4);
    } else {
      g.state.persist();
    }
    g.lock(false);
    await g.changeLevel('rubyOrchard');
  }

  override fallMessage(): string | null {
    return this.game.save.prologue.phase === 'village' ? 'Splash! Let’s hop over the brook with Space.' : null;
  }
}
