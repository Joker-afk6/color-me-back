/**
 * Gradient sky dome with soft painted clouds, desaturated through a color key like any paint
 * surface (e.g. the orchard's peach sky is red-keyed and warms up when Red returns).
 */
import * as THREE from 'three';
import type { ColorKey } from '../data/colors';
import { GLOBAL_PAINT_UNIFORMS, KEY_UNIFORMS } from './paint';

export interface SkyColors {
  zenith: THREE.ColorRepresentation;
  horizon: THREE.ColorRepresentation;
  ground: THREE.ColorRepresentation;
  /** Optional sun disc direction + color (the sun stays a soft cream: a magic-neutral cue). */
  sunDir?: THREE.Vector3;
}

export function createSky(colors: SkyColors, key: ColorKey, radius = 260): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 32, 16);
  const keyU = KEY_UNIFORMS[key];
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(colors.zenith) },
      uHorizon: { value: new THREE.Color(colors.horizon) },
      uGround: { value: new THREE.Color(colors.ground) },
      uSunDir: { value: (colors.sunDir ?? new THREE.Vector3(0.4, 0.5, -0.75)).clone().normalize() },
      uSat: keyU.uCmbSat,
      uWaveOn: keyU.uCmbWaveOn,
      uWaveRadius: keyU.uCmbWaveRadius,
      uGrayTint: GLOBAL_PAINT_UNIFORMS.uCmbGrayTint,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize( position );
        vec4 p = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * p;
        gl_Position.z = gl_Position.w; // keep the dome at the far plane
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uHorizon, uGround, uSunDir, uGrayTint;
      uniform float uSat, uWaveOn, uWaveRadius;
      varying vec3 vDir;
      float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
      float noise( vec2 p ) {
        vec2 i = floor( p ); vec2 f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), f.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), f.x ), f.y );
      }
      void main() {
        float h = vDir.y;
        vec3 col = h > 0.0 ? mix( uHorizon, uZenith, pow( clamp( h, 0.0, 1.0 ), 0.6 ) ) : mix( uHorizon, uGround, clamp( -h * 4.0, 0.0, 1.0 ) );
        // Soft painted clouds in a band above the horizon.
        vec2 uv = vDir.xz / ( 0.25 + max( h, 0.02 ) ) * 2.2;
        float n = noise( uv ) * 0.6 + noise( uv * 2.1 + 3.7 ) * 0.3 + noise( uv * 4.3 - 1.3 ) * 0.1;
        float band = smoothstep( 0.02, 0.18, h ) * ( 1.0 - smoothstep( 0.35, 0.75, h ) );
        float cloud = smoothstep( 0.55, 0.78, n ) * band;
        col = mix( col, vec3( 1.0 ), cloud * 0.55 );
        // Gentle sun glow.
        float s = max( dot( normalize( vDir ), uSunDir ), 0.0 );
        col += vec3( 1.0, 0.97, 0.88 ) * ( pow( s, 400.0 ) * 0.9 + pow( s, 12.0 ) * 0.18 );
        // Desaturate through the color key. While a wave is running, the sky follows its progress.
        float sat = max( uSat, uWaveOn * clamp( uWaveRadius / 60.0, 0.0, 1.0 ) );
        float lum = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
        col = mix( vec3( lum ) * uGrayTint, col, sat );
        gl_FragColor = vec4( col, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.name = 'sky';
  return mesh;
}
