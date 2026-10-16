/**
 * CHAPTER 1 — THE RUBY ORCHARD (docs/design/01_Chapter_One_Ruby_Orchard_FULL_SCRIPT.md).
 * Phase machine (saved): arrive → traversal(start|pastGaps|bridgeDown) → stage1 → stage2 →
 * stage3 → restoreRed → dashTutorial → complete. Saves at entry, after each stage, after the
 * Red reveal and after the dash tutorial; reloading resumes the exact phase.
 */
import * as THREE from 'three';
import { Level, type SpawnPoint } from '../../core/Level';
import { Tweens } from '../../core/Tweens';
import { RUBY, RUBY_HELP } from '../../data/script/rubyOrchard';
import type { Line } from '../../data/speakers';
import { RubyDragon } from '../../characters/RubyDragon';
import {
  collectSticker,
  completeRubyStage,
  finishDashTutorial,
  finishRedReveal,
  markEncounterIntroSeen,
  reachTraversalCheckpoint,
  rubyArrived,
  startRubyEncounter,
} from '../../state/progression';
import { rubyAtLeast, type StickerId } from '../../state/SaveData';
import { HintLadder } from '../../systems/Hints';
import { Sticker } from '../../gameplay/Sticker';
import { iconTexture } from '../../rendering/textures';
import { UNIT, mesh } from '../../rendering/shapes';
import { easeInOutSine, easeOutBack } from '../../utils/math';
import { keycap } from '../../ui/icons';
import { buildOrchard, type OrchardWorld } from './OrchardWorld';
import { PushBerryPuzzle } from './PushBerryPuzzle';
import { ORCH } from './layout';
import { BerryParadeStage } from './stages/BerryParadeStage';
import { MirrorStage } from './stages/MirrorStage';
import { DanceStage } from './stages/DanceStage';
import type { RescueStage, StageContext } from './stages/StageContext';

export class RubyOrchardLevel extends Level {
  readonly id = 'rubyOrchard' as const;
  readonly areaName = 'The Ruby Orchard';
  override music = 'orchard';
  override fogColor = '#e9dcd8';
  override fogNear = 45;
  override fogFar = 160;
  override killY = -8;

  private world!: OrchardWorld;
  private ruby!: RubyDragon;
  private puzzle!: PushBerryPuzzle;
  private readonly tweens = new Tweens();
  private stickers: Sticker[] = [];
  private stage: RescueStage | null = null;
  private mirrorStage: MirrorStage | null = null;
  private gemSprites: THREE.Sprite[] = [];
  private gemMats: THREE.SpriteMaterial[] = [];
  private stageCtx!: StageContext;
  private t = 0;
  private busy = false;
  private leaving = false;
  private lastEncourage = -99;
  private laneFalls = 0;
  private autoDashHelp = false;
  private autoDashUsedThisJump = false;
  private guideK = 0;
  private gateOpen = false;

  build(): void {
    this.world = buildOrchard(this);
    this.ruby = new RubyDragon(this.lib);
    this.ruby.root.position.copy(ORCH.rubyPos);
    this.root.add(this.ruby.root);
    this.puzzle = new PushBerryPuzzle(this.lib, this.physics);
    this.root.add(this.puzzle.group);
    this.puzzle.onSolved = () => void this.bridgeDown(false);
    this.puzzle.onReset = () => this.game.pipSays('Oops, the berry got stuck — it rolled back to try again!');
    this.game.interactions.add({
      id: 'push-berry',
      position: this.puzzle.worldPos,
      radius: 2.5,
      label: 'Push the giant berry',
      verticalReach: 3,
      enabled: () => !this.puzzle.solved && this.game.save.ruby.phase === 'traversal',
      onInteract: () => {
        const p = this.game.player!;
        this.puzzle.push(p.position.x, p.position.z);
        p.play('push');
        this.game.sfx('boing', 0.6);
        this.hints?.progress();
      },
    });
    // Three gem symbols above Ruby (rescue progress; shape-based, not color-based).
    const gemTex = iconTexture('gem');
    for (let i = 0; i < 3; i++) {
      const m = this.lib.track(new THREE.SpriteMaterial({ map: gemTex, color: '#9aa1ad', transparent: true, depthWrite: false }));
      const s = new THREE.Sprite(m);
      s.scale.setScalar(1.3);
      s.position.set(ORCH.rubyPos.x - 1.7 + i * 1.7, 8.4, ORCH.rubyPos.z + 0.8);
      this.root.add(s);
      this.gemSprites.push(s);
      this.gemMats.push(m);
    }
    // Stickers (cosmetic)
    for (const [id, pos] of Object.entries(ORCH.stickers) as Array<[StickerId, THREE.Vector3]>) {
      const st = new Sticker(this.lib, id, pos);
      this.root.add(st.group);
      this.stickers.push(st);
    }
    // Color reveal hooks: poppies bloom, fruit ripens with a happy bounce.
    for (const p of this.world.poppies) {
      this.game.restoration.onReveal('red', p.group.position, (instant) => {
        if (instant) p.setBloom(1);
        else this.tweens.add(1.1, (k) => p.setBloom(0.15 + 0.85 * k), easeOutBack);
      });
    }
    for (const b of this.world.ripenBerries) {
      const s0 = b.scale.x;
      this.game.restoration.onReveal('red', b.position, (instant) => {
        if (!instant) this.tweens.add(0.6, (k) => b.scale.setScalar(s0 * (1 + Math.sin(Math.PI * k) * 0.18)));
      });
    }
    this.stageCtx = {
      game: this.game,
      root: this.root,
      lib: this.lib,
      physics: this.physics,
      tweens: this.tweens,
      ruby: this.ruby,
      encourage: (text, gap = 4) => this.encourage(text, gap),
    };
  }

  private encourage(text: string, gap: number): void {
    if (this.t - this.lastEncourage < gap) return;
    this.lastEncourage = this.t;
    this.game.pipSays(text);
  }

  // ───────────────────────────── Spawn / objective ─────────────────────────────

  spawn(): SpawnPoint {
    const r = this.game.save.ruby;
    switch (r.phase) {
      case 'arrive':
        return { pos: ORCH.spawnPlaza.clone(), yaw: Math.PI, cameraYaw: 0 };
      case 'traversal':
        if (r.traversal === 'pastGaps') return { pos: ORCH.spawnPastGaps.clone(), yaw: Math.PI, cameraYaw: 0 };
        if (r.traversal === 'bridgeDown') return { pos: ORCH.spawnAfterBridge.clone(), yaw: Math.PI, cameraYaw: 0 };
        return { pos: ORCH.spawnPlaza.clone(), yaw: Math.PI, cameraYaw: 0 };
      case 'dashTutorial':
        return { pos: ORCH.spawnLane.clone(), yaw: Math.PI / 2, cameraYaw: -Math.PI / 2 };
      default:
        return { pos: ORCH.spawnArena.clone(), yaw: Math.PI, cameraYaw: 0 };
    }
  }

  objective(): string {
    const s = this.game.save;
    const r = s.ruby;
    switch (r.phase) {
      case 'arrive':
        return 'Into the orchard…';
      case 'traversal':
        if (r.traversal === 'start') return 'Follow the berry trail — jump over the gaps!';
        if (r.traversal === 'pastGaps') return 'Push the giant berry onto the round picture (E)';
        return 'Follow the guide stars to Ruby';
      case 'stage1':
        return 'Rescue 1 of 3 · Step out of the circles, then tap the crystal';
      case 'stage2':
        return 'Rescue 2 of 3 · Turn the mirrors so the light reaches the crystal';
      case 'stage3':
        return 'Rescue 3 of 3 · Hop on a berry platform, then hold E to paint the crystal';
      case 'restoreRed':
        return 'Red is coming back…';
      case 'dashTutorial':
        return 'Crimson Dash! Run, jump, then tap Shift to whoosh across the berry pads';
      case 'complete': {
        const n = s.collectibles.filter((c) => c.startsWith('berry')).length;
        return n < 3 ? `Chapter complete! Find the Berry Stickers (${n}/3) or go home through the arch` : 'Chapter complete! Walk through the arch to return to Hush Hollow';
      }
    }
  }

  override fallMessage(): string | null {
    if (this.game.save.ruby.phase === 'dashTutorial') {
      this.laneFalls++;
      if (this.laneFalls === 3 && !this.game.settings.assistMode) {
        this.autoDashHelp = true;
        return 'Let me help! Jump toward the next pad and I’ll add the WHOOSH for you.';
      }
      if (this.laneFalls >= 6) {
        void this.growVineBridges();
        return 'Let’s grow a vine bridge so you can cross. You did great trying!';
      }
      return RUBY_HELP.dashHint;
    }
    return RUBY_HELP.gapFall;
  }

  onLine(line: Line): void {
    if (line.speaker === 'ruby') this.ruby.talk(Math.min(5, 0.8 + line.text.length / 20));
  }

  override onAskPip(): boolean {
    if (this.stage && !this.stage.done) {
      this.stage.hint();
      return true;
    }
    return false;
  }

  // ───────────────────────────── Start (restore state for the checkpoint) ─────────────────────────────

  start(): void {
    const g = this.game;
    const s = g.save;
    const r = s.ruby;
    g.showPip(true);
    for (const st of this.stickers) if (s.collectibles.includes(st.id)) st.hide();
    // Crystals already freed in earlier stages stay freed.
    const freed = r.phase === 'stage2' ? 1 : r.phase === 'stage3' ? 2 : rubyAtLeast(s, 'restoreRed') ? 3 : 0;
    for (let i = 0; i < freed; i++) this.ruby.freeCrystal(i);
    this.ruby.wingsFree = freed >= 3 ? 2 : freed >= 2 ? 1 : 0;
    this.ruby.mood = freed >= 3 ? 'happy' : 'anxious';
    this.setGemSymbols(freed);
    if (rubyAtLeast(s, 'stage1') || r.traversal === 'bridgeDown') this.bridgeDown(true);
    else if (r.phase === 'traversal' && r.traversal === 'pastGaps') {
      /* puzzle in progress */
    }
    if (rubyAtLeast(s, 'dashTutorial')) this.openEastGate(true);
    if (r.phase === 'complete') void this.growVineBridges(true);
    this.ruby.lookAt(g.player!.position);

    switch (r.phase) {
      case 'arrive':
        void this.arrival();
        break;
      case 'traversal':
        this.setTraversalHints();
        if (r.traversal === 'start') g.narrator.speak('Follow the berry trail. Press Space to jump over the gaps.');
        break;
      case 'stage1':
      case 'stage2':
      case 'stage3':
        g.hud.setGems("Ruby's spell crystals", freed, 3);
        void this.runEncounter();
        break;
      case 'restoreRed':
        void this.redReturns();
        break;
      case 'dashTutorial':
        g.audio.music.bellsLayer = true;
        void this.dashTutorialIntro();
        break;
      case 'complete':
        g.audio.music.bellsLayer = true;
        this.ruby.mood = 'happy';
        break;
    }
  }

  // ───────────────────────────── Scene 1.1 ─────────────────────────────

  private async arrival(): Promise<void> {
    const g = this.game;
    const p = g.player!;
    await g.cutscene(async () => {
      g.camera.cut(new THREE.Vector3(-3, 3.2, 44.5), new THREE.Vector3(0, 2.2, 32));
      await g.camera.moveTo(new THREE.Vector3(-5, 4, 40), new THREE.Vector3(-6, 1.5, 34), 2.6);
      await g.say([RUBY.arrival[0]!]);
      const rubyHead = ORCH.rubyPos.clone().add(new THREE.Vector3(0, 4.5, 0));
      await g.camera.moveTo(new THREE.Vector3(0, 11, 18), new THREE.Vector3(0, 2, -6), 3.2);
      await g.camera.moveTo(new THREE.Vector3(3.5, 7, -24), rubyHead, 3.2);
      this.ruby.lookAt(g.engine.camera.position);
      await g.say(RUBY.arrival.slice(1));
      await g.camera.moveTo(p.position.clone().add(new THREE.Vector3(0, 4.2, 7.4)), p.position.clone().setY(1.3), 2.4);
    });
    g.state.apply(rubyArrived, true);
    g.hud.flashCheckpoint();
    this.setTraversalHints();
    g.toast(`${keycap('Space')} jump the gaps · ${keycap('E')} use the Wonderbrush`, 4.5);
    g.narrator.speak('Follow the berry trail. Press Space to jump over the gaps.');
  }

  private setTraversalHints(): void {
    const g = this.game;
    const r = g.save.ruby;
    if (r.phase !== 'traversal') return;
    if (r.traversal === 'start') {
      this.hints = new HintLadder('ruby-trail', [
        { after: 35, run: () => g.pipSays('Run toward the gap and press Space to jump across!') },
        { after: 40, run: () => g.pipSays('The white dots on the trail are safe stepping stones.') },
      ]);
    } else if (r.traversal === 'pastGaps') {
      // Script hint ladder: (1) sparkle the berry; (2) Pip's line; (3) slow optional guide arrow.
      this.hints = new HintLadder('ruby-berry', [
        { after: 25, run: () => g.particles.sparkles(this.puzzle.worldPos.add(new THREE.Vector3(0, 1.2, 0)), { count: 40, color: '#fff3b0', speed: 2, life: 1.6 }) },
        { after: 25, run: () => g.bark(RUBY.berryHint) },
        { after: 30, run: () => this.showGuideArrow() },
      ]);
    } else {
      this.hints = new HintLadder('ruby-path', [{ after: 30, run: () => g.pipSays('Follow the little white stars to Ruby!') }]);
    }
  }

  private showGuideArrow(): void {
    const g = this.game;
    const from = this.puzzle.worldPos.setY(0.05);
    const to = ORCH.switchPos.clone().setY(0.05);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const mat = this.lib.track(new THREE.MeshBasicMaterial({ map: iconTexture('arrow'), color: '#fff3b0', transparent: true, depthWrite: false, opacity: 0.9 }));
    const arrow = mesh(UNIT.plane, mat, { cast: false, receive: false });
    arrow.rotation.x = -Math.PI / 2;
    arrow.rotation.z = Math.atan2(-dir.x, -dir.z) + Math.PI;
    arrow.scale.set(1.4, Math.min(3, len * 0.6), 1);
    arrow.position.copy(from.clone().lerp(to, 0.45));
    this.root.add(arrow);
    // Where to stand: behind the berry, opposite the picture.
    const stand = from.clone().sub(dir.clone().normalize().multiplyScalar(2));
    g.particles.sparkles(stand.setY(0.4), { count: 30, color: '#ffffff', speed: 1, life: 2.2 });
    g.pipSays('Stand behind the berry, then push it toward the arrow!');
    this.tweens.add(9, (k) => (mat.opacity = 0.9 * (1 - k))).done.then(() => arrow.removeFromParent());
  }

  /** Bridge lowers; white guide stars light the path (not red yet). */
  private bridgeDown(instant: boolean): void {
    const w = this.world;
    if (instant) {
      this.puzzle.placeSolved();
      this.guideK = 1;
      w.bridge.rotation.x = 0;
      w.bridgeCollider.enabled = true;
      w.switchPlate.position.y = -0.08;
      return;
    }
    const g = this.game;
    g.sfx('switch');
    g.particles.sparkles(ORCH.switchPos.clone().setY(0.6), { count: 40, colors: ['#ffffff', '#fff3b0'], speed: 2.6, life: 1.2 });
    w.switchPlate.position.y = -0.08;
    g.sfx('bridge');
    g.camera.shake(0.25, 0.4);
    this.tweens.add(1.6, (k) => {
      w.bridge.rotation.x = (Math.PI / 2 - 0.05) * (1 - k);
    }, easeInOutSine).done.then(() => {
      w.bridgeCollider.enabled = true;
      g.camera.shake(0.4, 0.3);
      g.sfx('land');
    });
    this.tweens.add(3, (k) => (this.guideK = k));
    g.state.apply((s) => reachTraversalCheckpoint(s, 'bridgeDown'), true);
    g.hud.flashCheckpoint();
    g.toast('The bridge is down! ✨', 2.5);
    this.hints = null;
    this.setTraversalHints();
  }

  // ───────────────────────────── Scene 1.2: three-stage rescue ─────────────────────────────

  private setGemSymbols(freed: number): void {
    this.gemMats.forEach((m, i) => {
      m.color.set(i < freed ? '#ffffff' : '#9aa1ad');
      m.opacity = i < freed ? 1 : 0.85;
    });
    this.gemSprites.forEach((s, i) => s.scale.setScalar(i < freed ? 1.5 : 1.3));
  }

  private freeProgress(freed: number): void {
    this.setGemSymbols(freed);
    this.game.hud.setGems("Ruby's spell crystals", freed, 3);
  }

  /** A lower, wider camera keeps Ruby (and her crystals) in view during the rescue. */
  private encounterCamera(): void {
    const cam = this.game.camera;
    cam.pitch = 0.3;
    cam.distance = 9.5;
  }

  private async runEncounter(): Promise<void> {
    const g = this.game;
    g.audio.music.play('encounter');
    this.encounterCamera();
    let r = g.save.ruby;
    if (r.phase === 'stage1') {
      if (!r.encounterIntroSeen) {
        await g.cutscene(async () => {
          const look = ORCH.rubyPos.clone().add(new THREE.Vector3(0, 5, 0));
          await g.camera.moveTo(new THREE.Vector3(-5, 6.5, -26), look, 2.2);
          this.ruby.lookAt(g.player!.position);
          await g.say(RUBY.stage1Intro);
        });
        g.state.apply(markEncounterIntroSeen, true);
      }
      await this.playStage(new BerryParadeStage(this.stageCtx));
      await g.say(RUBY.stage1Free);
      g.state.apply((s) => completeRubyStage(s, 1).save, true);
      this.freeProgress(1);
      g.hud.flashCheckpoint('Checkpoint saved · Rescue 1 of 3 done');
      r = g.save.ruby;
    }
    if (r.phase === 'stage2') {
      await g.wait(0.8);
      const ms = new MirrorStage(this.stageCtx, g.save.ruby.mirrors);
      this.mirrorStage = ms;
      await g.say(RUBY.stage2Intro);
      await this.playStage(ms);
      await g.wait(0.6);
      await g.say(RUBY.stage2Done);
      g.state.apply((s) => completeRubyStage(s, 2).save, true);
      this.freeProgress(2);
      g.hud.flashCheckpoint('Checkpoint saved · Rescue 2 of 3 done');
      r = g.save.ruby;
    }
    if (r.phase === 'stage3') {
      this.mirrorStage?.retract();
      await g.wait(1.0);
      const ds = new DanceStage(this.stageCtx);
      g.pipSays(RUBY_HELP.danceHint, 4.5);
      await this.playStage(ds);
      await g.wait(0.6);
      await g.say(RUBY.stage3Done);
      let awarded: string | null = null;
      g.state.apply((s) => {
        const res = completeRubyStage(s, 3);
        awarded = res.awarded;
        return res.save;
      }, true);
      this.freeProgress(3);
      g.hud.flashCheckpoint(awarded ? 'Checkpoint saved · Ruby is free!' : 'Checkpoint saved');
      ds.retract();
      await this.redReturns();
    }
  }

  private playStage(stage: RescueStage): Promise<void> {
    this.stage = stage;
    this.hints = null;
    stage.start();
    return this.tasks.until(() => stage.done).then(() => {
      this.stage = null;
    });
  }

  // ───────────────────────────── Scene 1.3: RED RETURNS ─────────────────────────────

  private async redReturns(): Promise<void> {
    const g = this.game;
    const p = g.player!;
    g.hud.setGems(null);
    for (const s of this.gemSprites) s.visible = false;
    for (let i = 0; i < 3; i++) if (!this.ruby.isCrystalFree(i)) this.ruby.freeCrystal(i);
    // Hold the color back for the cinematic, even when replaying it after a reload.
    g.restoration.setInstant('red', false);
    g.audio.music.stop();
    const reduced = g.settings.reducedMotion;
    const glow = new THREE.PointLight('#ff4d4d', 0, 14, 2);
    glow.position.copy(this.ruby.chestWorld);
    this.root.add(glow);
    await g.cutscene(async () => {
      const head = this.ruby.headWorld;
      g.camera.cut(head.clone().add(new THREE.Vector3(0.8, 0.2, 5.6)), head);
      this.ruby.mood = 'happy';
      this.ruby.lookAt(head.clone().add(new THREE.Vector3(0.8, 0.2, 5.6)));
      await g.wait(1.0);
      // An intense red spark ignites in her chest...
      g.sfx('colorSwell');
      g.audio.redMotif();
      this.tweens.add(1.2, (k) => (glow.intensity = 8 * k));
      for (let i = 0; i < 4; i++) g.particles.sparkles(this.ruby.chestWorld, { count: 24, colors: ['#ff3b3b', '#ff8a8a', '#ffd0d0'], speed: 2.4, life: 1.2, size: 0.45 });
      await g.wait(1.1);
      // ...and flows outward through the berry vines.
      if (reduced) {
        await g.camera.moveTo(new THREE.Vector3(10, 9, -12), ORCH.arenaCenter.clone().setY(2), 1.6);
        await g.restoration.crossfade('red', 2.4);
      } else {
        const wave = g.restoration.playWave('red', ORCH.rubyPos.clone(), 7.5, 130);
        void g.camera.orbit(ORCH.arenaCenter, 23, 10, 0.25, Math.PI * 1.15, 7.5, 2);
        this.ruby.play('joy');
        await wave;
      }
      this.ruby.wingsFree = 2;
      this.ruby.mood = 'excited';
      this.tweens.add(1.5, (k) => (glow.intensity = 8 * (1 - k)));
      await g.camera.moveTo(p.position.clone().add(new THREE.Vector3(1.6, 1.7, 2.8)), p.position.clone().setY(1.2), 1.6);
      p.play('celebrate');
      await g.say(RUBY.redReturns);
    });
    g.restoration.setInstant('red', true);
    glow.removeFromParent();
    await g.unlockCard('red');
    g.state.apply(finishRedReveal, true);
    g.hud.flashCheckpoint('Checkpoint saved · Red restored!');
    g.audio.music.play('orchard');
    g.audio.music.bellsLayer = true;
    await this.dashTutorialIntro();
  }

  // ───────────────────────────── Scene 1.4: Test the new power ─────────────────────────────

  private openEastGate(instant: boolean): void {
    if (this.gateOpen) return;
    this.gateOpen = true;
    const w = this.world;
    w.eastGateCollider.enabled = false;
    if (instant) {
      w.eastGate.visible = false;
      return;
    }
    this.game.sfx('bridge');
    this.tweens.add(1.4, (k) => {
      w.eastGate.scale.set(1, 1 - k * 0.98, 1);
      w.eastGate.position.y = -0.2 * k;
    }).done.then(() => (w.eastGate.visible = false));
    this.game.particles.sparkles(w.eastGate.position.clone().setY(1.5), { count: 50, colors: ['#ff6b6b', '#ffd0d0', '#ffffff'], speed: 3, life: 1.4 });
  }

  private async dashTutorialIntro(): Promise<void> {
    const g = this.game;
    this.openEastGate(false);
    this.ruby.mood = 'happy';
    await g.say(RUBY.dashIntro);
    g.toast(`${keycap('Shift')} Crimson Dash — tap while running!`, 4.5);
    g.narrator.speak('Tap Shift while you run to dash. Jump, then tap Shift to whoosh across the berry pads.');
    this.hints = new HintLadder('ruby-dash', [
      { after: 25, run: () => g.pipSays('Through the open hedge to the east — follow the sparkly arrows!') },
      { after: 30, run: () => g.pipSays(RUBY_HELP.dashHint) },
      {
        after: 35,
        run: () => {
          this.autoDashHelp = true;
          g.pipSays('I’ll help with the WHOOSH — just jump toward the next pad!');
        },
      },
    ]);
  }

  private async dashTutorialDone(): Promise<void> {
    const g = this.game;
    this.busy = true;
    this.hints = null;
    await g.say(RUBY.dashDone);
    g.state.apply(finishDashTutorial, true);
    g.hud.flashCheckpoint('Checkpoint saved · Chapter 1 complete!');
    void this.growVineBridges();
    const choice = await g.chapterCard('Red found', 'Blue awaits…', 'Chapter 1 complete! Whisperwave Bay (Chapter 2) is being built next.', 'redFound', ['Return to Hush Hollow', 'Keep exploring the orchard']);
    this.busy = false;
    if (choice === 0) void this.goHome();
  }

  private async growVineBridges(instant = false): Promise<void> {
    for (const vb of this.world.vineBridges) {
      if (vb.collider.enabled) continue;
      vb.collider.enabled = true;
      vb.mesh.visible = true;
      if (instant) vb.mesh.scale.set(1, 1, 1);
      else this.tweens.add(1.2, (k) => vb.mesh.scale.set(Math.max(0.001, k), 1, 1), easeOutBack);
    }
  }

  private async goHome(): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    this.game.state.persist();
    await this.game.changeLevel('hushHollow');
  }

  // ───────────────────────────── Per-frame ─────────────────────────────

  override update(dt: number): void {
    this.t += dt;
    const g = this.game;
    const p = g.player;
    this.tweens.update(dt);
    if (p && !g.inCutscene) this.ruby.lookAt(p.position.clone().setY(1.4));
    this.ruby.update(dt);
    this.puzzle.update(dt);
    const ip = g.interactions.get('push-berry');
    if (ip) ip.position.copy(this.puzzle.worldPos);
    this.stage?.update(dt);
    this.hints?.update(g.locked ? 0 : dt);
    // Swaying jam jars (moving platforms carry the explorer).
    for (const j of this.world.jars) {
      const x = j.base.x + Math.sin(this.t * 0.7 + j.phase) * 0.28;
      const s = j.collider.shape;
      if (s.kind === 'cyl') {
        j.collider.delta.x = x - s.cx;
        s.cx = x;
      }
      j.group.position.x = x;
      j.group.rotation.z = Math.sin(this.t * 0.7 + j.phase) * 0.04;
    }
    // Guide stars and lane markers glow.
    this.world.guideStars.forEach((m, i) => (m.emissiveIntensity = Math.max(0, Math.min(1, this.guideK * 7 - i)) * (0.9 + Math.sin(this.t * 3 + i) * 0.25)));
    this.world.laneMarkers.forEach((m, i) => (m.position.y = 0.06 + Math.max(0, Math.sin(this.t * 4 - i * 0.8)) * 0.12));
    for (const st of this.stickers) {
      if (st.update(dt, p?.position ?? null)) {
        g.sfx('sticker');
        g.particles.sparkles(st.position, { count: 40, colors: ['#ffd45a', '#ffffff', '#ffb3c1'], speed: 3, life: 1.2 });
        let isNew = false;
        g.state.apply((s) => {
          const r = collectSticker(s, st.id);
          isNew = r.isNew;
          return r.save;
        }, true);
        if (isNew) g.toast(`Sticker found! (${g.save.collectibles.length}/3) ✨`, 3);
      }
    }
    if (!p || this.busy || g.locked) return;
    const s = g.save;
    const r = s.ruby;
    const pos = p.position;
    // Traversal checkpoints
    if (r.phase === 'traversal') {
      if (r.traversal === 'start' && pos.z < ORCH.pastGapsZ + 0.4 && pos.y > 0.9) {
        g.state.apply((x) => reachTraversalCheckpoint(x, 'pastGaps'), true);
        g.hud.flashCheckpoint();
        this.setTraversalHints();
        g.narrator.speak('Push the giant berry onto the round picture. Press E next to the berry.');
      }
      if (r.traversal === 'bridgeDown' && pos.z < ORCH.arenaEnterZ) {
        g.state.apply(startRubyEncounter, true);
        g.hud.flashCheckpoint('Checkpoint saved · Ruby’s clearing');
        g.hud.setGems("Ruby's spell crystals", 0, 3);
        void this.runEncounter();
      }
    }
    // Dash tutorial: assisted auto-dash and completion on the far pad.
    if (r.phase === 'dashTutorial') {
      const lane = ORCH.lane;
      const onLane = Math.abs(pos.z - lane.z) < lane.halfZ && pos.x > lane.groundX0;
      if (p.motor.grounded) this.autoDashUsedThisJump = false;
      if (onLane && (this.autoDashHelp || g.settings.assistMode) && !p.motor.grounded && !this.autoDashUsedThisJump && p.motor.vel.x > 2 && p.motor.vel.y < 1.2) {
        const edges = [lane.groundX1, lane.pads[0]![1]];
        if (edges.some((e) => pos.x > e - 0.6 && pos.x < e + 1.6)) {
          if (p.motor.requestDash(1, 0)) this.autoDashUsedThisJump = true;
        }
      }
      const far = lane.pads[1]!;
      if (pos.x > far[0] && pos.x < far[1] && p.motor.grounded && pos.y > -0.1 && onLane) void this.dashTutorialDone();
    }
    // Home through the arrival arch
    if (!this.leaving && pos.z > ORCH.arrivalArchZ + 0.8 && Math.abs(pos.x) < 2.4 && rubyAtLeast(s, 'traversal')) void this.goHome();
  }

  override dispose(): void {
    this.stage?.dispose();
    this.tweens.clear();
    super.dispose();
  }
}
