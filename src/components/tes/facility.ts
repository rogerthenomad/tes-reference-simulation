import * as THREE from "three";
import { buildReferenceModel } from "@/components/tes/geometry";

export async function buildFacility() {
  const unit = await buildReferenceModel();
  unit.traverse((obj) => {
    if (obj.name === "shell" || obj.name === "roof") obj.visible = false;
  });

  const root = new THREE.Group();
  root.name = "tes-facility";

  const steel = new THREE.MeshStandardMaterial({ color: "#b8c2cc", metalness: 0.72, roughness: 0.32 });
  const painted = new THREE.MeshStandardMaterial({ color: "#e8eef4", metalness: 0.18, roughness: 0.48 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: "#5c6770", metalness: 0.65, roughness: 0.38 });
  const yellow = new THREE.MeshStandardMaterial({ color: "#e8a317", metalness: 0.22, roughness: 0.42 });
  const blue = new THREE.MeshStandardMaterial({ color: "#1F4A90", metalness: 0.2, roughness: 0.38 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#2a2e32", metalness: 0.05, roughness: 0.82 });
  const glass = new THREE.MeshStandardMaterial({ color: "#c5dcec", metalness: 0.15, roughness: 0.06, transparent: true, opacity: 0.4 });
  const floor = new THREE.MeshStandardMaterial({ color: "#c5ced6", metalness: 0.04, roughness: 0.9 });
  const screen = new THREE.MeshStandardMaterial({ color: "#0a3a6a", emissive: "#1F4A90", emissiveIntensity: 0.9, roughness: 0.18 });
  const gauge = new THREE.MeshStandardMaterial({ color: "#d8e4ee", metalness: 0.4, roughness: 0.25, emissive: "#4A9AD4", emissiveIntensity: 0.3 });

  const add = (parent: THREE.Object3D, part: string, mesh: THREE.Mesh, pos: [number, number, number], rot?: [number, number, number]) => {
    mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.part = part;
    parent.add(mesh);
    return mesh;
  };

  const bolt = (parent: THREE.Object3D, part: string, pos: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), darkSteel);
    m.rotation.x = Math.PI / 2;
    add(parent, part, m, pos);
  };

  const flange = (parent: THREE.Object3D, part: string, pos: [number, number, number], axis: "x" | "y" | "z" = "y") => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), steel);
    if (axis === "x") m.rotation.z = Math.PI / 2;
    if (axis === "z") m.rotation.x = Math.PI / 2;
    add(parent, part, m, pos);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const bx = Math.cos(a) * 0.2;
      const by = Math.sin(a) * 0.2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 6), darkSteel);
      if (axis === "x") b.rotation.z = Math.PI / 2;
      if (axis === "z") b.rotation.x = Math.PI / 2;
      const bp: [number, number, number] = axis === "y" ? [pos[0] + bx, pos[1], pos[2] + by] : axis === "x" ? [pos[0], pos[1] + bx, pos[2] + by] : [pos[0] + bx, pos[1] + by, pos[2]];
      add(parent, part, b, bp);
    }
  };

  const rows = new THREE.Group();
  rows.name = "rows";
  rows.userData.part = "rows";
  for (let i = 0; i < 10; i++) {
    const copy = i === 0 ? unit : unit.clone(true);
    copy.position.set(0, 0, -18 + i * 3.6);
    copy.userData.part = "rows";
    copy.traverse((obj) => {
      obj.userData.part = "rows";
    });
    rows.add(copy);
  }
  root.add(rows);

  const hall = new THREE.Group();
  hall.name = "facility";
  hall.userData.part = "facility";

  add(hall, "facility", new THREE.Mesh(new THREE.BoxGeometry(52, 0.12, 46), floor), [2, -0.06, 0]);
  for (let i = 0; i < 7; i++) {
    const x = -18 + i * 7;
    add(hall, "facility", new THREE.Mesh(new THREE.BoxGeometry(0.32, 7.2, 0.32), steel), [x, 3.6, -22]);
    add(hall, "facility", new THREE.Mesh(new THREE.BoxGeometry(0.32, 7.2, 0.32), steel), [x, 3.6, 22]);
    add(hall, "facility", new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 44.4), steel), [x, 7.1, 0]);
    bolt(hall, "facility", [x, 1.2, -21.7]);
    bolt(hall, "facility", [x, 1.2, 21.7]);
  }

  const roof = new THREE.Group();
  roof.name = "roof";
  roof.userData.part = "roof";
  add(roof, "roof", new THREE.Mesh(new THREE.BoxGeometry(48, 0.18, 44), painted), [2, 7.35, 0]);
  add(roof, "roof", new THREE.Mesh(new THREE.BoxGeometry(48, 1.4, 0.18), painted), [2, 6.2, 22.2]);
  add(roof, "roof", new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.1, 0.06), blue), [2, 6.35, 22.32]);
  root.add(roof);

  const rail = (part: string, x: number, z: number, w: number, d: number) => {
    add(hall, part, new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), yellow), [x, 1.05, z - d / 2]);
    add(hall, part, new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), yellow), [x, 1.05, z + d / 2]);
    add(hall, part, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, d), yellow), [x - w / 2, 1.05, z]);
    add(hall, part, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, d), yellow), [x + w / 2, 1.05, z]);
  };
  rail("rows", 0, 0, 14, 38);

  const water = new THREE.Group();
  water.name = "water-handling";
  water.userData.part = "water-handling";
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 5.2, 32), steel);
  tank.position.set(16, 2.7, -8);
  tank.userData.part = "water-handling";
  tank.userData.flow = "water";
  tank.castShadow = true;
  water.add(tank);
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.48, 2.48, 0.12, 32), darkSteel);
    band.position.set(16, 1.2 + i * 1.6, -8);
    band.userData.part = "water-handling";
    water.add(band);
  }
  const tankBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.7, 0.3, 32), darkSteel);
  tankBase.position.set(16, 0.15, -8);
  tankBase.userData.part = "water-handling";
  water.add(tankBase);
  flange(water, "water-handling", [13.6, 1.8, -8], "x");
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7.2, 16), steel);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(11.6, 1.8, -8);
  pipe.userData.part = "water-handling";
  pipe.userData.flow = "water";
  water.add(pipe);
  const valve = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), darkSteel);
  valve.position.set(10.2, 1.8, -8);
  valve.userData.part = "water-handling";
  valve.userData.flow = "water";
  water.add(valve);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 16), yellow);
  wheel.position.set(10.2, 2.15, -8);
  wheel.userData.part = "water-handling";
  water.add(wheel);
  root.add(water);

  const power = new THREE.Group();
  power.name = "power-collection";
  power.userData.part = "power-collection";
  for (let i = 0; i < 4; i++) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.4, 0.9), painted);
    cab.position.set(15.4, 1.2, -2 + i * 1.6);
    cab.userData.part = "power-collection";
    cab.userData.flow = "power";
    cab.castShadow = true;
    power.add(cab);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.04), steel);
    door.position.set(15.4, 1.25, -1.55 + i * 1.6);
    door.userData.part = "power-collection";
    power.add(door);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.06), darkSteel);
    handle.position.set(15.9, 1.25, -1.5 + i * 1.6);
    handle.userData.part = "power-collection";
    power.add(handle);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({ color: "#00c2b3", emissive: "#00c2b3", emissiveIntensity: 1.2 }));
    lamp.position.set(15.9, 2.1, -1.5 + i * 1.6);
    lamp.userData.part = "power-collection";
    lamp.userData.flow = "power";
    power.add(lamp);
    for (let b = 0; b < 4; b++) {
      bolt(power, "power-collection", [15.4 + (b % 2 === 0 ? -0.7 : 0.7), 0.4 + Math.floor(b / 2) * 1.6, -1.55 + i * 1.6]);
    }
  }
  const bus = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 6.4), darkSteel);
  bus.position.set(16.6, 2.6, 0.4);
  bus.userData.part = "power-collection";
  bus.userData.flow = "power";
  power.add(bus);
  for (let i = 0; i < 4; i++) {
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), darkSteel);
    conduit.position.set(16.2, 2.2, -2 + i * 1.6);
    conduit.userData.part = "power-collection";
    power.add(conduit);
  }
  root.add(power);

  const ops = new THREE.Group();
  ops.name = "operations";
  ops.userData.part = "operations";
  const room = new THREE.Mesh(new THREE.BoxGeometry(8, 3.4, 6), painted);
  room.position.set(16, 1.7, 10);
  room.userData.part = "operations";
  room.castShadow = true;
  ops.add(room);
  const windowPane = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.5, 0.08), glass);
  windowPane.position.set(16, 1.9, 13.05);
  windowPane.userData.part = "operations";
  ops.add(windowPane);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.08), darkSteel);
  doorFrame.position.set(19.2, 1.1, 13.05);
  doorFrame.userData.part = "operations";
  ops.add(doorFrame);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.2), steel);
  desk.position.set(16, 0.95, 10.4);
  desk.userData.part = "operations";
  ops.add(desk);
  for (let i = 0; i < 3; i++) {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.04), screen);
    mon.position.set(15.1 + i * 0.95, 1.4, 10.95);
    mon.userData.part = "operations";
    ops.add(mon);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), darkSteel);
    stand.position.set(15.1 + i * 0.95, 1.1, 10.9);
    stand.userData.part = "operations";
    ops.add(stand);
  }
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.6), painted);
  rack.position.set(18.8, 0.9, 9.2);
  rack.userData.part = "operations";
  ops.add(rack);
  for (let i = 0; i < 4; i++) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: "#00c2b3", emissive: "#00c2b3", emissiveIntensity: 0.8 }));
    led.position.set(18.8, 0.4 + i * 0.35, 9.5);
    led.userData.part = "operations";
    ops.add(led);
  }
  const gaugeDial = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16), gauge);
  gaugeDial.rotation.x = Math.PI / 2;
  gaugeDial.position.set(14.2, 1.6, 10.95);
  gaugeDial.userData.part = "operations";
  ops.add(gaugeDial);
  root.add(ops);

  for (let i = 0; i < 5; i++) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: "#fff", emissive: "#fff", emissiveIntensity: 0.7 }));
    light.position.set(2, 6.9, -16 + i * 8);
    light.userData.part = "facility";
    hall.add(light);
  }

  root.add(hall);
  return root;
}
