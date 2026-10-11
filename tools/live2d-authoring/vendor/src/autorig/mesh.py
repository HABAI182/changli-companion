"""Stage 3a -- turn each layer PNG into a triangulated mesh.

Alpha mask -> outer contour -> simplify -> constrained Delaunay with interior
points. The interior points matter: a mesh that is only a boundary polygon
deforms like a rubber sheet pinned at the edges, which looks wrong on hair and
cloth. Cubism's own auto-mesh does the same thing.

Coordinates come out in Cubism model space: origin at canvas centre, Y up,
scaled by pixels_per_unit. Pixel space is Y-down, so Y is flipped here once and
never again.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image

ALPHA_THRESHOLD = 8       # 0-255; below this a pixel is transparent
DEFAULT_SPACING = 90.0    # px between interior points; ~Cubism's default density
MIN_AREA = 16.0           # px^2; smaller blobs are noise


@dataclass
class Mesh:
    """A triangulated layer. verts are model space, uvs are 0..1 texture space."""
    verts: np.ndarray        # (N, 2) float32, model space
    uvs: np.ndarray          # (N, 2) float32
    indices: np.ndarray      # (M*3,) uint16, CCW triangles

    @property
    def vertex_count(self) -> int:
        return len(self.verts)

    @property
    def triangle_count(self) -> int:
        return len(self.indices) // 3


def _largest_contour(mask: np.ndarray) -> np.ndarray | None:
    """Outer contour of the biggest connected blob, as (K,2) float xy in pixels.

    Uses marching squares at the alpha midpoint. Holes are ignored: Cubism art
    meshes are simple polygons, and a hole would need a constrained hole point
    that the runtime does not model.
    """
    try:
        from skimage import measure
    except ImportError as e:                                  # pragma: no cover
        raise SystemExit("pip install scikit-image") from e

    contours = measure.find_contours(mask.astype(float), 0.5)
    if not contours:
        return None
    # find_contours yields (row, col); flip to (x, y)
    best, best_area = None, 0.0
    for c in contours:
        xy = np.stack([c[:, 1], c[:, 0]], axis=1)
        area = abs(_polygon_area(xy))
        if area > best_area:
            best, best_area = xy, area
    if best is None or best_area < MIN_AREA:
        return None
    return best


def _polygon_area(p: np.ndarray) -> float:
    x, y = p[:, 0], p[:, 1]
    return 0.5 * float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def _resample_ring(points: np.ndarray, spacing: float, min_pts: int = 8) -> np.ndarray:
    """Resample a closed contour to roughly even spacing along its arc length.

    Deliberately not Ramer-Douglas-Peucker. RDP keeps only high-curvature
    points, so a long smooth silhouette (an arm, a skirt) collapses to a handful
    of vertices and triangulates into a few slivers that deform terribly. Even
    spacing gives predictable density and cannot collapse.
    """
    closed = np.vstack([points, points[:1]])
    seg = np.hypot(*np.diff(closed, axis=0).T)
    arc = np.concatenate([[0.0], np.cumsum(seg)])
    total = float(arc[-1])
    if total < 1e-6:
        return points

    n = max(min_pts, int(round(total / max(spacing, 1e-6))))
    targets = np.linspace(0.0, total, n, endpoint=False)
    xs = np.interp(targets, arc, closed[:, 0])
    ys = np.interp(targets, arc, closed[:, 1])
    return np.stack([xs, ys], axis=1)


def _interior_points(mask: np.ndarray, spacing: float) -> np.ndarray:
    """Grid points strictly inside the mask, for interior deformability."""
    h, w = mask.shape
    ys = np.arange(spacing, h - 1, spacing)
    xs = np.arange(spacing, w - 1, spacing)
    if len(xs) == 0 or len(ys) == 0:
        return np.zeros((0, 2), np.float64)
    gx, gy = np.meshgrid(xs, ys)
    pts = np.stack([gx.ravel(), gy.ravel()], axis=1)
    # keep only points well inside, so triangulation does not spill outside
    keep = [mask[int(y), int(x)] and _inset_ok(mask, int(x), int(y), spacing * 0.35)
            for x, y in pts]
    return pts[np.array(keep, dtype=bool)] if any(keep) else np.zeros((0, 2), np.float64)


def _inset_ok(mask: np.ndarray, x: int, y: int, r: float) -> bool:
    ri = max(1, int(r))
    h, w = mask.shape
    x0, x1 = max(0, x - ri), min(w, x + ri + 1)
    y0, y1 = max(0, y - ri), min(h, y + ri + 1)
    return bool(mask[y0:y1, x0:x1].all())


def build_mesh(
    png_path: str,
    offset_x: float,
    offset_y: float,
    canvas_w: int,
    canvas_h: int,
    pixels_per_unit: float = 1.0,
    spacing: float = DEFAULT_SPACING,
) -> Mesh | None:
    """Triangulate one layer PNG.

    offset_x/y is the layer's top-left in canvas pixel coordinates -- the PNGs
    from stage 1 are trimmed to their bounding box, so UVs must be computed
    against the full canvas, not the trimmed image.
    """
    try:
        import triangle as tr
    except ImportError as e:                                  # pragma: no cover
        raise SystemExit("pip install triangle") from e

    img = Image.open(png_path).convert("RGBA")
    alpha = np.array(img)[:, :, 3]
    mask = alpha > ALPHA_THRESHOLD
    if not mask.any():
        return None

    contour = _largest_contour(mask)
    if contour is None:
        return None
    # Boundary spacing finer than the interior grid, so silhouettes stay smooth.
    ring = _resample_ring(contour, spacing * 0.6)
    if len(ring) < 3:
        return None

    interior = _interior_points(mask, spacing)
    pts = np.vstack([ring, interior]) if len(interior) else ring
    segs = np.array([[i, (i + 1) % len(ring)] for i in range(len(ring))])

    # p = planar straight line graph (respect the boundary segments)
    # q20 = enforce a 20 deg minimum angle, which removes sliver triangles;
    #       slivers deform into visible creases once a warp pulls on them.
    # Y  = do not add points on the boundary, so the silhouette stays exactly
    #      where _resample_ring put it.
    # Q  = quiet.
    try:
        out = tr.triangulate({"vertices": pts, "segments": segs}, "pq20YQ")
    except Exception:
        try:
            out = tr.triangulate({"vertices": pts, "segments": segs}, "pQ")
        except Exception:
            return None
    if "triangles" not in out or len(out["triangles"]) == 0:
        return None

    verts_px = np.asarray(out["vertices"], dtype=np.float64)
    tris = np.asarray(out["triangles"], dtype=np.int64)

    # triangle may drop unused points; keep the arrays consistent
    if len(verts_px) > 65535:
        return None

    # pixel (layer-local, Y-down) -> canvas pixel -> model space (Y-up, centred)
    canvas_px = verts_px + np.array([offset_x, offset_y])
    uvs = np.stack([canvas_px[:, 0] / canvas_w,
                    1.0 - canvas_px[:, 1] / canvas_h], axis=1)
    model = np.stack([(canvas_px[:, 0] - canvas_w / 2.0) / pixels_per_unit,
                      (canvas_h / 2.0 - canvas_px[:, 1]) / pixels_per_unit], axis=1)

    # Cubism winds triangles CCW in model space; the Y flip reverses handedness
    tris = tris[:, ::-1]

    return Mesh(
        verts=model.astype(np.float32),
        uvs=uvs.astype(np.float32),
        indices=tris.ravel().astype(np.uint16),
    )


# ponytail: ~0.5% of triangles are still slivers, all on the boundary ring
# where flag Y forbids inserting points. Dropping Y would let triangle fix them
# but would also move the silhouette off the traced contour. If creasing shows
# up on a real rig, drop Y and re-trace instead of raising q.
