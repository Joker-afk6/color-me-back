/**
 * Ruby the Rumble Dragon — original 3D interpretation of docs/reference-art/worlds/02_red.png
 * (round red head, two pointed ears, big friendly eyes, wide smile), expanded into a chubby,
 * child-friendly dragon. Red-keyed: she is gray until RED returns.
 *
 * Moods: anxious (trembling, worried brows) → happy → excited. One-shot moves: tail wiggle,
 * wing flex, wiggle-stomp dance, berry flick, joyful bounce. Three spell crystals orbit her
 * until each rescue stage frees one (they burst into harmless sparkles — never "damage").
 */
import * as THREE from 'three';
import { MaterialLibrary } from '../rendering/paint';
import { addOutlines } from '../rendering/outline';
import { mergeRigMeshes } from '../rendering/batch';
import { UNIT, crystalGeometry, mesh, softShape, smoothShapePoints, strokeGeometry } from '../rendering/shapes';
import { clamp, damp } from '../utils/math';

export type RubyMood = 'anxious' | 'happy' | 'excited';
export type RubyMove = 'tailWiggle' | 'wingFlex' | 'stomp' | 'bigStomp' | 'wiggle' | 'flick' | 'joy' | 'yawn';

const RED = '#E5484D';
const RED_LIGHT = '#F06A6E';
const BELLY = '#F7B2A6';
const WING = '#F58C7A';
const CREAM = '#FFF1D6';

export class RubyDragon {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly tailSegs: THREE.Group[] = [];
  private readonly wingL = new THREE.Group();
  private readonly wingR = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly footL = new THREE.Group();
  private readonly footR = new THREE.Group();
  private readonly pupils: THREE.Mesh[] = [];
  private readonly lids: THREE.Mesh[] = [];
  private readonly brows: THREE.Mesh[] = [];
  private readonly smile: THREE.Mesh;
  private readonly mouthOpen: THREE.Mesh;
  readonly crystals: THREE.Mesh[] = [];
  private readonly crystalOrbit = new THREE.Group();
  private readonly crystalFree = [false, false, false];
  mood: RubyMood = 'anxious';
  /** Wings stay folded while two or more crystals remain (the spell). */
  wingsFree = 0;
  private t = 0;
  private talkT = 0;
  private move: { kind: RubyMove; t: number; duration: number } | null = null;
  private blink = 0;
  private blinkIn = 2;
  private readonly lookTarget = new THREE.Vector3(0, 2, 10);
  private headYaw = 0;
  private headPitch = 0;
  /** Exposed for stage logic: 0..1 how high she is off the ground during a stomp. */
  hop = 0;

  constructor(lib: MaterialLibrary) {
    const red = lib.paint(RED, 'red', { roughness: 0.55, rim: 0.32, rimColor: '#ffd6cf' });
    const redLight = lib.paint(RED_LIGHT, 'red', { roughness: 0.55, rim: 0.25 });
    const belly = lib.paint(BELLY, 'red', { roughness: 0.7, rim: 0.2 });
    const wing = lib.paint(WING, 'red', { roughness: 0.6, rim: 0.3, side: THREE.DoubleSide });
    const cream = lib.paint(CREAM, 'neutral', { roughness: 0.6, rim: 0.2 });
    const white = lib.paint('#FFFFFF', 'neutral', { roughness: 0.25, emissive: '#ffffff', emissiveIntensity: 0.15, rim: 0 });
    const dark = lib.paint('#2A2030', 'neutral', { roughness: 0.25, rim: 0 });
    const blush = lib.paint('#FF9AA8', 'red', { roughness: 0.8, transparent: true, opacity: 0.8 });

    this.root.add(this.body);
    // Body + belly
    const torso = mesh(UNIT.sphere, red);
    torso.scale.set(2.15, 1.95, 1.85);
    torso.position.y = 2.05;
    this.body.add(torso);
    const tummy = mesh(UNIT.sphere, belly);
    tummy.scale.set(1.45, 1.5, 0.9);
    tummy.position.set(0, 1.85, 1.15);
    this.body.add(tummy);
    for (let i = 0; i < 3; i++) {
      const band = mesh(new THREE.TorusGeometry(1, 0.035, 6, 30, Math.PI * 0.8), lib.paint('#E9928A', 'red', { roughness: 0.7 }), { cast: false });
      band.scale.set(1.2 - i * 0.12, 0.6, 1);
      band.rotation.set(0, 0, Math.PI * 1.1);
      band.position.set(0, 1.3 + i * 0.45, 1.92 - Math.abs(i - 1) * 0.08);
      this.body.add(band);
    }
    // Feet
    for (const [foot, s] of [[this.footL, -1], [this.footR, 1]] as const) {
      foot.position.set(s * 1.15, 0.35, 0.95);
      this.body.add(foot);
      const f = mesh(UNIT.sphere, red);
      f.scale.set(0.78, 0.42, 1.0);
      foot.add(f);
      for (let k = -1; k <= 1; k++) {
        const toe = mesh(UNIT.sphereLow, cream, { cast: false });
        toe.scale.set(0.16, 0.13, 0.16);
        toe.position.set(k * 0.32, -0.1, 0.9);
        foot.add(toe);
      }
    }
    // Arms (little, hugging the tummy)
    for (const [arm, s] of [[this.armL, -1], [this.armR, 1]] as const) {
      arm.position.set(s * 1.55, 2.6, 0.95);
      this.body.add(arm);
      const a = mesh(new THREE.CapsuleGeometry(0.28, 0.6, 6, 10), red);
      a.position.set(s * 0.1, -0.35, 0.15);
      a.rotation.set(-0.6, 0, s * 0.5);
      arm.add(a);
      const hand = mesh(UNIT.sphereLow, redLight);
      hand.scale.setScalar(0.32);
      hand.position.set(s * -0.12, -0.75, 0.45);
      arm.add(hand);
    }
    // Wings (scalloped bat wings; folded while the spell holds)
    const wingPts = smoothShapePoints([
      [0, 0],
      [0.6, 0.9],
      [1.6, 1.5],
      [2.3, 1.1],
      [2.0, 0.5],
      [2.4, 0.0],
      [1.7, -0.3],
      [1.4, -0.9],
      [0.6, -0.5],
    ]);
    const wingGeo = softShape(wingPts, 0.06, 0.04);
    for (const [w, s] of [[this.wingL, -1], [this.wingR, 1]] as const) {
      w.position.set(s * 1.1, 3.2, -0.9);
      this.body.add(w);
      const m = mesh(wingGeo, wing);
      m.scale.set(s, 1, 1);
      m.rotation.y = s * 0.4;
      w.add(m);
    }
    // Back spikes
    for (let i = 0; i < 5; i++) {
      const sp = mesh(UNIT.cone, cream);
      const a = 0.25 + i * 0.32;
      sp.scale.set(0.24 - i * 0.02, 0.45 - i * 0.04, 0.24 - i * 0.02);
      sp.position.set(0, 2.05 + Math.cos(a) * 1.95, -Math.sin(a) * 1.85);
      sp.rotation.x = -a;
      this.body.add(sp);
    }
    // Tail: chain of segments ending in a heart-shaped tip.
    let parent: THREE.Object3D = this.body;
    const base = new THREE.Vector3(0, 0.9, -1.55);
    for (let i = 0; i < 7; i++) {
      const seg = new THREE.Group();
      seg.position.copy(i === 0 ? base : new THREE.Vector3(0, 0.12, -0.55));
      parent.add(seg);
      const r = 0.55 - i * 0.045;
      const ball = mesh(UNIT.sphere, red);
      ball.scale.set(r, r * 0.9, r * 1.15);
      seg.add(ball);
      this.tailSegs.push(seg);
      parent = seg;
    }
    const heart = smoothShapePoints([
      [0, -0.55],
      [0.55, 0.05],
      [0.45, 0.45],
      [0.12, 0.45],
      [0, 0.2],
      [-0.12, 0.45],
      [-0.45, 0.45],
      [-0.55, 0.05],
    ]);
    const tip = mesh(softShape(heart, 0.18, 0.06), redLight);
    tip.position.set(0, 0.25, -0.45);
    tip.rotation.x = -0.4;
    parent.add(tip);

    // Head
    this.head.position.set(0, 4.35, 0.55);
    this.body.add(this.head);
    const skull = mesh(UNIT.sphere, red);
    skull.scale.set(1.55, 1.35, 1.35);
    this.head.add(skull);
    const snout = mesh(UNIT.sphere, redLight);
    snout.scale.set(0.95, 0.62, 0.72);
    snout.position.set(0, -0.38, 1.0);
    this.head.add(snout);
    for (const s of [-1, 1]) {
      const n = mesh(UNIT.sphereLow, dark, { cast: false });
      n.scale.set(0.07, 0.05, 0.05);
      n.position.set(s * 0.25, -0.2, 1.68);
      this.head.add(n);
      // Ears (pointed, like the reference) and little horns
      const ear = mesh(UNIT.cone, red);
      ear.scale.set(0.42, 0.95, 0.3);
      ear.position.set(s * 1.0, 1.0, -0.15);
      ear.rotation.set(-0.1, 0, s * -0.55);
      this.head.add(ear);
      const inner = mesh(UNIT.cone, belly, { cast: false });
      inner.scale.set(0.26, 0.62, 0.12);
      inner.position.set(s * 0.98, 0.95, 0.05);
      inner.rotation.set(-0.1, 0, s * -0.55);
      this.head.add(inner);
      const horn = mesh(UNIT.cone, cream);
      horn.scale.set(0.18, 0.5, 0.18);
      horn.position.set(s * 0.42, 1.28, 0.2);
      horn.rotation.set(-0.35, 0, s * -0.2);
      this.head.add(horn);
      // Eyes
      const eye = mesh(UNIT.sphere, white, { cast: false });
      eye.scale.set(0.38, 0.42, 0.26);
      eye.position.set(s * 0.58, 0.22, 1.08);
      eye.rotation.y = s * 0.3;
      this.head.add(eye);
      const pupil = mesh(UNIT.sphere, dark, { cast: false });
      pupil.scale.set(0.2, 0.24, 0.12);
      pupil.position.set(s * 0.6, 0.2, 1.3);
      this.head.add(pupil);
      this.pupils.push(pupil);
      const glint = mesh(UNIT.sphereLow, white, { cast: false });
      glint.scale.setScalar(0.06);
      glint.position.set(s * 0.6 + 0.07, 0.3, 1.41);
      this.head.add(glint);
      const lid = mesh(UNIT.sphere, red, { cast: false });
      lid.scale.set(0.42, 0.2, 0.3);
      lid.position.set(s * 0.58, 0.55, 1.08);
      this.head.add(lid);
      this.lids.push(lid);
      const brow = mesh(strokeGeometry([new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(0, 0.06, 0.02), new THREE.Vector3(0.22, 0, 0)], 0.045, 10), dark, { cast: false });
      brow.position.set(s * 0.6, 0.78, 1.12);
      this.head.add(brow);
      this.brows.push(brow);
      const cheek = mesh(UNIT.sphereLow, blush, { cast: false });
      cheek.scale.set(0.24, 0.14, 0.08);
      cheek.position.set(s * 0.98, -0.25, 0.85);
      cheek.rotation.y = s * 0.6;
      this.head.add(cheek);
    }
    this.smile = mesh(strokeGeometry([new THREE.Vector3(-0.42, 0.06, 0), new THREE.Vector3(-0.2, -0.08, 0.06), new THREE.Vector3(0.2, -0.08, 0.06), new THREE.Vector3(0.42, 0.06, 0)], 0.05, 16), dark, { cast: false });
    this.smile.position.set(0, -0.62, 1.38);
    this.head.add(this.smile);
    this.mouthOpen = mesh(UNIT.sphere, lib.paint('#7A2834', 'neutral', { roughness: 0.6 }), { cast: false });
    this.mouthOpen.scale.set(0.32, 0.2, 0.12);
    this.mouthOpen.position.set(0, -0.66, 1.36);
    this.mouthOpen.visible = false;
    this.head.add(this.mouthOpen);

    // Spell crystals orbiting her
    const crystalMat = lib.paint('#DADDE4', 'neutral', { roughness: 0.15, metalness: 0.1, flatShading: true, emissive: '#cfd6e6', emissiveIntensity: 0.18, rim: 0.5, rimColor: '#ffffff' });
    for (let i = 0; i < 3; i++) {
      const c = mesh(crystalGeometry(0.55, 1.5), crystalMat);
      c.userData.noOutline = true;
      this.crystals.push(c);
      this.crystalOrbit.add(c);
    }
    this.root.add(this.crystalOrbit);

    for (const o of [...this.pupils, this.smile, this.mouthOpen, ...this.brows]) o.userData.noOutline = true;
    for (const o of [...this.pupils, ...this.lids, ...this.brows, this.smile, this.mouthOpen]) o.userData.keep = true;
    mergeRigMeshes(this.body);
    addOutlines(this.body, 0.03, '#4a2a35');
  }

  play(kind: RubyMove): void {
    const d: Record<RubyMove, number> = { tailWiggle: 1.6, wingFlex: 1.6, stomp: 0.9, bigStomp: 1.3, wiggle: 1.2, flick: 0.8, joy: 2.4, yawn: 1.6 };
    this.move = { kind, t: 0, duration: d[kind] };
  }

  talk(seconds: number): void {
    this.talkT = Math.max(this.talkT, seconds);
  }

  lookAt(p: THREE.Vector3): void {
    this.lookTarget.copy(p);
  }

  /** Burst crystal i (rescue progress). Returns its world position for sparkles. */
  freeCrystal(i: number): THREE.Vector3 {
    const c = this.crystals[i]!;
    const p = c.getWorldPosition(new THREE.Vector3());
    this.crystalFree[i] = true;
    c.visible = false;
    return p;
  }

  isCrystalFree(i: number): boolean {
    return this.crystalFree[i] ?? false;
  }

  /** Detach a crystal for a stage (it flies to the stage position); returns it. */
  crystalWorld(i: number): THREE.Vector3 {
    return this.crystals[i]!.getWorldPosition(new THREE.Vector3());
  }

  get headWorld(): THREE.Vector3 {
    return this.head.getWorldPosition(new THREE.Vector3());
  }

  get chestWorld(): THREE.Vector3 {
    return this.body.localToWorld(new THREE.Vector3(0, 2.3, 1.4));
  }

  update(dt: number): void {
    this.t += dt;
    const t = this.t;
    const anxious = this.mood === 'anxious';
    // Breathing + anxious tremble
    const breath = Math.sin(t * 1.6) * 0.03;
    let bodyY = 0;
    let bodyRotZ = 0;
    let bodyRotX = 0;
    let squash = 0;
    const tremble = anxious ? Math.sin(t * 38) * 0.012 : 0;
    // One-shot moves
    let tailAmp = anxious ? 0.12 : 0.25;
    let tailSpeed = anxious ? 2 : 3;
    let wingOpen = this.wingsFree >= 2 ? 0.35 + Math.sin(t * 2) * 0.1 : this.wingsFree === 1 ? 0.15 : 0;
    let wingFlap = 0;
    let armLift = 0;
    this.hop = 0;
    if (this.move) {
      const m = this.move;
      m.t += dt;
      const k = clamp(m.t / m.duration, 0, 1);
      const env = Math.sin(Math.PI * k);
      switch (m.kind) {
        case 'tailWiggle':
          tailAmp = 0.9 * env;
          tailSpeed = 9;
          squash = Math.sin(m.t * 12) * 0.05 * env;
          break;
        case 'wingFlex':
          wingOpen = Math.max(wingOpen, 1.0 * env);
          break;
        case 'wiggle':
          bodyRotZ = Math.sin(m.t * 14) * 0.12 * env;
          tailAmp = 0.6;
          tailSpeed = 8;
          break;
        case 'stomp':
        case 'bigStomp': {
          const big = m.kind === 'bigStomp';
          // up (anticipation) then down
          const up = k < 0.55 ? Math.sin((k / 0.55) * Math.PI * 0.5) : Math.max(0, 1 - (k - 0.55) / 0.12);
          this.hop = up;
          bodyY = up * (big ? 1.1 : 0.55);
          squash = k > 0.6 && k < 0.85 ? (1 - Math.abs(k - 0.72) / 0.13) * (big ? 0.22 : 0.12) : -up * 0.06;
          armLift = up;
          wingOpen = Math.max(wingOpen, up * (this.wingsFree ? 0.8 : 0.2));
          break;
        }
        case 'flick':
          tailAmp = 1.2 * env;
          tailSpeed = 6;
          break;
        case 'joy':
          bodyY = Math.abs(Math.sin(m.t * 6)) * 0.7;
          squash = -Math.abs(Math.sin(m.t * 6)) * 0.08;
          wingFlap = 1;
          armLift = 1;
          tailAmp = 0.7;
          tailSpeed = 7;
          break;
        case 'yawn':
          this.mouthOpen.visible = true;
          break;
      }
      if (m.t >= m.duration) this.move = null;
    }
    if (this.mood === 'excited' && !this.move) {
      bodyY = Math.abs(Math.sin(t * 4)) * 0.25;
      wingFlap = this.wingsFree >= 2 ? 0.6 : 0;
    }
    this.body.position.y = damp(this.body.position.y, bodyY, 18, dt);
    this.body.position.x = tremble;
    this.body.rotation.z = damp(this.body.rotation.z, bodyRotZ, 12, dt);
    this.body.rotation.x = damp(this.body.rotation.x, bodyRotX, 8, dt);
    this.body.scale.set(1 + squash * 0.6, 1 + breath - squash, 1 + squash * 0.6);

    // Tail wave
    this.tailSegs.forEach((s, i) => {
      s.rotation.y = Math.sin(t * tailSpeed - i * 0.6) * tailAmp * (0.4 + i * 0.12);
      s.rotation.x = -0.18 + Math.sin(t * tailSpeed * 0.5 - i * 0.4) * 0.05;
    });
    // Wings
    const flap = wingFlap ? Math.sin(t * 14) * 0.6 * wingFlap : 0;
    this.wingL.rotation.y = damp(this.wingL.rotation.y, -wingOpen - flap, 10, dt);
    this.wingR.rotation.y = damp(this.wingR.rotation.y, wingOpen + flap, 10, dt);
    // Arms
    this.armL.rotation.z = damp(this.armL.rotation.z, -armLift * 1.4, 10, dt);
    this.armR.rotation.z = damp(this.armR.rotation.z, armLift * 1.4, 10, dt);
    // Head looks at the target
    const hw = this.head.getWorldPosition(new THREE.Vector3());
    const to = this.lookTarget.clone().sub(hw);
    const rootYaw = this.root.rotation.y;
    const yaw = Math.atan2(to.x, to.z) - rootYaw;
    const pitch = Math.atan2(-to.y, Math.hypot(to.x, to.z));
    this.headYaw = damp(this.headYaw, clamp(Math.atan2(Math.sin(yaw), Math.cos(yaw)), -0.7, 0.7), 4, dt);
    this.headPitch = damp(this.headPitch, clamp(pitch * 0.6, -0.35, 0.35), 4, dt);
    this.head.rotation.set(this.headPitch + (anxious ? Math.sin(t * 3) * 0.03 : 0), this.headYaw, Math.sin(t * 1.2) * 0.05);

    // Face
    this.talkT = Math.max(0, this.talkT - dt);
    const talking = this.talkT > 0 && Math.sin(t * 12) > -0.3;
    this.mouthOpen.visible = talking || this.move?.kind === 'yawn' || this.move?.kind === 'joy';
    this.smile.visible = !this.mouthOpen.visible;
    const browTilt = anxious ? 0.4 : this.mood === 'excited' ? -0.15 : 0;
    this.brows[0]!.rotation.z = -browTilt;
    this.brows[1]!.rotation.z = browTilt;
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blink = 0.14;
      this.blinkIn = 2.5 + Math.random() * 2.5;
    }
    this.blink = Math.max(0, this.blink - dt);
    for (const lid of this.lids) {
      lid.position.y = this.blink > 0 ? 0.3 : anxious ? 0.5 : 0.62;
      lid.scale.y = this.blink > 0 ? 0.4 : 0.2;
    }
    // Pupils glance toward the look target a little
    for (const p of this.pupils) p.position.x = Math.sign(p.position.x) * 0.6 + this.headYaw * 0.05;

    // Orbiting crystals
    this.crystalOrbit.rotation.y = t * 0.45;
    this.crystals.forEach((c, i) => {
      if (this.crystalFree[i] || c.userData.detached) return;
      const a = (i / 3) * Math.PI * 2;
      c.position.set(Math.sin(a) * 3.3, 3.4 + Math.sin(t * 1.4 + i * 2) * 0.35 + i * 0.25, Math.cos(a) * 3.3);
      c.rotation.y = t * 1.2 + i;
    });
  }
}
