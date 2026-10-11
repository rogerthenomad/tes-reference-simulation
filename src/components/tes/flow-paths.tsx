import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { FlowId, SceneId } from "@/lib/tes/content";

type Point = [number, number, number];
type Route = Point[];

const COLORS: Record<Exclude<FlowId, "off">, string> = {
  power: "#75c9ff",
  water: "#37c9ff",
  fuel: "#ff9c32",
  carbon: "#b8df74",
  oxygen: "#a7e9f4",
  thermal: "#ffb76e",
};
const HUBS = [-4.77, -2.99, -1.21, 0.57];

/** Paths follow the exported TES pipe headers, manifolds and service connections. */
function unitRoutes(flow: Exclude<FlowId, "off">): Route[] {
  switch (flow) {
    case "fuel":
      return [
        [[1.2, 0.95, -0.9], [1.2, 2.98, -0.9], [1.2, 3.28, 0.82], [-5.35, 3.28, 0.82]],
        ...HUBS.map((x): Route => [[x, 3.28, 0.82], [x, 2.18, 0.82], [x, 1.25, 0.82]]),
      ];
    case "carbon":
      return [
        [[1.24, 2.58, -0.92], [1.24, 3.38, -0.92], [-5.3, 3.38, -0.92]],
        ...HUBS.map((x): Route => [[x, 3.38, -0.92], [x, 2.45, -0.65], [x, 2.35, 0.75]]),
      ];
    case "water":
      return [
        [[-5.65, 0.66, 1.1], [5.62, 0.66, 1.1]],
        ...HUBS.map((x): Route => [[x, 1.12, 0.92], [x, 0.66, 1.1]]),
        [[-5.65, 0.66, -1.1], [2.1, 0.66, -1.1]],
      ];
    case "power":
      return [
        [[-5.25, 3.45, 0.59], [3.64, 3.45, 0.59], [3.64, 2.7, 0.82], [5.03, 2.7, 0.82]],
        ...HUBS.map((x): Route => [[x, 1.18, 0.89], [x, 3.45, 0.59]]),
      ];
    case "oxygen":
      return [
        [[5.32, 3.38, -0.3], [-5.3, 3.38, -0.3]],
        ...HUBS.map((x): Route => [[x, 3.38, -0.3], [x, 1.34, 0.71]]),
      ];
    case "thermal":
      return [
        [[-5.36, 2.88, -0.65], [5.42, 2.88, -0.65]],
        ...HUBS.map((x): Route => [[x, 1.33, 0.7], [x, 2.88, -0.65]]),
      ];
  }
}

function routes(scene: SceneId, flow: Exclude<FlowId, "off">): Route[] {
  const unit = unitRoutes(flow);
  if (scene === "unit") return unit;
  const rows = Array.from({ length: 10 }, (_, index) => -18 + index * 3.6);
  const translated = rows.flatMap((z) =>
    unit.map((route) => route.map(([x, y, localZ]): Point => [x, y, localZ + z])),
  );
  const side = flow === "water" ? 1.1 : flow === "fuel" ? -0.9 : flow === "power" ? 0.6 : -0.4;
  const height = flow === "water" ? 1.38 : flow === "power" ? 2.7 : 2.25;
  // Site headers connect the ten repeated skids to the storage and conversion area.
  translated.push([[5.5, height, -18 + side], [8.1, height, -18 + side], [8.1, height, 14.4 + side]]);
  if (flow === "water" || flow === "fuel") {
    translated.push([[8.1, height, -8 + side], [10.3, height, -8 + side], [12, height, -8 + side]]);
  }
  return translated;
}

export function FlowPaths({ scene, flow, running }: { scene: SceneId; flow: FlowId; running: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const elapsed = useRef(0);
  const overlay = useMemo(() => {
    if (flow === "off") return null;
    const group = new THREE.Group();
    group.name = `illustrative-${flow}-flow`;
    const curves = routes(scene, flow).map((route) =>
      new THREE.CatmullRomCurve3(route.map((point) => new THREE.Vector3(...point)), false, "centripetal"),
    );
    const color = new THREE.Color(COLORS[flow]);
    const guideMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, depthWrite: false });
    const tubes = curves.map((curve) => new THREE.TubeGeometry(curve, Math.max(12, Math.ceil(curve.getLength() * 3)), scene === "unit" ? 0.012 : 0.018, 5, false));
    const merged = mergeGeometries(tubes, false);
    tubes.forEach((tube) => tube.dispose());
    if (merged) {
      const guide = new THREE.Mesh(merged, guideMaterial);
      guide.userData.flowGuide = true;
      group.add(guide);
    }
    const beadsPerRoute = scene === "facility" ? 3 : 5;
    const beadGeometry = new THREE.SphereGeometry(scene === "facility" ? 0.065 : 0.046, 8, 6);
    const beadMaterial = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const beads = new THREE.InstancedMesh(beadGeometry, beadMaterial, curves.length * beadsPerRoute);
    beads.frustumCulled = false;
    beads.userData.flowTracer = true;
    group.add(beads);
    return { group, curves, beads, beadsPerRoute };
  }, [flow, scene]);

  useEffect(() => {
    elapsed.current = 0;
    invalidate();
    return () => {
      if (!overlay) return;
      overlay.group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      for (const material of new Set([overlay.beads.material, ...overlay.group.children.map((child) => (child as THREE.Mesh).material)])) {
        (material as THREE.Material).dispose();
      }
    };
  }, [overlay, invalidate]);

  useEffect(() => invalidate(), [running, invalidate]);
  const transform = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, delta) => {
    if (!overlay) return;
    if (running) elapsed.current += Math.min(delta, 0.05);
    const { curves, beads, beadsPerRoute } = overlay;
    curves.forEach((curve, routeIndex) => {
      const rate = 1.15 / Math.max(curve.getLength(), 0.5);
      for (let bead = 0; bead < beadsPerRoute; bead++) {
        const phase = (bead / beadsPerRoute + elapsed.current * rate + routeIndex * 0.17) % 1;
        transform.position.copy(curve.getPointAt(phase));
        transform.updateMatrix();
        beads.setMatrixAt(routeIndex * beadsPerRoute + bead, transform.matrix);
      }
    });
    beads.instanceMatrix.needsUpdate = true;
    if (running) invalidate();
  });
  return overlay ? <primitive object={overlay.group} /> : null;
}
