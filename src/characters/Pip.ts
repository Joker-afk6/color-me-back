/**
 * Pip — the magical talking paintbrush companion.
 * Floats upright: the wooden handle tapers down like a little tail, the ferrule is Pip's face, and
 * the soft bristles form a flame-shaped hairdo. Three paint drops on the bristle tip are color-keyed
 * (red / blue / yellow) and the handle is orange-keyed — Pip "normally looks a little more colorful"
 * and regains color along with the world.
 */
import * as THREE from 'three';
import { MaterialLibrary } from '../rendering/paint';
import { addOutlines } from '../rendering/outline';
import { mergeRigMeshes } from '../rendering/batch';
import { UNIT, mesh, strokeGeometry } from '../rendering/shapes';
import { clamp, damp, dampAngle } from '../utils/math';

export type PipMood = 'happy' | 'worried' | 'excited' | 'thinking';

export class Pip {
  readonly root = new THREE.Group();
  private readonly bodyPivot = new THREE.Group();
  private readonly eyes: THREE.Mesh[] = [];
  private readonly pupils: THREE.Mesh[] = [];
  private readonly brows: THREE.Mesh[] = [];
  private readonly mouth: THREE.Mesh;
  private readonly mouthOpen: THREE.Mesh;
  private readonly glow: THREE.PointLight;
  readonly position = new THREE.Vector3();
  private readonly vel = new THREE.Vector3();
  private t = 0;
  private blink = 0;
  private blinkIn = 2.5;
  private talkingTime = 0;
  private loop: { t: number; duration: number; center: THREE.Vector3 } | null = null;
  private circleTarget: THREE.Vector3 | null = null;
  /** When set, Pip flies here instead of following the explorer. */
  goal: THREE.Vector3 | null = null;
  mood: PipMood = 'happy';
  facingYaw = 0;

  constructor(lib: MaterialLibrary) {
    const wood = lib.paint('#C69B6D', 'orange', { roughness: 0.6, rim: 0.25 });
    const metal = lib.paint('#DCE1E8', 'neutral', { roughness: 0.28, metalness: 0.55, rim: 0.3 });
    const bristle = lib.paint('#FFF6DD', 'neutral', { roughness: 0.75, rim: 0.3, emissive: '#fff1c8', emissiveIntensity: 0.25 });
    const eyeWhite = lib.paint('#FFFFFF', 'neutral', { roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.15, rim: 0 });
    const pupil = lib.paint('#1F2A44', 'neutral', { roughness: 0.2, rim: 0 });
    const mouthMat = lib.paint('#6B3A42', 'neutral', { roughness: 0.6, rim: 0 });

    this.root.add(this.bodyPivot);
    // Handle (tail)
    const handle = mesh(new THREE.CylinderGeometry(0.075, 0.035, 0.46, 14), wood);
    handle.position.y = -0.36;
    this.bodyPivot.add(handle);
    const knob = mesh(UNIT.sphere, wood);
    knob.scale.setScalar(0.045);
    knob.position.y = -0.6;
    this.bodyPivot.add(knob);
    // Ferrule (face)
    const ferrule = mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.24, 24), metal);
    this.bodyPivot.add(ferrule);
    for (const y of [-0.085, 0.085]) {
      const band = mesh(new THREE.TorusGeometry(y > 0 ? 0.152 : 0.13, 0.012, 6, 28), metal, { cast: false });
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      this.bodyPivot.add(band);
    }
    // Bristle tuft (flame shape via lathe)
    const prof = [
      [0.0, 0.0],
      [0.15, 0.0],
      [0.19, 0.08],
      [0.2, 0.18],
      [0.17, 0.3],
      [0.1, 0.42],
      [0.035, 0.5],
      [0.0, 0.53],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    const tuft = mesh(new THREE.LatheGeometry(prof, 24), bristle);
    tuft.position.y = 0.11;
    this.bodyPivot.add(tuft);
    // Three paint drops on the tip, one per primary (color-keyed).
    const drops: Array<[string, 'red' | 'blue' | 'yellow', number]> = [
      ['#EF4444', 'red', 0],
      ['#3B82F6', 'blue', (Math.PI * 2) / 3],
      ['#FACC15', 'yellow', (Math.PI * 4) / 3],
    ];
    for (const [hex, key, a] of drops) {
      const d = mesh(UNIT.sphere, lib.paint(hex, key, { roughness: 0.35, rim: 0.2 }));
      d.scale.set(0.07, 0.09, 0.07);
      d.position.set(Math.sin(a) * 0.07, 0.56, Math.cos(a) * 0.07);
      this.bodyPivot.add(d);
    }
    // Face on the ferrule (front = +Z)
    for (const side of [-1, 1] as const) {
      const eye = mesh(UNIT.sphere, eyeWhite, { cast: false });
      eye.scale.set(0.05, 0.062, 0.03);
      eye.position.set(0.058 * side, 0.02, 0.13);
      eye.rotation.y = 0.4 * side;
      this.bodyPivot.add(eye);
      this.eyes.push(eye);
      const p = mesh(UNIT.sphere, pupil, { cast: false });
      p.scale.set(0.026, 0.034, 0.02);
      p.position.set(0.058 * side + 0.004 * side, 0.016, 0.152);
      this.bodyPivot.add(p);
      this.pupils.push(p);
      const glint = mesh(UNIT.sphere, eyeWhite, { cast: false });
      glint.scale.setScalar(0.009);
      glint.position.set(0.066 * side + 0.01, 0.03, 0.172);
      this.bodyPivot.add(glint);
      const brow = mesh(strokeGeometry([new THREE.Vector3(-0.025, 0, 0), new THREE.Vector3(0, 0.008, 0), new THREE.Vector3(0.025, 0, 0)], 0.007, 8), pupil, { cast: false });
      brow.position.set(0.058 * side, 0.088, 0.142);
      this.bodyPivot.add(brow);
      this.brows.push(brow);
    }
    this.mouth = mesh(strokeGeometry([new THREE.Vector3(-0.03, 0.006, 0), new THREE.Vector3(0, -0.012, 0.004), new THREE.Vector3(0.03, 0.006, 0)], 0.008, 10), mouthMat, { cast: false });
    this.mouth.position.set(0, -0.045, 0.142);
    this.bodyPivot.add(this.mouth);
    this.mouthOpen = mesh(UNIT.sphere, mouthMat, { cast: false });
    this.mouthOpen.scale.set(0.025, 0.02, 0.01);
    this.mouthOpen.position.set(0, -0.05, 0.14);
    this.mouthOpen.visible = false;
    this.bodyPivot.add(this.mouthOpen);

    this.glow = new THREE.PointLight('#ffe9b0', 0.6, 4, 2);
    this.glow.position.y = 0.3;
    this.root.add(this.glow);
    this.root.scale.setScalar(0.95);
    for (const o of [...this.eyes, ...this.pupils, ...this.brows, this.mouth, this.mouthOpen]) {
      o.userData.noOutline = true;
      o.userData.keep = true;
    }
    mergeRigMeshes(this.bodyPivot);
    addOutlines(this.bodyPivot, 0.012, '#3a4352');
  }

  teleport(p: THREE.Vector3): void {
    this.position.copy(p);
    this.vel.set(0, 0, 0);
    this.root.position.copy(p);
  }

  /** Playful loop-the-loop (Prologue P1 entrance). */
  loopDeLoop(center: THREE.Vector3, duration = 1.4): void {
    this.loop = { t: 0, duration, center: center.clone() };
  }

  /** Circle a point (e.g. the Wonderbrush or a hinted object). null to stop. */
  circle(target: THREE.Vector3 | null): void {
    this.circleTarget = target ? target.clone() : null;
  }

  talk(seconds: number): void {
    this.talkingTime = Math.max(this.talkingTime, seconds);
  }

  stopTalking(): void {
    this.talkingTime = 0;
  }

  /**
   * Follow the explorer: hover beside and slightly behind their right shoulder, on a soft spring.
   * `lookAt` is where Pip's face turns (usually the camera or the current speaker).
   */
  update(dt: number, follow: THREE.Vector3, followYaw: number, lookAt: THREE.Vector3, reducedMotion: boolean): void {
    this.t += dt;
    const target = new THREE.Vector3();
    if (this.loop) {
      this.loop.t += dt;
      const k = clamp(this.loop.t / this.loop.duration, 0, 1);
      const a = k * Math.PI * 2;
      target.set(this.loop.center.x + Math.sin(a) * 0.9, this.loop.center.y + (1 - Math.cos(a)) * 0.8, this.loop.center.z);
      this.position.lerp(target, 1 - Math.exp(-14 * dt));
      this.bodyPivot.rotation.z = -a;
      if (k >= 1) {
        this.loop = null;
        this.bodyPivot.rotation.z = 0;
      }
    } else {
      if (this.circleTarget) {
        const a = this.t * 2.4;
        target.set(this.circleTarget.x + Math.sin(a) * 0.75, this.circleTarget.y + 0.5 + Math.sin(this.t * 3) * 0.1, this.circleTarget.z + Math.cos(a) * 0.75);
      } else if (this.goal) {
        target.copy(this.goal);
      } else {
        const side = followYaw - Math.PI * 0.62;
        target.set(follow.x + Math.sin(side) * 1.0, follow.y + 1.95, follow.z + Math.cos(side) * 1.0);
      }
      const bobAmp = reducedMotion ? 0.04 : 0.11;
      target.y += Math.sin(this.t * 2.6) * bobAmp;
      // Critically-damped spring toward the target.
      const k = 18;
      const d = 2 * Math.sqrt(k);
      const acc = target.clone().sub(this.position).multiplyScalar(k).sub(this.vel.clone().multiplyScalar(d));
      this.vel.addScaledVector(acc, dt);
      this.position.addScaledVector(this.vel, dt);
    }
    this.root.position.copy(this.position);

    // Face the look target; lean into movement.
    const toLook = lookAt.clone().sub(this.position);
    const yaw = Math.atan2(toLook.x, toLook.z);
    this.facingYaw = dampAngle(this.facingYaw, yaw, 6, dt);
    this.root.rotation.y = this.facingYaw;
    const speed = this.vel.length();
    if (!this.loop) {
      this.bodyPivot.rotation.x = damp(this.bodyPivot.rotation.x, clamp(speed * 0.05, 0, 0.4), 6, dt);
      this.bodyPivot.rotation.z = damp(this.bodyPivot.rotation.z, Math.sin(this.t * 1.7) * 0.08, 4, dt);
    }

    // Talking squash & stretch + mouth.
    this.talkingTime = Math.max(0, this.talkingTime - dt);
    const talking = this.talkingTime > 0;
    const squash = talking ? Math.sin(this.t * 14) * 0.05 : this.mood === 'excited' ? Math.sin(this.t * 9) * 0.04 : 0;
    this.bodyPivot.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
    const open = talking && Math.sin(this.t * 13) > -0.2;
    this.mouthOpen.visible = open;
    this.mouth.visible = !open;

    // Brows show mood.
    const browTilt = this.mood === 'worried' ? 0.35 : this.mood === 'thinking' ? 0.15 : this.mood === 'excited' ? -0.1 : 0;
    this.brows[0]!.rotation.z = -browTilt;
    this.brows[1]!.rotation.z = browTilt;
    const browY = this.mood === 'excited' ? 0.1 : 0.088;
    for (const b of this.brows) b.position.y = damp(b.position.y, browY, 8, dt);

    // Blink.
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blink = 0.12;
      this.blinkIn = 2 + Math.random() * 3;
    }
    this.blink = Math.max(0, this.blink - dt);
    const s = this.blink > 0 ? 0.1 : 1;
    for (const e of this.eyes) e.scale.y = 0.062 * s;
    for (const p of this.pupils) p.scale.y = 0.034 * s;
    this.glow.intensity = 0.45 + Math.sin(this.t * 3) * 0.12;
  }
}
