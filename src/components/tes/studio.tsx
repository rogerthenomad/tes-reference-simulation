import { useEffect, useRef } from "react";
import { Hud } from "@/components/tes/hud";
import { Stage, type StageHandle } from "@/components/tes/stage";
import type { SceneId } from "@/lib/tes/content";
import { useTes } from "@/lib/tes/store";

export function Studio({ scene }: { scene: SceneId }) {
  const stageRef = useRef<StageHandle>(null);
  const setScene = useTes((s) => s.setScene);

  useEffect(() => {
    setScene(scene);
  }, [scene, setScene]);

  return (
    <Hud stageRef={stageRef}>
      <Stage stageRef={stageRef} />
    </Hud>
  );
}
