/**
 * Cartoon ink outlines (inverted hull, extruded along normals in the vertex shader), echoing the
 * dark outlines of the 2D character references. Used on characters and key interactables only.
 */
import * as THREE from 'three';

const cache = new Map<string, THREE.ShaderMaterial>();

export function outlineMaterial(thickness = 0.02, color: THREE.ColorRepresentation = '#38414f'): THREE.ShaderMaterial {
  const id = `${thickness}|${new THREE.Color(color).getHexString()}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uThickness: { value: thickness }, uColor: { value: new THREE.Color(color) }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uThickness;
      uniform float uScale;
      void main() {
        vec3 p = position + normalize( normal ) * uThickness * uScale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4( uColor, 1.0 );
        #include <colorspace_fragment>
      }`,
  });
  cache.set(id, mat);
  return mat;
}

/**
 * Adds an outline child to each mesh in `root` (skips meshes flagged `noOutline`).
 * The outline shares the mesh geometry, so it costs no extra memory.
 * Thickness is in the mesh's local units, so scaled meshes are compensated.
 */
export function addOutlines(root: THREE.Object3D, thickness = 0.022, color: THREE.ColorRepresentation = '#38414f'): THREE.Mesh[] {
  const added: THREE.Mesh[] = [];
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !o.userData.noOutline && !o.userData.isOutline) meshes.push(o as THREE.Mesh);
  });
  root.updateMatrixWorld(true);
  for (const m of meshes) {
    const s = new THREE.Vector3();
    m.getWorldScale(s);
    const avg = (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.z)) / 3 || 1;
    const outline = new THREE.Mesh(m.geometry, outlineMaterial(+(thickness / avg).toFixed(4), color));
    outline.userData.isOutline = true;
    outline.castShadow = false;
    outline.receiveShadow = false;
    outline.raycast = () => {};
    m.add(outline);
    added.push(outline);
  }
  return added;
}

export function setOutlinesVisible(root: THREE.Object3D, visible: boolean): void {
  root.traverse((o) => {
    if (o.userData.isOutline) o.visible = visible;
  });
}
