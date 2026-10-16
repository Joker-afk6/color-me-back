/**
 * Development/QA hooks (only installed in dev builds or with ?debug in the URL).
 * Lets automated browser playtests read state and jump to checkpoints. Never used by gameplay.
 */
import type { Game } from '../core/Game';
import type { SaveData } from '../state/SaveData';
import type { LocationId } from '../data/chapters';

export interface CmbDebug {
  game: Game;
  snapshot(): Record<string, unknown>;
  teleport(x: number, y: number, z: number): void;
  go(location: LocationId): Promise<void>;
  skip(): void;
  advance(): void;
  /** Replace the save (validated rules are bypassed — QA only) and reload the location. */
  load(save: SaveData): Promise<void>;
  interact(): void;
  /** Advance game time in fixed steps (works even when the tab is throttled). */
  step(seconds: number): Promise<Record<string, unknown>>;
  /** Hold keys (event.code) for a number of seconds of game time. */
  hold(codes: string[], seconds: number): Promise<Record<string, unknown>>;
  /** Tap a key (event.code) and advance one frame. */
  tap(code: string): Promise<Record<string, unknown>>;
}

export function installDebugApi(game: Game): void {
  const api: CmbDebug = {
    game,
    snapshot: () => ({
      mode: game.mode,
      level: game.level?.id ?? null,
      objective: game.level?.objective() ?? null,
      locked: game.locked,
      cutscene: game.inCutscene,
      dialogue: game.dialogue.currentLine ? `${game.dialogue.currentLine.speaker}: ${game.dialogue.currentLine.text}` : null,
      focus: game.interactions.focus ? { id: game.interactions.focus.target.id, blocked: game.interactions.focus.blocked, hold: game.interactions.focus.holdProgress } : null,
      player: game.player
        ? {
            x: +game.player.motor.pos.x.toFixed(2),
            y: +game.player.motor.pos.y.toFixed(2),
            z: +game.player.motor.pos.z.toFixed(2),
            grounded: game.player.motor.grounded,
            hero: game.player.hero,
            dash: game.player.motor.dashAllowed,
          }
        : null,
      save: game.state.active ? game.save : null,
      screens: game.screens.topId,
    }),
    teleport: (x, y, z) => game.player?.teleport(x, y, z),
    go: (loc) => game.changeLevel(loc),
    skip: () => game.skipCutscene(),
    advance: () => game.dialogue.advance(),
    load: async (save) => {
      game.state.begin(structuredClone(save));
      game.state.persist();
      await game.changeLevel(save.location);
    },
    interact: () => {
      const f = game.interactions.focus;
      if (f && !f.blocked) f.target.onInteract();
    },
    step: async (seconds) => {
      await game.debugStep(seconds);
      return api.snapshot();
    },
    hold: async (codes, seconds) => {
      for (const code of codes) window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code }));
      await game.debugStep(seconds);
      for (const code of codes) window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code }));
      await game.debugStep(1 / 60);
      return api.snapshot();
    },
    tap: async (code) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code }));
      await game.debugStep(1 / 60);
      window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code }));
      await game.debugStep(1 / 60);
      return api.snapshot();
    },
  };
  (window as unknown as { __CMB__: CmbDebug }).__CMB__ = api;
  console.info('[ColorMeBack] Debug API available as window.__CMB__');
}
