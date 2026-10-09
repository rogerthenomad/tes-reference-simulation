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

export type PartInfo = {
  id: PartId;
  title: string;
  body: string;
  wall: "process" | "storage" | "both" | "engineering";
};

const line = (id: PartId, title: string, body: string, wall: PartInfo["wall"]): PartInfo => ({
  id,
  title,
  body,
  wall,
});

export const PARTS: Record<PartId, PartInfo> = {
  overview: line("overview", "Trinium Energy System", "Containerized power, fuel, and water recovery in one unit.", "both"),
  shell: line("shell", "Container", "The enclosure that houses the TES equipment.", "both"),
  roof: line("roof", "Container", "The enclosure that houses the TES equipment.", "both"),
  "hub-1": line("hub-1", "Hub 1", "Each independently managed hub contains an ECR and Fuel Cell.", "process"),
  "hub-2": line("hub-2", "Hub 2", "Each independently managed hub contains an ECR and Fuel Cell.", "process"),
  "hub-3": line("hub-3", "Hub 3", "Each independently managed hub contains an ECR and Fuel Cell.", "process"),
  "hub-4": line("hub-4", "Hub 4", "Each independently managed hub contains an ECR and Fuel Cell.", "process"),
  ecr: line("ecr", "ECR", "Electrochemical Reactor. Converts stored electrolyte into TES aqueous fuel.", "process"),
  "fuel-cell": line("fuel-cell", "Fuel Cell", "Receives liquid fuel and oxidizes it to generate electricity and recoverable water.", "process"),
  "trim-front": line("trim-front", "Trim Reservoir", "Stores fluid used to maintain fuel and electrolyte balance.", "process"),
  battery: line("battery", "Battery Cabinet", "Provides reserve power and supports stable system operation.", "process"),
  ems: line("ems", "SI/EMS Cabinet", "Monitors and manages TES system operations.", "process"),
  piping: line("piping", "Process Headers", "Distribute fuel, electrolyte, and other process fluids throughout the system.", "process"),
  "water-front": line("water-front", "Water Outlet Manifold", "Collects and routes recovered water.", "process"),
  "water-rear": line("water-rear", "Water Outlet Manifold", "Collects and routes recovered water.", "storage"),
  electrolyte: line("electrolyte", "Electrolyte Storage", "Stores electrolyte used to regenerate TES fuel.", "storage"),
  fuel: line("fuel", "Fuel Storage", "Stores aqueous fuel for electricity generation.", "storage"),
  "tank-frame": line("tank-frame", "Fuel Storage", "Stores aqueous fuel for electricity generation.", "storage"),
  "trim-rear": line("trim-rear", "Trim Reservoir", "Stores fluid used to maintain fuel and electrolyte balance.", "storage"),
  vessel: line("vessel", "Trinium Energy System", "Containerized power, fuel, and water recovery in one unit.", "storage"),
  lights: line("lights", "Container", "The enclosure that houses the TES equipment.", "both"),
  oxygen: line("oxygen", "Oxygen support", "Supports the oxygen path for the hubs.", "engineering"),
  thermal: line("thermal", "Thermal rejection", "Moves heat away from the hubs.", "engineering"),
  anolyte: line("anolyte", "ECR", "Electrochemical Reactor. Converts stored electrolyte into TES aqueous fuel.", "engineering"),
  condenser: line("condenser", "Water Outlet Manifold", "Collects and routes recovered water.", "engineering"),
  "carbon-skid": line("carbon-skid", "Electrolyte Storage", "Stores electrolyte used to regenerate TES fuel.", "engineering"),
};

export const FLOW_PARTS: Record<Exclude<FlowId, "off">, PartId[]> = {
  power: ["battery", "ems", "lights", "hub-1", "hub-2", "hub-3", "hub-4"],
  water: ["water-front", "water-rear", "condenser", "piping"],
  fuel: ["fuel", "piping", "hub-1", "hub-2", "hub-3", "hub-4", "trim-front", "fuel-cell"],
  carbon: ["electrolyte", "piping", "ecr"],
  oxygen: ["oxygen", "hub-1", "hub-2", "hub-3", "hub-4"],
  thermal: ["thermal", "lights", "condenser"],
};

export const PART_FLOW: Partial<Record<PartId, FlowId>> = {
  fuel: "fuel",
  "fuel-cell": "fuel",
  piping: "fuel",
  "trim-front": "fuel",
  "trim-rear": "fuel",
  "hub-1": "fuel",
  "hub-2": "fuel",
  "hub-3": "fuel",
  "hub-4": "fuel",
  ecr: "carbon",
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

export const UNIT_PARTS: PartId[] = [
  "overview",
  "shell",
  "hub-1",
  "hub-2",
  "hub-3",
  "hub-4",
  "ecr",
  "fuel-cell",
  "electrolyte",
  "fuel",
  "trim-front",
  "battery",
  "ems",
  "piping",
  "water-front",
];

export const ENGINEERING_PARTS: PartId[] = [];

export function sceneStats() {
  return "Select a component";
}

export const DOES: Record<PartId, string> = {
  overview: "Containerized power, fuel, and water recovery in one unit.",
  shell: "The enclosure that houses the TES equipment.",
  roof: "The enclosure that houses the TES equipment.",
  "hub-1": "Each independently managed hub contains an ECR and Fuel Cell.",
  "hub-2": "Each independently managed hub contains an ECR and Fuel Cell.",
  "hub-3": "Each independently managed hub contains an ECR and Fuel Cell.",
  "hub-4": "Each independently managed hub contains an ECR and Fuel Cell.",
  ecr: "Electrochemical Reactor. Converts stored electrolyte into TES aqueous fuel.",
  "fuel-cell": "Receives liquid fuel and oxidizes it to generate electricity and recoverable water.",
  "trim-front": "Stores fluid used to maintain fuel and electrolyte balance.",
  "trim-rear": "Stores fluid used to maintain fuel and electrolyte balance.",
  battery: "Provides reserve power and supports stable system operation.",
  ems: "Monitors and manages TES system operations.",
  piping: "Distribute fuel, electrolyte, and other process fluids throughout the system.",
  "water-front": "Collects and routes recovered water.",
  "water-rear": "Collects and routes recovered water.",
  electrolyte: "Stores electrolyte used to regenerate TES fuel.",
  fuel: "Stores aqueous fuel for electricity generation.",
  "tank-frame": "Stores aqueous fuel for electricity generation.",
  vessel: "Containerized power, fuel, and water recovery in one unit.",
  lights: "The enclosure that houses the TES equipment.",
  oxygen: "Supports the oxygen path for the hubs.",
  thermal: "Moves heat away from the hubs.",
  anolyte: "Electrochemical Reactor. Converts stored electrolyte into TES aqueous fuel.",
  condenser: "Collects and routes recovered water.",
  "carbon-skid": "Stores electrolyte used to regenerate TES fuel.",
};
