export type SceneId = "unit";
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

export type PartInfo = {
  id: PartId;
  title: string;
  body: string;
  wall: "process" | "storage" | "both" | "engineering";
};

const HUB = "Each independently managed hub contains an ECR and Fuel Cell.";
const TRIM = "Stores fluid used to maintain fuel and electrolyte balance.";
const WATER = "Collects and routes recovered water.";

export const PARTS: Record<PartId, PartInfo> = {
  overview: {
    id: "overview",
    title: "Trinium Energy System",
    body: "A containerized system that stores fuel, generates electricity, and recovers water.",
    wall: "both",
  },
  shell: {
    id: "shell",
    title: "Container shell",
    body: "The enclosure that houses the TES equipment.",
    wall: "both",
  },
  roof: {
    id: "roof",
    title: "Roof",
    body: "Closes the top of the container.",
    wall: "both",
  },
  "hub-1": hub(1),
  "hub-2": hub(2),
  "hub-3": hub(3),
  "hub-4": hub(4),
  "trim-front": {
    id: "trim-front",
    title: "Trim Reservoir",
    body: TRIM,
    wall: "process",
  },
  battery: {
    id: "battery",
    title: "Battery Cabinet",
    body: "Provides reserve power and supports stable system operation.",
    wall: "process",
  },
  ems: {
    id: "ems",
    title: "SI/EMS Cabinet",
    body: "Monitors and manages TES system operations.",
    wall: "process",
  },
  piping: {
    id: "piping",
    title: "Process Headers",
    body: "Distribute fuel, electrolyte, and other process fluids throughout the system.",
    wall: "process",
  },
  "water-front": {
    id: "water-front",
    title: "Water Outlet Manifold",
    body: WATER,
    wall: "process",
  },
  "water-rear": {
    id: "water-rear",
    title: "Water Outlet Manifold",
    body: WATER,
    wall: "storage",
  },
  electrolyte: {
    id: "electrolyte",
    title: "Electrolyte Storage",
    body: "Stores electrolyte used to regenerate TES fuel.",
    wall: "storage",
  },
  fuel: {
    id: "fuel",
    title: "Fuel Storage",
    body: "Stores aqueous fuel for electricity generation.",
    wall: "storage",
  },
  "tank-frame": {
    id: "tank-frame",
    title: "Fuel Storage",
    body: "Stores aqueous fuel for electricity generation.",
    wall: "storage",
  },
  "trim-rear": {
    id: "trim-rear",
    title: "Trim Reservoir",
    body: TRIM,
    wall: "storage",
  },
  vessel: {
    id: "vessel",
    title: "Trinium Energy System",
    body: "A containerized system that stores fuel, generates electricity, and recovers water.",
    wall: "storage",
  },
  lights: {
    id: "lights",
    title: "Inspection lights",
    body: "Lights the interior of the container.",
    wall: "both",
  },
  oxygen: {
    id: "oxygen",
    title: "Oxygen support",
    body: "Supports the oxygen path for the hubs.",
    wall: "engineering",
  },
  thermal: {
    id: "thermal",
    title: "Thermal rejection",
    body: "Rejects heat from the hubs.",
    wall: "engineering",
  },
  anolyte: {
    id: "anolyte",
    title: "Anolyte loop",
    body: "Circulates anolyte at the first hub.",
    wall: "engineering",
  },
  condenser: {
    id: "condenser",
    title: "Water recovery",
    body: "Recovers water from the process.",
    wall: "engineering",
  },
  "carbon-skid": {
    id: "carbon-skid",
    title: "Carbon takeoff",
    body: "Handles the carbon-bearing liquid path.",
    wall: "engineering",
  },
};

function hub(n: number): PartInfo {
  return {
    id: `hub-${n}` as PartId,
    title: `Hub ${n}`,
    body: HUB,
    wall: "process",
  };
}

export const FLOW_PARTS: Record<Exclude<FlowId, "off">, PartId[]> = {
  power: ["battery", "ems", "lights", "hub-1", "hub-2", "hub-3", "hub-4"],
  water: ["water-front", "water-rear", "condenser", "piping"],
  fuel: ["fuel", "piping", "hub-1", "hub-2", "hub-3", "hub-4", "trim-front"],
  carbon: ["electrolyte", "carbon-skid", "piping"],
  oxygen: ["oxygen", "hub-1", "hub-2", "hub-3", "hub-4"],
  thermal: ["thermal", "lights", "condenser"],
};

export const PART_FLOW: Partial<Record<PartId, FlowId>> = {
  fuel: "fuel",
  piping: "fuel",
  "trim-front": "fuel",
  "trim-rear": "fuel",
  "hub-1": "fuel",
  "hub-2": "fuel",
  "hub-3": "fuel",
  "hub-4": "fuel",
  "water-front": "water",
  "water-rear": "water",
  condenser: "water",
  electrolyte: "carbon",
  "carbon-skid": "carbon",
  oxygen: "oxygen",
  thermal: "thermal",
  battery: "power",
  ems: "power",
  lights: "power",
};

export const PROCESS_PARTS = new Set<string>([
  "hub-1",
  "hub-2",
  "hub-3",
  "hub-4",
  "trim-front",
  "battery",
  "ems",
  "piping",
  "water-front",
  "lights",
  "oxygen",
  "thermal",
  "anolyte",
  "condenser",
  "carbon-skid",
]);

export const STORAGE_PARTS = new Set<string>([
  "electrolyte",
  "fuel",
  "tank-frame",
  "trim-rear",
  "vessel",
  "water-rear",
]);

export const VIEWS: { id: ViewId; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "iso", label: "Full" },
  { id: "top", label: "Top" },
  { id: "end", label: "End" },
  { id: "utility", label: "Utility" },
];

export const FLOWS: { id: FlowId; label: string }[] = [
  { id: "off", label: "Model" },
  { id: "power", label: "Power" },
  { id: "water", label: "Water" },
  { id: "fuel", label: "Fuel" },
  { id: "carbon", label: "Carbon" },
  { id: "oxygen", label: "Oxygen" },
  { id: "thermal", label: "Thermal" },
];

export const SHOWCASE_PARTS: PartId[] = [
  "overview",
  "shell",
  "hub-1",
  "hub-2",
  "hub-3",
  "hub-4",
  "trim-front",
  "battery",
  "ems",
  "piping",
  "water-front",
  "electrolyte",
  "fuel",
];

export const UNIT_PARTS: PartId[] = SHOWCASE_PARTS;

export const ENGINEERING_PARTS: PartId[] = [];

export const SELECT_ALIAS: Partial<Record<PartId, PartId>> = {
  "trim-rear": "trim-front",
  "water-rear": "water-front",
  vessel: "overview",
  "tank-frame": "fuel",
  lights: "overview",
  roof: "shell",
};

export function sceneStats() {
  return "150\u2013200 kW \u00b7 350\u2013400 gal/day";
}

export const DOES: Record<PartId, string> = {
  overview: PARTS.overview.body,
  shell: PARTS.shell.body,
  roof: PARTS.roof.body,
  "hub-1": HUB,
  "hub-2": HUB,
  "hub-3": HUB,
  "hub-4": HUB,
  "trim-front": TRIM,
  battery: PARTS.battery.body,
  ems: PARTS.ems.body,
  piping: PARTS.piping.body,
  "water-front": WATER,
  "water-rear": WATER,
  electrolyte: PARTS.electrolyte.body,
  fuel: PARTS.fuel.body,
  "tank-frame": PARTS.fuel.body,
  "trim-rear": TRIM,
  vessel: PARTS.overview.body,
  lights: PARTS.lights.body,
  oxygen: PARTS.oxygen.body,
  thermal: PARTS.thermal.body,
  anolyte: PARTS.anolyte.body,
  condenser: PARTS.condenser.body,
  "carbon-skid": PARTS["carbon-skid"].body,
};
