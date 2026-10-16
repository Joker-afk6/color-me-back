/**
 * PROLOGUE P3–P4 — Hush Hollow (and the hub after the prologue).
 * Rounded houses, leafless silhouettes, a winding safe cobblestone path, two Wonderbrush stars
 * (either order; one up a small step that teaches jumping) and the berry-shaped arch that
 * brightens with a white star outline. Walking through the arch leads to Chapter 1.
 */
import * as THREE from 'three';
import { Level, type SpawnPoint } from '../core/Level';
import { PROLOGUE, PROLOGUE_PROMPTS } from '../data/script/prologue';
import { completePrologue, villageStarsComplete, wakeVillageStar } from '../state/progression';
import type { VillageStar } from '../state/SaveData';
import { UNIT, mesh, RoundedBoxGeometry } from '../rendering/shapes';
import { labelTexture, paintNoiseTexture } from '../rendering/textures';
import { createSky } from '../rendering/Sky';
import { batchStatic } from '../rendering/batch';
import { HintLadder } from '../systems/Hints';
import { keycap } from '../ui/icons';
import { Rng } from '../utils/rng';
import { PAL, berryArch, berryBush, cloud, cobblePath, fence, grassTufts, hill, house, lampPost, leaflessTree, place, rock, wonderStar, type Arch, type WonderStar } from './props';
import { PuffBird } from './creatures';

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
  private p4Played = false;
  private leaving = false;
  private jumpTipShown = false;
  private hubNoticeShown = false;

  build(): void {
    const L = this.lib;
    const root = this.root;
    const P = this.physics;
    const decor = new THREE.Group();

    const sky = createSky({ zenith: '#a9c6e6', horizon: '#e3eaf1', ground: '#d3d8de' }, 'blue');
    root.add(sky);
    this.track(sky.material as THREE.Material);

    // Ground + boundary
    const ground = mesh(new THREE.CircleGeometry(36, 64), L.paint(PAL.grass, 'green', { roughness: 0.96, map: paintNoiseTexture(21, 9, 0.16) }), { cast: false });
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);
    P.box(0, -4, 90, 90, -2, 0);
    for (const [x, z, w, d] of [[-25, -4, 1, 60], [25, -4, 1, 60], [0, 22, 52, 1], [0, -34, 52, 1]] as const) P.box(x, z, w, d, 0, 4, { walkable: false });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      place(root, hill(L, 18 + (i % 3) * 6, 7 + (i % 4) * 2.5, i % 2 ? PAL.grassDark : PAL.grass), Math.cos(a) * 58, -0.5, Math.sin(a) * 58);
    }
    for (let i = 0; i < 7; i++) place(root, cloud(L, 40 + i, 3.5 + (i % 3)), Math.cos(i * 0.9) * 55, 20 + (i % 3) * 5, Math.sin(i * 0.9) * 55);

    // Winding cobblestone path from home to the arch
    const pathPts = [new THREE.Vector3(0, 0, 14.5), new THREE.Vector3(-2.5, 0, 8), new THREE.Vector3(-1.2, 0, 2), new THREE.Vector3(2.8, 0, -4), new THREE.Vector3(2.2, 0, -10), new THREE.Vector3(-0.8, 0, -16), new THREE.Vector3(0, 0, -21), new THREE.Vector3(0, 0, -30)];
    root.add(cobblePath(L, pathPts, 2.6, 7));
    const dirt = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pathPts), 80, 1.7, 8, false), L.paint('#D8D2C4', 'neutral', { roughness: 1 }), { cast: false });
    dirt.scale.y = 0.02;
    dirt.position.y = -0.01;
    root.add(dirt);

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

    // Village creatures (silent)
    for (let i = 0; i < 4; i++) {
      const bird = new PuffBird(L, 300 + i, new THREE.Vector3([-3, 6, -9, 9][i]!, 0, [6, 4, -8, -13][i]!));
      root.add(bird.group);
      this.birds.push(bird);
    }

    batchStatic(decor, root);
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
    if (n < 2) return `Wake the two Wonderbrush stars (${n}/2)`;
    return PROLOGUE_PROMPTS.arch;
  }

  start(): void {
    const g = this.game;
    const s = g.save;
    for (const spot of this.stars) spot.star.setAwake(s.prologue.villageStars.includes(spot.id) || s.prologue.phase === 'complete');
    if (villageStarsComplete(s) || s.prologue.phase === 'complete') this.openArch(true);
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
    g.toast(`${keycap('E')} near a star to wake it · ${keycap('Space')} to jump`, 5);
    g.narrator.speak(PROLOGUE_PROMPTS.stars);
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
      await g.wait(2.2);
    });
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
    // Jump tip near the step (shown once per visit, spoken too).
    if (!this.jumpTipShown && s.prologue.phase === 'village' && !s.prologue.villageStars.includes('terraceStar') && p.position.distanceTo(new THREE.Vector3(6.55, 0, -7.4)) < 3.2) {
      this.jumpTipShown = true;
      g.toast(`${keycap('Space')} Jump up the step!`, 4);
      g.narrator.speak(PROLOGUE_PROMPTS.jump);
    }
    // Arch still sleepy: a friendly nudge.
    if (s.prologue.phase === 'village' && !villageStarsComplete(s) && p.position.z < ARCH_Z + 2.5 && Math.abs(p.position.x) < 3 && !this.hubNoticeShown) {
      this.hubNoticeShown = true;
      g.pipSays('The arch is still sleepy. Let’s wake both stars first!');
      window.setTimeout(() => (this.hubNoticeShown = false), 8000);
    }
    // P4 — before walking through
    if (s.prologue.phase === 'village' && villageStarsComplete(s) && !this.p4Played && p.position.z < ARCH_Z + 5 && Math.abs(p.position.x) < 4.5) {
      this.p4Played = true;
      void (async () => {
        this.busy = true;
        await g.say(PROLOGUE.arch);
        this.busy = false;
      })();
    }
    // Walking through the arch
    if (!this.leaving && p.position.z < ARCH_Z - 1.2 && Math.abs(p.position.x) < 2.4) {
      if (s.prologue.phase === 'village' && villageStarsComplete(s)) void this.goToOrchard(true);
      else if (s.prologue.phase === 'complete') void this.goToOrchard(false);
    }
  }

  private async goToOrchard(firstTime: boolean): Promise<void> {
    const g = this.game;
    this.leaving = true;
    g.lock(true);
    if (firstTime) {
      g.state.apply(completePrologue, true);
      await g.chapterCard('Chapter 1', 'The Ruby Orchard', 'Restore Red · Ruby the Rumble Dragon', 'ruby', [], 3.4);
    } else {
      g.state.persist();
    }
    g.lock(false);
    await g.changeLevel('rubyOrchard');
  }

  override fallMessage(): string | null {
    return null;
  }
}
