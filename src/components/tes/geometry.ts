import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import sceneJson from "@/components/tes/tes-scene.json";
import { FLOW_PARTS, PROCESS_PARTS, STORAGE_PARTS, type FlowId, type Isolate, type ShellMode } from "@/lib/tes/content";

type MatDef = { name: string; color: number[]; metal: number; rough: number; emission: number };
type TubeDef = { r: number; bend: number; mi: number; pts: number[][]; name: string };
type PartDef = { boxes: number[][]; cyls: number[][]; tubes: TubeDef[]; arrows?: { mi: number; verts: number[][] }[] };
type LabelDef = { part: string; text: string; pos: number[]; size: number; side: string; mi: number };
type SceneFile = { materials: MatDef[]; parts: Record<string, PartDef>; labels: LabelDef[] };

const scene = sceneJson as SceneFile;

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const quat = new THREE.Quaternion();

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
  battery: [0.25, 0.22, 2.0],
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
  oxygen: [0, 1.7, 0.2],
  thermal: [0.2, 1.65, -0.2],
  anolyte: [-0.2, 0.3, 1.4],
  condenser: [0.1, 0.25, 1.7],
  "carbon-skid": [0.4, 0.3, 1.9],
};

function toThree(x: number, y: number, z: number, target?: THREE.Vector3) {
  const v = target ?? new THREE.Vector3();
  return v.set(x, z, -y);
}

function flowForMaterial(name: string): string | null {
  if (name.includes("orange")) return "fuel";
  if (name.includes("blue") || name.includes("Cobalt")) return "water";
  if (name.includes("HMI") || name.includes("display")) return "power";
  if (name.includes("lamp") || name.includes("Warm")) return "thermal";
  return null;
}

function makeTextures() {
  const size = 256;
  const paint = document.createElement("canvas");
  paint.width = paint.height = size;
  const pg = paint.getContext("2d")!;
  const img = pg.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const n = 188 + ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 48;
    const shade = Math.max(0, Math.min(255, n));
    img.data[i * 4] = shade;
    img.data[i * 4 + 1] = shade;
    img.data[i * 4 + 2] = shade;
    img.data[i * 4 + 3] = 255;
  }
  pg.putImageData(img, 0, 0);
  const colorMap = new THREE.CanvasTexture(paint);
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = 8;

  const rough = document.createElement("canvas");
  rough.width = rough.height = size;
  const rg = rough.getContext("2d")!;
  const rimg = rg.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const streak = 150 + Math.sin(y * 0.85) * 28 + ((x * 17 + y * 3) % 19);
      const i = (y * size + x) * 4;
      const v = Math.max(0, Math.min(255, streak));
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = v;
      rimg.data[i + 3] = 255;
    }
  }
  rg.putImageData(rimg, 0, 0);
  const roughMap = new THREE.CanvasTexture(rough);
  roughMap.wrapS = roughMap.wrapT = THREE.RepeatWrapping;
  roughMap.colorSpace = THREE.NoColorSpace;
  roughMap.anisotropy = 8;

  const norm = document.createElement("canvas");
  norm.width = norm.height = size;
  const ng = norm.getContext("2d")!;
  const nimg = ng.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.sin(y * 0.7) * 0.35;
      const i = (y * size + x) * 4;
      nimg.data[i] = 128 + dx * 90;
      nimg.data[i + 1] = 128;
      nimg.data[i + 2] = 230;
      nimg.data[i + 3] = 255;
    }
  }
  ng.putImageData(nimg, 0, 0);
  const normalMap = new THREE.CanvasTexture(norm);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.colorSpace = THREE.NoColorSpace;

  const powder = colorMap.clone();
  powder.repeat.set(2, 2);
  const brush = colorMap.clone();
  brush.repeat.set(1, 4);
  const brushRough = roughMap.clone();
  brushRough.repeat.set(1, 4);
  const brushNormal = normalMap.clone();
  brushNormal.repeat.set(1, 4);
  return { powder, brush, brushRough, brushNormal };
}

function baseMaterial(def: MatDef, maps: ReturnType<typeof makeTextures>) {
  const color = new THREE.Color(def.color[0], def.color[1], def.color[2]);
  const emissive = def.emission > 0 ? color.clone() : new THREE.Color(0, 0, 0);
  const metal = def.metal;
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: metal,
    roughness: def.rough,
    emissive,
    emissiveIntensity: def.emission > 0 ? Math.min(2.4, def.emission * 1.4) : 0,
    envMapIntensity: metal > 0.5 ? 1.15 : 0.55,
    map: metal > 0.55 ? maps.brush : def.emission > 0 ? null : maps.powder,
    roughnessMap: metal > 0.55 ? maps.brushRough : null,
    normalMap: metal > 0.55 ? maps.brushNormal : null,
    normalScale: new THREE.Vector2(0.28, 0.28),
  });
  mat.userData.baseOpacity = 1;
  mat.userData.baseEmissive = mat.emissiveIntensity;
  return mat;
}

function addBox(list: THREE.BufferGeometry[], b: number[]) {
  const [x, y, z, sx, sy, sz] = b;
  if (sx < 1e-4 || sy < 1e-4 || sz < 1e-4) return;
  const geo = new THREE.BoxGeometry(sx, sz, sy);
  toThree(x, y, z, tmp);
  geo.translate(tmp.x, tmp.y, tmp.z);
  list.push(geo);
}

function addCyl(list: THREE.BufferGeometry[], c: number[]) {
  const [ax, ay, az, bx, by, bz, r, , seg] = c;
  toThree(ax, ay, az, tmp);
  toThree(bx, by, bz, tmpB);
  const len = tmp.distanceTo(tmpB);
  if (len < 1e-4 || r < 1e-4) return;
  const geo = new THREE.CylinderGeometry(r, r, len, Math.max(6, Math.min(20, seg || 12)));
  tmpB.sub(tmp).normalize();
  quat.setFromUnitVectors(Y_AXIS, tmpB);
  geo.applyQuaternion(quat);
  tmpB.copy(tmp).add(toThree(bx, by, bz)).multiplyScalar(0.5);
  geo.translate(tmpB.x, tmpB.y, tmpB.z);
  list.push(geo);
}

function bendPath(points: number[][], bend: number) {
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  if (pts.length < 2) return [];
  const path = [pts[0].clone()];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const v1 = a.clone().sub(b);
    const v2 = c.clone().sub(b);
    if (v1.length() < 1e-4 || v2.length() < 1e-4) continue;
    const d = Math.min(bend, v1.length() * 0.35, v2.length() * 0.35);
    const u = b.clone().add(v1.normalize().multiplyScalar(d));
    const v = b.clone().add(v2.normalize().multiplyScalar(d));
    path.push(u);
    for (let j = 1; j <= 6; j++) {
      const t = j / 6;
      path.push(
        new THREE.Vector3()
          .addScaledVector(u, (1 - t) * (1 - t))
          .addScaledVector(b, 2 * t * (1 - t))
          .addScaledVector(v, t * t),
      );
    }
  }
  path.push(pts[pts.length - 1].clone());
  return path.map((p) => toThree(p.x, p.y, p.z));
}

function addTube(list: THREE.BufferGeometry[], tube: TubeDef) {
  const pts = bendPath(tube.pts, tube.bend || 0.1);
  if (pts.length < 2) return;
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0);
  const geo = new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), tube.r, 8, false);
  list.push(geo);
}

function cloneMat(src: THREE.Material) {
  const mat = src.clone() as THREE.MeshStandardMaterial;
  mat.userData.baseEmissive = (src.userData.baseEmissive as number) || 0;
  mat.userData.baseEmissiveColor = (mat.emissive as THREE.Color).clone();
  return mat;
}

function commit(group: THREE.Group, part: string, mi: number, geos: THREE.BufferGeometry[], mats: THREE.Material[], flow: string | null) {
  if (!geos.length) return;
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) return;
  const mesh = new THREE.Mesh(merged, cloneMat(mats[mi]));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.part = part;
  mesh.userData.flow = flow;
  group.add(mesh);
}

function fillPart(parent: THREE.Group, id: string, def: PartDef, mats: THREE.Material[], matDefs: MatDef[]) {
  const group = new THREE.Group();
  group.name = id;
  const byMat = new Map<number, THREE.BufferGeometry[]>();
  const take = (mi: number) => {
    let list = byMat.get(mi);
    if (!list) {
      list = [];
      byMat.set(mi, list);
    }
    return list;
  };
  for (const box of def.boxes) take(box[6]).push(...([] as THREE.BufferGeometry[])), addBox(take(box[6]), box);
  for (const cyl of def.cyls) addCyl(take(cyl[7]), cyl);
  for (const tube of def.tubes) addTube(take(tube.mi), tube);
  for (const [mi, geos] of byMat) {
    const flow = flowForMaterial(matDefs[mi]?.name || "");
    commit(group, id, mi, geos, mats, flow);
  }
  for (const arrow of def.arrows || []) {
    const verts = arrow.verts;
    if (verts.length < 3) continue;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(verts.length * 3);
    verts.forEach((v, i) => {
      toThree(v[0], v[1], v[2], tmp);
      pos[i * 3] = tmp.x;
      pos[i * 3 + 1] = tmp.y;
      pos[i * 3 + 2] = tmp.z;
    });
    const idx: number[] = [];
    for (let i = 1; i < verts.length - 1; i++) idx.push(0, i, i + 1);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, cloneMat(mats[arrow.mi]));
    mesh.userData.part = id;
    mesh.userData.flow = "water";
    group.add(mesh);
  }
  parent.add(group);
  return group;
}

function engineeringKit(mats: THREE.Material[]) {
  const g = new THREE.Group();
  g.name = "engineering";
  const steel = mats[0];
  const white = mats[1];
  const orange = mats[8];
  const blue = mats[9];

  const place = (part: string, mesh: THREE.Mesh, pos: THREE.Vector3) => {
    mesh.material = cloneMat(mesh.material as THREE.Material);
    mesh.position.copy(pos);
    mesh.userData.part = part;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const wrap = new THREE.Group();
    wrap.name = part;
    wrap.add(mesh);
    g.add(wrap);
  };

  place("oxygen", new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.35, 20), steel), new THREE.Vector3(-1.6, 4.35, 0.15));
  const oxySkid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.7), cloneMat(white));
  oxySkid.position.set(-1.6, 3.95, 0.15);
  oxySkid.userData.part = "oxygen";
  g.getObjectByName("oxygen")!.add(oxySkid);

  place("thermal", new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.42, 0.85), white), new THREE.Vector3(3.6, 4.15, -0.15));
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.025, 0.02), cloneMat(steel));
    fin.position.set(3.6, 4.28, -0.32 + i * 0.1);
    fin.userData.part = "thermal";
    g.getObjectByName("thermal")!.add(fin);
  }

  place("anolyte", new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.72, 16), steel), new THREE.Vector3(-4.77, 1.55, 1.35));
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 18), cloneMat(orange));
  loop.position.set(-4.77, 1.85, 1.35);
  loop.rotation.y = Math.PI / 2;
  loop.userData.part = "anolyte";
  loop.userData.flow = "fuel";
  g.getObjectByName("anolyte")!.add(loop);

  place("condenser", new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.42), white), new THREE.Vector3(2.35, 1.35, 1.55));
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.028, 8, 16), cloneMat(blue));
  coil.position.set(2.35, 1.72, 1.55);
  coil.userData.part = "condenser";
  coil.userData.flow = "water";
  g.getObjectByName("condenser")!.add(coil);

  place("carbon-skid", new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 16), steel), new THREE.Vector3(5.55, 1.15, 1.45));
  const drum = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.4), cloneMat(mats[2]));
  drum.position.set(5.55, 0.7, 1.45);
  drum.userData.part = "carbon-skid";
  g.getObjectByName("carbon-skid")!.add(drum);

  return g;
}

async function addLabels(root: THREE.Group) {
  const { Text } = await import("troika-three-text");
  for (const label of scene.labels) {
    const host = root.getObjectByName(label.part);
    if (!host) continue;
    const text = new Text();
    text.text = label.text;
    text.fontSize = label.size;
    text.anchorX = "center";
    text.anchorY = "middle";
    text.color = label.mi === 7 ? 0xe7eef4 : 0x021028;
    const p = toThree(label.pos[0], label.pos[1], label.pos[2]);
    const nudge = 0.02;
    if (label.side === "front") p.z += nudge;
    else if (label.side === "back") {
      p.z -= nudge;
      text.rotation.y = Math.PI;
    } else if (label.side === "left") {
      p.x -= nudge;
      text.rotation.y = -Math.PI / 2;
    } else if (label.side === "right") {
      p.x += nudge;
      text.rotation.y = Math.PI / 2;
    }
    text.position.copy(p);
    text.userData.part = label.part;
    text.sync();
    host.add(text as unknown as THREE.Object3D);
  }
}

export async function buildReferenceModel() {
  const maps = makeTextures();
  const matDefs = scene.materials;
  const mats = matDefs.map((def) => baseMaterial(def, maps));
  const root = new THREE.Group();
  root.name = "tes-unit";

  for (const [id, def] of Object.entries(scene.parts)) {
    if (id === "shell") {
      const shellDef: PartDef = { boxes: [], cyls: [], tubes: [], arrows: [] };
      const roofDef: PartDef = { boxes: [], cyls: [], tubes: [], arrows: [] };
      for (const box of def.boxes) (box[2] > 3.55 ? roofDef : shellDef).boxes.push(box);
      for (const cyl of def.cyls) (cyl[2] > 3.55 ? roofDef : shellDef).cyls.push(cyl);
      fillPart(root, "shell", shellDef, mats, matDefs);
      fillPart(root, "roof", roofDef, mats, matDefs);
      continue;
    }
    fillPart(root, id, def, mats, matDefs);
  }
  root.add(engineeringKit(mats));
  await addLabels(root);
  return root;
}

export function buildTeardown() {
  const maps = makeTextures();
  const matDefs = scene.materials;
  const mats = matDefs.map((def) => baseMaterial(def, maps));
  const root = new THREE.Group();
  root.name = "tes-teardown";
  const hub = scene.parts["hub-1"];
  const layers = ["skid", "dffc", "ecr", "header"].map((name) => {
    const g = new THREE.Group();
    g.name = name;
    root.add(g);
    return g;
  });
  const layerOf = (z: number) => (z >= 2.7 ? 3 : z >= 1.7 ? 2 : z >= 0.95 ? 1 : 0);

  const buckets: THREE.BufferGeometry[][][] = layers.map(() => matDefs.map(() => []));
  for (const box of hub.boxes) buckets[layerOf(box[2])][box[6]].push(...oneBox(box));
  for (const cyl of hub.cyls) {
    const z = (cyl[2] + cyl[5]) / 2;
    const list = buckets[layerOf(z)][cyl[7]];
    addCyl(list, cyl);
  }
  for (const tube of hub.tubes) {
    const z = tube.pts.reduce((s, p) => s + p[2], 0) / tube.pts.length;
    addTube(buckets[layerOf(z)][tube.mi], tube);
  }
  layers.forEach((group, li) => {
    buckets[li].forEach((geos, mi) => {
      if (!geos.length) return;
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, cloneMat(mats[mi]));
      mesh.userData.part = "stack";
      mesh.userData.flow = flowForMaterial(matDefs[mi]?.name || "");
      mesh.castShadow = true;
      group.add(mesh);
    });
  });

  const plates = new THREE.Group();
  plates.name = "plates";
  const plateMat = [mats[0], mats[2], mats[1], mats[8], mats[9]];
  const names = ["End plate", "Bipolar", "Field", "Membrane", "Manifold", "Board"];
  for (let i = 0; i < 12; i++) {
    const h = i === 11 ? 0.08 : 0.045;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, h, 0.72), cloneMat(plateMat[i % plateMat.length]));
    mesh.position.set(2.15, 0.4 + i * 0.02, 0);
    mesh.userData.part = "stack";
    mesh.userData.plate = i;
    mesh.name = names[Math.min(names.length - 1, Math.floor(i / 2))];
    plates.add(mesh);
  }
  root.add(plates);
  return root;
}

function oneBox(box: number[]) {
  const list: THREE.BufferGeometry[] = [];
  addBox(list, box);
  return list;
}

const ORANGE = new THREE.Color("#e85d04");

export function applyPresentation(root: THREE.Object3D, state: Presentation) {
  const e = state.explode;
  root.traverse((obj) => {
    if (obj.parent === root && obj.name && EXPLODE[obj.name]) {
      const [x, y, z] = EXPLODE[obj.name];
      obj.position.set(x * e, y * e, z * e);
    }
  });

  const roof = root.getObjectByName("roof");
  if (roof) {
    roof.visible = state.shell !== "open";
    if (state.shell === "open") roof.position.y = 0;
  }
  const engineering = root.getObjectByName("engineering");
  if (engineering) engineering.visible = state.engineering;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat?.isMeshStandardMaterial) return;
    const part = String(mesh.userData.part || mesh.parent?.name || "");
    let visible = true;
    if (state.isolate === "process" && STORAGE_PARTS.has(part)) visible = false;
    if (state.isolate === "storage" && PROCESS_PARTS.has(part)) visible = false;
    if ((mesh.parent && !mesh.parent.visible) || (obj.parent?.parent && !obj.parent.parent.visible && obj.parent.parent.name === "engineering")) {
      visible = false;
    }
    mesh.visible = visible && (mesh.parent?.visible !== false);
    if (part === "roof" && state.shell === "open") mesh.visible = false;

    const flowHit =
      state.flow !== "off" &&
      (mesh.userData.flow === state.flow || (FLOW_PARTS[state.flow] || []).includes(part as never));
    const xrayShell = state.shell === "xray" && (part === "shell" || part === "roof");
    mat.transparent = xrayShell || (state.flow !== "off" && !flowHit);
    mat.opacity = xrayShell ? 0.16 : state.flow !== "off" && !flowHit ? 0.14 : 1;
    mat.depthWrite = mat.opacity > 0.5;
    const selected = state.selected !== "overview" && state.selected === part;
    const pulse = flowHit ? 0.45 + Math.sin(state.pulse * 3.2) * 0.35 : 0;
    const baseColor = mat.userData.baseEmissiveColor as THREE.Color | undefined;
    if (selected) mat.emissive.copy(ORANGE);
    else if (baseColor) mat.emissive.copy(baseColor);
    mat.emissiveIntensity = (mat.userData.baseEmissive || 0) + (selected ? 0.65 : 0) + pulse;
  });
}

export function applyTeardown(root: THREE.Object3D, explode: number, pulse: number, flow: FlowId) {
  const lifts = [0, 0.55, 1.15, 1.8];
  root.children.forEach((child) => {
    if (child.name === "plates") {
      child.children.forEach((plate, i) => {
        plate.position.y = 0.35 + i * (0.05 + explode * 0.16);
      });
      return;
    }
    const index = ["skid", "dffc", "ecr", "header"].indexOf(child.name);
    if (index >= 0) child.position.y = lifts[index] * explode;
  });
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat?.isMeshStandardMaterial) return;
    const hit = flow !== "off" && mesh.userData.flow === flow;
    mat.transparent = flow !== "off" && !hit;
    mat.opacity = flow !== "off" && !hit ? 0.2 : 1;
    mat.emissiveIntensity = (mat.userData.baseEmissive || 0) + (hit ? 0.4 + Math.sin(pulse * 3) * 0.3 : 0);
  });
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose?.();
  });
}
