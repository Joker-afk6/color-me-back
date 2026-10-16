/**
 * Drives the shared color-key uniforms: instant sync from the save, propagating waves for the
 * signature "COLOR RETURNS" moments, and the reduced-motion crossfade alternative.
 * Objects can register a reveal callback that fires exactly when the wave front reaches them
 * (berries ripen, poppies bloom, the explorer's scarf lights up...).
 */
import * as THREE from 'three';
import { ALL_COLORS, COLOR_INFO, type GameColor } from '../data/colors';
import { KEY_UNIFORMS } from '../rendering/paint';

interface Reveal {
  color: GameColor;
  position: THREE.Vector3;
  callback: (instant: boolean) => void;
  fired: boolean;
}

interface Anim {
  color: GameColor;
  kind: 'wave' | 'fade';
  t: number;
  duration: number;
  maxRadius: number;
  resolve: () => void;
}

export class ColorRestoration {
  private reveals: Reveal[] = [];
  private anims: Anim[] = [];
  /** Colors currently shown in the world (may differ from the save during a cinematic). */
  private shown = new Set<GameColor>();

  /** Set every key to match the save, instantly (level load, continue). */
  syncAll(colors: Readonly<Record<GameColor, boolean>>): void {
    for (const c of ALL_COLORS) this.setInstant(c, colors[c]);
  }

  setInstant(color: GameColor, on: boolean): void {
    this.anims = this.anims.filter((a) => {
      if (a.color !== color) return true;
      a.resolve();
      return false;
    });
    const u = KEY_UNIFORMS[color];
    u.uCmbSat.value = on ? 1 : 0;
    u.uCmbWaveOn.value = 0;
    u.uCmbWaveRadius.value = 0;
    if (on) this.shown.add(color);
    else this.shown.delete(color);
    if (on) for (const r of this.reveals) if (r.color === color && !r.fired) this.fire(r, true);
  }

  isShown(color: GameColor): boolean {
    return this.shown.has(color);
  }

  /** Register a per-object reveal. If the color is already shown, it fires immediately (instant). */
  onReveal(color: GameColor, position: THREE.Vector3, callback: (instant: boolean) => void): void {
    const r: Reveal = { color, position: position.clone(), callback, fired: false };
    this.reveals.push(r);
    if (this.shown.has(color)) this.fire(r, true);
  }

  /** Forget level-specific reveal hooks (called when a level unloads). */
  clearReveals(): void {
    this.reveals = [];
  }

  /** Signature wave: color sweeps outward from `center` across all surfaces of that key. */
  playWave(color: GameColor, center: THREE.Vector3, duration = 6.5, maxRadius = 110): Promise<void> {
    const u = KEY_UNIFORMS[color];
    u.uCmbSat.value = 0;
    u.uCmbWaveCenter.value.copy(center);
    u.uCmbWaveRadius.value = 0;
    u.uCmbWaveWidth.value = 7;
    u.uCmbWaveOn.value = 1;
    u.uCmbFrontColor.value.set(COLOR_INFO[color].hex).lerp(new THREE.Color('#ffffff'), 0.35);
    for (const r of this.reveals) if (r.color === color) r.fired = false;
    return new Promise((resolve) => this.anims.push({ color, kind: 'wave', t: 0, duration, maxRadius, resolve }));
  }

  /** Reduced-motion alternative: a soft crossfade with no sweeping front. */
  crossfade(color: GameColor, duration = 2): Promise<void> {
    const u = KEY_UNIFORMS[color];
    u.uCmbWaveOn.value = 0;
    u.uCmbSat.value = 0;
    for (const r of this.reveals) if (r.color === color) r.fired = false;
    return new Promise((resolve) => this.anims.push({ color, kind: 'fade', t: 0, duration, maxRadius: 0, resolve }));
  }

  update(dt: number): void {
    for (const a of [...this.anims]) {
      a.t += dt;
      const k = Math.min(1, a.t / a.duration);
      const u = KEY_UNIFORMS[a.color];
      if (a.kind === 'wave') {
        // Ease-out so the color rushes out of the Guardian, then rolls gently across the land.
        const eased = 1 - Math.pow(1 - k, 2.2);
        const radius = eased * a.maxRadius;
        u.uCmbWaveRadius.value = radius;
        for (const r of this.reveals) {
          if (r.color !== a.color || r.fired) continue;
          const d = Math.hypot(r.position.x - u.uCmbWaveCenter.value.x, r.position.z - u.uCmbWaveCenter.value.z);
          if (d <= radius - 1) this.fire(r, false);
        }
      } else {
        u.uCmbSat.value = k * k * (3 - 2 * k);
        if (k > 0.35) for (const r of this.reveals) if (r.color === a.color && !r.fired) this.fire(r, false);
      }
      if (k >= 1) {
        u.uCmbSat.value = 1;
        u.uCmbWaveOn.value = 0;
        this.shown.add(a.color);
        for (const r of this.reveals) if (r.color === a.color && !r.fired) this.fire(r, false);
        this.anims.splice(this.anims.indexOf(a), 1);
        a.resolve();
      }
    }
  }

  private fire(r: Reveal, instant: boolean): void {
    r.fired = true;
    try {
      r.callback(instant);
    } catch (err) {
      console.error('[ColorMeBack] reveal callback failed', err);
    }
  }
}
