"""moc3 binary container reader/writer.

Section table is generated from PurismCore's moc3.h by tools/gen_layout.py.
"""
from .io import CanvasInfo, Moc3
from ._layout import COUNT_FIELDS, COUNT_IDX, SECTIONS

__all__ = ["Moc3", "CanvasInfo", "COUNT_FIELDS", "COUNT_IDX", "SECTIONS"]
