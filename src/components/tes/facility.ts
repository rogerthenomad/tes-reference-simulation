import * as THREE from "three";
import { loadIndustrialAsset } from "@/components/tes/geometry";

export async function buildFacility() {
  const root = await loadIndustrialAsset("/facility.glb", "tes-facility");
  root.updateMatrixWorld(true);
  const batches = new Map<string, THREE.Mesh[]>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.parent?.userData.row_index) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const key = `${mesh.geometry.uuid}:${materials.map((material) => material.uuid).join(":")}`;
    const batch = batches.get(key) || [];
    batch.push(mesh);
    batches.set(key, batch);
  });
  const local = new THREE.Matrix4().copy(root.matrixWorld).invert();
  for (const meshes of batches.values()) {
    const first = meshes[0];
    const instances = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    instances.name = first.name;
    instances.userData = { ...first.userData };
    instances.castShadow = true;
    instances.receiveShadow = true;
    meshes.forEach((mesh, index) => {
      instances.setMatrixAt(index, new THREE.Matrix4().multiplyMatrices(local, mesh.matrixWorld));
      mesh.removeFromParent();
    });
    instances.computeBoundingBox();
    instances.computeBoundingSphere();
    root.add(instances);
  }
  return root;
}
