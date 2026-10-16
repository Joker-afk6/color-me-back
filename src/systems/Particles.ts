/**
 * Pooled point-sprite particles for sparkles, dust, confetti and paint splashes.
 * One additive system (magic sparkles) and one normal-blended system (dust/confetti).
 * Respects reduced motion by lowering counts and speeds.
 */
import * as THREE from 'three';

export interface BurstOptions {
  count?: number;
  color?: THREE.ColorRepresentation;
  colors?: THREE.ColorRepresentation[];
  speed?: number;
  spread?: number;
  life?: number;
  size?: number;
  gravity?: number;
  upward?: number;
  /** 0 = round soft dot, 1 = four-point star sparkle. */
  star?: boolean;
  drag?: number;
}

class PointPool {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly shape: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly grav: Float32Array;
  private readonly drag: Float32Array;
  private readonly baseSize: Float32Array;
  private cursor = 0;

  constructor(readonly max: number, additive: boolean) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.shape = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aShape', new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexColors: true,
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aAlpha; attribute float aShape;
        varying vec3 vColor; varying float vAlpha; varying float vShape;
        uniform float uScale;
        void main() {
          vColor = color; vAlpha = aAlpha; vShape = aShape;
          vec4 mv = modelViewMatrix * vec4( position, 1.0 );
          gl_PointSize = aSize * uScale / max( 0.1, -mv.z );
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vAlpha; varying float vShape;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float r = length( p );
          float dot = 1.0 - smoothstep( 0.35, 1.0, r );
          float star = max( 1.0 - smoothstep( 0.0, 0.16, abs( p.x ) ) * smoothstep( 0.0, 1.0, abs( p.y ) ),
                            1.0 - smoothstep( 0.0, 0.16, abs( p.y ) ) * smoothstep( 0.0, 1.0, abs( p.x ) ) );
          star = clamp( star * ( 1.0 - r ), 0.0, 1.0 ) + ( 1.0 - smoothstep( 0.0, 0.35, r ) ) * 0.8;
          float a = mix( dot, star, vShape ) * vAlpha;
          if ( a < 0.01 ) discard;
          gl_FragColor = vec4( vColor, a );
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: THREE.Color, size: number, life: number, gravity: number, drag: number, star: boolean): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.col.set([color.r, color.g, color.b], i * 3);
    this.baseSize[i] = size;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.grav[i] = gravity;
    this.drag[i] = drag;
    this.shape[i] = star ? 1 : 0;
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i]! <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      this.life[i]! -= dt;
      const k = Math.max(0, this.life[i]! / this.maxLife[i]!);
      const d = Math.exp(-this.drag[i]! * dt);
      this.vel[i * 3]! *= d;
      this.vel[i * 3 + 2]! *= d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1]! * d - this.grav[i]! * dt;
      this.pos[i * 3]! += this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1]! += this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2]! += this.vel[i * 3 + 2]! * dt;
      // Fade in quickly, fade out slowly; sparkles twinkle in size.
      this.alpha[i] = Math.min(1, (1 - k) * 8) * Math.pow(k, 0.7);
      this.size[i] = this.baseSize[i]! * (0.6 + 0.4 * k);
    }
    const g = this.points.geometry;
    (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aShape as THREE.BufferAttribute).needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    this.alpha.fill(0);
  }
}

export class Particles {
  private readonly sparkle = new PointPool(1400, true);
  private readonly soft = new PointPool(900, false);
  reducedMotion = false;
  private readonly tmp = new THREE.Color();

  constructor(scene: THREE.Scene) {
    scene.add(this.sparkle.points, this.soft.points);
  }

  setViewportHeight(px: number): void {
    const scale = px * 0.55;
    (this.sparkle.points.material as THREE.ShaderMaterial).uniforms.uScale!.value = scale;
    (this.soft.points.material as THREE.ShaderMaterial).uniforms.uScale!.value = scale;
  }

  /** Magic sparkles (additive glow). */
  sparkles(at: THREE.Vector3, o: BurstOptions = {}): void {
    this.burst(this.sparkle, at, { star: true, gravity: -0.4, drag: 2.2, ...o });
  }

  /** Dust, confetti, juice splashes (normal blending). */
  puff(at: THREE.Vector3, o: BurstOptions = {}): void {
    this.burst(this.soft, at, { star: false, gravity: 3, drag: 2.5, ...o });
  }

  /** A trail of sparkles along a straight line (beams, ribbons, dash streaks). */
  line(a: THREE.Vector3, b: THREE.Vector3, o: BurstOptions = {}): void {
    const n = Math.max(1, Math.round((o.count ?? 12) * (this.reducedMotion ? 0.4 : 1)));
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(b, Math.random());
      this.burst(this.sparkle, p, { ...o, count: 1, star: o.star ?? true, speed: o.speed ?? 0.4 });
    }
  }

  update(dt: number): void {
    this.sparkle.update(dt);
    this.soft.update(dt);
  }

  clear(): void {
    this.sparkle.clear();
    this.soft.clear();
  }

  private burst(pool: PointPool, at: THREE.Vector3, o: BurstOptions): void {
    const count = Math.max(1, Math.round((o.count ?? 20) * (this.reducedMotion ? 0.35 : 1)));
    const speed = (o.speed ?? 2.5) * (this.reducedMotion ? 0.5 : 1);
    const spread = o.spread ?? 0.3;
    const palette = o.colors ?? [o.color ?? '#ffffff'];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.6);
      this.tmp.set(palette[i % palette.length]!);
      pool.spawn(
        at.x + (Math.random() - 0.5) * spread,
        at.y + (Math.random() - 0.5) * spread,
        at.z + (Math.random() - 0.5) * spread,
        Math.sin(phi) * Math.cos(theta) * s,
        Math.abs(Math.cos(phi)) * s * 0.6 + (o.upward ?? 1),
        Math.sin(phi) * Math.sin(theta) * s,
        this.tmp,
        (o.size ?? 0.35) * (0.7 + Math.random() * 0.6),
        (o.life ?? 1.1) * (0.7 + Math.random() * 0.6),
        o.gravity ?? 0,
        o.drag ?? 2,
        o.star ?? false,
      );
    }
  }
}
