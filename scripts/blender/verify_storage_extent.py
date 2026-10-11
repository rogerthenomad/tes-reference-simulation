"""Check that both facility storage vessels span the complete ten-hub width."""
from pathlib import Path
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(
    filepath=str(root / 'attachments/TES_Industrial_Facility_10_Rows.blend'),
    use_scripts=False,
)
scene = bpy.data.scenes['TES - Industrial Facility - 10 Rows']
rows = sorted((o for o in scene.objects if o.get('row_index')), key=lambda o: o['row_index'])
assert len(rows) == 10
left, right = -16.34, 1.46
for row in rows:
    assert row['tank_length_m'] == 17.8
    for name in ('REAR_Fuel_Tank', 'REAR_Electrolyte_Tank'):
        hull = next(o for o in row.children if o.name.startswith(name))
        world_x = [(hull.matrix_world @ Vector(corner)).x for corner in hull.bound_box]
        assert abs(min(world_x) - left) < .025, (row.name, name, min(world_x))
        assert abs(max(world_x) - right) < .025, (row.name, name, max(world_x))
print('Verified ten rows: both tanks span 17.8 m, hub 1 through hub 10.')
