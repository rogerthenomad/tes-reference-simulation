import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import * as THREE from "three";
import { PARTS, type PartId, type SceneId, type ViewId } from "@/lib/tes/content";
import { useTes } from "@/lib/tes/store";
import { applyPresentation, applyTeardown, buildReferenceModel, buildTeardown, disposeObject } from "@/components/tes/geometry";

export type StageHandle = { yaw: (dir: 1 | -1) => void };

type Shot = { pos: THREE.Vector3; target: THREE.Vector3 };

const UNIT_SHOTS: Record<string, Shot> = {
  front: shot([0.4, 2.2, 12], [0.3, 1.75, 0]),
  back: shot([0.4, 2.2, -12], [0.3, 1.75, 0]),
  iso: shot([12, 6.4, 9.4], [0, 1.55, 0]),
  top: shot([0.4, 18, 0.6], [0, 0.2, 0]),
  end: shot([15, 2.5, 3.2], [0, 1.8, 0]),
  utility: shot([3.7, 1.5, 5.4], [3.5, 0.75, 1.05]),
};

const FACILITY_SHOTS: Record<string, Shot> = {
  iso: shot([34, 24, 36], [2, 1, 0]),
  front: shot([2, 8, 48], [2, 1.5, 0]),
  top: shot([2, 52, 1], [2, 0, 0]),
  end: shot([58, 12, 6], [2, 2, 0]),
  utility: shot([36, 6, 18], [30, 1.2, 4]),
};

const TEAR_SHOTS: Record<string, Shot> = {
  front: shot([0.3, 1.9, 4.6], [-0.1, 1.45, 0]),
  iso: shot([3.8, 2.8, 3.8], [0.5, 1.25, 0]),
  top: shot([0.6, 6.5, 0.4], [0.5, 1, 0]),
  back: shot([0.2, 2, -4.8], [0, 1.4, 0]),
  end: shot([5.2, 2.2, 1.2], [0.6, 1.3, 0]),
  utility: shot([2.4, 1.6, 3.2], [1.2, 1.1, 0]),
};

const FOCUS: Partial<Record<PartId, Shot>> = {
  shell: UNIT_SHOTS.iso,
  roof: shot([4, 8, 8], [0, 3.2, 0]),
  "hub-1": shot([-4.2, 2.3, 3.8], [-4.77, 1.7, 0.45]),
  "hub-2": shot([-2.4, 2.3, 3.8], [-2.99, 1.7, 0.45]),
  "hub-3": shot([-0.6, 2.3, 3.8], [-1.21, 1.7, 0.45]),
  "hub-4": shot([1.2, 2.3, 3.8], [0.57, 1.7, 0.45]),
  "trim-front": shot([2.4, 2.2, 3.6], [2.32, 2.1, 0.9]),
  battery: shot([3.8, 2.1, 3.5], [3.68, 1.9, 0.95]),
  ems: shot([5.2, 2.3, 3.6], [5.03, 2.0, 0.95]),
  piping: shot([0, 4.2, 5], [-1, 3.2, 0.2]),
  "water-front": shot([3.8, 1.4, 4.2], [3.75, 0.7, 1.1]),
  "water-rear": shot([-4.4, 1.4, -4.2], [-4.6, 0.7, -1.1]),
  electrolyte: shot([1.2, 2.8, -5.5], [1.24, 2.5, -0.6]),
  fuel: shot([1.2, 1.6, -5.2], [1.24, 1.0, -0.6]),
  "tank-frame": shot([1, 2.2, -6], [1, 1.6, -0.2]),
  "trim-rear": shot([-4.6, 2.3, -4.4], [-4.93, 2.0, -0.7]),
  vessel: shot([-3.4, 2.2, -4.6], [-3.79, 1.6, -0.65]),
  lights: shot([0, 3.2, 6], [0, 3.4, 0]),
  oxygen: shot([-1.4, 5.4, 3.2], [-1.6, 4.2, 0.15]),
  thermal: shot([3.8, 5.6, 3], [3.6, 4.2, -0.15]),
  anolyte: shot([-4.2, 2.1, 3.4], [-4.77, 1.6, 1.2]),
  condenser: shot([2.4, 2, 3.6], [2.35, 1.4, 1.4]),
  "carbon-skid": shot([5.6, 1.8, 3.4], [5.55, 1.1, 1.3]),
  stack: TEAR_SHOTS.iso,
  bank: FACILITY_SHOTS.iso,
  "water-zone": shot([40, 8, 16], [32, 1.4, 6]),
  "power-zone": shot([40, 8, -4], [32, 1.4, -6]),
  "control-room": shot([40, 8, 18], [32, 1.6, 12]),
};

function shot(pos: [number, number, number], target: [number, number, number]): Shot {
  return { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target) };
}

function pickShot(scene: SceneId, view: ViewId, selected: PartId): Shot {
  if (selected !== "overview" && FOCUS[selected]) return FOCUS[selected]!;
  const table = scene === "facility" ? FACILITY_SHOTS : scene === "teardown" ? TEAR_SHOTS : UNIT_SHOTS;
  return table[view] || table.iso || UNIT_SHOTS.iso;
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
  const scene = useTes((s) => s.scene);
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

  const models = useRef<{ unit: THREE.Group; tear: THREE.Group } | null>(null);
  const [ready, setReady] = useState(false);
  const flying = useRef(true);
  const desired = useRef<Shot>(UNIT_SHOTS.iso);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void; autoRotate: boolean } | null;
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let dead = false;
    buildReferenceModel().then((unit) => {
      if (dead) {
        disposeObject(unit);
        return;
      }
      const tear = buildTeardown();
      models.current = { unit, tear };
      setReady(true);
    });
    return () => {
      dead = true;
      if (models.current) {
        disposeObject(models.current.unit);
        disposeObject(models.current.tear);
        models.current = null;
      }
    };
  }, []);

  useEffect(() => {
    flying.current = true;
    desired.current = pickShot(scene, view, selected);
  }, [scene, view, selected, shotN]);

  useImperativeHandle(stageRef, () => ({
    yaw(dir) {
      const origin = controls?.target?.clone() || new THREE.Vector3(0, 1.6, 0);
      const offset = camera.position.clone().sub(origin);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dir * (Math.PI / 5));
      desired.current = { pos: origin.clone().add(offset), target: origin };
      flying.current = true;
      useTes.getState().setSpin(false);
    },
  }), [camera, controls, stageRef]);

  useFrame(({ clock }, delta) => {
    if (controls) controls.autoRotate = spin && !flying.current;
    const pack = models.current;
    if (pack) {
      const pulse = clock.elapsedTime;
      if (scene === "unit") {
        applyPresentation(pack.unit, { shell, isolate, flow, explode, selected, engineering, pulse });
      } else if (scene === "teardown") {
        applyTeardown(pack.tear, explode, pulse, flow);
      }
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
      {ready && models.current && scene === "unit" ? <primitive object={models.current.unit} onClick={pick} /> : null}
      {ready && models.current && scene === "teardown" ? <primitive object={models.current.tear} onClick={pick} /> : null}
      {scene === "facility" ? <Facility onPick={pick} /> : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[scene === "facility" ? 70 : 22, 64]} />
        <meshStandardMaterial color="#c5ced6" roughness={0.92} metalness={0.04} />
      </mesh>
      {quality === "high" ? (
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={scene === "facility" ? 80 : 30} blur={2.4} far={8} />
      ) : null}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} minDistance={1.2} maxDistance={scene === "facility" ? 90 : 40} />
    </>
  );
}

function Facility({ onPick }: { onPick: (event: { stopPropagation: () => void; object: THREE.Object3D }) => void }) {
  const banks = [];
  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    banks.push(
      <group key={i} position={[-16 + col * 13, 0, row === 0 ? -7 : 7]} onClick={onPick} userData={{ part: "bank" }}>
        <Bank />
      </group>,
    );
  }
  return (
    <group>
      {banks}
      <Zone name="water-zone" position={[34, 0, 6]} color="#8aa0b2" onPick={onPick} label="Water" />
      <Zone name="power-zone" position={[34, 0, -6]} color="#d9dde2" onPick={onPick} label="Power" />
      <Zone name="control-room" position={[34, 0, 14]} color="#e7eef4" onPick={onPick} label="Ops" />
    </group>
  );
}

function Bank() {
  return (
    <group>
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[12.2, 3.1, 2.5]} />
        <meshStandardMaterial color="#c5ced6" metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[12.2, 0.12, 2.5]} />
        <meshStandardMaterial color="#e85d04" metalness={0.2} roughness={0.4} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[-5.2 + i * 1.15, 1.45, 1.35]} castShadow userData={{ part: "bank" }}>
          <boxGeometry args={[0.92, 2.2, 0.55]} />
          <meshStandardMaterial color={i % 2 ? "#1a242c" : "#d5dde4"} metalness={0.45} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[0, 1.15, -1.55]} rotation={[0, 0, Math.PI / 2]} castShadow userData={{ part: "bank" }}>
        <cylinderGeometry args={[0.42, 0.42, 10.5, 16]} />
        <meshStandardMaterial color="#d9dde2" metalness={0.7} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Zone({
  name,
  position,
  color,
  onPick,
  label,
}: {
  name: PartId;
  position: [number, number, number];
  color: string;
  onPick: (event: { stopPropagation: () => void; object: THREE.Object3D }) => void;
  label: string;
}) {
  return (
    <group name={label} position={position} onClick={onPick} userData={{ part: name }}>
      <mesh position={[0, name === "control-room" ? 1.6 : 1.1, 0]} castShadow userData={{ part: name }}>
        <boxGeometry args={[name === "control-room" ? 6 : 7.5, name === "control-room" ? 3.2 : 2.2, 4.2]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.35, 2.4]} userData={{ part: name }}>
        <boxGeometry args={[3.2, 0.7, 0.8]} />
        <meshStandardMaterial color="#1a242c" />
      </mesh>
    </group>
  );
}
