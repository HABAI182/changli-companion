from pathlib import Path
HERE = Path(__file__).resolve().parent
s = (HERE/'reference-repair-v52-preview.html').read_text(encoding='utf-8')
(HERE/'reference-repair-v53-preview.html').write_text(s.replace('v52','v53').replace('V52','V53'), encoding='utf-8')
p=HERE/'verify_reference_repair.cjs'
s=p.read_text(encoding='utf-8')
if '[53, 52,' not in s:
    p.write_text(s.replace('[52, 51,','[53, 52, 51,'), encoding='utf-8')
s=(HERE/'reference-repair-v52-checks.js').read_text(encoding='utf-8')
s=s.replace('v51-candidate/ChangliReferenceRepairV51.moc3','v52-candidate/ChangliReferenceRepairV52.moc3').replace('Core rejected v51 baseline','Core rejected v52 baseline')
s=s.replace("id!=='ArtMesh38'", "!['ArtMesh38','ArtMesh41'].includes(id)").replace('baselineVersion:51','baselineVersion:52')
s=s.replace('pass:Math.max(...contourDelta)<.03','pass:contourDelta.filter(v=>v>.03).length>0&&contourDelta.filter(v=>v>.03).length<=8&&Math.max(...contourDelta)<25')
s=s.replace('report.pass=report.nativeLeftOrnament.pass', """const fi=ids.indexOf('ArtMesh41'),fo=oldIds.indexOf('ArtMesh41');
 const faceNow=pose(model)[fi],faceOld=pose(baselineModel)[fo];
 const faceDelta=faceNow.map((v,k)=>Math.abs(v-faceOld[k])*ppu);
 report.nativeFaceContour={changedCoordinates:faceDelta.filter(v=>v>.03).length,maxPixels:Math.max(...faceDelta),pass:faceDelta.filter(v=>v>.03).length>0&&faceDelta.filter(v=>v>.03).length<=8&&Math.max(...faceDelta)<25};
 report.pass=report.nativeFaceContour.pass&&report.nativeLeftOrnament.pass""")
(HERE/'reference-repair-v53-checks.js').write_text(s,encoding='utf-8')
(HERE/'build/editor-export-reference-repair-v53-20261006').mkdir(exist_ok=True)
print('Prepared v53 native contour regression review against verified v52')
