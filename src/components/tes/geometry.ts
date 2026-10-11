import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import sceneJson from "@/components/tes/tes-scene.json";
import { FLOW_PARTS, PROCESS_PARTS, STORAGE_PARTS, type FlowId, type Isolate, type ShellMode } from "@/lib/tes/content";

// ... existing imports and types remain the same, but we patch applyPresentation ...
// For brevity, we only patch the applyPresentation function via a targeted edit.
// Full file rewrite is large; instead we use a smaller patch approach.
