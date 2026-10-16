/**
 * Optional, cosmetic collectible sticker (no influence on progression). Floats, spins, sparkles,
 * and is collected by simply touching it.
 */
import * as THREE from 'three';
import type { MaterialLibrary } from '../rendering/paint';
import { RoundedBoxGeometry, mesh } from '../rendering/shapes';
import { iconTexture } from '../rendering/textures';
import type { StickerId } from '../state/SaveData';

export class Sticker {
  readonly group = new THREE.Group();
  collected = false;
  private t = Math.random() * 10;

  constructor(lib: MaterialLibrary, readonly id: StickerId, readonly position: THREE.Vector3) {
    const card = mesh(new RoundedBoxGeometry(0.7, 0.7, 0.08, 3, 0.12), lib.paint('#FFF8E6', 'neutral', { roughness: 0.4, emissive: '#fff1c4', emissiveIntensity: 0.35, rim: 0.45 }));
    this.group.add(card);
    const iconMat = lib.track(new THREE.MeshBasicMaterial({ map: iconTexture('berry'), color: '#E5484D', transparent: true }));
    for (const z of [0.045, -0.045]) {
      const face = mesh(new THREE.PlaneGeometry(0.5, 0.5), iconMat, { cast: false, receive: false });
      face.position.z = z;
      if (z < 0) face.rotation.y = Math.PI;
      this.group.add(face);
    }
    const edge = mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24), lib.paint('#FFD45A', 'neutral', { emissive: '#ffd45a', emissiveIntensity: 0.5 }), { cast: false });
    this.group.add(edge);
    this.group.position.copy(position);
  }

  /** Returns true on the frame it is collected. */
  update(dt: number, player: THREE.Vector3 | null): boolean {
    if (this.collected) return false;
    this.t += dt;
    this.group.rotation.y += dt * 1.8;
    this.group.position.y = this.position.y + Math.sin(this.t * 2.2) * 0.12;
    if (player && Math.hypot(player.x - this.position.x, player.z - this.position.z) < 1.0 && Math.abs(player.y + 0.8 - this.position.y) < 1.4) {
      this.collected = true;
      this.group.visible = false;
      return true;
    }
    return false;
  }

  hide(): void {
    this.collected = true;
    this.group.visible = false;
  }
}
