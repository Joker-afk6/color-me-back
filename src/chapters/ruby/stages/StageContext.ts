/** Everything a Ruby rescue stage needs from the level. */
import type * as THREE from 'three';
import type { Game } from '../../../core/Game';
import type { Tweens } from '../../../core/Tweens';
import type { MaterialLibrary } from '../../../rendering/paint';
import type { PhysicsWorld } from '../../../systems/physics';
import type { RubyDragon } from '../../../characters/RubyDragon';

export interface StageContext {
  game: Game;
  root: THREE.Group;
  lib: MaterialLibrary;
  physics: PhysicsWorld;
  tweens: Tweens;
  ruby: RubyDragon;
  /** Pip/Ruby encouragement with simple rate limiting. */
  encourage(text: string, minGap?: number): void;
}

export interface RescueStage {
  readonly done: boolean;
  start(): void;
  update(dt: number): void;
  /** Ask Pip / hint request for this stage. */
  hint(): void;
  dispose(): void;
}
