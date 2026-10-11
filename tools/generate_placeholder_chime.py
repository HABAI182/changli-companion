"""Generate an original, quiet local placeholder cue; no third-party audio."""

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/models/changli/assets/audio/placeholder-chime.wav"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
RATE = 44100
DURATION = 0.48
samples = []
for index in range(int(RATE * DURATION)):
    time = index / RATE
    attack = min(1.0, time / 0.012)
    release = math.exp(-7.5 * time)
    tone = 0.65 * math.sin(2 * math.pi * 880 * time)
    tone += 0.25 * math.sin(2 * math.pi * 1320 * time)
    tone += 0.10 * math.sin(2 * math.pi * 1760 * time)
    samples.append(struct.pack("<h", round(32767 * 0.11 * attack * release * tone)))
with wave.open(str(OUTPUT), "wb") as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(RATE)
    audio.writeframes(b"".join(samples))
print(OUTPUT)
