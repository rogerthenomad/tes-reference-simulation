import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import * as THREE from "three";
import { PARTS, type PartId } from "@/lib/tes/content";
import { useTes } from "@/lib/tes/store";
import { applyPresentation, buildReferenceModel, disposeObject } from "@/components/tes/geometry";

export type StageHandle = { nudge: (dir: "left" | "right" | "up" | "down") => void };

type Shot = { pos: THREE.Vector3; target: THREE.Vector3 };

const UNIT_SHOTS: Record<string, Shot> = {
  front: shot([0.4, 2.2, 12], [0.3, 1.75, 0]),
  back: shot([0.4, 2.2, -12], [0.3, 1.75, 0]),
  iso: shot([12, 6.4, 9.4], [0, 1.55, 0]),
  top: shot([0.4, 18, 0.6], [0, 0.2, 0]),
  end: shot([15, 2.5, 3.2], [0, 1.8, 0]),
  utility: shot([3.7, 1.5, 5.4], [3.5, 0.75, 1.05]),
};

function shot(pos: [number, number, number], target: [number, number, number]): Shot {
  return { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target) };
}

class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-full place-items-center px-6 text-center text-muted">
          The 3D view could not start in this browser. The reference model is still described in the dossier.
        </div>
      );
    }
    return this.props.children;
  }
}

export function Stage({ stageRef }: { stageRef: Ref<StageHandle> }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className="grid h-full place-items-center text-sm text-muted">Preparing the bay…</div>;
  }
  return (
    <StageBoundary>
      <Canvas
        camera={{ position: [12, 6.4, 9.4], fov: 32, near: 0.08, far: 240 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onPointerMissed={() => useTes.getState().setSelected("overview")}
      >
        <SceneInner stageRef={stageRef} />
      </Canvas>
    </StageBoundary>
  );
}

function SceneInner({ stageRef }: { stageRef: Ref<StageHandle> }) {
  const view = useTes((s) => s.view);
  const shell = useTes((s) => s.shell);
  const isolate = useTes((s) => s.isolate);
  const flow = useTes((s) => s.flow);
  const explode = useTes((s) => s.explode);
  const selected = useTes((s) => s.selected);
  const spin = useTes((s) => s.spin);
  const quality = useTes((s) => s.quality);
  const engineering = useTes((s) => s.audience) === "engineering";
  const shotN = useTes((s) => s.shot);
  const setSelected = useTes((s) => s.setSelected);

  const models = useRef<THREE.Group | null>(null);
  const [ready, setReady] = useState(false);
  const flying = useRef(true);
  const desired = useRef<Shot>(UNIT_SHOTS.iso);
  const controls = useThree((s) => s.controls) as {
    target: THREE.Vector3;
    update: () => void;
    autoRotate: boolean;
    screenSpacePanning: boolean;
    mouseButtons: { LEFT: number };
    touches: { ONE: number };
  } | null;
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    let dead = false;
    buildReferenceModel().then((unit) => {
      if (dead) {
        disposeObject(unit);
        return;
      }
      models.current = unit;
      setReady(true);
    });
    return () => {
      dead = true;
      if (models.current) {
        disposeObject(models.current);
        models.current = null;
      }
    };
  }, []);

  useEffect(() => {
    flying.current = true;
    desired.current = UNIT_SHOTS[view] || UNIT_SHOTS.iso;
  }, [view, shotN]);

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onDown = (event: PointerEvent) => {
      if (!controls) return;
      flying.current = false;
      const rect = el.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = models.current ? raycaster.intersectObject(models.current, true) : [];
      const onModel = hits.length > 0;
      controls.screenSpacePanning = true;
      controls.mouseButtons.LEFT = onModel ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
      controls.touches.ONE = onModel ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN;
    };
    el.addEventListener("pointerdown", onDown, true);
    return () => el.removeEventListener("pointerdown", onDown, true);
  }, [camera, controls, gl]);

  useImperativeHandle(stageRef, () => ({
    nudge(dir) {
      if (!controls) return;
      flying.current = false;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const step = Math.max(0.45, camera.position.distanceTo(controls.target) * 0.08);
      const pan = new THREE.Vector3();
      if (dir === "left") pan.addScaledVector(right, step);
      if (dir === "right") pan.addScaledVector(right, -step);
      if (dir === "up") pan.addScaledVector(up, -step);
      if (dir === "down") pan.addScaledVector(up, step);
      camera.position.add(pan);
      controls.target.add(pan);
      controls.update();
      desired.current = { pos: camera.position.clone(), target: controls.target.clone() };
      useTes.getState().setSpin(false);
    },
  }), [camera, controls, stageRef]);

  useFrame(({ clock }, delta) => {
    if (controls) controls.autoRotate = spin && !flying.current;
    const pack = models.current;
    if (pack) {
      applyPresentation(pack, { shell, isolate, flow, explode, selected, engineering, pulse: clock.elapsedTime });
    }
    if (!controls || !flying.current || spin) return;
    const t = 1 - Math.pow(0.0015, Math.min(delta, 0.05));
    camera.position.lerp(desired.current.pos, Math.min(1, t * 2.2));
    controls.target.lerp(desired.current.target, Math.min(1, t * 2.2));
    controls.update();
    if (camera.position.distanceTo(desired.current.pos) < 0.05) flying.current = false;
  });

  const pick = (event: { stopPropagation: () => void; object: THREE.Object3D }) => {
    event.stopPropagation();
    let node: THREE.Object3D | null = event.object;
    while (node) {
      const part = node.userData.part as string | undefined;
      if (part && part in PARTS) {
        setSelected(part as PartId);
        return;
      }
      if (node.name && node.name in PARTS) {
        setSelected(node.name as PartId);
        return;
      }
      node = node.parent;
    }
  };

  return (
    <>
      <color attach="background" args={["#9eb0c0"]} />
      <hemisphereLight args={["#d5e4f2", "#6a5848", 0.55]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-8, 14, 8]} intensity={quality === "high" ? 2.4 : 1.6} castShadow={quality === "high"} />
      <directionalLight position={[6, 6, -8]} intensity={0.45} color="#ffd7bf" />
      <Environment files="/hdri/warehouse.hdr" environmentIntensity={quality === "high" ? 1.15 : 0.75} background={false} />
      {ready && models.current ? <primitive object={models.current} onClick={pick} /> : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <meshStandardMaterial color="#c5ced6" roughness={0.92} metalness={0.04} />
      </mesh>
      {quality === "high" ? (
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={30} blur={2.4} far={8} />
      ) : null}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} screenSpacePanning maxPolarAngle={Math.PI / 2.05} minDistance={1.2} maxDistance={80} />
    </>
  );
}
