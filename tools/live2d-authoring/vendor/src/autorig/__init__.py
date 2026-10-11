"""Live2D autorig pipeline (stages 1-5)."""
import sys as _sys
from pathlib import Path as _Path

# The moc3 package is a sibling under src/. Making the import work regardless of
# how the pipeline is invoked (module, script, or installed) keeps the CLI and
# the tests from needing different sys.path setups.
_src = str(_Path(__file__).resolve().parent.parent)
if _src not in _sys.path:
    _sys.path.insert(0, _src)
