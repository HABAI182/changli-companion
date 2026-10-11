"""Edit known numeric sections while preserving the native container verbatim.

This is runtime vector authoring, not a CMO3 editor. Source CMO3 stays intact.
Every output must pass official Core consistency and geometry validation.
"""
import struct
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / 'vendor/src'))
from moc3.io import Moc3
from moc3._layout import SECTIONS, COUNT_IDX

class NativeSections:
    def __init__(self, path):
        self.data = bytearray(Path(path).read_bytes())
        self.model = Moc3.from_bytes(self.data)
        self.layout = [s for s in SECTIONS if s[3] <= self.model.version]
        self.slots = {s[0]: i for i, s in enumerate(self.layout)}

    def offset(self, section):
        return struct.unpack_from('<I', self.data, 64 + self.slots[section] * 4)[0]

    def set_value(self, section, index, value):
        _, kind, _, _ = self.layout[self.slots[section]]
        formats = {'I32': ('<i',4), 'F32': ('<f',4), 'U16': ('<H',2), 'U8': ('<B',1)}
        fmt, size = formats[kind]
        struct.pack_into(fmt, self.data, self.offset(section) + index * size, value)
        self.model[section][index] = value

    def append_section(self, section, values):
        _, kind, _, _ = self.layout[self.slots[section]]
        formats = {'I32': '<i', 'F32': '<f', 'U16': '<H', 'U8': '<B'}
        if kind not in formats:
            raise ValueError('Unsupported section relocation: ' + section)
        while len(self.data) % 64:
            self.data.append(0)
        offset = len(self.data)
        for value in values:
            self.data.extend(struct.pack(formats[kind], value))
        struct.pack_into('<I', self.data, 64 + self.slots[section] * 4, offset)
        self.model[section] = list(values)

    def set_count(self, name, value):
        struct.pack_into('<i', self.data, self.offset('count_info') + COUNT_IDX[name]*4, value)
        self.model.set_count(name, value)

    def save(self, path):
        while len(self.data) % 64:
            self.data.append(0)
        Path(path).write_bytes(self.data)

if __name__ == '__main__':
    source = HERE.parents[1] / 'public/models/changli/live-reference-repair-v44-candidate/ChangliReferenceRepairV44.moc3'
    native = NativeSections(source)
    i = native.model['art_mesh_src.id'].index('ArtMesh40')
    key = native.model['art_mesh_src.keyform_off'][i]
    native.set_value('art_mesh_key_src.opacity', key, .99)
    native.save(HERE / 'build/vector-authoring-inplace.moc3')
    # Separate relocation probe: preserve all opaque sections and move only XY.
    native = NativeSections(source)
    native.append_section('key_pos_src.xy', native.model['key_pos_src.xy'])
    native.save(HERE / 'build/vector-authoring-relocated.moc3')
