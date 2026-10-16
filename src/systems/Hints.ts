/**
 * Gentle hint ladders (Bible: "safe help hints", per-stage hint ladders in every chapter script).
 * Each step unlocks after a delay without progress, or immediately when the player asks Pip (H).
 */
export interface HintStep {
  /** Seconds without progress before this step is offered automatically. */
  after: number;
  run: () => void;
}

export class HintLadder {
  private t = 0;
  level = 0;
  private active = true;

  constructor(readonly id: string, private readonly steps: HintStep[], private readonly scale = 1) {}

  get exhausted(): boolean {
    return this.level >= this.steps.length;
  }

  /** Reset the idle timer (call on visible progress). Keeps the current level. */
  progress(): void {
    this.t = 0;
  }

  stop(): void {
    this.active = false;
  }

  /** Player asked for help: give the next step now. Returns false when all steps were used. */
  request(): boolean {
    if (!this.active) return false;
    const step = this.steps[this.level];
    if (!step) {
      // Repeat the last hint so asking always does something.
      this.steps.at(-1)?.run();
      return false;
    }
    this.level++;
    this.t = 0;
    step.run();
    return true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.t += dt;
    const step = this.steps[this.level];
    if (step && this.t >= step.after * this.scale) {
      this.level++;
      this.t = 0;
      step.run();
    }
  }
}
