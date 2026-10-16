/** Silent village creatures: round "puff birds" that hop about and flutter away from the explorer. */
import * as THREE from 'three';
import type { MaterialLibrary } from '../rendering/paint';
import { mesh, UNIT } from '../rendering/shapes';
import { Rng } from '../utils/rng';
import { dampAngle } from '../utils/math';

export class PuffBird {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly rng: Rng;
  private target = new THREE.Vector3();
  private hopT = 0;
  private hopFrom = new THREE.Vector3();
  private wait = 1;
  private yaw = 0;
  private wings: THREE.Mesh[] = [];
  private flutter = 0;

  constructor(lib: MaterialLibrary, seed: number, private readonly home: THREE.Vector3) {
    this.rng = new Rng(seed);
    const feather = lib.paint('#8FB3E0', 'blue', { roughness: 0.8, rim: 0.25 });
    const belly = lib.paint('#F4F1EA', 'neutral', { roughness: 0.85 });
    const beak = lib.paint('#F2A03D', 'orange', { roughness: 0.6 });
    const eye = lib.paint('#1F2533', 'neutral', { roughness: 0.3 });
    const b = mesh(UNIT.sphereLow, feather);
    b.scale.set(0.24, 0.22, 0.27);
    b.position.y = 0.24;
    this.body.add(b);
    const be = mesh(UNIT.sphereLow, belly, { cast: false });
    be.scale.set(0.17, 0.15, 0.12);
    be.position.set(0, 0.2, 0.15);
    this.body.add(be);
    const bk = mesh(UNIT.cone, beak, { cast: false });
    bk.scale.set(0.05, 0.1, 0.05);
    bk.rotation.x = Math.PI / 2;
    bk.position.set(0, 0.28, 0.29);
    this.body.add(bk);
    for (const s of [-1, 1]) {
      const e = mesh(UNIT.sphereLow, eye, { cast: false });
      e.scale.setScalar(0.03);
      e.position.set(s * 0.09, 0.33, 0.21);
      this.body.add(e);
      const w = mesh(UNIT.sphereLow, feather, { cast: false });
      w.scale.set(0.04, 0.12, 0.16);
      w.position.set(s * 0.22, 0.25, -0.02);
      this.body.add(w);
      this.wings.push(w);
    }
    const tail = mesh(UNIT.cone, feather, { cast: false });
    tail.scale.set(0.08, 0.16, 0.04);
    tail.rotation.x = -2.2;
    tail.position.set(0, 0.32, -0.26);
    this.body.add(tail);
    this.group.add(this.body);
    this.group.position.copy(home);
    this.target.copy(home);
    this.hopFrom.copy(home);
  }

  update(dt: number, player: THREE.Vector3 | null): void {
    const pos = this.group.position;
    const scared = player && player.distanceTo(pos) < 2.4;
    if (this.hopT > 0) {
      this.hopT = Math.max(0, this.hopT - dt * (scared ? 3.2 : 2.4));
      const k = 1 - this.hopT;
      pos.lerpVectors(this.hopFrom, this.target, k);
      pos.y = Math.sin(Math.PI * k) * (scared ? 0.9 : 0.35);
      this.body.scale.set(1, 1 + Math.sin(Math.PI * k) * 0.15, 1);
    } else {
      this.wait -= dt;
      if (this.wait <= 0 || scared) {
        this.wait = this.rng.range(0.6, 2.2);
        this.hopFrom.copy(pos).setY(0);
        if (scared && player) {
          const away = pos.clone().sub(player).setY(0).normalize().multiplyScalar(this.rng.range(2.5, 3.5));
          this.target.copy(pos).add(away).setY(0);
          this.flutter = 0.8;
        } else {
          const a = this.rng.range(0, Math.PI * 2);
          const r = this.rng.range(0.4, 1.2);
          this.target.set(pos.x + Math.cos(a) * r, 0, pos.z + Math.sin(a) * r);
        }
        // Stay near home.
        if (this.target.distanceTo(this.home) > 5) this.target.lerp(this.home, 0.6).setY(0);
        this.hopT = 1;
      }
    }
    const dir = this.target.clone().sub(pos);
    if (dir.lengthSq() > 0.001) this.yaw = dampAngle(this.yaw, Math.atan2(dir.x, dir.z), 8, dt);
    this.group.rotation.y = this.yaw;
    this.flutter = Math.max(0, this.flutter - dt);
    const flap = this.flutter > 0 || this.hopT > 0 ? Math.sin(performance.now() * 0.04) * 0.9 : 0;
    this.wings[0]!.rotation.z = flap;
    this.wings[1]!.rotation.z = -flap;
  }
}
