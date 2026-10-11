"""Prepare read-only QA for the native left-ornament/upper-hair contour edit."""
from pathlib import Path

HERE=Path(__file__).resolve().parent
if __name__=='__main__':
    page=(HERE/'reference-repair-v35-preview.html').read_text(encoding='utf-8')
    page=page.replace('const version = 35;', 'const version = 36;').replace('reference-repair-v35-checks.js','reference-repair-v36-checks.js')
    page=page.replace('左侧羽状底边与发束交界核对 · v35','左上发饰和头顶残白核对 · v36')
    (HERE/'reference-repair-v36-preview.html').write_text(page,encoding='utf-8')
    checks=(HERE/'reference-repair-v35-checks.js').read_text(encoding='utf-8')
    checks=checks.replace('v32-candidate/ChangliReferenceRepairV32.moc3','v35-candidate/ChangliReferenceRepairV35.moc3').replace('v32 baseline','v35 baseline')
    checks=checks.replace("changed='ArtMesh31'", "changed='ArtMesh38'").replace('vertexCount===33','vertexCount===108').replace('baselineVersion:32','baselineVersion:35')
    # Four observed native drags at 75% display zoom (0.5 screenshot px / source px).
    # Small tolerance covers the Editor's native integer screen sampling.
    start=checks.index(' const expected=new Map(')
    end=checks.index(' report.regressions=',start)
    checks=checks[:start]+''' const expected=new Map([[6,[10,10]],[13,[8,2]],[20,[8,4]],[32,[18,8]]]);
 report.contourRepair={mesh:changed,changes,pass:changes.length===4&&changes.every(c=>expected.has(c.vertex)&&c.delta.every((v,k)=>Math.abs(v-expected.get(c.vertex)[k])<1.5))};
'''+checks[end:]
    (HERE/'reference-repair-v36-checks.js').write_text(checks,encoding='utf-8')
    print('Prepared v36 read-only contour QA against passed v35')
