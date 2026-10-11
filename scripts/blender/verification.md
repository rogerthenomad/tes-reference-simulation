# Industrial graphics verification

Verified on 2026-10-11 using Blender 5.2.2 LTS and the repository's installed Three.js viewer.

- The original `TES_Reference_Model.blend` is unchanged; its SHA-256 is checked by the asset contract tests.
- Three asset contract tests pass: source preservation, embedded unit materials/selection metadata, and ten complete facility rows with shared mesh buffers.
- Both optimized GLBs pass glTF validation with no errors or warnings.
- TypeScript checking, the production build, and linting of the modified viewer files pass.
- The upgraded unit, final ten-row facility, and facility close-up were rendered in Blender and visually inspected. Preview JPEGs are in `docs/previews/`.
- Desktop and mobile production browser checks load and render the unit without uncaught page errors. Full view, closed/cutaway/X-ray, and water/model flow controls were exercised.
- Development browser checks load the facility and exercise scene, camera, shell, and flow controls. The graphics context remains valid. Renderer statistics show 170 draw calls and 3,212,092 triangles for the closed facility; repeated row geometry is instanced.

The software-rendered headless browser times out when capturing a facility screenshot, so facility browser visual parity is not fully verified. The final native Blender overview and detail renders provide visual evidence of the asset geometry. The existing external font and platform-branding requests are unavailable in this test environment; their URLs and application integration are retained.

These assets are a visual reference with illustrative fabrication details. They do not establish validated process routing, pressure ratings, or construction specifications.
