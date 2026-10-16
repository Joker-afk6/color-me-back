/**
 * The player-controlled Explorer: physics motor + 3D model + animator, wired to input.
 * Identical for both explorers; only `buildExplorer(hero)` differs.
 */
import * as THREE from 'three';
import type { HeroId } from '../state/SaveData';
import { buildExplorer, type ExplorerRig } from '../characters/ExplorerModel';
import { ExplorerAnimator, type OneShot } from '../characters/ExplorerAnimator';
import { CharacterMotor, EXPLORER_TUNING, type MotorEvent } from '../systems/CharacterMotor';
import { PhysicsWorld } from '../systems/physics';
import { MaterialLibrary } from '../rendering/paint';
import { disposeGeometries } from '../rendering/shapes';

export interface PlayerControl {
  moveX: number;
  moveZ: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dashPressed: boolean;
  sweeping: boolean;
}

export class Player {
  readonly motor: CharacterMotor;
  rig: ExplorerRig;
  animator: ExplorerAnimator;
  hero: HeroId;
  private lib = new MaterialLibrary();
  readonly object = new THREE.Group();
  talking = false;
  /** Visual-only override (cutscenes place the explorer precisely). */
  private hasBrush = false;

  constructor(hero: HeroId, world: PhysicsWorld) {
    this.hero = hero;
    this.motor = new CharacterMotor(world, EXPLORER_TUNING);
    this.rig = buildExplorer(hero, this.lib);
    this.animator = new ExplorerAnimator(this.rig);
    this.object.add(this.rig.root);
  }

  /** Swap the visual model (Pause → Switch Explorer). Physics and progress are unchanged. */
  setHero(hero: HeroId): void {
    if (hero === this.hero) return;
    this.object.remove(this.rig.root);
    disposeGeometries(this.rig.root);
    this.lib.dispose();
    this.lib = new MaterialLibrary();
    this.hero = hero;
    this.rig = buildExplorer(hero, this.lib);
    this.animator = new ExplorerAnimator(this.rig);
    this.rig.brush.visible = this.hasBrush;
    this.object.add(this.rig.root);
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  setWorld(world: PhysicsWorld): void {
    this.motor.world = world;
  }

  setBrushVisible(v: boolean): void {
    this.hasBrush = v;
    this.rig.brush.visible = v;
  }

  get brushVisible(): boolean {
    return this.hasBrush;
  }

  /** World position of the brush tip (sparkle origin). */
  brushTipWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.rig.brushTip.getWorldPosition(out);
  }

  teleport(x: number, y: number, z: number, facing = this.motor.facing): void {
    this.motor.teleport(x, y, z, facing);
    this.syncVisual();
  }

  play(kind: OneShot): void {
    this.animator.play(kind);
  }

  update(dt: number, c: PlayerControl): MotorEvent[] {
    const events = this.motor.step(dt, {
      moveX: c.moveX,
      moveZ: c.moveZ,
      jumpPressed: c.jumpPressed,
      jumpHeld: c.jumpHeld,
      dashPressed: c.dashPressed,
    });
    for (const e of events) if (e.type === 'land') this.animator.landed(e.impact);
    this.syncVisual();
    this.animator.update(dt, {
      speed: Math.hypot(this.motor.vel.x, this.motor.vel.z),
      runSpeed: EXPLORER_TUNING.runSpeed,
      grounded: this.motor.grounded,
      vy: this.motor.vel.y,
      dashing: this.motor.dashActive,
      sweeping: c.sweeping,
      talking: this.talking,
    });
    return events;
  }

  /** Animate in place without physics (cutscenes, sitting on the bed). */
  animateOnly(dt: number): void {
    this.animator.update(dt, {
      speed: 0,
      runSpeed: EXPLORER_TUNING.runSpeed,
      grounded: true,
      vy: 0,
      dashing: false,
      sweeping: false,
      talking: this.talking,
    });
  }

  syncVisual(): void {
    this.object.position.set(this.motor.pos.x, this.motor.pos.y, this.motor.pos.z);
    this.object.rotation.y = this.motor.facing;
  }

  dispose(): void {
    disposeGeometries(this.rig.root);
    this.lib.dispose();
  }
}
