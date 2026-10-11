import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {
  FLOW_PARTS,
  PROCESS_PARTS,
  STORAGE_PARTS,
  type FlowId,
  type Isolate,
  type ShellMode,
} from "@/lib/tes/content";

export type Presentation = {
  shell: ShellMode;
  isolate: Isolate;
  flow: FlowId;
  explode: number;
  selected: string;
  engineering: boolean;
  pulse: number;
};

const EXPLODE: Record<string, [number, number, number]> = {
  "hub-1": [0, 0.05, 1.15],
  "hub-2": [0, 0.08, 1.28],
  "hub-3": [0, 0.11, 1.41],
  "hub-4": [0, 0.14, 1.54],
  "trim-front": [0.15, 0.2, 1.85],
  battery: [0.25, 0.22, 2],
  ems: [0.35, 0.28, 2.15],
  piping: [0, 0.62, 0.85],
  "water-front": [0, -0.02, 2.25],
  electrolyte: [0, 0.42, -1.45],
  fuel: [0, 0.12, -1.7],
  "tank-frame": [0, 0, -1.15],
  "trim-rear": [-0.2, 0.2, -1.95],
  vessel: [-0.1, 0.16, -1.55],
  "water-rear": [0, -0.02, -2.2],
  lights: [0, 0.85, 0],
  roof: [0, 1.55, 0],
};
const FLOW_COLORS: Record<Exclude<FlowId, "off">, THREE.Color> = {
  power: new THREE.Color("#7ec8ff"),
  water: new THREE.Color("#3ec6ff"),
  fuel: new THREE.Color("#ff8a1e"),
  carbon: new THREE.Color("#d6f25a"),
  oxygen: new THREE.Color("#e8fbff"),
  thermal: new THREE.Color("#ffb45a"),
};
const SELECTED = new THREE.Color("#e85d04");
type MaterialState = {
  color: THREE.Color;
  emissive: THREE.Color;
  intensity: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
};

function saveMaterialState(material: THREE.MeshStandardMaterial) {
  const base: MaterialState = {
    color: material.color.clone(),
    emissive: material.emissive.clone(),
    intensity: material.emissiveIntensity,
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
  };
  material.userData.presentationBase = base;
}

function materialFlow(name: string): FlowId {
  if (/orange/i.test(name)) return "fuel";
  if (/cobalt|blue process/i.test(name)) return "water";
  if (/HMI|display/i.test(name)) return "power";
  if (/lamp/i.test(name)) return "thermal";
  return "off";
}

/** Use evaluated Blender geometry and its packed PBR maps in the viewer. */
export async function loadIndustrialAsset(url: string, name: string) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  const root = gltf.scene;
  root.name = name;
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const originals = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const part = String(mesh.userData.part || mesh.parent?.userData.part || "piping");
    const component = String(mesh.userData.component_part || part);
    mesh.userData.part = part;
    mesh.userData.component_part = component;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const prepare = (source: THREE.Material) => {
      originals.add(source);
      const key = `${source.uuid}:${part}:${component}`;
      let material = materials.get(key);
      if (!material) {
        material = source.clone() as THREE.MeshStandardMaterial;
        saveMaterialState(material);
        for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
          if (texture) texture.anisotropy = 4;
        }
        materials.set(key, material);
      }
      return material;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(prepare)
      : prepare(mesh.material);
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    mesh.userData.flow = materialFlow(material.name);
  });
  // Clones retain the shared textures; the replaced materials are unused.
  originals.forEach((material) => material.dispose());
  return root;
}

export async function buildReferenceModel() {
  const source = await loadIndustrialAsset("/tes-unit.glb", "tes-unit");
  const root = new THREE.Group();
  root.name = "tes-unit";
  source.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  source.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
  });
  const groups = new Map<string, THREE.Group>();
  for (const mesh of meshes) {
    const part = String(mesh.userData.part);
    let group = groups.get(part);
    if (!group) {
      group = new THREE.Group();
      group.name = part;
      group.userData.part = part;
      groups.set(part, group);
      root.add(group);
    }
    group.attach(mesh);
  }
  return root;
}

export function applyPresentation(root: THREE.Object3D, state: Presentation) {
  if (root.name === "tes-unit") {
    for (const group of root.children) {
      const offset = EXPLODE[group.name];
      if (offset) group.position.set(...offset).multiplyScalar(state.explode);
    }
  }
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const part = String(mesh.userData.part || "");
    const component = String(mesh.userData.component_part || part);
    const roof = part === "roof";
    const shell = part === "shell" || roof;
    const storage = STORAGE_PARTS.has(component) || part === "water-handling";
    const process =
      PROCESS_PARTS.has(component) ||
      PROCESS_PARTS.has(part) ||
      component === "ecr" ||
      component === "fuel-cell" ||
      part === "power-collection" ||
      part === "operations";
    mesh.visible =
      !(roof && state.shell === "open") &&
      !(state.isolate === "process" && storage) &&
      !(state.isolate === "storage" && process);
    const flow = state.flow;
    const hit =
      flow !== "off" &&
      (mesh.userData.flow === flow ||
        FLOW_PARTS[flow].some((id) => id === component || id === part));
    const selected =
      state.selected !== "overview" && (state.selected === part || state.selected === component);
    const xray = shell && state.shell === "xray";
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const item of materials) {
      const material = item as THREE.MeshStandardMaterial;
      if (!material.isMeshStandardMaterial) continue;
      const base = material.userData.presentationBase as MaterialState;
      const opacity = xray ? 0.16 : base.opacity;
      const transparent = opacity < 1 || base.transparent;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.opacity = opacity;
      material.depthWrite = opacity > 0.5 && base.depthWrite;
      material.color.copy(base.color);
      material.emissive.copy(base.emissive);
      material.emissiveIntensity = base.intensity;
      if (flow !== "off" && !hit) material.color.multiplyScalar(0.86);
      if (hit && materialFlow(material.name) === flow) {
        material.color.lerp(FLOW_COLORS[flow], 0.12);
        material.emissive.copy(FLOW_COLORS[flow]);
        material.emissiveIntensity = 0.14 + 0.06 * (1 + Math.sin(state.pulse * 4));
      } else if (selected) {
        material.emissive.copy(SELECTED);
        material.emissiveIntensity = 0.28;
      }
    }
  });
}

/** Dispose repeated mesh data and packed textures exactly once. */
export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) (mesh as THREE.InstancedMesh).dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
