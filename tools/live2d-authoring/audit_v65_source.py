"""Prepare the existing read-only official Core source audit for v64->v65."""
from pathlib import Path
HERE = Path(__file__).resolve().parent
s = (HERE/'audit_native_source_export.cjs').read_text(encoding='utf-8')
s = s.replace('v60','v64').replace('V60','V64').replace('v61','v65').replace('V61','V65')
s = s.replace('sourceVersion:61,baselineVersion:60','sourceVersion:65,baselineVersion:64')
(HERE/'audit_v65_source.cjs').write_text(s,encoding='utf-8')
p = (HERE/'complete_source_audit.py').read_text(encoding='utf-8')
p = p.replace('v60','v64').replace('v61','v65').replace("report['publishedModelVersion'] = 60", "report['publishedModelVersion'] = 60")
# Do not append a hard-coded historical stage description. Emit only the audit.
p = p[:p.index('    section = ')] + "    print(json.dumps({'pass': report['pass'], 'mocIdentical': report['baselineMocSha256'] == report['newMocSha256'], 'atlasCount': len(textures), 'sourceSha256': report['sourceSha256']}, indent=2))\n\nif __name__ == '__main__':\n    main()\n"
(HERE/'complete_v65_source_audit.py').write_text(p,encoding='utf-8')
print('Prepared read-only official v65 source audit against verified v64.')
