"""Prepare the v60 promotion gate and preserve bounded manual art findings."""
import json
from pathlib import Path
HERE=Path(__file__).resolve().parent
visual={'version':60,'tailRepairAccepted':True,'earLayerOrderAccepted':True,'formalArtComplete':False,
 'scope':'Eight official SDK ear/cuff poses manually inspected, including AngleX +/-17, AngleY +/-6, AngleZ +/-11 and combined8/6/4. Compared with v59: top straight crop edge is concealed by hair and lower horizontal overlay cut is reduced. Remaining deformed sleeve/hair contour seams are not final art acceptance.',
 'earProofFolder':'build/neck-seam-v60-20261008','tailProofFolder':'build/keyboard-tail-v60-20261008',
 'geometryBaseline':59,'all43GeometriesPreserved':True,'onlyDrawOrderChange':{'ArtMesh33':385}}
(HERE/'build/left-tail-v60-visual-acceptance-20261008.json').write_text(json.dumps(visual,indent=2)+'\n',encoding='utf-8')
s=(HERE/'publish_v59_desktop.py').read_text(encoding='utf-8').replace('v59','v60').replace('V59','V60')
s=s.replace("'nativeKeyboardReplacement','continuous'", "'nativeKeyboardReplacement','nativeEarOcclusion','continuous'")
s=s.replace("not visual['tailRepairAccepted']", "not visual['tailRepairAccepted'] or not visual['earLayerOrderAccepted']")
s=s.replace("('0.6.2','0.6.3')", "('0.6.3','0.6.4')").replace("='0.6.3'", "='0.6.4'")
s=s.replace("replace('0.6.2','0.6.3')", "replace('0.6.3','0.6.4')").replace("='0.11.3'", "='0.11.4'")
s=s.replace('键盘朝向已替换，键盘为可替换生成素材。耳饰裁边、精细分层和大角度接缝仍需精修。',
            '键盘朝向已替换，键盘为可替换生成素材；左耳连接层遮挡已调整。精细分层和大角度头颈/袖口接缝仍需精修。')
s=s.replace('desktop 0.6.3','desktop 0.6.4')
(HERE/'publish_v60_desktop.py').write_text(s,encoding='utf-8')
print('Prepared v60 native ear-order promotion gate and bounded visual acceptance.')
