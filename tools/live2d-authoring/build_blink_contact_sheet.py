"""Arrange actual SDK screenshots for read-only blink review; never edit artwork."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw
HERE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--version',type=int,default=64)
parser.add_argument('--date',default='20261009')
parser.add_argument('--frames',default='build/input-blink-20261008')
args=parser.parse_args()
folder=HERE/args.frames
times=[3950,4020,4040,4060,4080,4096,4114,4135,4155,4187.5,4225,4260]
sheet=Image.new('RGB',(365*4,264*3),'#21323d')
draw=ImageDraw.Draw(sheet)
for n,t in enumerate(times):
    with Image.open(folder/f'blink-{t}.png') as frame:
        sheet.paste(frame.convert('RGB'),((n%4)*365,(n//4)*264+24))
    draw.text(((n%4)*365+8,(n//4)*264+5),f'{t} ms',fill='white')
target=HERE/f'build/blink-v{args.version}-contact-sheet-{args.date}.png'
sheet.save(target)
print(target)
