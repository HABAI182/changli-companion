"""Build an explicitly provisional Cubism model from the user-supplied cutout.

This preserves the source artwork at rest. Eye-open patches are separate art
meshes and reveal an edited closed-eye plate during blink. The result is a
working technical rig, not a hand-painted final production model.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
VENDOR = HERE / "vendor"
sys.path.insert(0, str(VENDOR / "src"))
sys.path.insert(0, str(VENDOR))

from src.autorig.build import ArtMeshSpec, RigBuilder  # noqa: E402
from src.autorig.mesh import Mesh  # noqa: E402


CANVAS = 1254
ATLAS = 2048
PPU = 1000.0
SOURCE = ROOT / "public/models/changli/assets/changli-cutout.png"
CLOSED = HERE / "assets/closed-eyes-candidate.png"
OUT = ROOT / "public/models/changli/live"
DIAGNOSTICS = HERE / "build"

EYES = [
    ("EyeLeft", [(332, 628), (355, 598), (397, 582), (494, 581), (532, 612),
                  (544, 655), (529, 729), (496, 747), (387, 745), (346, 711)]),
    ("EyeRight", [(648, 670), (674, 626), (714, 620), (800, 635), (836, 670),
                   (851, 727), (829, 785), (777, 810), (698, 798), (656, 761)]),
]
MOUTH = (562, 778, 601, 815)


def polygon_mask(points: list[tuple[int, int]]) -> Image.Image:
    mask = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask


def layer_box(mask: Image.Image) -> tuple[int, int, int, int]:
    bounds = mask.getbbox()
    if not bounds:
        raise ValueError("empty layer mask")
    return bounds


def grid_mesh(box: tuple[int, int, int, int], atlas_xy: tuple[int, int],
              divisions: tuple[int, int]) -> Mesh:
    x0, y0, x1, y1 = box
    ax, ay = atlas_xy
    nx, ny = divisions
    pixels = np.array(
        [(x0 + (x1 - x0) * ix / nx, y0 + (y1 - y0) * iy / ny)
         for iy in range(ny + 1) for ix in range(nx + 1)],
        dtype=np.float32,
    )
    verts = np.column_stack(((pixels[:, 0] - CANVAS / 2) / PPU,
                             (pixels[:, 1] - CANVAS / 2) / PPU)).astype(np.float32)
    # Cubism's WebGL Framework uploads PNG rows without UNPACK_FLIP_Y; its
    # model UV v=0 addresses the top row of this atlas in practice.
    uv = np.column_stack(((ax + pixels[:, 0] - x0) / ATLAS,
                          (ay + pixels[:, 1] - y0) / ATLAS)).astype(np.float32)
    indices: list[int] = []
    for iy in range(ny):
        for ix in range(nx):
            a = iy * (nx + 1) + ix
            b = a + 1
            c = a + nx + 1
            d = c + 1
            indices.extend((a, b, c, b, d, c))
    return Mesh(verts, uv, np.array(indices, dtype=np.uint16))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS.mkdir(parents=True, exist_ok=True)
    original = Image.open(SOURCE).convert("RGBA")
    closed = Image.open(CLOSED).convert("RGBA")
    assert original.size == closed.size == (CANVAS, CANVAS)

    base = original.copy()
    eye_layers: list[tuple[str, Image.Image, tuple[int, int, int, int]]] = []
    for name, points in EYES:
        mask = polygon_mask(points)
        box = layer_box(mask)
        # Edited plate appears only when the open-eye art mesh fades out.
        base.paste(closed, (0, 0), mask)
        eye = original.copy()
        eye.putalpha(mask)
        eye_layers.append((name, eye.crop(box), box))

    mouth_box = MOUTH
    mouth_mask = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(mouth_mask).ellipse(mouth_box, fill=255)
    mouth = original.copy()
    mouth.putalpha(mouth_mask)
    mouth = mouth.crop(mouth_box)
    # Small skin-colour underpaint is concealed at rest by the mouth art mesh.
    skin = original.getpixel((605, 793))
    ImageDraw.Draw(base).ellipse(mouth_box, fill=skin)

    # Each overlapping art mesh occupies its own UV region. A single composited
    # texture would let the eye sample the closed plate and break blinking.
    atlas = Image.new("RGBA", (ATLAS, ATLAS), (0, 0, 0, 0))
    atlas.alpha_composite(base, (0, ATLAS - CANVAS))
    pack: dict[str, tuple[int, int]] = {}
    cursor_y = 20
    for name, crop, box in eye_layers + [("Mouth", mouth, mouth_box)]:
        pack[name] = (1300, cursor_y)
        atlas.alpha_composite(crop, pack[name])
        cursor_y += crop.height + 24
    assert cursor_y <= ATLAS - CANVAS

    # Diagnostic rest composite should reproduce the cutout exactly except at
    # hard mask boundaries and the small mouth underpaint.
    check = base.copy()
    for _, crop, box in eye_layers:
        check.alpha_composite(crop, box[:2])
    check.alpha_composite(mouth, mouth_box[:2])
    check.save(DIAGNOSTICS / "rest-composite.png")
    base.save(DIAGNOSTICS / "closed-plate.png")

    rb = RigBuilder(CANVAS, CANVAS, PPU)
    # The upstream experimental builder writes model-space canvas dimensions,
    # while Cubism Core expects canvas pixel dimensions and divides by PPU.
    rb.canvas.canvas_width = CANVAS
    rb.canvas.canvas_height = CANVAS
    rb.canvas.origin_x = CANVAS / 2
    rb.canvas.origin_y = CANVAS / 2
    rb.canvas.canvas_flag = 0
    root = rb.add_part("Root")
    body_part = rb.add_part("Body", root)
    face_part = rb.add_part("Face", body_part)
    angle_x = rb.add_param("ParamAngleX", -8, 8, 0, [-8, 0, 8])
    angle_z = rb.add_param("ParamAngleZ", -4, 4, 0, [-4, 0, 4])
    breath = rb.add_param("ParamBreath", 0, 1, 0.5, [0, 0.5, 1])
    eye_l = rb.add_param("ParamEyeLOpen", 0, 1, 1, [0, 1])
    eye_r = rb.add_param("ParamEyeROpen", 0, 1, 1, [0, 1])
    mouth_open = rb.add_param("ParamMouthOpenY", 0, 1, 0, [0, 0.5, 1])
    mouth_form = rb.add_param("ParamMouthForm", -1, 1, 0, [-1, 0, 1])

    def common(base_verts: np.ndarray, ix: int, iz: int, ib: int) -> np.ndarray:
        pos = base_verts.copy()
        yaw = [-8, 0, 8][ix]
        roll = [-4, 0, 4][iz]
        breathing = [0, 0.5, 1][ib]
        # Deform gently around the face so the illustration remains recognisable.
        px, py = 0.0, -0.24
        weight = np.clip((0.45 - pos[:, 1]) / 0.9, 0, 1)
        pos[:, 0] += yaw / PPU * 1.5 * weight
        theta = math.radians(roll * 0.35) * weight
        xx, yy = pos[:, 0] - px, pos[:, 1] - py
        pos[:, 0] = px + xx * np.cos(theta) - yy * np.sin(theta)
        pos[:, 1] = py + xx * np.sin(theta) + yy * np.cos(theta)
        pos[:, 1] += (breathing - 0.5) * 2.5 / PPU * weight
        return pos.astype(np.float32)

    body_mesh = grid_mesh((0, 0, CANVAS, CANVAS), (0, ATLAS - CANVAS), (22, 22))
    rb.add_mesh(ArtMeshSpec(
        name="ChangliBody", mesh=body_mesh, part_index=body_part,
        draw_order=500, bound_params=[angle_x, angle_z, breath],
        deform=lambda cell: common(body_mesh.verts, *cell),
    ))

    for name, _, box in eye_layers:
        mesh = grid_mesh(box, pack[name], (7, 6))
        eye_param = eye_l if name == "EyeLeft" else eye_r
        rb.add_mesh(ArtMeshSpec(
            name=name, mesh=mesh, part_index=face_part, draw_order=510,
            bound_params=[angle_x, angle_z, breath, eye_param],
            deform=lambda cell, m=mesh: common(m.verts, *cell[:3]),
        ))

    mouth_mesh = grid_mesh(mouth_box, pack["Mouth"], (6, 5))

    def mouth_deform(cell: tuple[int, ...]) -> np.ndarray:
        pos = common(mouth_mesh.verts, *cell[:3])
        openness = [0, 0.5, 1][cell[3]]
        form = [-1, 0, 1][cell[4]]
        cx, cy = pos[:, 0].mean(), pos[:, 1].mean()
        pos[:, 1] = cy + (pos[:, 1] - cy) * (1 + openness * 0.7)
        pos[:, 0] = cx + (pos[:, 0] - cx) * (1 + form * 0.15)
        return pos

    rb.add_mesh(ArtMeshSpec(
        name="Mouth", mesh=mouth_mesh, part_index=face_part, draw_order=520,
        bound_params=[angle_x, angle_z, breath, mouth_open, mouth_form],
        deform=mouth_deform,
    ))

    moc = rb.build()
    # RigBuilder exposes fixed per-mesh opacity. In the native Moc3 section,
    # replace eye keyform opacities with values bound to EyeOpen parameters.
    opacities = moc.sections["art_mesh_key_src.opacity"]
    offsets = moc.sections["art_mesh_src.keyform_off"]
    lengths = moc.sections["art_mesh_src.key_len"]
    for mesh_index in (1, 2):
        start = offsets[mesh_index]
        assert lengths[mesh_index] % 2 == 0
        # Cubism's native key grid varies the first bound parameter fastest;
        # the eye-open parameter is the final (slowest) axis here.
        for i in range(lengths[mesh_index]):
            opacities[start + i] = float(i // (lengths[mesh_index] // 2))

    model_name = "ChangliCandidate"
    (OUT / f"{model_name}.moc3").write_bytes(moc.to_bytes())
    atlas_dir = OUT / f"{model_name}.2048"
    atlas_dir.mkdir(exist_ok=True)
    atlas.save(atlas_dir / "texture_00.png")
    def motion(name: str, duration: float, curves: dict[str, list[tuple[float, float]]]) -> str:
        records = []
        for pid, points in curves.items():
            segments: list[float] = [points[0][0], points[0][1]]
            for time, value in points[1:]:
                segments.extend([0, time, value])  # Cubism linear segment
            records.append({"Target": "Parameter", "Id": pid, "Segments": segments})
        data = {
            "Version": 3,
            "Meta": {
                "Duration": duration, "Fps": 30, "Loop": False,
                "AreBeziersRestricted": True,
                "CurveCount": len(records),
                "TotalSegmentCount": sum(len(c["Segments"]) // 3 for c in records),
                "TotalPointCount": sum((len(c["Segments"]) - 2) // 3 + 1 for c in records),
                "UserDataCount": 0, "TotalUserDataSize": 0,
            },
            "Curves": records,
            "UserData": [],
        }
        filename = f"{name}.motion3.json"
        (OUT / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2))
        return filename

    def expression(name: str, parameters: list[tuple[str, float]]) -> str:
        data = {
            "Type": "Live2D Expression", "FadeInTime": 0.25, "FadeOutTime": 0.3,
            "Parameters": [
                {"Id": pid, "Value": value, "Blend": "Add"}
                for pid, value in parameters
            ],
        }
        filename = f"{name}.exp3.json"
        (OUT / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2))
        return filename

    motions = {
        "TapHead": [motion("tap-head", 0.45, {
            "ParamAngleZ": [(0, 0), (0.12, -3.5), (0.25, 2), (0.45, 0)],
        })],
        "TapBody": [motion("tap-body", 0.45, {
            "ParamAngleX": [(0, 0), (0.15, 6), (0.3, -2), (0.45, 0)],
        })],
        "KeyLeft": [motion("key-left", 0.2, {
            "ParamAngleZ": [(0, 0), (0.08, -1.5), (0.2, 0)],
        })],
        "KeyRight": [motion("key-right", 0.2, {
            "ParamAngleZ": [(0, 0), (0.08, 1.5), (0.2, 0)],
        })],
    }
    expressions = [
        {"Name": "Neutral", "File": expression("neutral", [])},
        {"Name": "Smile", "File": expression("smile", [
            ("ParamEyeLOpen", -1), ("ParamEyeROpen", -1),
            ("ParamMouthForm", 0.55),
        ])},
        {"Name": "Sleepy", "File": expression("sleepy", [
            ("ParamEyeLOpen", -1), ("ParamEyeROpen", -1),
        ])},
        {"Name": "Surprised", "File": expression("surprised", [
            ("ParamMouthOpenY", 0.5),
        ])},
    ]
    model = {
        "Version": 3,
        "FileReferences": {
            "Moc": f"{model_name}.moc3",
            "Textures": [f"{model_name}.2048/texture_00.png"],
            "Motions": {group: [{"File": file} for file in files]
                        for group, files in motions.items()},
            "Expressions": expressions,
        },
        "Groups": [
            {"Target": "Parameter", "Name": "EyeBlink", "Ids": ["ParamEyeLOpen", "ParamEyeROpen"]},
            {"Target": "Parameter", "Name": "LipSync", "Ids": ["ParamMouthOpenY"]},
        ],
        "HitAreas": [],
    }
    (OUT / f"{model_name}.model3.json").write_text(json.dumps(model, indent=2))
    print(f"Wrote {OUT}; {len(rb.meshes)} art meshes, {len(rb.params)} parameters")
    print(f"MOC3: {len((OUT / f'{model_name}.moc3').read_bytes())} bytes")


if __name__ == "__main__":
    main()
