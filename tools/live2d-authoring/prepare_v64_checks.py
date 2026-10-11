"""Use the same strict v63 regression for the native closure positioning pass."""
from pathlib import Path
HERE = Path(__file__).resolve().parent
checks = (HERE / 'reference-repair-v63-checks.js').read_text(encoding='utf-8')
(HERE / 'reference-repair-v64-checks.js').write_text(checks, encoding='utf-8')
preview = (HERE / 'reference-repair-v63-preview.html').read_text(encoding='utf-8')
assert 'const version = 63;' in preview
(HERE / 'reference-repair-v64-preview.html').write_text(
    preview.replace('v63','v64').replace('V63','V64').replace('const version = 63;','const version = 64;'), encoding='utf-8')
p = HERE / 'verify_reference_repair.cjs'
s = p.read_text(encoding='utf-8')
if '[64, 63,' not in s:
    assert '[63, 62,' in s
    p.write_text(s.replace('[63, 62,','[64, 63, 62,'), encoding='utf-8')
(HERE / 'build/editor-export-reference-repair-v64-20261006').mkdir(exist_ok=True)
print('Prepared strict v64 verification against v60; candidate identity guard enabled.')
