/**
 * Stage 2 — The Mirror Berry Puzzles. A painted arrow sits above each of three round mirrors;
 * a friendly white beam travels between them. Each Wonderbrush tap turns a mirror 90°; a dotted
 * trail shows where each mirror points. Route the beam into the second crystal.
 * Hint ladder: highlight first mirror → show the beam route → optional single-tap solve.
 */
import * as THREE from 'three';
import { DIR_VECTORS, RUBY_MIRROR_LAYOUT as LAYOUT, nextMirrorToFix, rotateCW, solutionPath, traceBeam, type Cell } from '../../../gameplay/mirrorPuzzle';
import { RUBY, RUBY_HELP } from '../../../data/script/rubyOrchard';
import { saveRubyMirrors } from '../../../state/progression';
import type { MirrorState, Orientation } from '../../../state/SaveData';
import { HintLadder } from '../../../systems/Hints';
import { UNIT, mesh, RoundedBoxGeometry } from '../../../rendering/shapes';
import { berry, rock } from '../../../environments/props';
import { easeOutBack } from '../../../utils/math';
import { cellPos } from '../layout';
import type { RescueStage, StageContext } from './StageContext';

const BEAM_Y = 1.45;

interface MirrorView {
  group: THREE.Group;
  turntable: THREE.Group;
  sparkle: number;
  dots: THREE.Mesh[];
}

export class MirrorStage implements RescueStage {
  done = false;
  private readonly orientations: Orientation[];
  private readonly mirrors: MirrorView[] = [];
  private readonly group = new THREE.Group();
  private beam = new THREE.Group();
  private ghost = new THREE.Group();
  private readonly beamMat: THREE.MeshBasicMaterial;
  private readonly ghostMat: THREE.MeshBasicMaterial;
  private readonly dotMat: THREE.MeshBasicMaterial;
  private readonly hintLadder: HintLadder;
  private twitchSaid = false;
  private crystal: THREE.Mesh | null = null;
  private crystalSpot: THREE.Vector3;
  private t = 0;
  private rise = 0;

  constructor(private readonly ctx: StageContext, saved: MirrorState) {
    this.orientations = [...saved];
    this.beamMat = ctx.lib.track(new THREE.MeshBasicMaterial({ color: '#fffbe6', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ghostMat = ctx.lib.track(new THREE.MeshBasicMaterial({ color: '#ffd96b', transparent: true, opacity: 0.55, depthWrite: false }));
    this.dotMat = ctx.lib.track(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }));
    this.crystalSpot = cellPos(LAYOUT.target.col, LAYOUT.target.row, 1.9);
    this.hintLadder = new HintLadder(
      'ruby-mirrors',
      [
        { after: 40, run: () => this.hintHighlight() },
        { after: 40, run: () => this.hintRoute() },
        { after: 45, run: () => this.hintSolveStep() },
      ],
      ctx.game.settings.assistMode ? 0.6 : 1,
    );
    this.build();
  }

  private build(): void {
    const { lib, root, physics } = this.ctx;
    root.add(this.group, this.beam, this.ghost);
    const stone = lib.paint('#CFCBC4', 'neutral', { roughness: 0.9 });
    const silver = lib.paint('#E8EDF4', 'neutral', { roughness: 0.08, metalness: 0.85, rim: 0.6, rimColor: '#ffffff' });
    const frame = lib.paint('#C9A36A', 'orange', { roughness: 0.5, metalness: 0.3 });
    const arrowMat = lib.paint('#FFFFFF', 'neutral', { roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.25 });
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.55);
    arrowShape.lineTo(0.42, 0.05);
    arrowShape.lineTo(0.16, 0.05);
    arrowShape.lineTo(0.16, -0.5);
    arrowShape.lineTo(-0.16, -0.5);
    arrowShape.lineTo(-0.16, 0.05);
    arrowShape.lineTo(-0.42, 0.05);
    arrowShape.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    arrowGeo.rotateX(-Math.PI / 2); // lie flat, pointing toward -z in shape → +z after... (see below)
    arrowGeo.rotateY(Math.PI);
    LAYOUT.mirrors.forEach((cell, i) => {
      const g = new THREE.Group();
      g.position.copy(cellPos(cell.col, cell.row));
      const ped = mesh(new THREE.CylinderGeometry(0.72, 0.85, 0.9, 24), stone);
      ped.position.y = 0.45;
      g.add(ped);
      const tt = new THREE.Group();
      tt.position.y = 0.9;
      g.add(tt);
      const plate = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 24), lib.paint('#B9B2A7', 'neutral', { roughness: 0.8 }));
      tt.add(plate);
      const disc = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 32), silver);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(0, 0.62, -0.1);
      tt.add(disc);
      const ring = mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 32), frame);
      ring.position.set(0, 0.62, -0.1);
      tt.add(ring);
      const arrow = mesh(arrowGeo, arrowMat);
      arrow.position.set(0, 1.55, 0);
      arrow.scale.setScalar(1.15);
      tt.add(arrow);
      const arrowTop = mesh(arrowGeo, arrowMat, { cast: false });
      arrowTop.position.set(0, 0.09, 0.25);
      arrowTop.scale.setScalar(0.8);
      tt.add(arrowTop);
      // dotted preview trail in the arrow direction
      const dots: THREE.Mesh[] = [];
      for (let k = 1; k <= 5; k++) {
        const d = mesh(UNIT.sphereLow, this.dotMat, { cast: false, receive: false });
        d.scale.setScalar(0.07);
        dots.push(d);
        this.group.add(d);
      }
      this.group.add(g);
      physics.cyl(g.position.x, g.position.z, 0.85, 0, 1.6);
      this.mirrors.push({ group: g, turntable: tt, sparkle: 0, dots });
      this.ctx.game.interactions.add({
        id: `mirror-${i}`,
        position: g.position.clone().setY(1.4),
        radius: 2.3,
        label: 'Turn the mirror',
        enabled: () => !this.done && this.rise >= 1,
        onInteract: () => this.tap(i),
      });
    });
    // Emitter (berry lantern), boulder blocker, receiver with the crystal.
    const em = new THREE.Group();
    em.position.copy(cellPos(LAYOUT.emitter.col, LAYOUT.emitter.row));
    const post = mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 10), lib.paint('#7A5A43', 'orange'));
    post.position.y = 0.75;
    em.add(post);
    const lantern = berry(lib, 0.42, '#FFF6D6', 'neutral');
    lantern.position.y = BEAM_Y;
    em.add(lantern);
    this.group.add(em);
    physics.cyl(em.position.x, em.position.z, 0.5, 0, 1.8);
    for (const b of LAYOUT.blockers) {
      const boulder = rock(lib, 33, 1.3);
      boulder.position.copy(cellPos(b.col, b.row, 0.3));
      this.group.add(boulder);
      physics.cyl(boulder.position.x, boulder.position.z, 1.05, 0, 1.6);
    }
    const rec = new THREE.Group();
    rec.position.copy(cellPos(LAYOUT.target.col, LAYOUT.target.row));
    const cup = mesh(new RoundedBoxGeometry(1.1, 1.1, 1.1, 3, 0.35), stone);
    cup.position.y = 0.55;
    rec.add(cup);
    this.group.add(rec);
    physics.cyl(rec.position.x, rec.position.z, 0.75, 0, 1.2);
    this.group.position.y = -2;
  }

  start(): void {
    const ruby = this.ctx.ruby;
    // Bring the second crystal down onto the receiver.
    const c = ruby.crystals[1]!;
    c.userData.detached = true;
    this.ctx.root.attach(c);
    const from = c.position.clone();
    this.ctx.tweens.add(1.6, (k) => {
      c.position.lerpVectors(from, this.crystalSpot, k);
      c.position.y += Math.sin(Math.PI * k) * 2.5;
    });
    this.crystal = c;
    this.ctx.tweens.add(1.4, (k) => {
      this.rise = k;
      this.group.position.y = -2 + 2 * easeOutBack(k);
    });
    this.ctx.game.sfx('bridge');
    this.refresh(false);
  }

  private tap(i: number): void {
    const g = this.ctx.game;
    this.orientations[i] = rotateCW(this.orientations[i]!);
    const tt = this.mirrors[i]!.turntable;
    const from = tt.rotation.y;
    const to = this.yawFor(this.orientations[i]!);
    const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    this.ctx.tweens.add(0.28, (k) => (tt.rotation.y = from + delta * k), easeOutBack);
    g.sfx('mirror');
    g.player?.play('interact');
    this.hintLadder.progress();
    g.state.apply((s) => saveRubyMirrors(s, [...this.orientations] as MirrorState), true);
    this.refresh(true);
  }

  private yawFor(o: Orientation): number {
    const v = DIR_VECTORS[o]!;
    return Math.atan2(v.col, v.row);
  }

  /** Rebuild the beam and previews from the pure trace. */
  private refresh(animated: boolean): void {
    const trace = traceBeam(LAYOUT, this.orientations);
    this.mirrors.forEach((m, i) => {
      if (!animated) m.turntable.rotation.y = this.yawFor(this.orientations[i]!);
      const v = DIR_VECTORS[this.orientations[i]!]!;
      m.dots.forEach((d, k) => {
        const base = cellPos(LAYOUT.mirrors[i]!.col, LAYOUT.mirrors[i]!.row, BEAM_Y);
        d.position.set(base.x + v.col * (0.9 + k * 0.5), BEAM_Y, base.z + v.row * (0.9 + k * 0.5));
      });
    });
    this.buildPath(this.beam, trace.path, this.beamMat, 0.09);
    if (!this.twitchSaid && trace.mirrorsHit.includes(1)) {
      this.twitchSaid = true;
      this.ctx.game.bark(RUBY.stage2Twitch);
      this.ctx.ruby.play('wingFlex');
    }
    if (trace.reachedTarget && !this.done) void this.solved();
  }

  private buildPath(into: THREE.Group, path: Cell[], mat: THREE.Material, radius: number): void {
    for (const c of [...into.children]) {
      into.remove(c);
      (c as THREE.Mesh).geometry?.dispose();
    }
    for (let i = 0; i < path.length - 1; i++) {
      const a = cellPos(path[i]!.col, path[i]!.row, BEAM_Y);
      const b = cellPos(path[i + 1]!.col, path[i + 1]!.row, BEAM_Y);
      const len = a.distanceTo(b);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8, 1, true), mat);
      seg.position.copy(a).lerp(b, 0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      seg.renderOrder = 4;
      into.add(seg);
    }
  }

  private async solved(): Promise<void> {
    const g = this.ctx.game;
    this.done = true;
    this.hintLadder.stop();
    for (let i = 0; i < 3; i++) g.interactions.remove(`mirror-${i}`);
    g.sfx('crystal');
    const pos = this.crystalSpot.clone();
    if (this.crystal) this.crystal.visible = false;
    this.ctx.ruby.freeCrystal(1);
    // "blossoms into white star particles"
    g.particles.sparkles(pos, { count: 90, colors: ['#ffffff', '#fff6d0'], speed: 4, life: 1.6, size: 0.45, star: true });
    this.ctx.ruby.wingsFree = 1;
    this.ctx.ruby.play('wingFlex');
    for (const c of this.ghost.children) (c as THREE.Mesh).visible = false;
  }

  /** Lower the mirrors out of the way (start of Stage 3). */
  retract(): void {
    this.ctx.tweens.add(1.0, (k) => (this.group.position.y = -2.4 * k));
    this.ctx.tweens.add(0.6, (k) => (this.beamMat.opacity = 0.85 * (1 - k)));
    this.ctx.tweens.add(1.0, () => {}).done.then(() => {
      this.group.visible = false;
      this.beam.visible = false;
    });
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.done && !this.ctx.game.locked) this.hintLadder.update(dt);
    this.beamMat.opacity = this.done ? this.beamMat.opacity : 0.7 + Math.sin(this.t * 6) * 0.15;
    for (const m of this.mirrors) {
      if (m.sparkle > 0) {
        m.sparkle -= dt;
        if (Math.random() < dt * 14) this.ctx.game.particles.sparkles(m.group.position.clone().setY(2.6), { count: 2, color: '#fff3b0', speed: 1, life: 0.9, size: 0.3 });
      }
    }
    if (this.crystal && !this.done) this.crystal.rotation.y += dt * 1.2;
  }

  hint(): void {
    this.hintLadder.request();
  }

  // Hint ladder steps
  private hintHighlight(): void {
    const i = nextMirrorToFix(LAYOUT, this.orientations);
    if (i === null) return;
    this.mirrors[i]!.sparkle = 5;
    this.ctx.game.pip.circle(this.mirrors[i]!.group.position.clone().setY(1.8));
    window.setTimeout(() => this.ctx.game.pip.circle(null), 5000);
    this.ctx.encourage(RUBY_HELP.mirrorHint1, 0);
  }

  private hintRoute(): void {
    this.buildPath(this.ghost, solutionPath(LAYOUT), this.ghostMat, 0.05);
    this.ghost.position.y = -0.35;
    this.ctx.encourage(RUBY_HELP.mirrorHint2, 0);
  }

  private hintSolveStep(): void {
    const i = nextMirrorToFix(LAYOUT, this.orientations);
    this.ctx.encourage(RUBY_HELP.mirrorHint3, 0);
    if (i !== null) this.tap(i);
  }

  dispose(): void {
    for (let i = 0; i < 3; i++) this.ctx.game.interactions.remove(`mirror-${i}`);
    for (const grp of [this.beam, this.ghost]) for (const c of grp.children) (c as THREE.Mesh).geometry?.dispose();
  }
}
