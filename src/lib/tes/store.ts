import { create } from "zustand";
import type { Audience, FlowId, Isolate, PartId, Quality, SceneId, ShellMode, ViewId } from "@/lib/tes/content";

type TesState = {
  scene: SceneId;
  view: ViewId;
  shell: ShellMode;
  isolate: Isolate;
  flow: FlowId;
  audience: Audience;
  explode: number;
  spin: boolean;
  running: boolean;
  selected: PartId;
  present: boolean;
  panel: boolean;
  callouts: boolean;
  quality: Quality;
  shot: number;
  setScene: (scene: SceneId) => void;
  setView: (view: ViewId) => void;
  setShell: (shell: ShellMode) => void;
  setIsolate: (isolate: Isolate) => void;
  setFlow: (flow: FlowId) => void;
  setAudience: (audience: Audience) => void;
  setExplode: (explode: number) => void;
  setSpin: (spin: boolean) => void;
  setRunning: (running: boolean) => void;
  setSelected: (selected: PartId) => void;
  setPresent: (present: boolean) => void;
  setPanel: (panel: boolean) => void;
  setCallouts: (callouts: boolean) => void;
  setQuality: (quality: Quality) => void;
  bumpShot: () => void;
};

export const useTes = create<TesState>((set) => ({
  scene: "unit",
  view: "iso",
  shell: "open",
  isolate: "all",
  flow: "off",
  audience: "doe",
  explode: 0,
  spin: false,
  running: false,
  selected: "overview",
  present: false,
  panel: false,
  callouts: true,
  quality: "high",
  shot: 0,
  setScene: (scene) =>
    set({
      scene,
      selected: "overview",
      view: scene === "facility" ? "iso" : scene === "teardown" ? "iso" : "front",
      explode: scene === "teardown" ? 0.35 : 0,
      shot: Date.now(),
    }),
  setView: (view) => set((s) => ({ view, shot: s.shot + 1 })),
  setShell: (shell) => set({ shell }),
  setIsolate: (isolate) => set({ isolate }),
  setFlow: (flow) => set({ flow }),
  setAudience: (audience) => set({ audience }),
  setExplode: (explode) => set({ explode }),
  setSpin: (spin) => set({ spin }),
  setRunning: (running) => set({ running }),
  setSelected: (selected) => set((s) => ({ selected, shot: s.shot + 1 })),
  setPresent: (present) => set({ present }),
  setPanel: (panel) => set({ panel }),
  setCallouts: (callouts) => set({ callouts }),
  setQuality: (quality) => set({ quality }),
  bumpShot: () => set((s) => ({ shot: s.shot + 1 })),
}));
