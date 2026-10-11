"""Editable vector keyboard: rotated toward Changli, with four landing zones."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
s=['<svg xmlns="http://www.w3.org/2000/svg" width="926" height="160" viewBox="0 0 926 160">',
   '<defs><linearGradient id="cap" x2="0" y2="1"><stop stop-color="#fff7ed"/><stop offset="1" stop-color="#e9cdbd"/></linearGradient></defs>',
   '<path d="M48 3H878L918 125V148Q918 157 908 157H18Q8 157 8 148V125Z" fill="#4b3c43" stroke="#342b33" stroke-width="5"/>',
   '<path d="M51 9H875L904 124H22Z" fill="#6a5056"/>']
# Spacebar is on the character-facing edge. Home/bottom rows above Q/numbers,
# and all labels are oriented for the character, not for the viewer.
rows=[[(1,1),(1,1),(1,1),(6,0),(1,1),(1,1),(1,1)],[(1.7,1)]+[(1,0)]*10+[(1.3,1)],[(1.4,1)]+[(1,0)]*11+[(1.6,1)],[(1,1)]+[(1,0)]*12+[(1,1)]]
for r,row in enumerate(rows):
    y=13+r*27;inset=44-r*7;avail=926-inset*2;unit=avail/sum(w for w,_ in row);x=inset
    for j,(w,accent) in enumerate(row):
        color='#ef8c85' if accent and j in [0,len(row)-1] else 'url(#cap)'
        if r<2 and color=='url(#cap)': color='#ffe2d2'
        s.append(f'<rect x="{x+2:.1f}" y="{y}" width="{unit*w-4:.1f}" height="24" rx="3" fill="#b99485" stroke="#533f42" stroke-width="1.5"/>')
        s.append(f'<rect x="{x+5:.1f}" y="{y+2}" width="{unit*w-10:.1f}" height="17" rx="2" fill="{color}"/>')
        if r==0 and w==6:
            s.append(f'<path d="M{(x+unit*w/2)-10:.1f} {y+10}q10 -6 20 0q-10 6 -20 0" fill="#efaaa0"/>')
        x+=unit*w
# Quiet center seam makes the two lateral regions legible, not a UI grid.
s+=['<path d="M463 42V116" stroke="#805d5c" stroke-width="2" opacity=".5"/>',
    '<path d="M17 133H909" stroke="#a36d67" stroke-width="2"/>',
    '<path d="M800 142l12 -7 13 7 -13 6z" fill="#e9be85"/>','</svg>']
p=root/'public/models/changli/assets/keyboard-four-zones.svg';p.parent.mkdir(exist_ok=True);p.write_text('\n'.join(s)+'\n',encoding='utf-8');print(p)
