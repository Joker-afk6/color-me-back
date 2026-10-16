/**
 * Title-screen vignette: both explorers (girl waving, boy idling) and Pip on a little gray
 * island in Hush Hollow, with a slow camera orbit behind the menu.
 */
import * as THREE from 'three';
import { Level, type SpawnPoint } from '../core/Level';
import { buildExplorer } from '../characters/ExplorerModel';
import { ExplorerAnimator } from '../characters/ExplorerAnimator';
import { createSky } from '../rendering/Sky';
import { paintNoiseTexture } from '../rendering/textures';
import { mesh } from '../rendering/shapes';
import { PAL, berryBush, cloud, fence, house, leaflessTree, place, wonderStar, type WonderStar } from './props';

export class TitleStage extends Level {
  readonly id = 'title' as const;
  readonly areaName = 'Title';
  override music = 'title';
  override fogColor = '#c9cfd8';
  private animators: ExplorerAnimator[] = [];
  private t = 0;
  private star!: WonderStar;
  private waveTimer = 1.5;

  build(): void {
    const sky = createSky({ zenith: '#9fc3ea', horizon: '#dfe9f3', ground: '#c9cfd8' }, 'blue');
    this.root.add(sky);
    this.track(sky.geometry);
    this.track(sky.material as THREE.Material);

    const ground = mesh(new THREE.CylinderGeometry(9, 7.5, 2.2, 48), this.lib.paint(PAL.grass, 'green', { roughness: 0.95, map: paintNoiseTexture(4, 4, 0.14) }));
    ground.position.y = -1.1;
    this.root.add(ground);
    const under = mesh(new THREE.ConeGeometry(7.4, 6, 32), this.lib.paint('#9B8A7A', 'orange', { roughness: 0.95 }));
    under.rotation.x = Math.PI;
    under.position.y = -5.2;
    this.root.add(under);

    place(this.root, house(this.lib, 2, { roofColor: PAL.roofRed, roofKey: 'red' }), -3.4, 0, -3.6, 0.35);
    place(this.root, leaflessTree(this.lib, 5, 4.2), 4.2, 0, -3.2);
    place(this.root, leaflessTree(this.lib, 9, 3.2), -6.5, 0, 0.5);
    place(this.root, berryBush(this.lib, 3, 1.1, 5), 5.6, 0, 1.6);
    place(this.root, fence(this.lib, 5), 1.5, 0, -5.4, 0.1);
    this.star = wonderStar(this.lib);
    place(this.root, this.star.group, 2.6, 0, -1.4);
    for (let i = 0; i < 6; i++) place(this.root, cloud(this.lib, 30 + i, 3 + (i % 3)), Math.cos(i) * 40, 14 + (i % 3) * 4, Math.sin(i * 1.7) * 40 - 20);

    const girl = buildExplorer('girl', this.lib);
    const boy = buildExplorer('boy', this.lib);
    girl.brush.visible = true;
    boy.brush.visible = true;
    place(this.root, girl.root, -0.9, 0, 1.2, 0.35);
    place(this.root, boy.root, 0.9, 0, 1.2, -0.35);
    this.animators = [new ExplorerAnimator(girl), new ExplorerAnimator(boy)];
    for (const o of [girl.root, boy.root]) o.traverse((m) => m.isObject3D && ((m as THREE.Mesh).castShadow = true));
  }

  start(): void {
    const g = this.game;
    g.camera.cut(new THREE.Vector3(0, 3.2, 9), new THREE.Vector3(0, 1.4, 0));
    g.pip.root.visible = true;
    g.pip.teleport(new THREE.Vector3(0, 2.6, 1.6));
    void g.camera.orbit(new THREE.Vector3(0, 0, 0), 9.5, 3.4, -0.35, 0.35, 26, 1.3);
  }

  spawn(): SpawnPoint {
    return { pos: new THREE.Vector3(0, 0, 0), yaw: 0 };
  }

  objective(): string {
    return '';
  }

  override update(dt: number): void {
    this.t += dt;
    this.star.update(dt, this.t);
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.waveTimer = 5 + Math.random() * 3;
      this.animators[Math.random() < 0.5 ? 0 : 1]!.play(Math.random() < 0.7 ? 'wave' : 'celebrate');
    }
    for (const a of this.animators) a.update(dt, { speed: 0, runSpeed: 5.4, grounded: true, vy: 0, dashing: false, sweeping: false, talking: false });
    const cam = this.game.engine.camera.position;
    this.game.pip.update(dt, new THREE.Vector3(0, 0.75, 1.4), 0, cam, this.game.settings.reducedMotion);
    // Keep orbiting back and forth while the menu is open.
    if (this.t > 26) {
      this.t = 0;
      void this.game.camera.orbit(new THREE.Vector3(0, 0, 0), 9.5, 3.4, Math.sin(Date.now()) > 0 ? 0.35 : -0.35, Math.sin(Date.now()) > 0 ? -0.35 : 0.35, 26, 1.3);
    }
  }
}
