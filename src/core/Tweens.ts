/** Tiny game-time tween runner (paused with the game, cleared with the level). */
export interface TweenHandle {
  cancel(): void;
  readonly done: Promise<void>;
}

interface Tween {
  t: number;
  duration: number;
  fn: (k: number) => void;
  ease: (t: number) => number;
  resolve: () => void;
  cancelled: boolean;
}

export class Tweens {
  private list: Tween[] = [];

  add(duration: number, fn: (k: number) => void, ease: (t: number) => number = (x) => x): TweenHandle {
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    const tw: Tween = { t: 0, duration: Math.max(0.0001, duration), fn, ease, resolve, cancelled: false };
    this.list.push(tw);
    fn(ease(0));
    return {
      done,
      cancel: () => {
        tw.cancelled = true;
        resolve();
      },
    };
  }

  update(dt: number): void {
    if (!this.list.length) return;
    const finished: Tween[] = [];
    for (const tw of this.list) {
      if (tw.cancelled) {
        finished.push(tw);
        continue;
      }
      tw.t = Math.min(tw.duration, tw.t + dt);
      tw.fn(tw.ease(tw.t / tw.duration));
      if (tw.t >= tw.duration) finished.push(tw);
    }
    if (finished.length) {
      this.list = this.list.filter((t) => !finished.includes(t));
      for (const tw of finished) tw.resolve();
    }
  }

  /** Jump every running tween to its end (cutscene skip). */
  finishAll(): void {
    for (const tw of this.list) {
      tw.fn(tw.ease(1));
      tw.resolve();
    }
    this.list = [];
  }

  clear(): void {
    this.list = [];
  }
}
