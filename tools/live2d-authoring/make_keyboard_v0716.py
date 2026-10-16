"""Perspective keycaps on the existing v71 keyboard plane; no rig export changes."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'public/models/changli/assets/keyboard-changli-v0716.svg'
# A compact four-row illustration: modifiers/Space plus three letter rows.
# The hidden number row is omitted visually; native input still covers all keys.
# Unit weights preserve the mirrored character-facing Space/Enter/Shift layout.
physical_rows = [
    [1.5]+[1]*12+[1.5],
    [1.75]+[1]*11+[2.25],
    [2.25]+[1]*10+[2.75],
    [1.25]*3+[6.25]+[1.25]*4,
]
rows = [list(reversed(row)) for row in reversed(physical_rows)]
parts = ['''<svg xmlns="http://www.w3.org/2000/svg" width="926" height="160" viewBox="0 0 926 160">
<defs>
<linearGradient id="shell" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#6b515d"/><stop offset="1" stop-color="#302633"/></linearGradient>
<linearGradient id="ivory" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#fffdf5"/><stop offset="1" stop-color="#f4dfcb"/></linearGradient>
<linearGradient id="coral" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#ffb5a7"/><stop offset="1" stop-color="#e98682"/></linearGradient>
<linearGradient id="ink" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#806674"/><stop offset="1" stop-color="#594250"/></linearGradient>
<linearGradient id="front" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#56404e"/><stop offset="1" stop-color="#302631"/></linearGradient>
<linearGradient id="ivoryFace" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e7c7ad"/><stop offset="1" stop-color="#cfa28c"/></linearGradient>
<linearGradient id="coralFace" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e98e83"/><stop offset="1" stop-color="#b65560"/></linearGradient>
<linearGradient id="inkFace" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#725567"/><stop offset="1" stop-color="#41323f"/></linearGradient>
</defs>
<g transform="translate(18.52 .16) scale(.96)">
<path d="M49 3H877L919 112V146Q919 157 907 157H19Q7 157 7 146V112Z" fill="url(#shell)" stroke="#29232f" stroke-width="3.4"/>
<path d="M50 5H876L912 112H14Z" fill="#a97a75" stroke="#e8c4a3" stroke-width="1.7"/>
<path d="M56 10H870L904 105H22Z" fill="#372c35" stroke="#5b424a" stroke-width="2"/>
<path d="M11 116H915V146Q915 152 907 152H19Q11 152 11 146Z" fill="url(#front)"/>
<path d="M20 112H906" stroke="#e4b293" stroke-width="1.5"/>
<path d="M19 118H907" stroke="#211d29" stroke-width="2" opacity=".8"/>
''']
def point(u, y):
    width = 790 + (y-10)*.85
    return f'{463+(u/15-.5)*width:.2f},{y:.2f}'
def poly(coords, fill, stroke=None, sw=.7):
    line=' '.join(point(x,y) for x,y in coords)
    return f'<polygon points="{line}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else '')+'/>'
for row_index,row in enumerate(rows):
    assert abs(sum(row)-15)<.001
    y=[12,30,51,75][row_index]
    depth=[10,12,14,16][row_index]
    thickness=[6,7,8,10][row_index]
    x=0
    for index,weight in enumerate(row):
        l,r=x+.055,x+weight-.055
        back,front=y,y+depth
        shade='coral' if index in (0,len(row)-1) else 'ivory'
        if row_index in (0,3) and index in (1,len(row)-2): shade='ink'
        side={'coral':'#ba5a62','ivory':'#c19b88','ink':'#493644'}[shade]
        bevel={'coral':'#e08b82','ivory':'#e4c8b0','ink':'#6b505e'}[shade]
        # The cap is a solid raised object: tapered top, broad front face,
        # narrow side bevels and a separate contact shadow on the plate.
        parts.append(poly([(l-.035,front+2),(r+.035,front+2),(r+.06,front+thickness+2),(l-.06,front+thickness+2)],'#211d2a'))
        parts.append(poly([(l-.04,front),(r+.04,front),(r+.01,front+thickness),(l-.01,front+thickness)],f'url(#{shade}Face)','#63474b',.65))
        parts.append(poly([(l+.07,back),(r-.07,back),(r+.04,front),(l-.04,front)],bevel,'#f3cfb5',.55))
        parts.append(poly([(l+.14,back+1.6),(r-.14,back+1.6),(r-.09,front-2.7),(l+.09,front-2.7)],f'url(#{shade})'))
        parts.append(poly([(l-.04,front),(l+.09,front-2.7),(r-.09,front-2.7),(r+.04,front)],'#eed5bc' if shade=='ivory' else bevel))
        parts.append(poly([(r-.07,back),(r+.04,front),(r+.01,front+thickness),(r-.11,front-2.7)],side))
        parts.append(f'<path d="M{point(l+.15,back+1.7)} L{point(r-.15,back+1.7)}" stroke="#fffdf5" stroke-width="1.15" opacity=".95"/>')
        if weight==6.25:
            mid=(l+r)/2
            parts.append(f'<path d="M{point(mid-.65,back+6)} L{point(mid+.65,back+6)}" stroke="#c99870" stroke-width="1.1" opacity=".65"/>')
        if row_index==1 and index in (4,7):
            parts.append(f'<path d="M{point((l+r)/2-.09,back+4)} L{point((l+r)/2+.09,back+4)}" stroke="#bd937c" stroke-width="1.3" stroke-linecap="round"/>')
        x+=weight
parts+=['''<path d="M28 148l10-6h28l-10 6Zm803 0 10-6h24l-10 6Z" fill="#de7b7e"/>
<path d="M380 146H541" stroke="#ad825f" stroke-width="1.4" stroke-linecap="round"/>
<g fill="none" stroke="#d9ad75" stroke-width="1.4" stroke-linecap="round" transform="translate(880 139)">
<path d="M0 3c-5-4-7-1-4 2l4 1c4-5 7-5 7-2 0 2-3 3-7 2Zm0 3v6m0-3-3 3m3-3 3 3"/>
</g></g></svg>''']
OUTPUT.write_text('\n'.join(parts)+'\n',encoding='utf-8')
print(OUTPUT)
