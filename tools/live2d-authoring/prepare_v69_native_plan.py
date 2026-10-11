"""Prepare an isolated native geometry iteration; no binary model editing."""
import hashlib,json,shutil
from pathlib import Path
HERE=Path(__file__).resolve().parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
baseline=HERE/'build/ChangliReferenceRepair-v64-20261006.cmo3'
prov=json.loads((HERE/'build/reference-repair-v64-provenance-20261006.json').read_text(encoding='utf-8'))
assert sha(baseline)==prov['authoringSha256']
candidate=HERE/'ChangliReferenceRepair-v69-candidate.cmo3'
if not candidate.exists():shutil.copy2(baseline,candidate)
assert sha(candidate)==sha(baseline),'Do not overwrite edited native work'
probe=json.loads((HERE/'build/blink-v68-layer-probe-20261009.json').read_text())
sample=next(s for s in probe['samples'] if s['time']==4060)
meshes={m['id']:m for m in sample['meshes']}
metrics={id:{'opacity':meshes[id]['opacity'],'sourceBounds':[627+min(meshes[id]['vertices'][::2]),627-max(meshes[id]['vertices'][1::2]),627+max(meshes[id]['vertices'][::2]),627-min(meshes[id]['vertices'][1::2])]} for id in ['EyeLeft2','EyeRight2','ArtMesh42','ArtMesh43']}
plan={'version':69,'nativeEdited':False,'officialExportExists':False,'basedOnVerifiedNative':64,'baselineSourceSha256':sha(baseline),'candidateSourceSha256':sha(candidate),'currentDesktopModel':68,'goal':'Align near-closed native contour geometry, then retain complementary contour opacity instead of reducing both contours to faint values.','probeTimeMs':4060,'opening':sample['opening'],'metrics':metrics,'formalArtComplete':False}
(HERE/'build/v69-native-plan-20261009.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
guide='''# v69 原生眨眼衔接施工单（未编辑、未导出）

当前运行版是0.6.7/v68。正式美术未完工，严禁把本施工单或未编辑v69当作交付。

原生候选已从经过验证的v64源另存：ChangliReferenceRepair-v69-candidate.cmo3。这一基线已经包含右眼闭合变形、正向网格、半闭平衡、尾羽、键盘和耳饰修正。v68没有改变这些几何，主要改变透明度。选择v64基线是为保留完整互补关键帧，减少重建透明度的操作，不重做已通过功能。已发布v68不覆盖。

实际Core/Adapter在4060ms、开眼参数0.103515625：原眼轮廓0.08710，闭眼睫毛0.13737，总和仅0.22448。二者同时很淡且处于不同高度，所以只缩窄淡入淡出窗口虽减少重影，却不能解决自然过渡。这不是输入时序故障，继续调随机眨眼间隔无效。眼白遮罩与原眼透明度已一致，不再重复修遮罩。

下一步在原生Cubism：

1. 打开v69隔离候选，先恢复默认姿态。选择EyeLeftClose以及EyeRightClose/Warp5，分别进入ParamEyeLOpen/ParamEyeROpen=0的已存在原生关键形。只调整闭合端点，0.35和1的关键形保留。
2. 对照闭眼睫毛ArtMesh42、43，向下对齐原眼轮廓的收拢位置，必要时微调曲率。以下数值只是网格包围盒诊断，贴图透明留白不等于可见睫毛边界，不能直接用包围盒中心宣布对齐。必须以实际SDK逐帧渲染验收。禁止通过修改MOC3二进制实现。
3. 保留完整0、0.35、1关键帧及互补透明度（原轮廓0/1/1，闭眼睫毛1/0/0），让两条已经对齐的轮廓交接时保持足够强度。不要再把两个图层一起压到很淡。
4. Ctrl+S后保留未使用PSD，等待保存结束，再创建校验备份。由官方Editor导出到新的v69目录。源与导出配对之后再启动检查，不把未导出候选发布到桌宠。
5. 只允许原眼轮廓、眼白、虹膜这六个受闭眼变形器影响的图层，在对应开眼参数小于0.35时改变几何。其余图层、默认/半闭姿态、UV/拓扑/顺序/遮罩、手部输入、尾羽和键盘必须保持。检查翻折、完整闭合、独立左右眼、视线叠加、原生物理，再检查实际Adapter的12帧开闭序列。需要重新构建时如实记录当前受限环境可能产生的访问拒绝。

当前电脑操作工具拒绝Java/Cubism与桌宠；93%恢复尚未执行。已有Windows125%缩放证据只覆盖这个单次验证，没有新版退出重开/多DPI/安装卸载验收。既有0.6.6实机证据不得挪作新版全部通过。
'''
(HERE/'NEXT-NATIVE-BLINK-V69.md').write_text(guide,encoding='utf-8')
print('Saved isolated v69 native source and measured work plan; v69 is not edited or exported.')
