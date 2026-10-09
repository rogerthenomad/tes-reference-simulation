export type SceneId = "unit" | "facility" | "teardown";
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
  | "carbon-skid"
  | "stack"
  | "bank"
  | "water-zone"
  | "power-zone"
  | "control-room";

export type PartInfo = {
  id: PartId;
  title: string;
  body: string;
  wall: "process" | "storage" | "both" | "engineering" | "facility";
};

export const PARTS: Record<PartId, PartInfo> = {
  overview: {
    id: "overview",
    title: "Trinium Energy System",
    body: "Forty-foot container reference. Four front hubs, shared electrolyte and fuel storage on the back, dual water manifolds, and the AI/EMS cabinet. Geometry is the visual reconstruction in the Blender reference, not a fabrication drawing.",
    wall: "both",
  },
  shell: {
    id: "shell",
    title: "Container shell",
    body: "ISO-style 40 ft envelope. Length 12.192 m from the caption. Height 3.80 m keeps the concept aspect. Depth 2.438 m is the standard container width used for this reconstruction.",
    wall: "both",
  },
  roof: {
    id: "roof",
    title: "Roof and top rails",
    body: "Corrugated roof, top side rails, and upper corner castings. Open the roof for a cutaway, or leave it closed.",
    wall: "both",
  },
  "hub-1": hub(1),
  "hub-2": hub(2),
  "hub-3": hub(3),
  "hub-4": hub(4),
  "trim-front": {
    id: "trim-front",
    title: "Front trim reservoir",
    body: "Front-bay trim reservoir with lid, inlet, and vent. It sits between hub 4 and the battery cabinet on the process wall.",
    wall: "process",
  },
  battery: {
    id: "battery",
    title: "Battery cabinet",
    body: "Front battery cabinet with seal, louvres, and top vent. Illustrative buffer on the power path between the hubs and the site connection.",
    wall: "process",
  },
  ems: {
    id: "ems",
    title: "AI / EMS cabinet",
    body: "Energy management cabinet with door, hinges, handle, and the HMI status screen. This is the operator face of the unit.",
    wall: "process",
  },
  piping: {
    id: "piping",
    title: "Process headers",
    body: "Front headers: safety-orange supply, cobalt return, and a stainless utility line, clamped along the bay.",
    wall: "process",
  },
  "water-front": {
    id: "water-front",
    title: "Front water manifold",
    body: "Water outlet manifold on the process face. Six valved branches, flanges, and a flow arrow. Illustrative recoverable-water takeoff.",
    wall: "process",
  },
  "water-rear": {
    id: "water-rear",
    title: "Rear water manifold",
    body: "Matching water outlet manifold on the storage face, with the same branch and shutoff pattern.",
    wall: "storage",
  },
  electrolyte: {
    id: "electrolyte",
    title: "Electrolyte storage tank",
    body: "Long upper tank on the storage wall, panel seams, mounting lugs, and port flanges. Holds the carbon-bearing working fluid in this reference.",
    wall: "storage",
  },
  fuel: {
    id: "fuel",
    title: "Fuel storage tank",
    body: "Lower long tank under the electrolyte vessel. Same seam and lug pattern. Fuel path starts here.",
    wall: "storage",
  },
  "tank-frame": {
    id: "tank-frame",
    title: "Tank frame",
    body: "Uprights and ties that carry the two storage tanks off the floor.",
    wall: "storage",
  },
  "trim-rear": {
    id: "trim-rear",
    title: "Rear trim reservoir",
    body: "Trim reservoir on the storage side, with lid, inlet, and top vent tied into the rear stainless run.",
    wall: "storage",
  },
  vessel: {
    id: "vessel",
    title: "Rear service vessel",
    body: "Vertical stainless vessel, end caps, lower return, orange supply, blue return, and service risers behind the tanks.",
    wall: "storage",
  },
  lights: {
    id: "lights",
    title: "Inspection lights",
    body: "Warm-white housings along both sides of the ceiling. They mark the bay; they are not the thermal-rejection system.",
    wall: "both",
  },
  oxygen: {
    id: "oxygen",
    title: "Oxygen support",
    body: "Engineering view only. Roof-level oxygen support skid. Not in the concept sheet; shown so the support path can be discussed.",
    wall: "engineering",
  },
  thermal: {
    id: "thermal",
    title: "Thermal rejection",
    body: "Engineering view only. Roof radiator for heat leaving the hubs. Illustrative, not a sized exchanger.",
    wall: "engineering",
  },
  anolyte: {
    id: "anolyte",
    title: "Anolyte loop",
    body: "Engineering view only. Dedicated anolyte vessel and short loop at hub 1. Hidden in the DOE view.",
    wall: "engineering",
  },
  condenser: {
    id: "condenser",
    title: "Water recovery",
    body: "Engineering view only. Condenser / water-recovery package near the front trim line.",
    wall: "engineering",
  },
  "carbon-skid": {
    id: "carbon-skid",
    title: "Carbon takeoff",
    body: "Engineering view only. Small product skid beside the EMS cabinet for the carbon-bearing liquid path.",
    wall: "engineering",
  },
  stack: {
    id: "stack",
    title: "Representative stack",
    body: "Break-apart of hub 1 plus an illustrative plate stack: end plates, fields, membrane, and the control board. Internal plate count is not taken from the Blender shell.",
    wall: "process",
  },
  bank: {
    id: "bank",
    title: "Hub bank",
    body: "One bank of ten hub bays. Eight banks is the illustrative 4 MW yard. Each bay stands in for the four-hub container block.",
    wall: "facility",
  },
  "water-zone": {
    id: "water-zone",
    title: "Water zone",
    body: "Shared water handling at the end of the yard: tanks, manifold rack, and a truck apron.",
    wall: "facility",
  },
  "power-zone": {
    id: "power-zone",
    title: "Power zone",
    body: "Switchgear and transformer pad where the banks land on the site electrical connection.",
    wall: "facility",
  },
  "control-room": {
    id: "control-room",
    title: "Operations",
    body: "Operations room for the EMS fleet view. Illustrative building, not an architectural drawing.",
    wall: "facility",
  },
};

function hub(n: number): PartInfo {
  return {
    id: `hub-${n}` as PartId,
    title: `Hub ${n}`,
    body: "ECR over a graphite DFFC housing, on a perforated rack with stainless risers, orange supply, and blue return. One of four identical front hubs.",
    wall: "process",
  };
}

export const FLOW_PARTS: Record<Exclude<FlowId, "off">, PartId[]> = {
  power: ["battery", "ems", "lights"],
  water: ["water-front", "water-rear", "condenser"],
  fuel: ["fuel"],
  carbon: ["electrolyte", "carbon-skid"],
  oxygen: ["oxygen"],
  thermal: ["thermal", "lights", "condenser"],
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

export const SCENES: { id: SceneId; label: string; title: string; to: "/" | "/facility" | "/teardown" }[] = [
  { id: "unit", label: "Unit", title: "40-foot TES", to: "/" },
  { id: "facility", label: "Facility", title: "Eight-bank yard", to: "/facility" },
  { id: "teardown", label: "Teardown", title: "Hub break-apart", to: "/teardown" },
];

export const VIEWS: Record<SceneId, { id: ViewId; label: string }[]> = {
  unit: [
    { id: "front", label: "Front" },
    { id: "back", label: "Back" },
    { id: "iso", label: "Full" },
    { id: "top", label: "Top" },
    { id: "end", label: "End" },
    { id: "utility", label: "Utility" },
  ],
  facility: [
    { id: "iso", label: "Yard" },
    { id: "front", label: "Facade" },
    { id: "top", label: "Top" },
    { id: "end", label: "End" },
  ],
  teardown: [
    { id: "front", label: "Front" },
    { id: "iso", label: "Three-quarter" },
    { id: "top", label: "Top" },
  ],
};

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
  "trim-front",
  "battery",
  "ems",
  "piping",
  "water-front",
  "electrolyte",
  "fuel",
  "trim-rear",
  "vessel",
  "water-rear",
  "lights",
];

export const ENGINEERING_PARTS: PartId[] = ["anolyte", "oxygen", "thermal", "condenser", "carbon-skid"];

export function sceneStats(scene: SceneId) {
  if (scene === "facility") return "Eight banks · ten hubs each · illustrative 4 MW";
  if (scene === "teardown") return "Hub 1 · ECR and DFFC · representative plates";
  return "150–200 kW · 350–400 gal/day · illustrative";
}
