/** Floating word labels with a star icon ("star icon and a word label" — Prologue P1). */
import * as THREE from 'three';
import type { MaterialLibrary } from '../rendering/paint';
import { iconTexture, labelTexture } from '../rendering/textures';

export interface WordLabel {
  group: THREE.Group;
  setDone(done: boolean): void;
  setHighlight(on: boolean): void;
  update(t: number): void;
}

export function wordLabel(lib: MaterialLibrary, text: string, height = 0.42): WordLabel {
  const group = new THREE.Group();
  const { texture, aspect } = labelTexture(text, { background: 'rgba(255,252,244,0.95)', border: '#ffd46e', color: '#2b3150' });
  const labelMat = lib.track(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  const label = new THREE.Sprite(labelMat);
  label.scale.set(height * aspect, height, 1);
  label.renderOrder = 10;
  group.add(label);
  const starMat = lib.track(new THREE.SpriteMaterial({ map: iconTexture('star'), color: '#ffd84d', transparent: true, depthWrite: false }));
  const star = new THREE.Sprite(starMat);
  star.scale.setScalar(height * 0.9);
  star.position.set(-(height * aspect) / 2 - height * 0.35, 0, 0);
  star.renderOrder = 11;
  group.add(star);
  let done = false;
  let highlight = false;
  return {
    group,
    setDone(d: boolean) {
      done = d;
      starMat.color.set(d ? '#9be27f' : '#ffd84d');
      labelMat.opacity = d ? 0.6 : 1;
    },
    setHighlight(on: boolean) {
      highlight = on;
    },
    update(t: number) {
      const bob = Math.sin(t * 2.2 + group.id) * 0.05;
      group.position.y = (group.userData.baseY ?? (group.userData.baseY = group.position.y)) + bob + (highlight ? Math.abs(Math.sin(t * 6)) * 0.12 : 0);
      star.material.rotation = done ? 0 : Math.sin(t * 3) * 0.25;
      const s = highlight ? 1.15 + Math.sin(t * 8) * 0.08 : 1;
      star.scale.setScalar(height * 0.9 * s);
    },
  };
}
