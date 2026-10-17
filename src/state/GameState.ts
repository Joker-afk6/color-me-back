/**
 * Runtime owner of the current save. Gameplay code calls `apply(rule)` with a pure progression
 * function; the result is stored, persisted (when it is a checkpoint) and broadcast to the UI.
 */
import { withDerived, type SaveData } from './SaveData';
import { SaveStore } from './SaveStore';

type Listener = (save: Readonly<SaveData>) => void;

export class GameState {
  private current: SaveData | null = null;
  private listeners = new Set<Listener>();
  private playTimeAccumulator = 0;

  constructor(readonly store: SaveStore) {}

  get save(): Readonly<SaveData> {
    if (!this.current) throw new Error('No active save');
    return this.current;
  }

  get active(): boolean {
    return this.current !== null;
  }

  begin(save: SaveData): void {
    this.current = save;
    this.emit();
  }

  /**
   * Apply a pure rule. `checkpoint` persists immediately (the scripts require saves at specific beats).
   * Returns true when the save actually changed.
   */
  apply(rule: (s: SaveData) => SaveData, checkpoint = true): boolean {
    if (!this.current) return false;
    const next = rule(this.current);
    if (next === this.current) return false;
    // Keep the derived fields (abilities, checkpointId) current in memory, not only on disk.
    this.current = withDerived(next);
    if (checkpoint) this.persist();
    this.emit();
    return true;
  }

  persist(): boolean {
    return this.current ? this.store.write(this.current) : false;
  }

  /** Count play time; flushed into the save every 30 s of play (cheap, never blocks). */
  tick(dt: number): void {
    if (!this.current) return;
    this.playTimeAccumulator += dt;
    if (this.playTimeAccumulator >= 30) {
      this.current = { ...this.current, playTimeSeconds: this.current.playTimeSeconds + this.playTimeAccumulator };
      this.playTimeAccumulator = 0;
      this.persist();
    }
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(): void {
    if (!this.current) return;
    for (const l of this.listeners) l(this.current);
  }
}
