/**
 * Base class for a playable place. A level owns its scene graph, colliders, materials, scripted
 * tasks and interactables, and releases ALL of them in dispose() (no leaks across transitions).
 */
import * as THREE from 'three';
import type { LocationId } from '../data/chapters';
import { PhysicsWorld } from '../systems/physics';
import { MaterialLibrary } from '../rendering/paint';
import { disposeGeometries } from '../rendering/shapes';
import type { CameraLimits } from '../systems/CameraRig';
import { Tasks } from './Tasks';
import type { Game } from './Game';
import type { HintLadder } from '../systems/Hints';

export interface SpawnPoint {
  pos: THREE.Vector3;
  /** Direction the explorer faces. */
  yaw: number;
  /** Camera orbit yaw (defaults to directly behind the explorer). */
  cameraYaw?: number;
}

export abstract class Level {
  abstract readonly id: LocationId | 'title';
  abstract readonly areaName: string;
  readonly root = new THREE.Group();
  readonly physics = new PhysicsWorld();
  readonly lib = new MaterialLibrary();
  readonly tasks = new Tasks();
  cameraLimits: Partial<CameraLimits> = {};
  /** Song id for the music sequencer. */
  music = 'village';
  /** Fog + background tint for this place. */
  fogColor = '#cfd5dc';
  fogNear = 45;
  fogFar = 170;
  killY = -12;
  /** Current hint ladder (Ask Pip). */
  hints: HintLadder | null = null;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  constructor(protected readonly game: Game) {
    this.root.name = 'level';
  }

  /** Create geometry, colliders and interactables. */
  abstract build(): void;

  /** Begin scripted flow for the current save state. */
  abstract start(): void;

  /** Where to put the explorer when (re)entering at the current checkpoint. */
  abstract spawn(): SpawnPoint;

  /** HUD objective text for the current state. */
  abstract objective(): string;

  /** Per-frame logic (after player/camera). */
  update(_dt: number): void {}

  /** Level-specific "Ask Pip" handling. Return true when handled. */
  onAskPip(): boolean {
    return false;
  }

  /** Ask Pip with no active ladder: a friendly reminder of the objective. */
  genericHint(): string {
    return this.objective();
  }

  /** Called when the explorer falls off or lands in a soft hazard. Return a Pip line or null. */
  fallMessage(): string | null {
    return 'Whoops! Let’s try that again.';
  }

  track<T extends { dispose: () => void }>(d: T): T {
    this.disposables.push(d);
    return d;
  }

  dispose(): void {
    this.tasks.cancelAll();
    this.root.removeFromParent();
    disposeGeometries(this.root);
    this.lib.dispose();
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
  }
}
