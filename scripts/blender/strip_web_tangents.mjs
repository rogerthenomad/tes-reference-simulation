// Three.js derives a tangent frame for normal-mapped meshes at runtime.
// Removing stored tangents keeps the 100-hub facility download manageable.
import { NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMaterialsEmissiveStrength, KHRMeshQuantization } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const [input, output] = process.argv.slice(2);
if (!input || !output || input === output) {
  throw new Error("Usage: node strip_web_tangents.mjs input.glb output.glb");
}
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization, KHRMaterialsEmissiveStrength])
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const document = await io.read(input);
let removed = 0;
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    if (!primitive.getAttribute("TANGENT")) continue;
    primitive.setAttribute("TANGENT", null);
    removed++;
  }
}
await io.write(output, document);
console.log(`Removed stored tangents from ${removed} mesh primitives.`);
