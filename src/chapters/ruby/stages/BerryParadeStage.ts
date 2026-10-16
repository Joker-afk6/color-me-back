/**
 * Stage 1 — The Bouncing Berry Parade (3D presentation of BerryParade logic).
 * Ground circles with berry icons + chime show where soft berries will land; a hit only bounces
 * the explorer gently back. After a clean wave the first crystal floats down to be tapped.
 */
import * as THREE from 'three';
import { BerryParade, DEFAULT_PARADE_TUNING, type LandingSpot, type ParadeEvent } from '../berryParadeLogic';
import { RUBY, RUBY_HELP } from '../../../data/script/rubyOrchard';
import { berry } from '../../../environments/props';
import { iconTexture } from '../../../rendering/textures';
import { UNIT, mesh } from '../../../rendering/shapes';
import { easeOutBack, easeInOutSine } from '../../../utils/math';
import { ORCH } from '../layout';
import type { RescueStage, StageContext } from './StageContext';

interface Telegraph {
  group: THREE.Group;
  ring: THREE.Mesh;
  age: number;
  life: number;
}

interface Faller {
  obj: THREE.Group;
  spot: LandingSpot;
  phase: 'fall' | 'bounce' | 'roll';
  t: number;
  dir: THREE.Vector2;
}

const FALL_TIME = 0.6;
const DROP_HEIGHT = 11;

export class BerryParadeStage implements RescueStage {
  done = false;
  private readonly parade: BerryParade;
  private waveT = 0;
  private readonly telegraphs = new Map<number, Telegraph>();
  private fallers: Faller[] = [];
  private scheduled = new Set<number>();
  private crystal: THREE.Mesh | null = null;
  private revealed = false;
  private hitCount = 0;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private readonly iconMat: THREE.MeshBasicMaterial;
  private t = 0;

  constructor(private readonly ctx: StageContext) {
    const assist = ctx.game.settings.assistMode;
    const tuning = { ...DEFAULT_PARADE_TUNING, center: { x: ORCH.arenaCenter.x, z: ORCH.arenaCenter.z }, arenaRadius: ORCH.arenaRadius - 1.5 };
    this.parade = new BerryParade(7, tuning, assist);
    this.ringMat = ctx.lib.track(new THREE.MeshBasicMaterial({ map: iconTexture('ring'), color: '#fff6cf', transparent: true, depthWrite: false, opacity: 0.95 }));
    this.iconMat = ctx.lib.track(new THREE.MeshBasicMaterial({ map: iconTexture('berry'), color: '#ffffff', transparent: true, depthWrite: false }));
  }

  start(): void {
    this.handle(this.parade.start(this.playerXZ()));
  }

  private playerXZ(): { x: number; z: number } {
    const p = this.ctx.game.player!.position;
    return { x: p.x, z: p.z };
  }

  update(dt: number): void {
    this.t += dt;
    const g = this.ctx.game;
    const p = g.player!;
    if (!this.revealed && !g.locked) {
      this.waveT += dt;
      // Spawn falling berries so they land exactly when the logic says.
      this.parade.currentSpots.forEach((spot, i) => {
        if (!this.scheduled.has(i) && this.waveT >= spot.landAt - FALL_TIME) {
          this.scheduled.add(i);
          this.spawnFaller(spot);
        }
      });
      this.handle(this.parade.update(dt, this.playerXZ(), p.position.y > 0.9));
    }
    // Telegraph circles grow and pulse.
    for (const [i, tg] of this.telegraphs) {
      tg.age += dt;
      const k = Math.min(1, tg.age / tg.life);
      const s = 0.35 + 0.65 * easeOutBack(Math.min(1, k * 1.3));
      tg.group.scale.setScalar(s * DEFAULT_PARADE_TUNING.circleRadius);
      tg.ring.rotation.z += dt * (1 + k * 3);
      (tg.ring.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(this.t * (6 + k * 10)) * 0.25;
      if (tg.age > tg.life + 0.4) {
        tg.group.removeFromParent();
        this.telegraphs.delete(i);
      }
    }
    // Falling, bouncing, rolling berries.
    for (const f of [...this.fallers]) {
      f.t += dt;
      if (f.phase === 'fall') {
        const k = Math.min(1, f.t / FALL_TIME);
        f.obj.position.y = DROP_HEIGHT * (1 - k * k);
        if (k >= 1) {
          f.phase = 'bounce';
          f.t = 0;
          f.obj.scale.set(1.25, 0.7, 1.25);
        }
      } else if (f.phase === 'bounce') {
        const k = Math.min(1, f.t / 0.55);
        f.obj.position.y = Math.sin(Math.PI * k) * 1.4;
        const sq = 1 - Math.min(1, f.t * 6);
        f.obj.scale.set(1 + 0.25 * sq, 1 - 0.3 * sq, 1 + 0.25 * sq);
        f.obj.position.x += f.dir.x * dt * 2;
        f.obj.position.z += f.dir.y * dt * 2;
        if (k >= 1) {
          f.phase = 'roll';
          f.t = 0;
        }
      } else {
        f.obj.position.x += f.dir.x * dt * 5;
        f.obj.position.z += f.dir.y * dt * 5;
        f.obj.rotateOnWorldAxis(new THREE.Vector3(f.dir.y, 0, -f.dir.x).normalize(), dt * 5);
        const fade = Math.max(0, 1 - f.t / 1.3);
        f.obj.scale.setScalar(fade);
        if (fade <= 0) {
          f.obj.removeFromParent();
          this.fallers.splice(this.fallers.indexOf(f), 1);
        }
      }
    }
    if (this.crystal) {
      this.crystal.rotation.y += dt * 1.5;
      const m = this.crystal.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.5 + Math.sin(this.t * 5) * 0.3;
    }
  }

  private handle(events: ParadeEvent[]): void {
    const g = this.ctx.game;
    for (const e of events) {
      switch (e.type) {
        case 'waveStart':
          this.waveT = 0;
          this.scheduled.clear();
          this.ctx.ruby.play('flick');
          if (e.wave === 1) g.soundCaption('Chime — a berry will land inside each circle');
          break;
        case 'telegraph': {
          g.sfx('telegraph');
          const group = new THREE.Group();
          const ring = mesh(UNIT.plane, this.ringMat, { cast: false, receive: false });
          ring.rotation.x = -Math.PI / 2;
          ring.scale.setScalar(2);
          group.add(ring);
          const icon = mesh(UNIT.plane, this.iconMat, { cast: false, receive: false });
          icon.rotation.x = -Math.PI / 2;
          icon.scale.setScalar(0.9);
          icon.position.y = 0.01;
          group.add(icon);
          group.position.set(e.spot.x, 0.05, e.spot.z);
          group.renderOrder = 3;
          this.ctx.root.add(group);
          this.telegraphs.set(e.index, { group, ring, age: 0, life: e.spot.landAt - e.spot.showAt });
          break;
        }
        case 'land': {
          g.sfx('berryLand');
          g.camera.shake(0.35, 0.25);
          g.particles.puff(new THREE.Vector3(e.spot.x, 0.3, e.spot.z), { count: 16, colors: ['#e9e4e6', '#cfc6ca'], speed: 3, upward: 1.5, size: 0.4, life: 0.7 });
          const tg = this.telegraphs.get(e.index);
          if (tg) tg.age = tg.life + 0.3;
          if (e.hitPlayer) {
            this.hitCount++;
            g.player!.motor.bounceFrom(e.spot.x, e.spot.z, 6.5, 6.2);
            g.player!.play('bonk');
            g.sfx('boing');
            this.ctx.encourage(RUBY_HELP.bounced[this.hitCount % RUBY_HELP.bounced.length]!, 4);
          }
          break;
        }
        case 'waveCleared':
          g.sfx('success');
          break;
        case 'waveMissed':
          if (e.totalMisses % 2 === 1) g.bark(RUBY.stage1Bother);
          else g.bark(RUBY.stage1Circle);
          break;
        case 'slowModeOn':
          this.ctx.encourage(RUBY_HELP.slowMode, 0);
          break;
        case 'reveal':
          this.revealed = true;
          this.revealCrystal(e.assisted);
          break;
      }
    }
  }

  private spawnFaller(spot: LandingSpot): void {
    const obj = berry(this.ctx.lib, 1.0);
    obj.position.set(spot.x, DROP_HEIGHT, spot.z);
    this.ctx.root.add(obj);
    const c = ORCH.arenaCenter;
    const dir = new THREE.Vector2(spot.x - c.x, spot.z - c.z);
    if (dir.lengthSq() < 0.01) dir.set(1, 0);
    dir.normalize();
    this.fallers.push({ obj, spot, phase: 'fall', t: 0, dir });
  }

  private revealCrystal(assisted: boolean): void {
    const g = this.ctx.game;
    const ruby = this.ctx.ruby;
    const c = ruby.crystals[0]!;
    c.userData.detached = true;
    this.ctx.root.attach(c);
    const from = c.position.clone();
    const p = g.player!.position;
    const toCenter = new THREE.Vector3(ORCH.arenaCenter.x - p.x, 0, ORCH.arenaCenter.z - p.z);
    const len = Math.min(2.6, toCenter.length());
    const dest = new THREE.Vector3(p.x, 1.25, p.z).add(toCenter.normalize().multiplyScalar(Math.max(1.8, len)));
    this.ctx.tweens.add(1.4, (k) => {
      c.position.lerpVectors(from, dest, k);
      c.position.y += Math.sin(Math.PI * k) * 3;
    }, easeInOutSine);
    this.crystal = c;
    g.sfx('chime');
    this.ctx.encourage(assisted ? RUBY_HELP.revealAssist : RUBY_HELP.revealed, 0);
    g.interactions.add({
      id: 'crystal-1',
      position: dest,
      radius: 2.3,
      label: 'Tap the crystal with your Wonderbrush',
      enabled: () => !this.done,
      onInteract: () => this.tapCrystal(),
    });
  }

  private tapCrystal(): void {
    const g = this.ctx.game;
    if (this.done || !this.crystal) return;
    this.done = true;
    g.player!.play('brush');
    const pos = this.crystal.getWorldPosition(new THREE.Vector3());
    this.crystal.visible = false;
    this.ctx.ruby.freeCrystal(0);
    g.interactions.remove('crystal-1');
    g.sfx('crystal');
    // "cracks into harmless sparkling dots"
    g.particles.sparkles(pos, { count: 70, colors: ['#ffffff', '#fff6d0', '#e4e9f2'], speed: 3.5, life: 1.4, size: 0.4 });
    this.ctx.ruby.play('tailWiggle');
    this.parade.complete();
  }

  hint(): void {
    const g = this.ctx.game;
    if (this.revealed) g.pipSays(RUBY_HELP.revealed);
    else g.bark(RUBY.stage1Circle);
  }

  dispose(): void {
    for (const t of this.telegraphs.values()) t.group.removeFromParent();
    for (const f of this.fallers) f.obj.removeFromParent();
    this.telegraphs.clear();
    this.fallers = [];
    this.ctx.game.interactions.remove('crystal-1');
  }
}
