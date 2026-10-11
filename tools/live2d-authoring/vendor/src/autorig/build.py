"""Stage 3 -- assemble a Moc3 from meshes, parts, parameters and keyforms.

The moc3 rig model, verified against Mark.moc3:

    parameter -> key table -> keys[]        breakpoint values
    binding   -> [key table indices]        which params drive a deformable
    deformable.key_len == product of its bound tables' key counts

Every deformable (art mesh, warp, rotation) stores one keyform per cell of that
N-dimensional grid, in row-major order with the FIRST bound table varying
slowest. A keyform holds absolute vertex positions, not offsets from a base
pose -- the rest pose is simply the cell at each parameter's default.

Sections are written as flat arrays with parallel *_off/*_len index pairs, so
this builder accumulates into python lists and resolves offsets at the end.
"""
from __future__ import annotations

import itertools
from dataclasses import dataclass, field

import numpy as np

from moc3.io import CanvasInfo, Moc3
from .mesh import Mesh

# Cubism's drawable_flag bits (from the Core header / Purism):
#   0x01 blend additive, 0x02 blend multiplicative, 0x04 double-sided,
#   0x08 inverted mask. Normal blending is 0.
FLAG_NORMAL = 0

# Keyform position blocks are padded to a multiple of this many floats.
KEYFORM_ALIGN_FLOATS = 16


@dataclass
class Param:
    """A rig parameter and the values at which keyforms are authored."""
    pid: str
    minimum: float
    maximum: float
    default: float
    keys: list[float]

    @property
    def n_keys(self) -> int:
        return len(self.keys)


@dataclass
class ArtMeshSpec:
    """One drawable: its mesh, where it sits in the tree, and how it deforms."""
    name: str
    mesh: Mesh
    part_index: int
    texture_no: int = 0
    draw_order: int = 500
    opacity: float = 1.0
    parent_deformer: int = -1
    # Parameters this mesh is bound to, and the deformed positions per grid cell.
    # deform(cell) -> (N,2) absolute model-space positions. None => rest pose.
    bound_params: list[int] = field(default_factory=list)
    deform: object = None          # callable(cell_indices) -> np.ndarray | None


@dataclass
class PartSpec:
    name: str
    parent: int = -1


class RigBuilder:
    """Accumulates rig content, then emits a Moc3 with consistent tables."""

    def __init__(self, canvas_w: int, canvas_h: int, pixels_per_unit: float = 1.0):
        self.canvas = CanvasInfo(
            pixels_per_unit=pixels_per_unit,
            origin_x=canvas_w / 2.0 / pixels_per_unit,
            origin_y=canvas_h / 2.0 / pixels_per_unit,
            canvas_width=canvas_w / pixels_per_unit,
            canvas_height=canvas_h / pixels_per_unit,
            canvas_flag=1,
        )
        self.parts: list[PartSpec] = []
        self.params: list[Param] = []
        self.meshes: list[ArtMeshSpec] = []

    # -- authoring --

    def add_part(self, name: str, parent: int = -1) -> int:
        self.parts.append(PartSpec(name, parent))
        return len(self.parts) - 1

    def add_param(self, pid: str, minimum: float, maximum: float,
                  default: float, keys: list[float]) -> int:
        self.params.append(Param(pid, minimum, maximum, default, keys))
        return len(self.params) - 1

    def add_mesh(self, spec: ArtMeshSpec) -> int:
        self.meshes.append(spec)
        return len(self.meshes) - 1

    # -- emit --

    def build(self) -> Moc3:
        m = Moc3(version=3)
        m.canvas = self.canvas
        S = m.sections

        n_parts = len(self.parts)
        n_params = len(self.params)
        n_meshes = len(self.meshes)

        # ---- parameters, key tables, keys ----
        # One key table per parameter, in parameter order, so table i belongs
        # to parameter i. Bindings reference tables, not parameters.
        keys: list[float] = []
        kt_off: list[int] = []
        kt_len: list[int] = []
        for p in self.params:
            kt_off.append(len(keys))
            kt_len.append(p.n_keys)
            keys.extend(p.keys)

        S["param_src.id"] = [p.pid for p in self.params]
        S["param_src.maximum_value"] = [p.maximum for p in self.params]
        S["param_src.minimum_value"] = [p.minimum for p in self.params]
        S["param_src.default_value"] = [p.default for p in self.params]
        S["param_src.repeat"] = [0] * n_params
        S["param_src.decimal_places"] = [2] * n_params
        S["param_src.key_table_off"] = list(range(n_params))
        S["param_src.key_table_len"] = [1] * n_params
        S["key_table_src.keys_off"] = kt_off
        S["key_table_src.keys_len"] = kt_len
        S["keys_src.key"] = keys

        # ---- bindings ----
        # Binding 0 is the empty binding (rest pose only); every deformable that
        # is not parameter-driven points at it. Deduplicating identical bindings
        # keeps the tables small and matches what the Editor emits.
        binding_kti: list[int] = []
        b_off: list[int] = [0]
        b_len: list[int] = [0]
        binding_of: dict[tuple[int, ...], int] = {(): 0}

        def binding_for(param_indices: list[int]) -> int:
            key = tuple(param_indices)
            if key in binding_of:
                return binding_of[key]
            binding_of[key] = len(b_off)
            b_off.append(len(binding_kti))
            b_len.append(len(key))
            binding_kti.extend(key)          # table index == param index
            return binding_of[key]

        # ---- art meshes + keyforms ----
        uvs: list[float] = []
        idx: list[int] = []
        kf_pos: list[float] = []
        am_key_pos_off: list[int] = []
        am_opacity: list[float] = []
        am_draw_order: list[float] = []

        am_binding: list[int] = []
        am_kf_off: list[int] = []
        am_key_len: list[int] = []
        am_vcount: list[int] = []
        am_uv_off: list[int] = []
        am_idx_off: list[int] = []
        am_idx_len: list[int] = []

        for spec in self.meshes:
            mesh = spec.mesh
            n_v = mesh.vertex_count

            am_uv_off.append(len(uvs))   # floats, packed tight (no padding)
            uvs.extend(mesh.uvs.reshape(-1).tolist())
            am_idx_off.append(len(idx))
            idx.extend(int(i) for i in mesh.indices)
            am_idx_len.append(len(mesh.indices))
            am_vcount.append(n_v)

            b = binding_for(spec.bound_params)
            am_binding.append(b)

            grid = [self.params[pi].n_keys for pi in spec.bound_params]
            n_cells = 1
            for g in grid:
                n_cells *= g

            am_kf_off.append(len(am_key_pos_off))
            am_key_len.append(n_cells)

            # Cubism stores the keyform grid with the FIRST bound table varying
            # FASTEST -- column-major, not row-major. itertools.product varies
            # the last axis fastest, so the axes are reversed before iterating
            # and each cell is flipped back to caller order.
            #
            # Verified empirically: a 3x2 grid encoding cell indices into vertex
            # positions read back transposed until this was flipped (A=1,B=0
            # returned the value written at A=0,B=1). Getting this wrong is
            # silent -- the model loads, deforms, and simply moves wrongly.
            if grid:
                cells = (tuple(reversed(c))
                         for c in itertools.product(*[range(g) for g in reversed(grid)]))
            else:
                cells = [()]
            for cell in cells:
                pos = None
                if spec.deform is not None:
                    pos = spec.deform(cell)
                if pos is None:
                    pos = mesh.verts
                pos = np.asarray(pos, dtype=np.float32)
                if pos.shape != (n_v, 2):
                    raise ValueError(
                        f"{spec.name}: deform returned {pos.shape}, expected {(n_v, 2)}")
                # Offsets are in FLOATS, not vertex pairs. Each keyform block is
                # padded up to a multiple of 16 floats -- the runtime reads them
                # with SIMD. Verified on Mark: 61 verts (122 floats) strides 128.
                am_key_pos_off.append(len(kf_pos))
                kf_pos.extend(pos.reshape(-1).tolist())
                while len(kf_pos) % KEYFORM_ALIGN_FLOATS:
                    kf_pos.append(0.0)
                am_opacity.append(spec.opacity)
                am_draw_order.append(float(spec.draw_order))

        S["art_mesh_src.id"] = [s.name for s in self.meshes]
        S["art_mesh_src.binding_idx"] = am_binding
        S["art_mesh_src.keyform_off"] = am_kf_off
        S["art_mesh_src.key_len"] = am_key_len
        S["art_mesh_src.visible"] = [1] * n_meshes
        S["art_mesh_src.enable"] = [1] * n_meshes
        S["art_mesh_src.parent_part_idx"] = [s.part_index for s in self.meshes]
        S["art_mesh_src.parent_deformer_idx"] = [s.parent_deformer for s in self.meshes]
        S["art_mesh_src.texture_no"] = [s.texture_no for s in self.meshes]
        S["art_mesh_src.drawable_flag"] = [FLAG_NORMAL] * n_meshes
        S["art_mesh_src.vertex_count"] = am_vcount
        S["art_mesh_src.uv_off"] = am_uv_off
        S["art_mesh_src.idx_off"] = am_idx_off
        S["art_mesh_src.idx_len"] = am_idx_len
        S["art_mesh_src.mask_off"] = [-1] * n_meshes
        S["art_mesh_src.mask_len"] = [0] * n_meshes

        S["art_mesh_key_src.opacity"] = am_opacity
        S["art_mesh_key_src.draw_order"] = am_draw_order
        S["art_mesh_key_src.key_pos_off"] = am_key_pos_off
        S["key_pos_src.xy"] = kf_pos
        S["uv_src.xy"] = uvs
        S["idx_src.idx"] = idx

        # ---- parts ----
        # Parts carry visibility/opacity, one keyform each (no part animation).
        S["part_src.id"] = [p.name for p in self.parts]
        S["part_src.binding_idx"] = [0] * n_parts
        S["part_src.keyform_off"] = list(range(n_parts))
        S["part_src.key_len"] = [1] * n_parts
        S["part_src.visible"] = [1] * n_parts
        S["part_src.enable"] = [1] * n_parts
        S["part_src.parent_part_idx"] = [p.parent for p in self.parts]
        S["part_key_src.draw_order"] = [500.0] * n_parts

        S["binding_src.key_table_idx_off"] = b_off
        S["binding_src.key_table_idx_len"] = b_len
        S["key_table_idx_src.idx"] = binding_kti

        # ---- draw order groups ----
        # A single flat group listing every mesh. Cubism supports nested groups
        # per part; one group is valid and keeps draw order fully explicit.
        # Draw order is carried by the ORDER of entries in obj_idx, sorted by
        # each mesh's draw_order value -- not by the value alone.
        #
        # self_group_idx must be -1 ("not a nested group"). Writing 0 points
        # every item at group 0, i.e. the group containing it, and the runtime
        # responds by reporting render order 0 for every drawable: layers then
        # composite in arbitrary order. Verified against Mark, which uses -1.
        order = sorted(range(n_meshes), key=lambda i: self.meshes[i].draw_order)
        orders = [float(s.draw_order) for s in self.meshes]
        S["draw_group_src.obj_off"] = [0]
        S["draw_group_src.obj_len"] = [n_meshes]
        S["draw_group_src.obj_total_count"] = [n_meshes]
        S["draw_group_src.max_order"] = [int(max(orders))] if orders else [0]
        S["draw_group_src.min_order"] = [int(min(orders))] if orders else [0]
        S["draw_group_obj_src.type"] = [0] * n_meshes        # 0 = art mesh
        S["draw_group_obj_src.idx"] = order
        S["draw_group_obj_src.self_group_idx"] = [-1] * n_meshes

        # ---- counts ----
        m.set_count("parts", n_parts)
        m.set_count("deformers", 0)
        m.set_count("warps", 0)
        m.set_count("rotations", 0)
        m.set_count("art_meshes", n_meshes)
        m.set_count("parameters", n_params)
        m.set_count("part_keyforms", n_parts)
        m.set_count("warp_keyforms", 0)
        m.set_count("rotation_keyforms", 0)
        m.set_count("art_mesh_keyforms", len(am_key_pos_off))
        m.set_count("keyform_pos", len(kf_pos))
        m.set_count("key_table_idx", len(binding_kti))
        m.set_count("bindings", len(b_off))
        m.set_count("key_tables", n_params)
        m.set_count("keys", len(keys))
        m.set_count("uvs", len(uvs))
        m.set_count("idx", len(idx))
        m.set_count("masks", 0)
        m.set_count("draw_groups", 1)
        m.set_count("draw_items", n_meshes)

        return m
