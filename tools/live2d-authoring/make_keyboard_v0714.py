"""Character-facing vector keyboard, same canvas and hand landing rows as v0810."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'public/models/changli/assets'

hairpin = '''<g fill="#29232d" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">
<path d="M11.4 11C8 7.8 7.6 3.3 10.3 1.8c2.7-1.5 4.8.8 4.2 3.6-.5 2.4-1.6 4.3-3.1 5.6Z"/>
<path d="M11 11.3C7.7 9 4.2 8.2 2.8 10.6c-1.7 3 1.2 5.1 3.4 4.4 1.8-.5 3.5-1.8 4.8-3.7Z"/>
<path d="M12.1 11.4c2.4-2.4 6.1-3.6 8-1.9 2.5 2.1 1.1 5.6-1.7 6.1-2.1.3-4.1-1.6-6.3-4.2Z"/>
<path d="M12 15c-1.5 1.4-2.3 2.8-1.7 4 .6 1.2 2.7 1.2 3.4 0 .6-1.2-.2-2.6-1.7-4Z"/>
</g><path d="m11.4 8.9 2.5 2.6-2.5 2.7-2.1-2.7Z" fill="currentColor"/><circle cx="12" cy="22" r="1.3" fill="currentColor"/>'''

parts = ['''<svg xmlns="http://www.w3.org/2000/svg" width="926" height="160" viewBox="0 0 926 160">
<defs>
<linearGradient id="case" x2="0" y2="1"><stop stop-color="#645059"/><stop offset=".45" stop-color="#46323e"/><stop offset="1" stop-color="#30232f"/></linearGradient>
<linearGradient id="ivory" x2=".3" y2="1"><stop stop-color="#fffaf2"/><stop offset=".65" stop-color="#fae8d7"/><stop offset="1" stop-color="#e9c4ad"/></linearGradient>
<linearGradient id="coral" x2=".3" y2="1"><stop stop-color="#ffb1a1"/><stop offset=".5" stop-color="#f8887d"/><stop offset="1" stop-color="#c95260"/></linearGradient>
<linearGradient id="ink" x2=".3" y2="1"><stop stop-color="#66535c"/><stop offset="1" stop-color="#3e303b"/></linearGradient>
</defs>
<path d="M48 4Q49 2 54 2H873Q878 2 880 8L919 124V146Q919 157 907 157H20Q7 157 7 146V124Z" fill="url(#case)" stroke="#2a202b" stroke-width="4"/>
<path d="M53 10H873L905 123H21Z" fill="#3a2b32" stroke="#ad827b" stroke-width="2"/>
<path d="M55 11H871M22 126H906" fill="none" stroke="#e7b18e" stroke-width="2" opacity=".85"/>
<path d="M11 136H915V146Q915 153 906 153H21Q11 153 11 146Z" fill="#352732"/>
<path d="M21 132H904" stroke="#1c1822" stroke-width="3"/>
''']

rows = [[1,1,1,6,1,1,1], [1.6]+[1]*10+[1.4], [1.3]+[1]*11+[1.3], [1]+[1]*12+[1]]
for r, row in enumerate(rows):
    y = 17 + 26*r
    inset = 47 - 7*r
    unit = (926 - 2*inset) / sum(row)
    x = inset
    for j, weight in enumerate(row):
        l, w = x+2, unit*weight-4
        shade = 'coral' if j in (0,len(row)-1) else 'ivory'
        if r == 3 and j in (1,len(row)-2):
            shade = 'ink'
        side = '#bd625f' if shade == 'coral' else ('#3f303c' if shade == 'ink' else '#ba9584')
        parts += [
            f'<path d="M{l:.1f} {y+3}H{l+w:.1f}L{l+w+3:.1f} {y+22}Q{l+w+3:.1f} {y+24} {l+w:.1f} {y+24}H{l-1:.1f}Q{l-3:.1f} {y+24} {l-3:.1f} {y+21}Z" fill="{side}" stroke="#382a32" stroke-width="1.7"/>',
            f'<path d="M{l+2:.1f} {y}H{l+w-2:.1f}L{l+w:.1f} {y+16}Q{l+w:.1f} {y+18} {l+w-2:.1f} {y+18}H{l-1:.1f}Z" fill="url(#{shade})" stroke="#edb99c" stroke-width=".8"/>',
            f'<path d="M{l+4:.1f} {y+2}H{l+w-5:.1f}" stroke="#fff8eb" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>',
            f'<path d="M{l+1:.1f} {y+19}H{l+w-2:.1f}" stroke="#80594f" stroke-width="1.1" opacity=".65"/>',
        ]
        if r == 0 and weight == 6:
            center = l+w/2
            parts.append(f'<path d="M{center-72:.1f} {y+9}H{center-22:.1f}M{center+22:.1f} {y+9}H{center+72:.1f}" stroke="#d3ad86" stroke-width="1.2" opacity=".7"/>')
            parts.append(f'<g transform="translate({center-9:.1f} {y+1}) scale(.75)" color="#b88754">{hairpin}</g>')
        # Small raised home-row marks, oriented for the character across the desk.
        if r == 1 and j in (4,7):
            parts.append(f'<path d="M{l+w/2-7:.1f} {y+5}h14" stroke="#d1a784" stroke-width="1.5" stroke-linecap="round"/>')
        x += unit*weight

parts += ['''<path d="M24 148l12-8h29l-12 8Zm796 0 13-8h28l-13 8Z" fill="#d76166"/>
<path d="M366 146H536" stroke="#c9976d" stroke-width="2" stroke-linecap="round" opacity=".85"/>
<g transform="translate(874 135) scale(.75)" color="#e9c48c">'''+hairpin+'''</g>
</svg>''']
keyboard = ASSETS/'keyboard-changli-v0714.svg'
keyboard.write_text('\n'.join(parts)+'\n',encoding='utf-8')

# The cable is vector artwork in the opted-in complete mouse layer. Remove only
# its two strokes, retaining the entire shell and original hand/layer ordering.
mouse = (ASSETS/'mouse-complete-v078.svg').read_text(encoding='utf-8')
mouse = '\n'.join(line for line in mouse.splitlines() if 'M-8 106' not in line)+'\n'
wireless = ASSETS/'mouse-wireless-v0714.svg'
wireless.write_text(mouse,encoding='utf-8')
print(keyboard)
print(wireless)
