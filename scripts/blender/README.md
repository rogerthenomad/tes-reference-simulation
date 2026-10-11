# TES industrial asset workflow

The viewer now loads evaluated Blender geometry instead of reconstructing the equipment from simplified boxes and cylinders.

## Editable assets

- `attachments/TES_Industrial_Unit.blend`: the original TES unit, with fabrication and connection detail added.
- `attachments/TES_Industrial_Facility_10_Rows.blend`: the repository's ten-row facility, using four existing TES hubs per row, with water handling, electrical cabinets, operations, structural steel, and anchored row skids.
- `attachments/TES_Reference_Model.blend`: preserved original source.

The native files contain packed steel/paint normal and roughness maps. The upgraded materials distinguish stainless steel, galvanized frames, coated steel, rubber seals, brass fittings, and bright fasteners. Added assemblies include hollow flange pairs, gasket seams, studs with washers and hex heads, isolation valves, dial gauges, pipe clamps, skid anchors, cabinet hinges/vents/glands, and protected conduit.

The original TES dimensions and major equipment arrangement are retained. Connection detail is a visual reference rather than a validated fabrication or process drawing.

## Previews and review

![TES unit](../../docs/previews/tes-unit-industrial.jpg)

![Ten-row facility](../../docs/previews/tes-facility-industrial.jpg)

![Mechanical detail](../../docs/previews/tes-facility-detail.jpg)

See [verification.md](verification.md) for the completed checks and browser rendering limitations.

## Regenerate

Use Blender 5.2 LTS with this repository as the working directory:

```sh
blender --background --python scripts/blender/upgrade_industrial.py
```

Add `-- --render` for the unit, facility overview, and production detail renders. Python with the `bpy` 5.2 module also runs the script directly. Native files are written into `attachments/`; uncompressed exports are written into `public/`; temporary textures/renders are written into the ignored `artifacts/industrial/` directory.

Compress the web exports using glTF Transform 4.5.1:

```sh
npx --yes @gltf-transform/cli@4.5.1 meshopt public/tes-unit.glb artifacts/industrial/tes-unit-optimized.glb --quantize-position 16 --quantize-normal 12 --quantize-texcoord 16
npx --yes @gltf-transform/cli@4.5.1 meshopt public/facility.glb artifacts/industrial/facility-optimized.glb --quantize-position 16 --quantize-normal 12 --quantize-texcoord 16
cp artifacts/industrial/tes-unit-optimized.glb public/tes-unit.glb
cp artifacts/industrial/facility-optimized.glb public/facility.glb
```

The viewer includes the Meshopt decoder. Exports retain selectable part metadata, smooth/hard normals, tangents, image maps, and UVs. Unit meshes are evaluated and grouped by part/material; facility rows reference the same mesh data. UV coordinates intentionally repeat outside the unit square, so the compressor leaves those UVs at full precision.

## Verify

```sh
node --test scripts/blender/asset-contract.test.mjs
npm run typecheck
npm run build
npx --yes @gltf-transform/cli@4.5.1 validate public/tes-unit.glb
npx --yes @gltf-transform/cli@4.5.1 validate public/facility.glb
```

The asset checks protect the original source, require embedded PBR maps and selection tags, and verify ten complete rows with shared mesh data. Browser QA must also inspect the unit/facility on desktop and mobile and exercise component selection, camera views, cutaway/closed/X-ray, flow highlighting, and scene switching.
