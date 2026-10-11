"""Save a compact, single-scene editable facility after the heavy web export."""
import json
from pathlib import Path

import bpy

root = Path(__file__).resolve().parents[2]
native = root / 'attachments/TES_Industrial_Facility_10_Rows.blend'
bpy.ops.wm.open_mainfile(filepath=str(native), use_scripts=False)
facility = bpy.data.scenes['TES - Industrial Facility - 10 Rows']
for scene in list(bpy.data.scenes):
    if scene != facility:
        bpy.data.scenes.remove(scene)
bpy.context.window.scene = facility
for _ in range(3):
    bpy.ops.outliner.orphans_purge(do_recursive=False)
bpy.ops.wm.save_as_mainfile(filepath=str(native), compress=True)

report_file = root / 'scripts/blender/asset-report.json'
report = json.loads(report_file.read_text())
report['files']['attachments/TES_Industrial_Facility_10_Rows.blend'] = native.stat().st_size
report_file.write_text(json.dumps(report, indent=2) + '\n')
print('INDUSTRIAL_BUILD_COMPLETE', native.stat().st_size, flush=True)
