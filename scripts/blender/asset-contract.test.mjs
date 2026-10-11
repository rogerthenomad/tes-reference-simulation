import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
function readAsset(name) {
  const bytes = readFileSync(new URL(`public/${name}`, root));
  assert.equal(bytes.toString("ascii", 0, 4), "glTF", "must be a real GLB, not a placeholder");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString("utf8", 20, 20 + length));
  return { bytes, json };
}

test("the original TES Blender source is preserved", () => {
  const source = readFileSync(new URL("attachments/TES_Reference_Model.blend", root));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "b8c94f6d864500f2c465b14c3b024942fe6290091740fd4060e86059998553bc",
  );
});

test("unit export contains selectable TES components and embedded steel textures", () => {
  const { bytes, json } = readAsset("tes-unit.glb");
  assert.ok(bytes.length < 6_000_000, "unit download budget");
  const components = new Set(json.nodes.map((node) => node.extras?.component_part));
  for (const part of [
    "hub-1",
    "hub-4",
    "ecr",
    "fuel-cell",
    "battery",
    "ems",
    "fuel",
    "electrolyte",
    "roof",
  ]) {
    assert.ok(components.has(part), `missing selection metadata: ${part}`);
  }
  assert.ok(json.extensionsRequired.includes("EXT_meshopt_compression"));
  assert.ok(json.images.length >= 4);
  assert.ok(
    json.images.every((image) => Number.isInteger(image.bufferView) && !image.uri),
    "maps must be self-contained",
  );
  const steel = json.materials.find((material) => material.name === "Brushed stainless steel");
  assert.ok(steel.pbrMetallicRoughness.metallicFactor > 0.85);
  assert.ok(steel.normalTexture && steel.pbrMetallicRoughness.metallicRoughnessTexture);
});

test("facility retains ten complete rows and reuses the unit mesh data", () => {
  const { bytes, json } = readAsset("facility.glb");
  assert.ok(bytes.length < 20_000_000, "facility download budget");
  const rows = json.nodes.filter((node) => node.extras?.row_index);
  assert.equal(rows.length, 10);
  assert.deepEqual(
    rows.map((row) => row.extras.row_index).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  for (const row of rows) {
    const parts = new Set(row.children.map((index) => json.nodes[index].extras?.component_part));
    for (const part of [...Array.from({ length: 10 }, (_, index) => `hub-${index + 1}`), "battery", "ems", "fuel", "electrolyte"])
      assert.ok(parts.has(part));
    assert.ok(!parts.has("shell") && !parts.has("roof"), "rows are open equipment assemblies");
  }
  const references = json.nodes.filter((node) => node.mesh !== undefined).map((node) => node.mesh);
  assert.ok(
    new Set(references).size < references.length / 5,
    "repeated equipment must share geometry",
  );
  const parts = new Set(json.nodes.map((node) => node.extras?.part));
  for (const part of ["rows", "water-handling", "power-collection", "operations", "roof"])
    assert.ok(parts.has(part));
});
