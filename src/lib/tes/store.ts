import { create } from "zustand";
import type { Audience, FlowId, Isolate, PartId, Quality, SceneId, ShellMode, ViewId } from "@/lib/tes/content";
import { PART_FLOW } from "@/lib/tes/content";

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
      view: "iso",
      explode: 0,
      shell: scene === "facility" ? "closed" : "open",
      shot: Date.now(),
    }),
  setView: (view) => set((s) => ({ view, shot: s.shot + 1 })),
  setShell: (shell) => set({ shell }),
  setIsolate: (isolate) => set({ isolate }),
  setFlow: (flow) => set((s) => ({
    flow,
    shell: flow !== "off" && s.scene === "facility" ? "open" : s.shell,
  })),
  setAudience: (audience) => set({ audience }),
  setExplode: (explode) => set({ explode }),
  setSpin: (spin) => set({ spin }),
  setRunning: (running) => set((s) => ({
    running,
    flow: running && s.flow === "off" ? "power" : s.flow,
    shell: running && s.scene === "facility" ? "open" : s.shell,
  })),
  setSelected: (selected) =>
    set((s) => {
      const flow = PART_FLOW[selected];
      const engineering = selected === "oxygen" || selected === "thermal" || selected === "anolyte" || selected === "condenser" || selected === "carbon-skid";
      return {
        selected,
        panel: selected === "overview" || (typeof window !== "undefined" && window.matchMedia("(max-width: 959px)").matches) ? s.panel : true,
        flow: flow ?? (selected === "overview" ? "off" : s.flow),
        audience: engineering ? "engineering" : s.audience,
      };
    }),
  setPresent: (present) => set({ present }),
  setPanel: (panel) => set({ panel }),
  setCallouts: (callouts) => set({ callouts }),
  setQuality: (quality) => set({ quality }),
  bumpShot: () => set((s) => ({ shot: s.shot + 1 })),
}));
