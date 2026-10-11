"""Non-destructive format roundtrip probe; not a publish/acceptance operation."""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / 'vendor/src'))
from moc3.io import Moc3

source = HERE.parents[1] / 'public/models/changli/live-reference-repair-v44-candidate/ChangliReferenceRepairV44.moc3'
target = HERE / 'build/vector-authoring-roundtrip.moc3'
m = Moc3.from_file(source)
m.to_file(target)
print(target, target.stat().st_size)
