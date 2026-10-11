"""Upgrade the repository TES source and build its existing ten-row facility.

Run with Blender 5.2 (background --python), or Python with bpy 5.2 installed.
All dimensions are meters. Connections are illustrative, not fabrication data.
The original source remains at attachments/TES_Reference_Model.blend.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--render', action='store_true')
ARGS = PARSER.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
OUT = ROOT / 'artifacts' / 'industrial'
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC = ROOT / 'public'
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'attachments/TES_Reference_Model.blend'), use_scripts=False)
UNIT = bpy.context.scene
UNIT.name = 'TES - Industrial Unit'
SCENE = UNIT
CURRENT = None
PART = 'piping'
GEOMETRY = {}


def collection(name, scene=None):
    c = bpy.data.collections.new(name)
    (scene or SCENE).collection.children.link(c)
    return c


def part_for(o):
    n = o.name
    if o.get('part'):
        return o['part']
    if n.startswith('HUB_'):
        return 'hub-' + n.split('_')[1]
    if 'Container' in ' '.join(c.name for c in o.users_collection):
        return 'roof' if o.location.z > 3.55 else 'shell'
    checks = [('Battery', 'battery'), ('EMS', 'ems'), ('Electrolyte', 'electrolyte'),
              ('Fuel_', 'fuel'), ('FRONT_Trim', 'trim-front'), ('REAR_Trim', 'trim-rear'),
              ('Tank_frame', 'tank-frame'), ('Tank_support', 'tank-frame'),
              ('Tank_cradle', 'tank-frame'), ('REAR_Vessel', 'vessel')]
    for fragment, part in checks:
        if fragment.lower() in n.lower():
            return part
    cols = ' '.join(c.name for c in o.users_collection)
    if 'Water_Manifolds' in cols:
        return 'water-rear' if 'REAR' in n or o.location.y > 0 else 'water-front'
    if 'Fixtures' in cols:
        return 'lights'
    if 'Back_Storage' in cols:
        return 'fuel' if o.location.z < 1.8 else 'electrolyte'
    if 'Back_Service' in cols:
        return 'vessel'
    if 'Front_Service' in cols:
        return 'trim-front'
    return 'piping'


def put(o, part=None):
    CURRENT.objects.link(o)
    o['part'] = part or PART
    o['industrial_detail'] = True
    return o


def material(name, rgb, metallic=0, rough=.4):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes.clear()
    p = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = rough
    out = m.node_tree.nodes.new('ShaderNodeOutputMaterial')
    m.node_tree.links.new(p.outputs['BSDF'], out.inputs['Surface'])
    m.diffuse_color = (*rgb, 1)
    m.use_backface_culling = True
    return m


def texture_image(name, arr):
    h, w, _ = arr.shape
    image = bpy.data.images.new(name, width=w, height=h, alpha=True)
    image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(arr.astype(np.float32).ravel())
    image.filepath_raw = str(OUT / (name + '.png'))
    image.file_format = 'PNG'
    image.save()
    image.pack()
    return image


def surface(m, kind, rough=.4):
    """Image-based UV maps survive glTF export, unlike procedural shader noise."""
    size = 256
    rng = np.random.default_rng(41 if kind == 'steel' else 73)
    yy, xx = np.mgrid[:size, :size]
    noise = rng.normal(0, .015, (size, size))
    grain = .022 * np.sin(yy * 2.1) + .009 * np.sin(yy * 5.3) if kind == 'steel' else noise
    height = grain + noise * .3
    gy, gx = np.gradient(height)
    normal = np.ones((size, size, 4))
    normal[:, :, 0] = .5 - gx * .16
    normal[:, :, 1] = .5 - gy * .16
    normal[:, :, 2] = 1
    orm = np.ones((size, size, 4))
    orm[:, :, 1] = np.clip(rough + grain * 1.8 + noise, .1, .8)
    orm[:, :, 2] = 1
    maps = (texture_image('TES_' + kind + '_normal', normal), texture_image('TES_' + kind + '_roughness', orm))
    return maps


def attach_maps(m, maps):
    ns, links = m.node_tree.nodes, m.node_tree.links
    p = next(n for n in ns if n.type == 'BSDF_PRINCIPLED')
    n = ns.new('ShaderNodeTexImage'); n.image = maps[0]
    norm = ns.new('ShaderNodeNormalMap'); norm.inputs['Strength'].default_value = .22
    links.new(n.outputs['Color'], norm.inputs['Color'])
    links.new(norm.outputs['Normal'], p.inputs['Normal'])
    r = ns.new('ShaderNodeTexImage'); r.image = maps[1]
    sep = ns.new('ShaderNodeSeparateColor'); sep.mode = 'RGB'
    links.new(r.outputs['Color'], sep.inputs['Color'])
    links.new(sep.outputs['Green'], p.inputs['Roughness'])


STEEL = material('Brushed stainless steel', (.43, .47, .50), .92, .32)
FASTENER = material('Bright fasteners', (.56, .60, .63), .96, .25)
GALV = material('Galvanized service partition', (.32, .37, .40), .78, .43)
PAINT = material('Powder-coated light gray', (.64, .69, .72), .18, .4)
DARK = material('Graphite DFFC housings', (.034, .046, .058), .35, .42)
RUBBER = material('Recesses and rubber seals', (.009, .013, .017), 0, .72)
BLUE = bpy.data.materials['Cobalt blue process pipe']
ORANGE = bpy.data.materials['Safety orange process pipe']
BRASS = bpy.data.materials['Brass valve bodies']
WHITE = bpy.data.materials['Label white']
NAVY = bpy.data.materials['TES navy lettering']
YELLOW = material('Safety yellow powder coat', (.87, .48, .01), .15, .44)
CONCRETE = material('Facility concrete', (.40, .43, .46), .02, .85)
GLASS = material('Operations glazing', (.23, .37, .43), 0, .15)
GLASS.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value = .35
GLASS.surface_render_method = 'DITHERED'
steel_maps = surface(STEEL, 'steel', .34)
paint_maps = surface(PAINT, 'paint', .42)
for m in [STEEL, FASTENER, GALV]:
    attach_maps(m, steel_maps)
for m in [PAINT, DARK]:
    attach_maps(m, paint_maps)


def uv_mesh(me):
    if me.uv_layers:
        return
    uv = me.uv_layers.new(name='IndustrialUV')
    me.update()
    for face in me.polygons:
        axis = max(range(3), key=lambda i: abs(face.normal[i]))
        dims = [i for i in range(3) if i != axis]
        for loop in face.loop_indices:
            v = me.vertices[me.loops[loop].vertex_index].co
            uv.data[loop].uv = (v[dims[0]] * 1.6, v[dims[1]] * 1.6)


def mesh_object(name, verts, faces, mat, smooth=False):
    me = bpy.data.meshes.new(name + '_mesh')
    me.from_pydata(verts, [], faces); me.materials.append(mat); me.update()
    for p in me.polygons:
        p.use_smooth = smooth and len(p.vertices) == 4
    uv_mesh(me)
    return me


def box(name, p, dims, mat=STEEL, bevel=.005):
    key = ('box', tuple(dims), mat.name, bevel)
    me = GEOMETRY.get(key)
    if me is None:
        x, y, z = [d / 2 for d in dims]
        vs = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
        fs = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        me = mesh_object(name, vs, fs, mat); GEOMETRY[key] = me
    o = put(bpy.data.objects.new(name, me)); o.location = p
    if bevel:
        b = o.modifiers.new('Fabricated edge radius', 'BEVEL'); b.width = min(bevel, min(dims) * .25); b.segments = 2
        o.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return o


def cyl(name, a, b, r, mat=STEEL, n=24):
    a, b = Vector(a), Vector(b); d = b - a
    key = ('cyl', r, round(d.length, 6), mat.name, n)
    me = GEOMETRY.get(key)
    if me is None:
        vs = [(r*math.cos(i*math.tau/n), r*math.sin(i*math.tau/n), z) for z in [-d.length/2, d.length/2] for i in range(n)]
        fs = [tuple(reversed(range(n))), tuple(range(n,2*n))] + [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        me = mesh_object(name, vs, fs, mat, True); GEOMETRY[key] = me
    o = put(bpy.data.objects.new(name, me)); o.location = (a+b)/2
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z','Y')
    return o


def basis(axis):
    a = Vector(axis).normalized()
    u = a.cross(Vector((0,0,1)) if abs(a.z) < .9 else Vector((0,1,0))).normalized()
    return a, u, a.cross(u)


def ring(name, p, axis, outer, inner, thickness, mat=STEEL, n=32):
    """Hollow ring, including visible pipe wall thickness and gasket seams."""
    key = ('ring', outer, inner, thickness, mat.name, n)
    me = GEOMETRY.get(key)
    if me is None:
        vs = [(r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z) for z in [-thickness/2,thickness/2] for r in [outer,inner] for i in range(n)]
        fs = []
        for i in range(n):
            j = (i+1)%n
            fs += [(i,j,2*n+j,2*n+i),(n+j,n+i,3*n+i,3*n+j),(j,i,n+i,n+j),(2*n+i,2*n+j,3*n+j,3*n+i)]
        me = mesh_object(name, vs, fs, mat, True); GEOMETRY[key] = me
    o = put(bpy.data.objects.new(name,me)); o.location=p
    o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector(axis).to_track_quat('Z','Y')
    return o


def bolt(name, p, axis, r=.013, length=.075):
    p=Vector(p); a=Vector(axis).normalized()
    cyl(name+'_stud',p-a*length/2,p+a*length/2,r*.55,FASTENER,12)
    for sign in [-1,1]:
        q=p+a*length/2*sign
        ring(name+'_washer',q,a,r*1.5,r*.58,.006,FASTENER,16)
        cyl(name+'_hex',q+a*.004*sign,q+a*.019*sign,r,FASTENER,6)


def flange(name,p,axis,r=.12,bore=.042):
    p=Vector(p);a,u,v=basis(axis)
    ring(name+'_gasket',p,a,r*.93,bore,.007,RUBBER)
    for sign in [-1,1]:
        ring(name+'_flange',p+a*.023*sign,a,r,bore,.036,STEEL)
        ring(name+'_weld_neck',p+a*.052*sign,a,bore*1.45,bore,.023,STEEL)
    for i in range(8):
        ang=i*math.tau/8
        bolt(name+'_M16',p+r*.78*(math.cos(ang)*u+math.sin(ang)*v),a,r*.12,.094)


def pipe(name, points, r=.04, mat=STEEL, bend=.12):
    pts=[Vector(p) for p in points];path=[pts[0]]
    for i in range(1,len(pts)-1):
        a,b,c=pts[i-1:i+2];v=a-b;w=c-b
        if min(v.length,w.length)<.0001:continue
        d=min(bend,v.length*.4,w.length*.4);a=b+v.normalized()*d;c=b+w.normalized()*d
        path.append(a)
        for j in range(1,9):
            t=j/8;path.append((1-t)**2*a+2*t*(1-t)*b+t*t*c)
    path.append(pts[-1]); sides=24;vs=[]
    for i,p in enumerate(path):
        axis=(path[min(i+1,len(path)-1)]-path[max(i-1,0)]).normalized();a,u,v=basis(axis)
        for j in range(sides):
            t=j*math.tau/sides;vs.append(p+r*(u*math.cos(t)+v*math.sin(t)))
    fs=[(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(len(path)-1) for j in range(sides)]
    fs.extend([tuple(reversed(range(sides))),tuple((len(path)-1)*sides+j for j in range(sides))])
    return put(bpy.data.objects.new(name,mesh_object(name,vs,fs,mat,True)))


def valve(name,p,axis=(1,0,0),r=.045):
    p=Vector(p);a=Vector(axis).normalized()
    cyl(name+'_body',p-a*.14,p+a*.14,r*1.6)
    flange(name+'_inlet',p-a*.17,a,r*2.8,r)
    flange(name+'_outlet',p+a*.17,a,r*2.8,r)
    cyl(name+'_bonnet',p+Vector((0,0,r)),p+Vector((0,0,.19)),r*.7,BRASS)
    cyl(name+'_stem',p+Vector((0,0,.19)),p+Vector((0,0,.26)),.014,FASTENER)
    box(name+'_lever',p+Vector((.10,0,.27)),(.30,.045,.028),BLUE)


def gauge(name,p,r=.078):
    p=Vector(p)
    cyl(name+'_tap',p-Vector((0,0,.22)),p-Vector((0,0,.055)),.018,BRASS)
    cyl(name+'_case',p+Vector((0,.025,0)),p-Vector((0,.025,0)),r,STEEL,40)
    ring(name+'_bezel',p-Vector((0,.028,0)),(0,-1,0),r,r*.84,.016,FASTENER,40)
    cyl(name+'_dial',p-Vector((0,.027,0)),p-Vector((0,.034,0)),r*.84,WHITE,40)
    for i in range(25):
        a=math.radians(-130+i*260/24)
        q=p+Vector((math.sin(a)*r*.67,-.038,math.cos(a)*r*.67))
        t=box(name+'_tick',q,(.0025,.003,.014 if i%4==0 else .008),DARK,0);t.rotation_euler.y=a
    needle=box(name+'_pointer',p+Vector((.009,-.042,.022)),(.003,.004,r*.70),ORANGE,0)
    needle.rotation_euler.y=.35
    cyl(name+'_pivot',p-Vector((0,.043,0)),p-Vector((0,.047,0)),.008,DARK,16)


def clamp(name,p,axis,r=.045):
    p=Vector(p)
    ring(name+'_rubber',p,axis,r+.004,r-.001,.036,RUBBER)
    ring(name+'_band',p,axis,r+.012,r+.004,.025,STEEL)
    q=p+Vector((0,.07,0))
    box(name+'_bracket',q,(.12,.09,.07),GALV)
    bolt(name+'_anchor',q+Vector((0,-.05,0)),(0,-1,0),.012,.055)


def cabinet_details(name,x,y,z,w,h,d):
    box(name+'_door_seal',(x,y-d/2-.016,z),(w*.90,.018,h*.9),RUBBER)
    box(name+'_door',(x,y-d/2-.031,z),(w*.86,.022,h*.87),PAINT)
    for dz in [-h*.30,h*.30]:
        box(name+'_hinge',(x-w*.43,y-d/2-.055,z+dz),(.045,.045,.13),FASTENER)
    box(name+'_handle',(x+w*.33,y-d/2-.072,z),(.03,.045,.20),DARK)
    for i in range(12):
        box(name+'_vent',(x,y-d/2-.05,z-h*.27+i*.016),(w*.48,.025,.008),GALV,.001)
    for dx in [-w*.37,w*.37]:
        for dz in [-h*.4,h*.4]:bolt(name+'_panel_fastener',(x+dx,y-d/2-.045,z+dz),(0,-1,0),.009,.032)
    for dx in [-w*.27,w*.27]:
        p=Vector((x+dx,y,z-h/2))
        cyl(name+'_gland',p,p-Vector((0,0,.075)),.032,GALV,12)
        pipe(name+'_conduit',[p-Vector((0,0,.075)),p-Vector((0,0,.24)),(x+dx,y+d/2+.13,.3)],.025,RUBBER)


# Preserve source positions and semantics before adding surface/fabrication detail.
for o in UNIT.objects:
    if o.type in ['MESH','FONT'] and not any(c.name=='90_Studio' for c in o.users_collection):
        o['part']=part_for(o)
        if o.type=='MESH':uv_mesh(o.data)
CURRENT=collection('09_Industrial_Fabrication_Detail')
for i,x in enumerate([-4.77,-2.99,-1.21,.57],1):
    PART='hub-'+str(i);prefix='Industrial_HUB_'+str(i)
    pipe(prefix+'_upper_service_line',[(x-.70,-.90,3.26),(x-.70,-1.15,3.26),(x-.62,-1.15,3.13),(x+.62,-1.15,3.13),(x+.70,-1.15,3.26),(x+.70,-.90,3.26)],.043)
    valve(prefix+'_isolation_valve',(x-.16,-1.15,3.13))
    gauge(prefix+'_pressure',(x+.46,-1.15,3.35))
    for dx in [-.62,.62]:
        clamp(prefix+'_upper_clamp',(x+dx,-1.15,3.13),(1,0,0),.043)
        box(prefix+'_rack_base',(x+dx,-.62,.32),(.24,.85,.048),GALV)
        for dy in [-.32,.32]:bolt(prefix+'_foundation_bolt',(x+dx,-.62+dy,.35),(0,0,1),.018,.08)
        for z in [.70,1.8,2.96]:
            clamp(prefix+'_riser_support',(x+dx,-.90,z),(0,0,1),.033)
    for dz in [.85,1.02,1.19,1.36,1.53]:
        box(prefix+'_stack_edge',(x+.64,-.62,dz),(.027,.60,.018),STEEL,.003)
    for j in range(8):
        box(prefix+'_motor_fin',(x-.65,-.68+j*.018,1.0),(.19,.008,.15),GALV,.002)
    pipe(prefix+'_protected_wiring',[(x+.78,-.34,.60),(x+.78,-.34,3.20),(x+.40,-.34,3.20)],.018,RUBBER)
    for z in [.65,1.7,2.8]:
        box(prefix+'_cable_clip',(x+.78,-.34,z),(.065,.045,.032),STEEL)
    for dx in [-.54,.54]:
        flange(prefix+'_fuel_cell_port',(x+dx,-.65,.60),(0,0,1),.082,.043)

PART='piping'
for x in [-5.1,-3.4,-1.6,.2,1.9]:
    flange('Process_header_union',(x,-.98,3.515),(1,0,0),.067,.025)
    clamp('Process_header_support',(x+.12,-.98,3.515),(1,0,0),.025)
for side in [-1,1]:
    PART='water-front' if side<0 else 'water-rear'
    y=side*1.09
    for x in [-4.6,-2.8,-1.0,.8]:
        flange('Water_manifold_service_joint',(x,y,.48),(1,0,0),.088,.034)

PART='ems'
for x in [4.72,5.0,5.28]:
    cyl('EMS_cable_gland',(x,-.5,.83),(x,-.5,.72),.027,GALV,12)
    pipe('EMS_protected_cable',[(x,-.5,.72),(x,-.5,.38),(x-1,-.25,.38)],.021,RUBBER)
for part,z in [('electrolyte',2.57),('fuel',.99)]:
    PART=part
    for x in [-2.5,-.6,1.3,3.2,5.1]:
        box('Storage_fabrication_seam',(x,1.072,z),(.009,.009,1.08),STEEL,.002)
    for x in [-2.0,2.7]:
        flange('Storage_inspection_flange',(x,1.09,z),(0,1,0),.12,.045)
        cyl('Storage_inspection_cover',(x,1.105,z),(x,1.16,z),.045,STEEL)

# Canonical source stays intact; deliver an editable upgraded unit.
UNIT['visual_scope']='Original TES structure retained. Added illustrative fabrication/connection detail.'
UNIT['industrial_revision']=1
UNIT.unit_settings.system='METRIC'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'attachments/TES_Industrial_Unit.blend'),compress=True)


def merge_export(scene, source_objects, prefix):
    """Evaluate bevels/normals once, batch by selectable part + material."""
    bpy.context.window.scene=scene
    deps=bpy.context.evaluated_depsgraph_get();buckets=collections.defaultdict(list)
    for o in source_objects:
        if o.type not in ['MESH','FONT'] or o.hide_render:continue
        e=o.evaluated_get(deps);me=e.to_mesh(preserve_all_data_layers=True,depsgraph=deps)
        if me is None:continue
        me.calc_loop_triangles()
        for tri in me.loop_triangles:
            mat=me.materials[tri.material_index] if me.materials else PAINT
            component=o.get('component_part') or ('ecr' if 'ECR' in o.name else 'fuel-cell' if 'DFFC' in o.name else o.get('part','piping'))
            key=(o.get('part','piping'),mat.name,component)
            uv=me.uv_layers.active
            # Record split loop normals; retain hard edges and smoothed pipes.
            for li in tri.loops:
                loop=me.loops[li];v=me.vertices[loop.vertex_index]
                normal=(o.matrix_world.to_3x3().inverted().transposed() @ me.corner_normals[li].vector).normalized()
                buckets[key].append((tuple(o.matrix_world @ v.co),tuple(normal),tuple(uv.data[li].uv) if uv else (0,0)))
        e.to_mesh_clear()
    c=bpy.data.collections.new(prefix+'_Web_Meshes');meshes=[]
    for (part,mname,component),loops in buckets.items():
        # Deduplicate identical position/normal/UV triples, preserving seams.
        unique={};vs=[];ns=[];uvs=[];indices=[]
        for p,n,u in loops:
            key=tuple(round(v,6) for v in (*p,*n,*u))
            index=unique.get(key)
            if index is None:index=len(vs);unique[key]=index;vs.append(p);ns.append(n);uvs.append(u)
            indices.append(index)
        me=bpy.data.meshes.new(prefix+'_'+part+'_'+mname)
        me.from_pydata(vs,[],[indices[i:i+3] for i in range(0,len(indices),3)])
        me.materials.append(bpy.data.materials[mname]);me.update()
        for p in me.polygons:p.use_smooth=True
        me.normals_split_custom_set_from_vertices(ns)
        uv=me.uv_layers.new(name='IndustrialUV')
        for loop in me.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]
        o=bpy.data.objects.new(prefix+'_'+part+'_'+component+'_'+mname,me);o['part']=part;o['component_part']=component;c.objects.link(o);meshes.append(o)
    return c,meshes


def export_scene(scene,file):
    bpy.context.window.scene=scene
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_active_scene=True,
        export_extras=True,export_animations=False,export_cameras=False,export_lights=False,
        export_apply=False,export_shared_accessors=True,export_tangents=True,export_yup=True,export_image_format='AUTO')


unit_objects=[o for o in UNIT.objects if o.type in ['MESH','FONT'] and not any(c.name=='90_Studio' for c in o.users_collection)]
web_col,web_unit=merge_export(UNIT,unit_objects,'TES')
web_scene=bpy.data.scenes.new('TES - Unit Web Export');web_scene.collection.children.link(web_col)
export_scene(web_scene,PUBLIC/'tes-unit.glb')

# Facility coordinates reproduce facility.ts exactly, converted from Y-up.
FAC=bpy.data.scenes.new('TES - Industrial Facility - 10 Rows');SCENE=FAC
bpy.context.window.scene=FAC
FAC.unit_settings.system='METRIC'
FAC['production_rows']=10
FAC['hubs_per_row']=10
FAC['layout_basis']='Ten facility TES rows with ten ECR/DFFC hub assemblies each; standalone TES retains four hubs.'
FAC['visual_scope']='Illustrative mechanical visualization, not validated process engineering.'
rows=collection('FAC 01 - Ten Production Rows')
HUB_SHIFT=-10.68
EXTRA_HUBS={number:-15.45+(number-1)*1.78 for number in range(5,11)}
hub_template=[o for o in unit_objects if o.get('part')=='hub-1']
CURRENT=rows;PART='rows'
for i in range(10):
    y=18-i*3.6
    row=bpy.data.objects.new('TES_Row_%02d'%(i+1),None);row['part']='rows';row['row_index']=i+1;rows.objects.link(row)
    row.location=(0,y,0)
    for src in unit_objects:
        if src.get('part') in ['shell','roof','lights']:continue
        o=src.copy();o.data=src.data;o.parent=row;rows.objects.link(o);o['part']='rows'
        o['component_part']=src.get('part')
        if src.get('part') in {'hub-1','hub-2','hub-3','hub-4'}:
            o.location.x+=HUB_SHIFT
    for number,x in EXTRA_HUBS.items():
        for src in hub_template:
            o=src.copy();o.data=src.data;o.parent=row;rows.objects.link(o);o['part']='rows'
            o['component_part']='hub-'+str(number)
            o.location.x+=x-(-4.77)
        # A fabricated identity plate replaces the copied Hub 1 marking.
        plate=box('Facility_HUB_%02d_identity_plate'%number,(x,y-1.19,3.24),(.74,.036,.24),DARK,.003)
        plate['component_part']='hub-'+str(number)
        font=bpy.data.curves.new('HUB_%02d_text'%number,'FONT');font.body='HUB %d'%number
        font.size=.145;font.align_x='CENTER';font.align_y='CENTER';font.extrude=.001
        font.materials.append(WHITE)
        label=put(bpy.data.objects.new('Facility_HUB_%02d_label'%number,font),'rows')
        label['component_part']='hub-'+str(number)
        label.location=(x,y-1.214,3.24);label.rotation_euler.x=math.pi/2
CURRENT=collection('FAC 02 - Mechanical Infrastructure');PART='rows'
for i in range(10):
    y=18-i*3.6
    box('Row_skid_deck',(-5.34,y,.20),(23.0,2.3,.12),GALV,.012)
    for x in [-16.3,-10.6,-4.9,.8,5.7]:
        box('Row_skid_crossmember',(x,y,.105),(.18,2.3,.09),GALV)
        for dy in [-.90,.90]:
            box('Row_skid_anchor_pad',(x,y+dy,.03),(.36,.36,.06),GALV)
            bolt('Row_skid_anchor',(x+.10,y+dy,.07),(0,0,1),.021,.08)
    for x,entry in [(-18.6,-15.8),(7.6,5.25)]:
        # Headers now join each row to continuous side collectors.
        elbow=x-.8
        pipe('Row_branch',[(entry,y-1.09,.48),(elbow,y-1.09,.48),(elbow,y,1.1),(x,y,1.1)],.065)
        flange('Row_branch_flange',((elbow+x)/2,y,1.1),(1,0,0),.15,.065)
        box('Collector_support',(x,y,.55),(.11,.11,1.1),GALV)
        clamp('Collector_clamp',(x,y,1.1),(0,1,0),.105)
    gauge('Row_pressure',(7.15,y,1.32),.09)
    for z,mat in [(3.515,BLUE),(3.42,ORANGE)]:
        pipe('Extended_ten_hub_process_header',[(-16.2,y-.98,z),(-4.4,y-.98,z)],.032,mat)
        for x in [-15.45,-13.67,-11.89,-10.11,-8.33,-6.55]:
            pipe('Hub_header_drop',[(x,y-.98,z),(x,y-1.1,3.19)],.023,mat)
            clamp('Hub_header_support',(x,y-.98,z),(1,0,0),.032)
for x in [-18.6,7.6]:
    pipe('Continuous_row_collector',[(x,18,1.1),(x,-14.4,1.1)],.105)
    for y in [16,8,0,-8]:flange('Collector_service_joint',(x,y,1.1),(0,1,0),.22,.105)

CURRENT=collection('FAC 03 - Structural Hall');PART='facility'
box('Facility_floor',(2,0,-.06),(52,46,.12),CONCRETE,0)
for x in [-18+i*7 for i in range(7)]:
    for y in [-22,22]:
        box('Column_baseplate',(x,y,.05),(.70,.70,.10),GALV)
        for dx in [-.25,.25]:
            for dy in [-.25,.25]:bolt('Column_anchor',(x+dx,y+dy,.11),(0,0,1),.032,.12)
        # I-section columns instead of solid square blockout posts.
        box('Column_web',(x,y,3.6),(.10,.30,7.2),GALV)
        for dx in [-.18,.18]:box('Column_flange',(x+dx,y,3.6),(.07,.36,7.2),GALV)
    box('Roof_tie_beam',(x,0,7.1),(.20,44.4,.30),GALV)
    for y in [-21.5,21.5]:
        box('Beam_connection_plate',(x,y,6.92),(.36,.04,.35),GALV)
        for dx in [-.12,.12]:bolt('Beam_connection_bolt',(x+dx,y-.03,6.91),(0,-1,0),.025,.08)
PART='roof'
box('Hall_roof',(2,0,7.35),(48,44,.18),PAINT)
box('Hall_fascia',(2,-22.2,6.2),(48,.18,1.4),PAINT)
brand_blue=material('CIVIS facility blue',(.013,.069,.28),.22,.36)
box('Facility_brand_panel',(2,-22.32,6.35),(6.4,.06,1.1),brand_blue)
for x in [-21.5+i*.5 for i in range(96)]:box('Roof_sheet_seam',(x,0,7.455),(.022,44,.018),GALV,.002)
PART='facility'
for y in [-16,-8,0,8,16]:
    box('Luminaire_housing',(2,y,6.92),(1.5,.42,.08),DARK)
    box('Luminaire_diffuser',(2,y,6.87),(1.35,.33,.012),bpy.data.materials['Warm white inspection lamps'],0)
for x in [-19.5,7]:
    for y in [18-i*1.8 for i in range(21)]:
        cyl('Safety_rail_post',(x,y,.05),(x,y,1.1),.035,YELLOW,16)
        box('Safety_rail_foot',(x,y,.03),(.18,.18,.06),GALV)
    for z in [.6,1.05]:cyl('Safety_rail',(x,-18,z),(x,20,z),.035,YELLOW,16)

CURRENT=collection('FAC 04 - Water Handling');PART='water-handling'
cyl('Water_tank',(16,8,.3),(16,8,5.3),2.4,STEEL,96)
cyl('Water_tank_base',(16,8,0),(16,8,.3),2.65,GALV,64)
for z in [1.2,2.8,4.4]:ring('Water_tank_band',(16,8,z),(0,0,1),2.425,2.395,.12,GALV,96)
for z in [.36,5.24]:ring('Water_tank_shell_weld',(16,8,z),(0,0,1),2.407,2.39,.018,FASTENER,96)
pipe('Water_tank_feed',[(7.6,8,1.1),(8.0,8,1.1),(8,8,1.8),(13.65,8,1.8)],.18)
flange('Tank_outlet_flange',(13.65,8,1.8),(1,0,0),.34,.18)
valve('Tank_isolation_valve',(10.2,8,1.8),(1,0,0),.18)
gauge('Tank_line_pressure',(11.3,8,2.05),.12)
for x in [8.5,11.9]:
    box('Water_line_support',(x,8,.80),(.16,.16,1.60),GALV)
    clamp('Water_line_support_clamp',(x,8,1.8),(1,0,0),.18)
flange('Tank_top_inspection',(16,8,5.34),(0,0,1),.45,.18)
cyl('Tank_top_cover',(16,8,5.34),(16,8,5.42),.18)
for z in [1.0,1.6,2.2,2.8,3.4,4.0,4.6,5.2]:cyl('Tank_ladder_rung',(15.6,5.52,z),(16.4,5.52,z),.025,GALV,16)
for x in [15.6,16.4]:cyl('Tank_ladder_rail',(x,5.52,.35),(x,5.52,5.4),.033,GALV,16)

CURRENT=collection('FAC 05 - Power Collection');PART='power-collection'
for i in range(4):
    y=2-i*1.6
    box('Power_cabinet',(15.4,y,1.2),(1.8,.9,2.4),PAINT,.025)
    cabinet_details('Power_cabinet',15.4,y,1.2,1.8,2.4,.9)
    for x in [14.85,15.95]:box('Cabinet_foot',(x,y,.05),(.20,.6,.10),GALV)
pipe('Power_cabinet_conduit',[(16.6,2,2.6),(16.6,-4.4,2.6)],.07,GALV)
for i in range(4):pipe('Cabinet_conduit_drop',[(16.6,2-i*1.6,2.6),(15.9,2-i*1.6,2.6),(15.9,2-i*1.6,2.4)],.035,GALV)
for y in [16-i*2 for i in range(16)]:
    box('Cable_tray_rung',(8.8,y,3.7),(.70,.05,.04),GALV)
for x in [8.45,9.15]:box('Cable_tray_side',(x,1,3.74),(.04,32,.15),GALV)

CURRENT=collection('FAC 06 - Operations');PART='operations'
# Preserve 8 x 6 m footprint while opening the glazed front wall.
box('Operations_back_wall',(16,-7,1.7),(8,.12,3.4),PAINT)
for x in [12,20]:box('Operations_side_wall',(x,-10,1.7),(.12,6,3.4),PAINT)
box('Operations_roof',(16,-10,3.4),(8,6,.12),PAINT)
box('Operations_front_spandrel',(16,-13,.5),(8,.12,1),PAINT)
box('Operations_window',(16,-13,1.95),(6.4,.07,1.5),GLASS,0)
for x in [12,14,16,18,20]:box('Window_mullion',(x,-13,2),(.08,.12,2.8),GALV)
box('Operations_desk',(16,-10.4,.95),(3.4,1.2,.08),STEEL)
for i in range(3):
    x=15.1+i*.95
    box('Monitor_case',(x,-10.95,1.4),(.8,.08,.55),DARK)
    box('Monitor_screen',(x,-11,1.4),(.73,.012,.48),bpy.data.materials['HMI display blue'])
    box('Monitor_stand',(x,-10.95,1.08),(.07,.09,.30),GALV)
box('Operations_rack',(18.8,-9.2,.9),(1.2,.6,1.8),DARK)
for z in [.3,.5,.7,.9,1.1,1.3,1.5]:box('Rack_unit',(18.8,-9.51,z),(1.02,.03,.15),GALV)

# Studio cameras are excluded from web geometry.
CURRENT=collection('FAC 90 - Cameras and Lighting')


def camera(name,pos,target,lens=45):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);CURRENT.objects.link(o)
    o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;d.clip_end=400
    return o


def lighting(scene):
    world=bpy.data.worlds.new(scene.name+'_World');world.use_nodes=True;scene.world=world
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.56,.64,.74,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.75
    environment=world.node_tree.nodes.new('ShaderNodeTexEnvironment')
    environment.image=bpy.data.images.load(str(PUBLIC/'hdri/warehouse.hdr'),check_existing=True)
    environment.image.pack()
    world.node_tree.links.new(environment.outputs['Color'],world.node_tree.nodes['Background'].inputs['Color'])
    for name,pos,energy,size in [('Key',(-7,-12,15),2600,10),('Fill',(10,5,12),1900,8),('Rim',(-5,16,10),2100,8)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size
        o=bpy.data.objects.new(name,d);CURRENT.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=32
    scene.render.resolution_percentage=100;scene.render.threads_mode='FIXED';scene.render.threads=8
    scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'


FAC.camera=camera('CAM_Facility_Overview',(55,-67,42),(2,0,2),42)
detail_camera=camera('CAM_Facility_Mechanical_Detail',(10,-21,5.2),(0,-14.4,1.7),48)
lighting(FAC)
roof_col=CURRENT
# Packed textures make both native files self-contained.
for im in bpy.data.images:
    if im.source=='FILE' and not im.packed_file:
        try:im.pack()
        except RuntimeError:pass
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'attachments/TES_Industrial_Facility_10_Rows.blend'),compress=True)

# Export the repeated unit geometry only once and reuse its mesh datablocks.
infrastructure=[o for o in FAC.objects if o.type in ['MESH','FONT'] and not o.parent and not any(c.name=='FAC 90 - Cameras and Lighting' for c in o.users_collection)]
fac_web_col,fac_web_meshes=merge_export(FAC,infrastructure,'Facility')
fac_web_scene=bpy.data.scenes.new('TES - Facility Web Export');fac_web_scene.collection.children.link(fac_web_col)
for i in range(10):
    row=bpy.data.objects.new('TES_Row_%02d'%(i+1),None);row['part']='rows';row['row_index']=i+1;fac_web_col.objects.link(row);row.location=(0,18-i*3.6,0)
    for src in web_unit:
        if src.get('part') in ['shell','roof','lights']:continue
        o=src.copy();o.data=src.data;o.parent=row;fac_web_col.objects.link(o);o['component_part']=src.get('component_part',src['part']);o['part']='rows'
        if src.get('part') in {'hub-1','hub-2','hub-3','hub-4'}:o.location.x+=HUB_SHIFT
    for number,x in EXTRA_HUBS.items():
        for src in web_unit:
            if src.get('part')!='hub-1':continue
            o=src.copy();o.data=src.data;o.parent=row;fac_web_col.objects.link(o)
            o['component_part']=src.get('component_part') if src.get('component_part') in {'ecr','fuel-cell'} else 'hub-'+str(number)
            o['part']='rows';o.location.x+=x-(-4.77)
export_scene(fac_web_scene,PUBLIC/'facility.glb')

if ARGS.render:
    bpy.context.window.scene=UNIT;SCENE=UNIT;CURRENT=collection('91_Industrial_Render_Lighting',UNIT);lighting(UNIT)
    UNIT.camera=camera('CAM_Industrial_Unit',(14,-18,9),(0,0,1.7),48)
    for o in UNIT.objects:
        if o.get('part')=='roof':o.hide_render=True
    UNIT.render.resolution_x=1800;UNIT.render.resolution_y=1000
    UNIT.render.filepath=str(OUT/'TES_Unit_Industrial.png');bpy.ops.render.render(write_still=True)
    bpy.context.window.scene=FAC
    for o in FAC.objects:
        if o.get('part')=='roof':o.hide_render=True
    FAC.render.resolution_x=1800;FAC.render.resolution_y=1100
    FAC.render.filepath=str(OUT/'TES_Facility_Industrial.png');bpy.ops.render.render(write_still=True)
    FAC.camera=detail_camera;FAC.render.resolution_x=1600;FAC.render.resolution_y=1000
    FAC.render.filepath=str(OUT/'TES_Facility_Detail.png');bpy.ops.render.render(write_still=True)
# Keep the native delivery focused on the editable facility. The unit master
# and temporary web export have their own outputs and need not inflate it.
for unused in list(bpy.data.scenes):
    if unused != FAC:bpy.data.scenes.remove(unused)
bpy.context.window.scene=FAC
for _ in range(3):bpy.ops.outliner.orphans_purge(do_recursive=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'attachments/TES_Industrial_Facility_10_Rows.blend'),compress=True)
report={'source_sha256':hashlib.sha256((ROOT/'attachments/TES_Reference_Model.blend').read_bytes()).hexdigest(),
        'unit_objects':len(unit_objects),'unit_web_meshes':len(web_unit),'facility_rows':10,'hubs_per_row':10,
        'blender_version':bpy.app.version_string,'files':{p.name:p.stat().st_size for p in [PUBLIC/'tes-unit.glb',PUBLIC/'facility.glb',ROOT/'attachments/TES_Industrial_Unit.blend',ROOT/'attachments/TES_Industrial_Facility_10_Rows.blend']}}
(ROOT/'scripts/blender/asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('ASSET_REPORT',json.dumps(report),flush=True)
print('INDUSTRIAL_BUILD_COMPLETE',flush=True)
