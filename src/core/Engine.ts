/** Renderer, scene, camera and the shared lighting rig. */
import * as THREE from 'three';
import type { Quality } from '../state/Settings';

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly rimLight: THREE.DirectionalLight;
  private readonly sunOffset = new THREE.Vector3(-14, 26, 12);
  private quality: Quality = 'high';

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    this.camera.position.set(0, 6, 12);

    this.hemi = new THREE.HemisphereLight('#eef3fb', '#858a84', 1.3);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#fff1d8', 2.7);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    const sc = this.sun.shadow.camera;
    sc.left = -24;
    sc.right = 24;
    sc.top = 24;
    sc.bottom = -24;
    sc.near = 1;
    sc.far = 90;
    this.scene.add(this.sun, this.sun.target);

    this.rimLight = new THREE.DirectionalLight('#d9e6ff', 0.55);
    this.rimLight.position.set(10, 8, -16);
    this.scene.add(this.rimLight);

    this.scene.fog = new THREE.Fog('#cfd5dc', 60, 220);
    this.setQuality('high');
    this.resize();
  }

  setQuality(q: Quality): void {
    this.quality = q;
    const dpr = Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = q !== 'low';
    const size = q === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.resize();
  }

  get currentQuality(): Quality {
    return this.quality;
  }

  /** Keep the shadow frustum centred on the action. */
  focusShadows(target: THREE.Vector3): void {
    // Snap to texel-ish steps to reduce shadow shimmer while moving.
    const snap = 0.5;
    const x = Math.round(target.x / snap) * snap;
    const z = Math.round(target.z / snap) * snap;
    this.sun.target.position.set(x, 0, z);
    this.sun.position.set(x + this.sunOffset.x, this.sunOffset.y, z + this.sunOffset.z);
    this.sun.target.updateMatrixWorld();
  }

  setSunOffset(x: number, y: number, z: number): void {
    this.sunOffset.set(x, y, z);
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
