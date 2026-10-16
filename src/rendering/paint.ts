/**
 * "Paint" materials: MeshStandardMaterial extended with the color-restoration shader.
 *
 * Every paintable surface belongs to a ColorKey. A key's uniforms are SHARED by all of its
 * materials, so restoring Red is one uniform animation that sweeps across every red-keyed surface
 * in the 3D world at once. The wave is evaluated per pixel from the fragment's world position,
 * so color genuinely propagates over the environment from the Guardian outward.
 *
 * Gray state = the surface's own luminance (keeps the value structure of the colored art, so the
 * gray world stays layered and readable), slightly lifted and cool-tinted.
 */
import * as THREE from 'three';
import type { ColorKey, GameColor } from '../data/colors';
import { ALL_COLORS } from '../data/colors';

export interface KeyUniforms {
  uCmbSat: { value: number };
  uCmbWaveCenter: { value: THREE.Vector3 };
  uCmbWaveRadius: { value: number };
  uCmbWaveWidth: { value: number };
  uCmbWaveOn: { value: number };
  uCmbFrontColor: { value: THREE.Color };
}

const makeKeyUniforms = (sat: number, front = '#ffffff'): KeyUniforms => ({
  uCmbSat: { value: sat },
  uCmbWaveCenter: { value: new THREE.Vector3() },
  uCmbWaveRadius: { value: 0 },
  uCmbWaveWidth: { value: 7 },
  uCmbWaveOn: { value: 0 },
  uCmbFrontColor: { value: new THREE.Color(front) },
});

/** Global singletons: one uniform bundle per color key. Neutral is always fully saturated. */
export const KEY_UNIFORMS: Readonly<Record<ColorKey, KeyUniforms>> = (() => {
  const u = {} as Record<ColorKey, KeyUniforms>;
  for (const c of ALL_COLORS) u[c] = makeKeyUniforms(0);
  u.neutral = makeKeyUniforms(1);
  return u;
})();

export const GLOBAL_PAINT_UNIFORMS = {
  uCmbGrayTint: { value: new THREE.Color(0.93, 0.96, 1.0) },
  // Lift and soften the grays toward the light "pencil drawing" look of the Hush Hollow reference,
  // while keeping enough value contrast for readable shapes.
  uCmbGrayLift: { value: 0.52 },
  uCmbGrayMix: { value: 0.34 },
};

const VERT_DECL = /* glsl */ `varying vec3 vCmbWorld;\n`;
const VERT_BODY = /* glsl */ `
  #include <project_vertex>
  {
    vec4 cmbWP = vec4( transformed, 1.0 );
    #ifdef USE_BATCHING
      cmbWP = batchingMatrix * cmbWP;
    #endif
    #ifdef USE_INSTANCING
      cmbWP = instanceMatrix * cmbWP;
    #endif
    vCmbWorld = ( modelMatrix * cmbWP ).xyz;
  }
`;

const FRAG_DECL = /* glsl */ `
varying vec3 vCmbWorld;
uniform float uCmbSat;
uniform vec3 uCmbWaveCenter;
uniform float uCmbWaveRadius;
uniform float uCmbWaveWidth;
uniform float uCmbWaveOn;
uniform vec3 uCmbFrontColor;
uniform vec3 uCmbGrayTint;
uniform float uCmbGrayLift;
uniform float uCmbGrayMix;
uniform vec3 uCmbRim;
`;

const FRAG_DESAT = /* glsl */ `
  #include <color_fragment>
  float cmbFrontGlow = 0.0;
  {
    float cmbD = distance( vCmbWorld.xz, uCmbWaveCenter.xz );
    float cmbWave = ( 1.0 - smoothstep( uCmbWaveRadius - uCmbWaveWidth, uCmbWaveRadius, cmbD ) ) * uCmbWaveOn;
    float cmbSat = clamp( max( uCmbSat, cmbWave ), 0.0, 1.0 );
    float cmbLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
    vec3 cmbGray = mix( vec3( cmbLum ), vec3( uCmbGrayLift ), uCmbGrayMix ) * uCmbGrayTint;
    diffuseColor.rgb = mix( cmbGray, diffuseColor.rgb, cmbSat );
    cmbFrontGlow = ( 1.0 - smoothstep( 0.0, uCmbWaveWidth * 0.55, abs( cmbD - uCmbWaveRadius ) ) ) * uCmbWaveOn * ( 1.0 - uCmbSat );
  }
`;

const FRAG_EMISSIVE = /* glsl */ `
  #include <emissivemap_fragment>
  totalEmissiveRadiance += cmbFrontGlow * uCmbFrontColor * 0.55;
  {
    float cmbFacing = clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 );
    totalEmissiveRadiance += pow( 1.0 - cmbFacing, 3.0 ) * uCmbRim;
  }
`;

export interface PaintOptions {
  roughness?: number;
  metalness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  flatShading?: boolean;
  map?: THREE.Texture | null;
  vertexColors?: boolean;
  depthWrite?: boolean;
  /** Rim-light strength (warm edge light that gives the soft "painted toy" look). */
  rim?: number;
  rimColor?: THREE.ColorRepresentation;
}

/** Patch a standard material so it obeys its color key. Exposed for special cases (e.g. instanced). */
export function applyPaintShader(mat: THREE.MeshStandardMaterial, key: ColorKey, rim = 0.14, rimColor: THREE.ColorRepresentation = '#ffe7c4'): THREE.MeshStandardMaterial {
  const keyU = KEY_UNIFORMS[key];
  const rimU = { value: new THREE.Color(rimColor).multiplyScalar(rim) };
  mat.userData.cmbKey = key;
  mat.userData.cmbRim = rimU;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, keyU, GLOBAL_PAINT_UNIFORMS, { uCmbRim: rimU });
    shader.vertexShader = VERT_DECL + shader.vertexShader.replace('#include <project_vertex>', VERT_BODY);
    shader.fragmentShader = FRAG_DECL + shader.fragmentShader.replace('#include <color_fragment>', FRAG_DESAT).replace('#include <emissivemap_fragment>', FRAG_EMISSIVE);
  };
  // All paint materials share one compiled program variant.
  mat.customProgramCacheKey = () => 'cmb-paint-v1';
  return mat;
}

/**
 * Per-level (or per-character) material cache. Identical requests share one material instance;
 * `dispose()` releases them when the level unloads (no GPU leaks across scene transitions).
 */
export class MaterialLibrary {
  private cache = new Map<string, THREE.Material>();
  private owned: THREE.Material[] = [];

  paint(color: THREE.ColorRepresentation, key: ColorKey, opts: PaintOptions = {}): THREE.MeshStandardMaterial {
    const id = `${new THREE.Color(color).getHexString()}|${key}|${JSON.stringify({ ...opts, map: opts.map ? opts.map.uuid : null })}`;
    const hit = this.cache.get(id);
    if (hit) return hit as THREE.MeshStandardMaterial;
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.82,
      metalness: opts.metalness ?? 0,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
      flatShading: opts.flatShading ?? false,
      map: opts.map ?? null,
      vertexColors: opts.vertexColors ?? false,
      depthWrite: opts.depthWrite ?? true,
    });
    applyPaintShader(mat, key, opts.rim ?? 0.14, opts.rimColor ?? '#ffe7c4');
    this.cache.set(id, mat);
    this.owned.push(mat);
    return mat;
  }

  /** Unique (uncached) paint material, e.g. for per-object animated colors. */
  unique(color: THREE.ColorRepresentation, key: ColorKey, opts: PaintOptions = {}): THREE.MeshStandardMaterial {
    const mat = this.paint(color, key, opts).clone();
    applyPaintShader(mat, key, opts.rim ?? 0.14, opts.rimColor ?? '#ffe7c4');
    this.owned.push(mat);
    return mat;
  }

  /** Unlit material for glows, beams and magic cues (always neutral). */
  basic(color: THREE.ColorRepresentation, opts: THREE.MeshBasicMaterialParameters = {}): THREE.MeshBasicMaterial {
    const id = `basic|${new THREE.Color(color).getHexString()}|${JSON.stringify({ ...opts, map: opts.map ? opts.map.uuid : null })}`;
    const hit = this.cache.get(id);
    if (hit) return hit as THREE.MeshBasicMaterial;
    const mat = new THREE.MeshBasicMaterial({ color, ...opts });
    this.cache.set(id, mat);
    this.owned.push(mat);
    return mat;
  }

  track<T extends THREE.Material>(mat: T): T {
    this.owned.push(mat);
    return mat;
  }

  dispose(): void {
    for (const m of this.owned) {
      const anyMat = m as THREE.Material & { map?: THREE.Texture | null };
      anyMat.map?.dispose();
      m.dispose();
    }
    this.owned = [];
    this.cache.clear();
  }
}

/** Convenience to create the same paint color in two keys, e.g. pink petals that are red-keyed. */
export const keyOf = (c: GameColor | 'neutral'): ColorKey => c;
