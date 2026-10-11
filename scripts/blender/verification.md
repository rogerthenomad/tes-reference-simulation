# Industrial graphics verification

Verified on 2026-10-11 using Blender 5.2.2 LTS and the repository's installed Three.js viewer.

- The original `TES_Reference_Model.blend` is unchanged; its SHA-256 is checked by the asset contract tests.
- The asset contract checks source preservation, embedded unit materials/selection metadata, and ten complete facility rows. Each facility row contains individually tagged hubs 1–10 with shared mesh buffers; the standard unit remains four hubs.
- The updated optimized facility GLB passes glTF validation with no errors. Its warnings concern unused texture coordinates and tangents on certain meshes.
- TypeScript checking, the production build, and linting of the modified viewer files pass.
- The 100-hub facility was rendered in Blender and visually inspected. Its overview JPEG is in `docs/previews/`.
- Both stacked storage hulls in every facility row were checked in Blender at the ten-bay edges, x = -16.34 m to +1.46 m (17.8 m total). The rear three-quarter render in `docs/previews/tes-facility-storage.jpg` shows the tanks continuing across all ten hubs. The standalone unit tanks were not lengthened.
- Desktop and mobile production browser checks load and render the unit without uncaught page errors. Full view, closed/cutaway/X-ray, and water/model flow controls were exercised.
- A development browser check loaded the new facility asset with no uncaught page errors. The default facility view now opens as a cutaway so the ten hubs per row are visible; the roof remains accessible through Closed.
- After the storage extension, a fresh local Chromium check loaded the optimized facility GLB to `data-asset-state="ready"` with no page errors. The glTF validator reported no errors; it notes that the viewer derives tangent space for normal-mapped facility meshes.

The native Blender scene and exported GLB were inspected for all ten numbered hubs in every row. The software-rendered headless browser is slower with the larger facility, so the Blender overview remains the clearest visual geometry check.

These assets are a visual reference with illustrative fabrication details. They do not establish validated process routing, pressure ratings, or construction specifications.
