/**
 * Game-time scheduler for scripted sequences. Waits advance only while the game is running
 * (they pause with the pause menu). Cancelling (level unload) makes every pending wait hang
 * forever, which cleanly stops any script that was still running for that level.
 */
export class Tasks {
  private timers: Array<{ left: number; resolve: () => void }> = [];
  private conditions: Array<{ pred: () => boolean; resolve: () => void }> = [];
  private _cancelled = false;
  /** When true (cutscene skip), every wait resolves immediately. */
  fastForward = false;

  get cancelled(): boolean {
    return this._cancelled;
  }

  wait(seconds: number): Promise<void> {
    if (this._cancelled) return new Promise(() => {});
    if (this.fastForward || seconds <= 0) return Promise.resolve();
    return new Promise((resolve) => this.timers.push({ left: seconds, resolve }));
  }

  until(pred: () => boolean): Promise<void> {
    if (this._cancelled) return new Promise(() => {});
    if (pred()) return Promise.resolve();
    return new Promise((resolve) => this.conditions.push({ pred, resolve }));
  }

  /** Wrap an external promise so it never continues a cancelled script. */
  guard<T>(p: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      p.then(
        (v) => {
          if (!this._cancelled) resolve(v);
        },
        (e) => {
          if (!this._cancelled) reject(e);
        },
      );
    });
  }

  update(dt: number): void {
    if (this._cancelled) return;
    if (this.timers.length) {
      const done: Array<() => void> = [];
      this.timers = this.timers.filter((t) => {
        t.left -= this.fastForward ? Infinity : dt;
        if (t.left <= 0) {
          done.push(t.resolve);
          return false;
        }
        return true;
      });
      for (const r of done) r();
    }
    if (this.conditions.length) {
      const done: Array<() => void> = [];
      this.conditions = this.conditions.filter((c) => {
        let ok = false;
        try {
          ok = c.pred();
        } catch (err) {
          console.error('[ColorMeBack] condition failed', err);
          ok = true;
        }
        if (ok) done.push(c.resolve);
        return !ok;
      });
      for (const r of done) r();
    }
  }

  cancelAll(): void {
    this._cancelled = true;
    this.timers = [];
    this.conditions = [];
  }
}
