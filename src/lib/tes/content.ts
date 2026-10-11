export type SceneId = "unit" | "facility";
export type ViewId = "front" | "back" | "iso" | "top" | "end" | "utility";
export type ShellMode = "open" | "closed" | "xray";
export type Isolate = "all" | "process" | "storage";
export type FlowId = "off" | "power" | "water" | "fuel" | "carbon" | "oxygen" | "thermal";
export type Audience = "doe" | "engineering";
export type Quality = "balanced" | "high";

export type PartId =
  | "overview"
  | "shell"
  | "roof"
  | "hub-1"
  | "hub-2"
  | "hub-3"
  | "hub-4"
  | "ecr"
  | "fuel-cell"
  | "trim-front"
  | "battery"
  | "ems"
  | "piping"
  | "water-front"
  | "water-rear"
  | "electrolyte"
  | "fuel"
  | "tank-frame"
  | "trim-rear"
  | "vessel"
  | "lights"
  | "oxygen"
  | "thermal"
  | "anolyte"
  | "condenser"
  | "carbon-skid";
