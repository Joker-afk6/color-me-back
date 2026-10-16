/**
 * Static batching: merges every non-dynamic mesh under a decoration group into one mesh per
 * material. Keeps draw calls low in detailed levels (hundreds of props → a few dozen calls).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function batchStatic(source: THREE.Object3D, into: THREE.Object3D): number {
  source.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(into.matrixWorld).invert();
  const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  const toDispose: THREE.BufferGeometry[] = [];
  source.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.dynamic || Array.isArray(m.material) || (m as unknown as THREE.InstancedMesh).isInstancedMesh) return;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2));
    g.morphAttributes = {};
    const mat = new THREE.Matrix4().multiplyMatrices(invRoot, m.matrixWorld);
    g.applyMatrix4(mat);
    g.clearGroups();
    const b = buckets.get(m.material) ?? { geos: [], cast: false, receive: false };
    b.geos.push(g);
    b.cast ||= m.castShadow;
    b.receive ||= m.receiveShadow;
    buckets.set(m.material, b);
    if (!m.geometry.userData.shared) toDispose.push(m.geometry);
    g = null as unknown as THREE.BufferGeometry;
  });
  let count = 0;
  for (const [mat, b] of buckets) {
    const merged = mergeGeometries(b.geos, false);
    for (const g of b.geos) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    into.add(mesh);
    count++;
  }
  source.removeFromParent();
  for (const g of new Set(toDispose)) g.dispose();
  return count;
}

/**
 * Merge the static child meshes of every joint in a character rig, per material (and outline
 * flag). Meshes with children or `userData.keep` (animated eyes, mouths, brows…) are left alone.
 * Cuts character draw calls by more than half without changing the look or the animation.
 */
export function mergeRigMeshes(group: THREE.Object3D): void {
  const buckets = new Map<string, { mat: THREE.Material; meshes: THREE.Mesh[]; noOutline: boolean }>();
  for (const child of group.children) {
    const m = child as THREE.Mesh;
    if (!m.isMesh || m.userData.keep || m.children.length || Array.isArray(m.material) || !m.visible) continue;
    const key = `${m.material.uuid}|${m.userData.noOutline ? 1 : 0}`;
    const b = buckets.get(key) ?? { mat: m.material, meshes: [], noOutline: !!m.userData.noOutline };
    b.meshes.push(m);
    buckets.set(key, b);
  }
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue;
    const geos: THREE.BufferGeometry[] = [];
    for (const m of b.meshes) {
      m.updateMatrix();
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2));
      g.applyMatrix4(m.matrix);
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mm = new THREE.Mesh(merged, b.mat);
    mm.castShadow = b.meshes.some((m) => m.castShadow);
    mm.receiveShadow = b.meshes.some((m) => m.receiveShadow);
    mm.userData.noOutline = b.noOutline;
    group.add(mm);
    for (const m of b.meshes) {
      group.remove(m);
      if (!m.geometry.userData.shared) m.geometry.dispose();
    }
  }
  for (const child of [...group.children]) if (!(child as THREE.Mesh).isMesh || child.children.length) mergeRigMeshes(child);
}
