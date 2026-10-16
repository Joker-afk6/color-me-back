/**
 * Game orchestrator: owns the engine and every shared system, runs the frame loop, switches
 * levels (with full disposal), and offers the scripting API used by levels and chapters
 * (dialogue, barks, cutscenes, cards, respawns, saves).
 */
import * as THREE from 'three';
import { Engine } from './Engine';
import type { Level } from './Level';
import { Input } from '../systems/Input';
import { CameraRig } from '../systems/CameraRig';
import { Particles } from '../systems/Particles';
import { ColorRestoration } from '../systems/ColorRestoration';
import { InteractionSystem } from '../systems/Interaction';
import { AudioEngine, type SfxName } from '../audio/AudioEngine';
import { Narrator } from '../audio/Narrator';
import { SaveStore } from '../state/SaveStore';
import { SettingsStore, type Settings } from '../state/Settings';
import { GameState } from '../state/GameState';
import { newSave, type HeroId, type SaveData } from '../state/SaveData';
import { hasAbility, hasColor, mixColors, setLocation } from '../state/progression';
import { Player } from '../gameplay/Player';
import { Pip } from '../characters/Pip';
import { MaterialLibrary } from '../rendering/paint';
import { setOutlinesVisible } from '../rendering/outline';
import { Hud } from '../ui/Hud';
import { Captions, DialogueBox, Toasts } from '../ui/Dialogue';
import { Screens } from '../ui/Screens';
import { TouchControls } from '../ui/TouchControls';
import * as menus from '../ui/menus';
import { $, el } from '../ui/dom';
import { SPEAKERS, type Line } from '../data/speakers';
import { COLOR_INFO, type GameColor, type PrimaryColor } from '../data/colors';
import { CHAPTERS, LOCATION_NAMES, type LocationId } from '../data/chapters';
import { EXPLORER_TUNING } from '../systems/CharacterMotor';
import { PhysicsWorld } from '../systems/physics';
import { ABILITIES } from '../data/abilities';
import type { MotorEvent } from '../systems/CharacterMotor';

export type LevelFactory = (game: Game) => Level;

export class Game {
  readonly engine: Engine;
  readonly input: Input;
  readonly camera: CameraRig;
  readonly particles: Particles;
  readonly restoration = new ColorRestoration();
  readonly interactions: InteractionSystem;
  readonly audio = new AudioEngine();
  readonly narrator = new Narrator();
  readonly saveStore = new SaveStore();
  readonly settingsStore: SettingsStore;
  readonly state: GameState;
  readonly hud: Hud;
  readonly dialogue: DialogueBox;
  readonly captions: Captions;
  readonly toasts: Toasts;
  readonly screens: Screens;
  readonly touch: TouchControls;
  player: Player | null = null;
  pip: Pip;
  level: Level | null = null;
  mode: 'title' | 'game' = 'title';
  time = 0;

  private readonly levelFactories = new Map<string, LevelFactory>();
  private readonly pipLib = new MaterialLibrary();
  private last = performance.now();
  private talkDepth = 0;
  private cinematicDepth = 0;
  private lockDepth = 0;
  private changing = false;
  private skipping = false;
  private respawning = false;
  private lastFallBark = -99;
  private stepTimer = 0;
  private hudTimer = 0;
  private errors = new Set<string>();
  private skipBtn: HTMLButtonElement | null = null;
  private soundRestore = 0.8;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.camera = new CameraRig(this.engine.camera);
    this.particles = new Particles(this.engine.scene);
    this.interactions = new InteractionSystem(this.engine.scene);
    this.settingsStore = new SettingsStore(SaveStore.defaultStorage());
    this.state = new GameState(this.saveStore);
    this.screens = new Screens($('screens'));
    this.dialogue = new DialogueBox(this.narrator);
    this.captions = new Captions(this.narrator);
    this.toasts = new Toasts();
    this.touch = new TouchControls(this.input);
    this.hud = new Hud({ onPause: () => this.openPause(), onPalette: () => this.openPalette(), onHint: () => this.askPip() });
    this.pip = new Pip(this.pipLib);
    this.pip.root.visible = false;
    this.engine.scene.add(this.pip.root);
    this.dialogue.hooks = {
      onLine: (line) => this.onLine(line),
      onClose: () => {
        if (this.player) this.player.talking = false;
        this.pip.stopTalking();
      },
    };
    this.screens.onAnyOpenChange = (open) => {
      if (open) this.narrator.cancel();
      this.touch.setVisible(!open && this.mode === 'game');
    };
    this.settingsStore.onChange(() => this.applySettings());
    this.applySettings();
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
    this.state.onChange((s) => this.hud.setColors(s.colors, (c) => this.restoration.isShown(c)));
  }

  // ───────────────────────────── Setup ─────────────────────────────

  registerLevel(id: string, factory: LevelFactory): void {
    this.levelFactories.set(id, factory);
  }

  get settings(): Readonly<Settings> {
    return this.settingsStore.get();
  }

  get save(): Readonly<SaveData> {
    return this.state.save;
  }

  start(): void {
    requestAnimationFrame(this.frame);
    void this.showTitle();
  }

  private applySettings(): void {
    const s = this.settings;
    this.audio.setVolumes(s.masterVolume, s.musicVolume, s.sfxVolume);
    this.narrator.enabled = s.readAloud;
    this.narrator.volume = s.voiceVolume;
    if (!s.readAloud) this.narrator.cancel();
    this.captions.soundCaptions = s.soundCaptions;
    this.particles.reducedMotion = s.reducedMotion;
    this.camera.shakeEnabled = s.cameraShake && !s.reducedMotion;
    this.interactions.assist = s.assistMode;
    this.dialogue.typewriter = !s.reducedMotion;
    const html = document.documentElement;
    html.dataset.textSize = s.textSize;
    html.dataset.reducedMotion = String(s.reducedMotion);
    html.dataset.contrast = s.highContrast ? 'high' : 'normal';
    if (this.engine.currentQuality !== s.quality) this.engine.setQuality(s.quality);
    if (this.player) setOutlinesVisible(this.player.object, true);
    if (s.masterVolume > 0) this.soundRestore = s.masterVolume;
  }

  private onResize(): void {
    this.engine.resize();
    this.particles.setViewportHeight(window.innerHeight * this.engine.renderer.getPixelRatio());
  }

  // ───────────────────────────── Frame loop ─────────────────────────────

  private frame = (now: number): void => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.input.poll(this.settings.cameraSensitivity);
    try {
      this.tick(dt);
    } catch (err) {
      this.reportError(err);
    }
    this.engine.render();
    this.input.endFrame();
  };

  /**
   * QA helper: advance the simulation by `seconds` in fixed 1/60 s steps, independent of the
   * browser's frame timing (background tabs throttle requestAnimationFrame). Renders once at the end.
   */
  async debugStep(seconds: number): Promise<void> {
    const steps = Math.max(1, Math.round(seconds * 60));
    for (let i = 0; i < steps; i++) {
      this.input.poll(this.settings.cameraSensitivity);
      try {
        this.tick(1 / 60);
      } catch (err) {
        this.reportError(err);
      }
      this.input.endFrame();
      // Let promise continuations (scripted sequences) run between frames, as they do in real play.
      for (let k = 0; k < 12; k++) await Promise.resolve();
    }
    this.last = performance.now();
    this.engine.render();
  }

  private reportError(err: unknown): void {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    if (this.errors.has(msg)) return;
    this.errors.add(msg);
    console.error('[ColorMeBack] frame error', err);
  }

  get locked(): boolean {
    return this.talkDepth > 0 || this.cinematicDepth > 0 || this.lockDepth > 0 || this.changing || this.respawning;
  }

  get inCutscene(): boolean {
    return this.cinematicDepth > 0;
  }

  private tick(dt: number): void {
    const level = this.level;
    if (!level) return;
    // Menus pause the world during play; the title vignette keeps animating behind its menu.
    if (this.screens.isOpen && this.mode === 'game') return;
    this.time += dt;
    const playing = this.mode === 'game' && !!this.player;

    if (playing && !this.changing) {
      if (this.input.consume('pause')) {
        if (this.inCutscene && this.skipBtn) this.skipCutscene();
        else this.openPause();
        return;
      }
      if (this.input.consume('palette') && !this.inCutscene) {
        this.openPalette();
        return;
      }
      if (this.input.consume('hint') && !this.inCutscene) this.askPip();
    }
    if (this.dialogue.isOpen && this.input.consume('advance')) {
      this.dialogue.advance();
      this.input.consume('interact');
      this.input.consume('jump');
    }
    this.dialogue.update(dt);
    level.tasks.update(dt);
    if (this.skipping) this.camera.finishShot();

    if (playing && this.player) {
      const p = this.player;
      const locked = this.locked;
      const b = this.camera.basis();
      const mx = locked ? 0 : b.rx * this.input.move.x + b.fx * this.input.move.y;
      const mz = locked ? 0 : b.rz * this.input.move.x + b.fz * this.input.move.y;
      p.motor.frozen = locked;
      p.motor.dashAllowed = hasAbility(this.save, 'crimsonDash');
      const events = p.update(dt, {
        moveX: mx,
        moveZ: mz,
        jumpPressed: !locked && this.input.pressed('jump'),
        jumpHeld: this.input.isHeld('jump'),
        dashPressed: !locked && this.input.pressed('dash'),
        sweeping: this.interactions.sweeping,
      });
      this.onMotorEvents(events);
      this.interactions.update(dt, p.position, p.motor.facing, !locked && this.input.pressed('interact'), !locked && this.input.isHeld('interact'), !locked);
      this.footsteps(dt);
    }

    level.update(dt);

    // Camera
    if (playing && this.player) {
      const p = this.player;
      this.camera.update(dt, {
        target: new THREE.Vector3(p.position.x, p.position.y + 1.25, p.position.z),
        velocity: { x: p.motor.vel.x, z: p.motor.vel.z },
        facing: p.motor.facing,
        look: this.locked ? { x: 0, y: 0 } : this.input.look,
        zoom: this.locked ? 0 : this.input.zoom,
        manual: this.input.manualCamera,
        recenter: !this.locked && this.input.pressed('recenter'),
        assist: this.settings.cameraAssist,
        invertY: this.settings.invertCameraY,
        physics: level.physics,
      });
      this.engine.focusShadows(p.position);
      if (this.pip.root.visible) {
        const look = this.dialogue.isOpen ? this.engine.camera.position : this.engine.camera.position.clone().lerp(p.position, 0.3);
        this.pip.update(dt, p.position, p.motor.facing, look, this.settings.reducedMotion);
      }
    } else {
      this.camera.update(dt, null);
      this.engine.focusShadows(this.camera.camera.position.clone().setY(0));
    }

    this.restoration.update(dt);
    this.particles.update(dt);
    if (this.mode === 'game') this.updateHud(dt);
    this.state.tick(dt);
  }

  private onMotorEvents(events: MotorEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'jump':
          this.sfx('jump');
          break;
        case 'land':
          if (e.impact > 4) {
            this.sfx('land', Math.min(1, e.impact / 14));
            if (this.player) this.particles.puff(this.player.position.clone().setY(this.player.position.y + 0.05), { count: 8, color: '#d9dde3', speed: 1.5, upward: 0.5, size: 0.3, life: 0.6, gravity: 1 });
          }
          break;
        case 'dashStart':
          this.sfx('dash');
          if (this.player) this.particles.sparkles(this.player.position.clone().setY(this.player.position.y + 0.8), { count: 16, color: COLOR_INFO.red.hex, speed: 2.5, life: 0.6, size: 0.35 });
          break;
        case 'hazard':
          void this.gentleRespawn(true);
          break;
        case 'fell':
          void this.gentleRespawn(false);
          break;
        default:
          break;
      }
    }
    // Dash streak while dashing.
    if (this.player?.motor.dashActive) {
      const p = this.player.position;
      this.particles.sparkles(new THREE.Vector3(p.x, p.y + 0.6 + Math.random() * 0.6, p.z), { count: 2, color: COLOR_INFO.red.hex, speed: 0.4, life: 0.45, size: 0.3, upward: 0 });
    }
  }

  private footsteps(dt: number): void {
    const p = this.player;
    if (!p) return;
    const speed = Math.hypot(p.motor.vel.x, p.motor.vel.z);
    if (!p.motor.grounded || speed < 1.2 || p.motor.dashActive) {
      this.stepTimer = 0.05;
      return;
    }
    this.stepTimer -= dt * (speed / EXPLORER_TUNING.runSpeed);
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.3;
      this.sfx('step');
    }
  }

  private updateHud(dt: number): void {
    if (!this.player || !this.level) return;
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.25;
      this.hud.setObjective(this.level.areaName, this.level.objective());
      this.hud.setColors(this.save.colors, (c) => this.restoration.isShown(c));
    }
    const cd = this.player.motor.dashCooldownLeft / EXPLORER_TUNING.dashCooldown;
    // An ability appears once its color is visibly back in the world (after the cinematic).
    this.hud.setAbilities((a) => hasAbility(this.save, a) && this.restoration.isShown(ABILITIES[a].color), { crimsonDash: cd });
    const f = this.interactions.focus;
    if (this.locked || !f) this.hud.setPrompt(null);
    else if (f.blocked) this.hud.setPrompt({ key: 'E', text: f.blockedText ?? 'Get a little closer!', blocked: true });
    else if ((f.target.kind ?? 'tap') === 'hold') this.hud.setPrompt({ key: 'E', text: `Hold E: ${f.target.label}`, hold: f.holdProgress ?? 0 });
    else this.hud.setPrompt({ key: 'E', text: f.target.label });
  }

  // ───────────────────────────── Scripting API (used by levels) ─────────────────────────────

  /** Blocking dialogue. Resolves when the player has read every line (instantly while skipping). */
  say(lines: Line[]): Promise<void> {
    if (this.skipping || !lines.length) return Promise.resolve();
    this.talkDepth++;
    const p = this.dialogue.say(lines).finally(() => {
      this.talkDepth = Math.max(0, this.talkDepth - 1);
    });
    return this.level ? this.level.tasks.guard(p) : p;
  }

  /** Non-blocking line during play. */
  bark(line: Line, seconds?: number): void {
    if (this.skipping) return;
    this.captions.bark(line, seconds);
    this.onLine(line);
  }

  /** Quick Pip remark (not from the script; used for hints and encouragement). */
  pipSays(text: string, seconds = 3.6): void {
    this.bark({ id: 'pip.help', speaker: 'pip', text }, seconds);
  }

  toast(html: string, seconds?: number, big = false): void {
    this.toasts.show(html, seconds, big);
  }

  sfx(name: SfxName, intensity = 1): void {
    this.audio.sfx(name, intensity);
  }

  soundCaption(text: string): void {
    this.captions.sound(text);
  }

  wait(seconds: number): Promise<void> {
    return this.level ? this.level.tasks.wait(seconds) : Promise.resolve();
  }

  lock(on: boolean): void {
    this.lockDepth = Math.max(0, this.lockDepth + (on ? 1 : -1));
  }

  /** Run a skippable cinematic: letterbox, input locked, camera under script control. */
  async cutscene(run: () => Promise<void>, skippable = true): Promise<void> {
    this.cinematicDepth++;
    $('letterbox').classList.add('on');
    $('hud').classList.add('cinematic');
    this.hud.setPrompt(null);
    if (skippable && !this.skipBtn) {
      this.skipBtn = el('button', { class: 'small secondary skip-btn', 'aria-label': 'Skip scene (Escape)' }) as HTMLButtonElement;
      this.skipBtn.innerHTML = 'Skip scene <kbd class="keycap">Esc</kbd>';
      this.skipBtn.addEventListener('click', () => this.skipCutscene());
      $('app').append(this.skipBtn);
    }
    try {
      await run();
    } finally {
      this.cinematicDepth = Math.max(0, this.cinematicDepth - 1);
      if (this.cinematicDepth === 0) {
        $('letterbox').classList.remove('on');
        $('hud').classList.remove('cinematic');
        this.skipBtn?.remove();
        this.skipBtn = null;
        this.skipping = false;
        if (this.level) this.level.tasks.fastForward = false;
        this.camera.follow(0.9);
      }
    }
  }

  skipCutscene(): void {
    if (!this.inCutscene || this.skipping) return;
    this.skipping = true;
    if (this.level) this.level.tasks.fastForward = true;
    this.dialogue.cancel();
    this.narrator.cancel();
    this.camera.finishShot();
  }

  get isSkipping(): boolean {
    return this.skipping;
  }

  /** Chapter card. Resolves with the index of the clicked button (or -1 after auto-close). */
  chapterCard(kicker: string, title: string, sub: string, theme: 'prologue' | 'ruby' | 'redFound', buttons: string[] = [], autoClose = 3.2): Promise<number> {
    this.sfx('page');
    this.narrator.speak(`${kicker}. ${title}. ${sub}`, SPEAKERS.narrator.voice);
    return new Promise((resolve) => {
      let done = false;
      const finish = (i: number) => {
        if (done) return;
        done = true;
        this.screens.close('card', false);
        resolve(i);
      };
      menus.openChapterCard(
        this.screens,
        kicker,
        title,
        sub,
        theme,
        buttons.map((label, i) => ({ label, primary: i === 0, onClick: () => finish(i) })),
      );
      if (!buttons.length) window.setTimeout(() => finish(-1), autoClose * 1000);
    });
  }

  unlockCard(color: GameColor): Promise<void> {
    return new Promise((resolve) => menus.openUnlockCard(this.screens, color, resolve));
  }

  /** Persist a checkpoint and tell the player (Bible: visible, reassuring saves). */
  checkpoint(rule?: (s: SaveData) => SaveData, text = 'Checkpoint saved'): void {
    if (rule) this.state.apply(rule, true);
    else this.state.persist();
    this.hud.flashCheckpoint(text);
    this.sfx('checkpoint');
  }

  /** Soft respawn: never a "death" — a splash, a pop back to safe ground, an encouraging word. */
  private async gentleRespawn(hazard: boolean): Promise<void> {
    if (this.respawning || !this.player || !this.level) return;
    this.respawning = true;
    const p = this.player;
    const level = this.level;
    this.sfx('splash');
    this.particles.puff(p.position.clone().setY(Math.max(p.position.y, level.killY + 1) + 0.3), { count: 18, colors: ['#e9eaee', '#c8ccd3'], speed: 3, upward: 2, size: 0.35, life: 0.8 });
    if (hazard) await level.tasks.wait(0.35);
    $('fade').classList.add('on');
    await level.tasks.wait(0.26);
    p.motor.respawn();
    p.syncVisual();
    this.camera.snapTo(new THREE.Vector3(p.position.x, p.position.y + 1.25, p.position.z));
    this.pip.teleport(p.position.clone().add(new THREE.Vector3(0.8, 2, 0.6)));
    $('fade').classList.remove('on');
    this.particles.sparkles(p.position.clone().setY(p.position.y + 0.8), { count: 14, color: '#fff6c8', speed: 1.6, life: 0.8 });
    const msg = level.fallMessage();
    if (msg && this.time - this.lastFallBark > 6) {
      this.lastFallBark = this.time;
      this.pipSays(msg);
    }
    this.respawning = false;
  }

  private onLine(line: Line): void {
    const seconds = Math.min(6, 0.9 + line.text.length / 22);
    if (line.speaker === 'pip') this.pip.talk(seconds);
    if (line.speaker === 'explorer' && this.player) {
      this.player.talking = true;
      window.setTimeout(() => this.player && !this.dialogue.isOpen && (this.player.talking = false), seconds * 1000);
    }
    (this.level as Level & { onLine?: (l: Line) => void })?.onLine?.(line);
  }

  askPip(): void {
    if (!this.level || this.mode !== 'game') return;
    if (this.level.onAskPip()) {
      // handled by the level (e.g. the current rescue stage's hint ladder)
    } else if (this.level.hints) {
      this.level.hints.request();
    } else {
      this.pipSays(this.level.genericHint());
    }
    this.pip.mood = 'thinking';
    window.setTimeout(() => (this.pip.mood = 'happy'), 2500);
  }

  // ───────────────────────────── Level management ─────────────────────────────

  private async fade(on: boolean, dark = false): Promise<void> {
    const f = $('fade');
    f.classList.toggle('dark', dark);
    f.classList.toggle('on', on);
    await new Promise((r) => setTimeout(r, this.settings.reducedMotion ? 120 : 620));
  }

  async changeLevel(id: LocationId | 'title', opts: { fade?: boolean } = {}): Promise<void> {
    if (this.changing) return;
    this.changing = true;
    try {
      if (opts.fade !== false) await this.fade(true);
      this.unloadLevel();
      const factory = this.levelFactories.get(id);
      if (!factory) throw new Error(`No level registered for ${id}`);
      const level = factory(this);
      this.level = level;
      level.build();
      this.engine.scene.add(level.root);
      const fogColor = new THREE.Color(level.fogColor);
      this.engine.scene.fog = new THREE.Fog(fogColor, level.fogNear, level.fogFar);
      this.engine.scene.background = fogColor;
      if (this.state.active) this.restoration.syncAll(this.save.colors);
      else this.restoration.syncAll({ red: false, blue: false, yellow: false, purple: false, orange: false, green: false });
      this.camera.setLimits(level.cameraLimits);
      if (this.player && id !== 'title') {
        const sp = level.spawn();
        this.player.setWorld(level.physics);
        this.player.motor.killY = level.killY;
        this.player.teleport(sp.pos.x, sp.pos.y, sp.pos.z, sp.yaw);
        this.engine.scene.add(this.player.object);
        this.camera.follow(0);
        this.camera.snapTo(new THREE.Vector3(sp.pos.x, sp.pos.y + 1.25, sp.pos.z), sp.cameraYaw ?? sp.yaw + Math.PI);
        this.pip.teleport(sp.pos.clone().add(new THREE.Vector3(1, 2, 1)));
        this.state.apply((s) => setLocation(s, id), true);
      }
      this.audio.music.play(level.music);
      this.audio.music.bellsLayer = false;
      if (opts.fade !== false) await this.fade(false);
    } finally {
      this.changing = false;
    }
    this.level?.start();
  }

  private unloadLevel(): void {
    this.dialogue.cancel();
    this.captions.clear();
    this.toasts.clear();
    this.interactions.clear();
    this.restoration.clearReveals();
    this.particles.clear();
    this.hud.setGems(null);
    this.hud.setPrompt(null);
    this.talkDepth = 0;
    this.cinematicDepth = 0;
    this.lockDepth = 0;
    this.skipping = false;
    this.respawning = false;
    this.skipBtn?.remove();
    this.skipBtn = null;
    $('letterbox').classList.remove('on');
    $('hud').classList.remove('cinematic');
    if (this.player) this.engine.scene.remove(this.player.object);
    if (this.level) {
      this.level.dispose();
      this.level = null;
    }
  }

  // ───────────────────────────── Menus & flow ─────────────────────────────

  async showTitle(): Promise<void> {
    this.mode = 'title';
    this.hud.hide();
    this.touch.setVisible(false);
    this.pip.root.visible = false;
    if (this.player) {
      this.engine.scene.remove(this.player.object);
      this.player.dispose();
      this.player = null;
    }
    await this.changeLevel('title', { fade: this.level !== null });
    $('boot').classList.add('done');
    this.openTitleMenu();
  }

  private openTitleMenu(): void {
    const stored = this.saveStore.load();
    const hasSave = stored !== null;
    const s = stored?.save;
    const where = s ? (s.prologue.phase === 'complete' ? (s.ruby.phase === 'complete' ? 'Ruby Orchard (complete)' : CHAPTERS.ruby.title) : 'the Prologue') : '';
    menus.openTitle(this.screens, {
      hasSave,
      continueLabel: hasSave ? `Continue — ${where}` : 'Continue',
      readAloud: this.settings.readAloud,
      soundOn: this.settings.masterVolume > 0,
      onContinue: () => this.continueGame(),
      onNewGame: () => {
        if (hasSave) menus.openConfirm(this.screens, 'Start a new adventure?', 'Your saved adventure will be replaced. This cannot be undone.', 'Yes, start over', () => this.pickHero());
        else this.pickHero();
      },
      onSettings: () => this.openSettings(),
      onAbout: () => menus.openAbout(this.screens),
      onToggleReadAloud: (on) => this.settingsStore.set('readAloud', on),
      onToggleSound: (on) => this.settingsStore.set('masterVolume', on ? this.soundRestore || 0.8 : 0),
      onAnyClick: () => this.audio.unlock(),
    });
  }

  private pickHero(): void {
    menus.openHeroSelect(
      this.screens,
      (hero) => {
        this.audio.unlock();
        this.sfx('pickup');
        this.screens.closeAll();
        void this.newGame(hero);
      },
      () => {},
    );
  }

  async newGame(hero: HeroId): Promise<void> {
    const fresh = this.saveStore.reset(hero);
    this.state.begin(fresh);
    await this.enterGame(hero, fresh.location);
  }

  async continueGame(): Promise<void> {
    this.audio.unlock();
    const report = this.saveStore.load();
    const save = report?.save ?? newSave('girl');
    if (report?.repairs.length) console.info('[ColorMeBack] Save repaired:', report.repairs);
    this.state.begin(save);
    this.state.persist();
    this.screens.closeAll();
    await this.enterGame(save.hero, save.location);
    if (report?.migratedFrom === 1) this.toast('Welcome to the new adventure! Your explorer choice was kept.', 4);
  }

  private async enterGame(hero: HeroId, location: LocationId): Promise<void> {
    this.mode = 'game';
    if (this.player) {
      this.player.dispose();
      this.engine.scene.remove(this.player.object);
    }
    this.player = new Player(hero, new PhysicsWorld());
    this.player.setBrushVisible(this.save.prologue.hasWonderbrush);
    this.hud.show();
    this.touch.setVisible(true);
    this.pip.root.visible = this.save.prologue.phase !== 'opening' && this.save.prologue.phase !== 'inspect';
    await this.changeLevel(location);
  }

  /** Pip becomes visible (Prologue P1 entrance) — persists via save phase. */
  showPip(on: boolean): void {
    this.pip.root.visible = on;
  }

  openPause(): void {
    if (!this.level || this.mode !== 'game' || this.screens.isOpen) return;
    this.sfx('ui');
    this.audio.music.setLevel(0.45);
    const heroName = this.player?.hero === 'boy' ? 'Boy Explorer' : 'Girl Explorer';
    menus.openPause(this.screens, {
      heroName,
      areaName: this.level.areaName,
      onResume: () => this.audio.music.setLevel(1),
      onHelp: () => menus.openHelp(this.screens, (c) => hasColor(this.save, c)),
      onSettings: () => this.openSettings(),
      onStickers: () => menus.openStickers(this.screens, this.save.collectibles),
      onSwitchHero: () => {
        if (!this.player) return;
        const next: HeroId = this.player.hero === 'girl' ? 'boy' : 'girl';
        this.player.setHero(next);
        this.player.syncVisual();
        this.state.apply((s) => ({ ...structuredClone(s), hero: next }), true);
        this.screens.close('pause');
        this.toast(`Now playing as the ${next === 'girl' ? 'Girl' : 'Boy'} Explorer — same powers, same story!`, 3);
      },
      onRestartCheckpoint: () => {
        menus.openConfirm(this.screens, 'Restart from the last checkpoint?', 'You will go back to your last saved spot. Nothing you finished will be lost.', 'Restart', () => {
          this.screens.closeAll();
          this.audio.music.setLevel(1);
          void this.changeLevel(this.save.location);
        });
      },
      onMainMenu: () => {
        menus.openConfirm(this.screens, 'Go to the main menu?', 'Your progress is saved at the last checkpoint.', 'Main menu', () => {
          this.screens.closeAll();
          this.audio.music.setLevel(1);
          this.state.persist();
          void this.showTitle();
        });
      },
    });
  }

  openSettings(): void {
    menus.openSettings(
      this.screens,
      () => this.settings,
      (k, v) => {
        this.settingsStore.set(k, v);
        if (k === 'readAloud' && v) this.narrator.speak('Read aloud is on.', SPEAKERS.pip.voice);
      },
      () => this.settingsStore.resetToDefaults(),
      this.narrator.available,
    );
  }

  openPalette(): void {
    if (this.mode !== 'game' || this.screens.isOpen) return;
    this.sfx('ui');
    menus.openPalette(this.screens, {
      owned: (c) => hasColor(this.save, c),
      guardianFor: (c: PrimaryColor) => (c === 'red' ? 'Ruby' : c === 'blue' ? 'Bloop' : 'Sol'),
      onMix: (a, b) => {
        const r = mixColors(this.save, a, b);
        if (r.discovered) {
          this.state.apply(() => r.save, true);
          this.restoration.setInstant(r.result!, true);
        }
        return { result: r.reason === 'same-color' ? null : r.result, discovered: r.discovered, reason: r.reason };
      },
      onClose: () => {},
      sound: (n) => this.sfx(n),
      speak: (t) => this.narrator.speak(t, SPEAKERS.pip.voice),
    });
  }

  /** Human-readable location (HUD/pause). */
  locationName(id: LocationId): string {
    return LOCATION_NAMES[id];
  }
}
