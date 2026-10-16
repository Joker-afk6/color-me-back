/**
 * Stage 3 — The Friendly Dragon Dance. Ruby chants and stomps three times (slow, beat-marked by
 * floor symbols 1-2-3); soft ripples roll out. Climb a raised berry platform before the biggest
 * wiggle, then sweep-paint (hold E) the last gem when the final stomp lifts it into view.
 * Missing it is fine — Ruby simply dances again.
 */
import * as THREE from 'three';
import { DANCE_TUNING, DANCE_TUNING_ASSIST, DragonDance, rippleTouches, type DanceEvent } from '../dragonDanceLogic';
import { RUBY, RUBY_HELP } from '../../../data/script/rubyOrchard';
import { UNIT, mesh } from '../../../rendering/shapes';
import { iconTexture } from '../../../rendering/textures';
import { easeOutBack, easeInOutSine } from '../../../utils/math';
import { ORCH } from '../layout';
import type { RescueStage, StageContext } from './StageContext';

export class DanceStage implements RescueStage {
  done = false;
  private readonly dance: DragonDance;
  private readonly platforms: THREE.Group[] = [];
  private readonly beatMats: THREE.MeshBasicMaterial[] = [];
  private readonly beatGlow = [0, 0, 0];
  private ringMeshes: THREE.Mesh[] = [];
  private readonly ringMat: THREE.MeshBasicMaterial;
  private readonly hitRipples = new WeakSet<object>();
  private gem: THREE.Mesh | null = null;
  private gemHome = new THREE.Vector3();
  private gemPlatform = 0;
  private gemTween: { cancel(): void } | null = null;
  private t = 0;
  private started = false;
  private bigMissed = 0;

  constructor(private readonly ctx: StageContext) {
    this.dance = new DragonDance(ctx.game.settings.assistMode ? DANCE_TUNING_ASSIST : DANCE_TUNING);
    this.ringMat = ctx.lib.track(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }));
    this.build();
  }

  private build(): void {
    const { lib, root, physics } = this.ctx;
    const top = ORCH.platformTop;
    const r = ORCH.platformRadius;
    const berryMat = lib.paint('#E5383B', 'red', { roughness: 0.45, rim: 0.3, rimColor: '#ffd6d6' });
    const capMat = lib.paint('#FFF3E6', 'neutral', { roughness: 0.7 });
    const leafMat = lib.paint('#4F9C58', 'green', { roughness: 0.7 });
    ORCH.dancePlatforms.forEach((p, i) => {
      const g = new THREE.Group();
      const body = mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, Math.PI * 0.18, Math.PI * 0.82), berryMat);
      body.scale.set(r, top * 1.05, r);
      body.position.y = top * 0.15;
      g.add(body);
      const cap = mesh(new THREE.CylinderGeometry(r * 0.83, r * 0.85, 0.12, 28), capMat);
      cap.position.y = top;
      g.add(cap);
      for (let k = 0; k < 5; k++) {
        const leaf = mesh(UNIT.sphereLow, leafMat, { cast: false });
        const a = (k / 5) * Math.PI * 2;
        leaf.scale.set(0.42, 0.06, 0.2);
        leaf.position.set(Math.cos(a) * r * 0.75, top + 0.07, Math.sin(a) * r * 0.75);
        leaf.rotation.y = -a;
        g.add(leaf);
      }
      // A low helper step on the side facing the arena centre (two small hops instead of one big one).
      const toC = new THREE.Vector3(ORCH.arenaCenter.x - p.x, 0, ORCH.arenaCenter.z - p.z).normalize();
      const stepPos = toC.clone().multiplyScalar(r + 0.55);
      const step = mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.62, 18), berryMat);
      step.position.set(stepPos.x, 0.31, stepPos.z);
      g.add(step);
      g.position.set(p.x, -top - 0.2, p.z);
      g.visible = false;
      root.add(g);
      this.platforms.push(g);
      physics.cyl(p.x, p.z, r * 0.92, 0, top, { enabled: false, tag: `danceplat-${i}` });
      physics.cyl(p.x + stepPos.x, p.z + stepPos.z, 0.66, 0, 0.62, { enabled: false, tag: `dancestep-${i}` });
    });
    // Beat symbols 1-2-3 on the floor in front of Ruby.
    (['footprint1', 'footprint2', 'footprint3'] as const).forEach((name, i) => {
      const m = lib.track(new THREE.MeshBasicMaterial({ map: iconTexture(name), color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
      const decal = mesh(UNIT.plane, m, { cast: false, receive: false });
      decal.rotation.x = -Math.PI / 2;
      decal.scale.setScalar(2.1);
      decal.position.copy(ORCH.beatSpots[i]!).setY(0.04);
      root.add(decal);
      this.beatMats.push(m);
    });
  }

  start(): void {
    const { physics, tweens } = this.ctx;
    // Platforms rise up out of the orchard floor.
    for (const g of this.platforms) {
      g.visible = true;
      const y0 = g.position.y;
      tweens.add(1.3, (k) => (g.position.y = y0 * (1 - easeOutBack(k))));
    }
    this.ctx.game.sfx('bridge');
    tweens.add(1.3, () => {}).done.then(() => {
      for (const c of physics.colliders) if (c.tag.startsWith('danceplat-') || c.tag.startsWith('dancestep-')) c.enabled = true;
      this.started = true;
      this.handle(this.dance.start());
    });
  }

  update(dt: number): void {
    this.t += dt;
    const g = this.ctx.game;
    if (this.started && !this.done && !g.locked) {
      const sweeping = g.interactions.sweeping && g.interactions.focus?.target.id === 'gem-3';
      this.handle(this.dance.update(dt, sweeping));
      this.checkRipples();
      if (sweeping && this.gem) {
        const tip = g.player!.brushTipWorld();
        if (Math.random() < dt * 30) g.particles.line(tip, this.gem.position, { count: 2, color: '#fff3b0', size: 0.25, life: 0.6 });
        if (Math.random() < dt * 6) g.sfx('sweep');
      }
    }
    // Beat symbols glow then fade.
    this.beatMats.forEach((m, i) => {
      this.beatGlow[i] = Math.max(0, this.beatGlow[i]! - dt * 0.7);
      m.opacity = 0.32 + this.beatGlow[i]! * 0.68;
      m.color.setScalar(0.8 + this.beatGlow[i]! * 0.2);
    });
    // Ripple rings follow the logic's ripples.
    const ripples = this.dance.ripples;
    while (this.ringMeshes.length < ripples.length) {
      const ring = mesh(new THREE.TorusGeometry(1, 0.12, 8, 64), this.ringMat, { cast: false, receive: false });
      ring.rotation.x = Math.PI / 2;
      this.ctx.root.add(ring);
      this.ringMeshes.push(ring);
    }
    this.ringMeshes.forEach((ring, i) => {
      const rp = ripples[i];
      ring.visible = !!rp;
      if (!rp) return;
      const height = rp.beat === 3 ? 0.55 : rp.beat === 2 ? 0.3 : 0.2;
      ring.position.set(ORCH.rubyPos.x, 0.1 + height * 0.5, ORCH.rubyPos.z);
      ring.scale.set(Math.max(0.01, rp.radius), Math.max(0.01, rp.radius), 1 + height * 3);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * Math.max(0, 1 - rp.radius / 26);
    });
    if (this.gem) this.gem.rotation.y += dt * 2;
  }

  private checkRipples(): void {
    const g = this.ctx.game;
    const p = g.player!;
    const d = Math.hypot(p.position.x - ORCH.rubyPos.x, p.position.z - ORCH.rubyPos.z);
    for (const rp of this.dance.ripples) {
      if (this.hitRipples.has(rp) || !rippleTouches(rp, d)) continue;
      this.hitRipples.add(rp);
      const onFloor = p.motor.grounded && p.position.y < 0.35;
      if (!onFloor) continue;
      if (rp.beat === 3) {
        p.motor.bounceFrom(ORCH.rubyPos.x, ORCH.rubyPos.z, 7, 6.5);
        p.play('bonk');
        g.sfx('boing');
        this.bigMissed++;
        this.ctx.encourage(RUBY_HELP.danceHint, 3);
      } else {
        p.motor.bounceFrom(ORCH.rubyPos.x, ORCH.rubyPos.z, 2.2, 4.6);
        g.sfx('boing');
      }
    }
  }

  private handle(events: DanceEvent[]): void {
    const g = this.ctx.game;
    const ruby = this.ctx.ruby;
    for (const e of events) {
      switch (e.type) {
        case 'chant':
          g.bark(e.beat === 1 ? RUBY.stage3Chant1 : e.beat === 2 ? RUBY.stage3Chant2 : RUBY.stage3Chant3, e.beat === 3 ? 3 : 2.2);
          ruby.play('wiggle');
          if (e.beat === 3) g.soundCaption('Ruby gets ready for her BIGGEST stomp — get up high!');
          break;
        case 'stomp':
          ruby.play(e.beat === 3 ? 'bigStomp' : 'stomp');
          g.sfx('stomp', e.beat === 3 ? 1 : 0.6);
          g.camera.shake(e.beat === 3 ? 0.8 : 0.4, 0.35);
          g.sfx('ripple', e.beat === 3 ? 1 : 0.6);
          this.beatGlow[e.beat - 1] = 1;
          break;
        case 'gemUp':
          this.liftGem();
          break;
        case 'gemDown':
          this.lowerGem();
          break;
        default:
          break;
      }
    }
  }

  private nearestPlatform(): number {
    const p = this.ctx.game.player!.position;
    let best = 0;
    let bd = Infinity;
    ORCH.dancePlatforms.forEach((q, i) => {
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /** The final stomp lifts the last gem into view above the nearest berry platform. */
  private liftGem(): void {
    const g = this.ctx.game;
    const ruby = this.ctx.ruby;
    const c = ruby.crystals[2]!;
    if (!c.userData.detached) {
      c.userData.detached = true;
      this.ctx.root.attach(c);
    }
    this.gem = c;
    this.gemHome.copy(c.position);
    this.gemPlatform = this.nearestPlatform();
    const plat = ORCH.dancePlatforms[this.gemPlatform]!;
    const dest = new THREE.Vector3(plat.x, ORCH.platformTop + 1.55, plat.z);
    const from = c.position.clone();
    this.gemTween?.cancel();
    this.gemTween = this.ctx.tweens.add(0.9, (k) => {
      c.position.lerpVectors(from, dest, k);
      c.position.y += Math.sin(Math.PI * k) * 2;
    }, easeInOutSine);
    g.bark(RUBY.stage3Chance);
    g.sfx('chime');
    g.interactions.remove('gem-3');
    g.interactions.add({
      id: 'gem-3',
      position: dest,
      radius: 2.0,
      label: 'Sweep-paint the sparkly crystal',
      kind: 'hold',
      holdTime: g.settings.assistMode ? 0.8 : 1.2,
      minFeetY: ORCH.platformTop - 0.15,
      blockedText: 'Hop onto the berry platform to reach it!',
      verticalReach: 2.2,
      enabled: () => !this.done && this.dance.gemVisible,
      onInteract: () => this.gemPainted(),
      priority: 2,
    });
  }

  private lowerGem(): void {
    const g = this.ctx.game;
    g.interactions.remove('gem-3');
    const c = this.gem;
    if (!c) return;
    const from = c.position.clone();
    const home = this.ctx.ruby.chestWorld.add(new THREE.Vector3(2.5, 1.5, 0));
    this.gemTween?.cancel();
    this.gemTween = this.ctx.tweens.add(1.0, (k) => c.position.lerpVectors(from, home, k), easeInOutSine);
    this.ctx.encourage(this.bigMissed > 0 ? RUBY_HELP.danceHint : RUBY_HELP.danceMissed, 2);
  }

  private gemPainted(): void {
    const g = this.ctx.game;
    if (this.done || !this.gem) return;
    this.done = true;
    this.dance.finish();
    g.interactions.remove('gem-3');
    g.player!.play('celebrate');
    const pos = this.gem.position.clone();
    this.gem.visible = false;
    this.ctx.ruby.freeCrystal(2);
    g.sfx('crystal');
    // "Final gem opens like a harmless flower": a ring of white petals, then sparkles.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.particles.sparkles(pos.clone().add(new THREE.Vector3(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4)), { count: 6, colors: ['#ffffff', '#ffe4ea'], speed: 2.2, life: 1.6, size: 0.42, upward: 0.4 });
    }
    g.particles.sparkles(pos, { count: 50, colors: ['#ffffff', '#fff6d0'], speed: 3.5, life: 1.4, size: 0.4 });
    for (const m of this.ringMeshes) m.visible = false;
  }

  /** Lower the platforms after the rescue so the clearing is open again. */
  retract(): void {
    const { physics, tweens } = this.ctx;
    for (const c of physics.colliders) if (c.tag.startsWith('danceplat-') || c.tag.startsWith('dancestep-')) c.enabled = false;
    for (const g of this.platforms) {
      const y0 = g.position.y;
      tweens.add(1.2, (k) => (g.position.y = y0 - (ORCH.platformTop + 0.4) * k)).done.then(() => (g.visible = false));
    }
  }

  hint(): void {
    const g = this.ctx.game;
    if (this.dance.gemVisible) g.pipSays('Stand on the berry platform and HOLD E to paint the crystal!');
    else g.pipSays(RUBY_HELP.danceHint);
  }

  dispose(): void {
    this.ctx.game.interactions.remove('gem-3');
    this.gemTween?.cancel();
  }
}
