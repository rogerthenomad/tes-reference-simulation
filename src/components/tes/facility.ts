import * as THREE from "three";
import { buildReferenceModel } from "@/components/tes/geometry";

export async function buildFacility() {
  const unit = await buildReferenceModel();
  unit.traverse((obj) => {
    if (obj.name === "shell" || obj.name === "roof") obj.visible = false;
  });

  const root = new THREE.Group();
  root.name = "tes-facility";

  const rows = new THREE.Group();
  rows.name = "rows";
  rows.userData.part = "rows";
  for (let i = 0; i < 10; i++) {
    const copy = i === 0 ? unit : unit.clone(true);
    copy.position.set(0, 0, -18 + i * 3.6);
    copy.userData.part = "rows";
    rows.add(copy);
  }
  root.add(rows);

  const hall = new THREE.Group();
  hall.name = "facility";
  hall.userData.part = "facility";
  const steel = new THREE.MeshStandardMaterial({ color: "#d7dde3", metalness: 0.55, roughness: 0.42 });
  const white = new THREE.MeshStandardMaterial({ color: "#f4f7fa", metalness: 0.12, roughness: 0.55 });
  const yellow = new THREE.MeshStandardMaterial({ color: "#f0b429", metalness: 0.2, roughness: 0.45 });
  const blue = new THREE.MeshStandardMaterial({ color: "#1F4A90", metalness: 0.15, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: "#b9d6ea", metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.35 });
  const floor = new THREE.MeshStandardMaterial({ color: "#c5ced6", metalness: 0.04, roughness: 0.9 });

  const add = (part: string, mesh: THREE.Mesh, pos: [number, number, number], rot?: [number, number, number]) => {
    mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.part = part;
    hall.add(mesh);
    return mesh;
  };

  add("facility", new THREE.Mesh(new THREE.BoxGeometry(52, 0.12, 46), floor), [2, -0.06, 0]);
  for (let i = 0; i < 7; i++) {
    const x = -18 + i * 7;
    add("facility", new THREE.Mesh(new THREE.BoxGeometry(0.28, 7.2, 0.28), steel), [x, 3.6, -22]);
    add("facility", new THREE.Mesh(new THREE.BoxGeometry(0.28, 7.2, 0.28), steel), [x, 3.6, 22]);
    add("facility", new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 44.4), steel), [x, 7.1, 0]);
  }

  // Named roof so Cutaway / Closed toggles it on mobile and desktop.
  const roof = new THREE.Group();
  roof.name = "roof";
  roof.userData.part = "roof";
  const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(48, 0.18, 44), white.clone());
  roofPanel.position.set(2, 7.35, 0);
  roofPanel.userData.part = "roof";
  roofPanel.castShadow = true;
  roofPanel.receiveShadow = true;
  roof.add(roofPanel);
  root.add(roof);

  add("facility", new THREE.Mesh(new THREE.BoxGeometry(48, 1.4, 0.18), white), [2, 6.2, 22.2]);
  add("facility", new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.1, 0.06), blue), [2, 6.35, 22.32]);

  const rail = (part: string, x: number, z: number, w: number, d: number) => {
    add(part, new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), yellow), [x, 1.05, z - d / 2]);
    add(part, new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), yellow), [x, 1.05, z + d / 2]);
    add(part, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, d), yellow), [x - w / 2, 1.05, z]);
    add(part, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, d), yellow), [x + w / 2, 1.05, z]);
  };
  rail("rows", 0, 0, 14, 38);

  const water = new THREE.Group();
  water.name = "water-handling";
  water.userData.part = "water-handling";
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 5.2, 28), new THREE.MeshStandardMaterial({ color: "#c9d2da", metalness: 0.82, roughness: 0.28 }));
  tank.position.set(16, 2.7, -8);
  tank.userData.part = "water-handling";
  tank.userData.flow = "water";
  water.add(tank);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 8, 12), new THREE.MeshStandardMaterial({ color: "#3ec6ff", metalness: 0.4, roughness: 0.35 }));
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(12.2, 1.4, -8);
  pipe.userData.part = "water-handling";
  pipe.userData.flow = "water";
  water.add(pipe);
  root.add(water);

  const power = new THREE.Group();
  power.name = "power-collection";
  power.userData.part = "power-collection";
  for (let i = 0; i < 3; i++) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.8), white.clone());
    cab.position.set(15.4, 1.1, -1 + i * 1.4);
    cab.userData.part = "power-collection";
    cab.userData.flow = "power";
    power.add(cab);
  }
  root.add(power);

  const ops = new THREE.Group();
  ops.name = "operations";
  ops.userData.part = "operations";
  const room = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 6), white.clone());
  room.position.set(16, 1.6, 10);
  room.userData.part = "operations";
  ops.add(room);
  const windowPane = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.4, 0.08), glass);
  windowPane.position.set(16, 1.8, 13.05);
  windowPane.userData.part = "operations";
  ops.add(windowPane);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.1), steel.clone());
  desk.position.set(16, 0.9, 10.4);
  desk.userData.part = "operations";
  ops.add(desk);
  root.add(ops);

  root.add(hall);
  return root;
}
