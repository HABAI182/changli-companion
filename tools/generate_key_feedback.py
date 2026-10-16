"""Original short, soft mechanical feedback. No voice or third-party samples."""
import math
import random
import struct
import wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'public/models/changli/assets/audio'
OUTPUT.mkdir(parents=True,exist_ok=True)
RATE=44100
for name,duration,frequency,seed in [
    ('key-press-v0716.wav',.065,360,716),
    ('mouse-press-v0716.wav',.042,620,717),
]:
    rng=random.Random(seed)
    previous=0.0
    samples=[]
    for index in range(int(RATE*duration)):
        t=index/RATE
        raw=rng.uniform(-1,1)
        # A low-passed transient plus a damped body; no chime or tonal melody.
        previous=.68*previous+.32*raw
        attack=min(1,t/.0015)
        release=math.exp(-t/0.009)*(1-t/duration)**2
        body=math.sin(2*math.pi*frequency*t)*math.exp(-t/.012)
        signal=.17*attack*(.68*previous*release+.32*body*(1-t/duration)**3)
        samples.append(struct.pack('<h',round(32767*signal)))
    path=OUTPUT/name
    with wave.open(str(path),'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(b''.join(samples))
    print(path)
