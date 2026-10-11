"""moc3 container reader/writer driven by the generated section table.

Layout, in order:
    0x00  "MOC3" magic, u8 version, u8 endian(0=LE), padding to 0x40
    0x40  section offset table (SOT): u32 per section, NUM_SOT slots
    0x280 body -- each section at its SOT offset, 64-byte aligned

Section order and element types come from _layout.SECTIONS, which is generated
from PurismCore's moc3.h. Sections whose min_version exceeds the file version
are absent entirely (no SOT slot, no bytes).
"""
from __future__ import annotations

import struct
from dataclasses import dataclass, field
from pathlib import Path

from ._layout import COUNT_FIELDS, COUNT_IDX, SECTIONS

_SECTION_NAMES = {s[0] for s in SECTIONS}

MAGIC = b"MOC3"
HEADER_SIZE = 0x40
NUM_SOT = 480             # u32 slots; verified against Hiyori/Mark/Haru
BODY_OFFSET = 0x7C0       # 0x40 + 480*4 == 1984
ALIGN = 64
COUNT_INFO_SIZE = 128     # verified from SOT deltas on Hiyori/Mark/Haru
CANVAS_INFO_SIZE = 64
# Purism's count_info struct lists 39 fields (it covers up to moc 5.3), but a
# v3/v4 file only stores the first 32 -- the section is 128 bytes on disk.
N_COUNTS_ON_DISK = COUNT_INFO_SIZE // 4

# on-disk size per element
ELEM_SIZE = {
    "I32": 4, "F32": 4, "U16": 2, "U8": 1, "STR64": 64, "RUNTIME_PTR": 8,
}
ELEM_FMT = {"I32": "<i", "F32": "<f", "U16": "<H", "U8": "<B"}

# moc3 version byte -> the "min_version" tier a section must satisfy
#   1 = 3.0, 2 = 3.3, 3 = 4.0, 4 = 4.2, 5 = 5.0, 6 = 5.3
# A v4.0 file (byte 3) carries V30 + V33 sections but not V42.


def _align(n: int, a: int = ALIGN) -> int:
    return (n + a - 1) // a * a


@dataclass
class CanvasInfo:
    pixels_per_unit: float = 1.0
    origin_x: float = 0.0
    origin_y: float = 0.0
    canvas_width: float = 1200.0
    canvas_height: float = 1600.0
    canvas_flag: int = 1


@dataclass
class Moc3:
    version: int = 3                       # 3 == moc 4.0, what Cubism 4/5 emit
    counts: list[int] = field(default_factory=lambda: [0] * len(COUNT_FIELDS))
    canvas: CanvasInfo = field(default_factory=CanvasInfo)
    sections: dict[str, list] = field(default_factory=dict)

    # -- counts by name, so callers never index by magic number --

    def set_count(self, name: str, n: int) -> None:
        self.counts[COUNT_IDX[name]] = n

    def get_count(self, name: str) -> int:
        return self.counts[COUNT_IDX[name]]

    def layout(self) -> list[tuple[str, str, str | None, int]]:
        """Sections present in a file of this version, in on-disk order."""
        return [s for s in SECTIONS if s[3] <= self.version]

    def __getitem__(self, name: str) -> list:
        return self.sections[name]

    def __setitem__(self, name: str, value: list) -> None:
        # Reject unknown section names loudly. A typo here is otherwise silent:
        # the section is never written, the field stays zero-filled, and the
        # failure surfaces much later as an out-of-bounds offset. Cost real
        # debugging time via "uv_src.uv" (the real name is "uv_src.xy").
        if name not in _SECTION_NAMES:
            group = name.split(".")[0]
            siblings = sorted(n.split(".", 1)[1] for n in _SECTION_NAMES
                              if n.startswith(group + "."))
            hint = f" -- {group} has: {siblings}" if siblings else ""
            raise KeyError(f"unknown moc3 section {name!r}{hint}")
        self.sections[name] = value

    # -- read --

    @classmethod
    def from_bytes(cls, data: bytes) -> "Moc3":
        if data[:4] != MAGIC:
            raise ValueError("not a moc3 file")
        moc = cls(version=data[4])
        if data[5] != 0:
            raise ValueError("big-endian moc3 not supported")

        sot = list(struct.unpack_from(f"<{NUM_SOT}I", data, HEADER_SIZE))

        for i, (name, etype, cfield, _v) in enumerate(moc.layout()):
            off = sot[i]
            if name == "count_info":
                on_disk = list(struct.unpack_from(f"<{N_COUNTS_ON_DISK}i", data, off))
                moc.counts = on_disk + [0] * (len(COUNT_FIELDS) - N_COUNTS_ON_DISK)
                continue
            if name == "canvas_info":
                ppu, ox, oy, cw, ch = struct.unpack_from("<5f", data, off)
                flag = data[off + 20]
                moc.canvas = CanvasInfo(ppu, ox, oy, cw, ch, flag)
                continue

            n = moc.counts[COUNT_IDX[cfield]]
            if n == 0 or off == 0:
                moc.sections[name] = []
                continue
            moc.sections[name] = _read(data, off, etype, n)

        return moc

    # -- write --

    def to_bytes(self) -> bytes:
        body = bytearray()
        sot = []

        prev_runtime = False
        for name, etype, cfield, _v in self.layout():
            # Every section starts 64-byte aligned, EXCEPT one that follows a
            # RUNTIME_PTR section -- those pointer tables are packed flush.
            # Verified against Hiyori/Mark/Haru; this is the whole reason a
            # naive rewrite comes out 64 bytes long per runtime section.
            if not (prev_runtime and etype != "RUNTIME_PTR"):
                while len(body) % ALIGN:
                    body.append(0)
            prev_runtime = etype == "RUNTIME_PTR"
            sot.append(BODY_OFFSET + len(body))

            if name == "count_info":
                body += struct.pack(f"<{N_COUNTS_ON_DISK}i", *self.counts[:N_COUNTS_ON_DISK])
                body += bytes(COUNT_INFO_SIZE - N_COUNTS_ON_DISK * 4)
                continue
            if name == "canvas_info":
                c = self.canvas
                blob = struct.pack("<5f", c.pixels_per_unit, c.origin_x, c.origin_y,
                                   c.canvas_width, c.canvas_height) + bytes([c.canvas_flag])
                body += blob
                continue

            n = self.counts[COUNT_IDX[cfield]]
            body += _write(self.sections.get(name, []), etype, n)

        out = bytearray()
        out += MAGIC + bytes([self.version, 0]) + bytes(HEADER_SIZE - 6)
        sot_full = sot + [0] * (NUM_SOT - len(sot))
        out += struct.pack(f"<{NUM_SOT}I", *sot_full)
        out += bytes(BODY_OFFSET - len(out))
        assert len(out) == BODY_OFFSET
        out += body
        while len(out) % ALIGN:
            out.append(0)
        return bytes(out)

    @classmethod
    def from_file(cls, path: str | Path) -> "Moc3":
        return cls.from_bytes(Path(path).read_bytes())

    def to_file(self, path: str | Path) -> None:
        Path(path).write_bytes(self.to_bytes())


def _read(data: bytes, off: int, etype: str, n: int) -> list:
    if etype == "RUNTIME_PTR":
        return []                                    # zero-filled on disk
    if etype == "STR64":
        return [data[off + i * 64: off + i * 64 + 64].split(b"\0")[0].decode("utf-8", "replace")
                for i in range(n)]
    fmt = ELEM_FMT[etype]
    sz = ELEM_SIZE[etype]
    return [struct.unpack_from(fmt, data, off + i * sz)[0] for i in range(n)]


def _write(vals: list, etype: str, n: int) -> bytes:
    if etype == "RUNTIME_PTR":
        return bytes(n * ELEM_SIZE["RUNTIME_PTR"])
    if etype == "STR64":
        out = bytearray()
        for i in range(n):
            s = (vals[i] if i < len(vals) else "").encode("utf-8")[:63]
            out += s + bytes(64 - len(s))
        return bytes(out)
    fmt = ELEM_FMT[etype]
    default = 0.0 if etype == "F32" else 0
    out = bytearray()
    for i in range(n):
        out += struct.pack(fmt, vals[i] if i < len(vals) else default)
    return bytes(out)
