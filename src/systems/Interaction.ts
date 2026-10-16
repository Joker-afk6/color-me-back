/**
 * Wonderbrush interactions. Levels register interactables; the system finds the best one in reach
 * (assist mode widens the reach), shows a prompt + a floating 3D marker, and handles taps (E) and
 * holds (sweep-paint). Height-gated targets explain why they cannot be reached yet.
 */
import * as THREE from 'three';
import { iconTexture } from '../rendering/textures';

export interface Interactable {
  id: string;
  position: THREE.Vector3;
  /** Horizontal reach in metres (before the assist multiplier). */
  radius: number;
  label: string;
  /** 'hold' = sweep-paint: hold E for `holdTime` seconds. */
  kind?: 'tap' | 'hold';
  holdTime?: number;
  enabled: () => boolean;
  onInteract: () => void;
  /** Feet must be at least this high (e.g. standing on a raised platform). */
  minFeetY?: number;
  /** Text when in reach but height-gated. */
  blockedText?: string;
  /** Custom gate: return a friendly reason when the target can't be used yet, else null. */
  blocked?: () => string | null;
  /** Vertical reach above/below the explorer's chest. */
  verticalReach?: number;
  /** Hide the floating marker (e.g. doors that glow themselves). */
  noMarker?: boolean;
  priority?: number;
}

export interface FocusInfo {
  target: Interactable;
  blocked: boolean;
  /** Why the target can't be used yet (shown in the prompt). */
  blockedText: string | null;
  holdProgress: number | null;
}

export class InteractionSystem {
  private items: Interactable[] = [];
  focus: FocusInfo | null = null;
  assist = false;
  private holdT = 0;
  private holdId = '';
  readonly marker: THREE.Sprite;
  private t = 0;

  constructor(scene: THREE.Scene) {
    const tex = iconTexture('star');
    const mat = new THREE.SpriteMaterial({ map: tex, color: '#fff3b0', transparent: true, depthTest: false, depthWrite: false });
    this.marker = new THREE.Sprite(mat);
    this.marker.scale.setScalar(0.42);
    this.marker.renderOrder = 20;
    this.marker.visible = false;
    scene.add(this.marker);
  }

  add(i: Interactable): Interactable {
    this.items.push(i);
    return i;
  }

  remove(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
    if (this.focus?.target.id === id) this.focus = null;
  }

  clear(): void {
    this.items = [];
    this.focus = null;
    this.marker.visible = false;
  }

  get(id: string): Interactable | undefined {
    return this.items.find((i) => i.id === id);
  }

  /**
   * Update focus. `interactPressed`/`interactHeld` come from input. Returns the interactable that
   * was triggered this frame (if any).
   */
  update(dt: number, feet: THREE.Vector3, facing: number, interactPressed: boolean, interactHeld: boolean, active: boolean): Interactable | null {
    this.t += dt;
    if (!active) {
      this.focus = null;
      this.marker.visible = false;
      this.holdT = 0;
      return null;
    }
    const reachMul = this.assist ? 1.5 : 1;
    const chest = feet.y + 1.0;
    let best: { item: Interactable; score: number; blocked: boolean; why: string | null } | null = null;
    for (const it of this.items) {
      if (!it.enabled()) continue;
      const dx = it.position.x - feet.x;
      const dz = it.position.z - feet.z;
      const d = Math.hypot(dx, dz);
      const reach = it.radius * reachMul;
      if (d > reach) continue;
      const vReach = it.verticalReach ?? 2.6;
      if (Math.abs(it.position.y - chest) > vReach + (this.assist ? 0.6 : 0)) continue;
      // Prefer targets in front of the explorer.
      const ang = Math.atan2(dx, dz) - facing;
      const front = Math.cos(ang);
      const custom = it.blocked?.() ?? null;
      const blocked = custom !== null || (it.minFeetY !== undefined && feet.y < it.minFeetY - 0.05);
      const score = d - front * 0.6 - (it.priority ?? 0) + (blocked ? 1.5 : 0);
      if (!best || score < best.score) best = { item: it, score, blocked, why: custom ?? (blocked ? it.blockedText ?? null : null) };
    }
    let fired: Interactable | null = null;
    if (!best) {
      this.focus = null;
      this.holdT = 0;
    } else {
      const it = best.item;
      if (this.holdId !== it.id) {
        this.holdId = it.id;
        this.holdT = 0;
      }
      let holdProgress: number | null = null;
      if (!best.blocked) {
        if ((it.kind ?? 'tap') === 'tap') {
          if (interactPressed) fired = it;
        } else {
          const need = it.holdTime ?? 1.2;
          if (interactHeld) this.holdT += dt;
          else this.holdT = Math.max(0, this.holdT - dt * 1.5);
          holdProgress = Math.min(1, this.holdT / need);
          if (this.holdT >= need) {
            fired = it;
            this.holdT = 0;
          }
        }
      }
      this.focus = { target: it, blocked: best.blocked, blockedText: best.why, holdProgress };
    }
    // Floating marker above the focused target.
    const f = this.focus;
    if (f && !f.target.noMarker) {
      this.marker.visible = true;
      this.marker.position.copy(f.target.position);
      this.marker.position.y += 0.9 + Math.sin(this.t * 4) * 0.08;
      const s = 0.38 + Math.sin(this.t * 6) * 0.04;
      this.marker.scale.setScalar(s);
      (this.marker.material as THREE.SpriteMaterial).color.set(f.blocked ? '#ffd7a0' : '#fff3b0');
    } else this.marker.visible = false;
    if (fired) fired.onInteract();
    return fired;
  }

  /** Is the player currently holding toward a hold-type target? (drives the sweep animation) */
  get sweeping(): boolean {
    return !!this.focus && (this.focus.target.kind ?? 'tap') === 'hold' && (this.focus.holdProgress ?? 0) > 0.02 && !this.focus.blocked;
  }
}
