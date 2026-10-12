"""Original deterministic 92 BPM toy-piano/marimba cue. No sampled music."""
import json,wave
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'deliveries/media-20261012-v0712'
SR=48000;DURATION=45;BEAT=60/92
audio=np.zeros((SR*DURATION,2),dtype=np.float64)
rng=np.random.default_rng(120712)
def note(at,midi,length,volume=.12,pan=0,kind='piano'):
    count=min(int(length*SR),len(audio)-int(at*SR))
    if count<=0:return
    t=np.arange(count)/SR;f=440*2**((midi-69)/12)
    if kind=='bass':
        s=sum(np.sin(2*np.pi*f*k*t)/k**2 for k in [1,3,5])
        env=(1-np.exp(-t*45))*np.exp(-t*2.9)
    elif kind=='wood':
        s=np.sin(2*np.pi*f*t)+.16*np.sin(2*np.pi*f*4.01*t)*np.exp(-t*7)
        env=(1-np.exp(-t*260))*np.exp(-t*5.6)
    else:
        s=(np.sin(2*np.pi*f*t)+.22*np.sin(2*np.pi*f*2.003*t)*np.exp(-t*3)+.055*np.sin(2*np.pi*f*3.007*t)*np.exp(-t*8))
        env=(1-np.exp(-t*220))*np.exp(-t*3.6)
    release=np.clip((length-t)/.12,0,1);s=s*env*release*volume
    left=np.sqrt((1-pan)/2);right=np.sqrt((1+pan)/2);start=int(at*SR)
    audio[start:start+count,0]+=s*left;audio[start:start+count,1]+=s*right
# Own short melody; C / Am / F / G progression, plentiful rests.
melodies=[[72,76,79,76],[74,76,72,None],[76,79,81,79],[77,76,74,None],
          [72,74,76,79],[81,79,76,None],[77,79,76,74],[72,None,79,None]]
chords=[[48,60,64,67],[45,57,60,64],[41,53,57,60],[43,55,59,62]]
for bar in range(16):
    base=bar*4*BEAT+.35;chord=chords[bar%4]
    for beat,midi in enumerate(melodies[bar%8]):
        if midi is not None:note(base+beat*BEAT,midi,1.35,.13,(-.2 if beat%2 else .18),'wood' if bar%4==2 else 'piano')
    note(base,chord[0],1.4,.08,0,'bass')
    for i,midi in enumerate(chord[1:]):note(base+(i+.5)*BEAT,midi,1.1,.041,(-.3+i*.3),'piano')
for i,midi in enumerate([72,76,79,84]):note(42+i*.14,midi,2.9,.085,-.18+i*.12)
# Quiet interface clicks timed to the keyboard and mouse demonstration.
for at in [4.4,5.45,6.5,7.55,8.6,9.25,10.75,12.05,13.35]:
    n=int(.026*SR);t=np.arange(n)/SR
    click=rng.normal(0,1,n)*np.exp(-t*210)*.012
    start=int(at*SR);audio[start:start+n,:]+=click[:,None]
t=np.arange(len(audio))/SR
audio*=np.minimum(t/.5,1)[:,None]*np.minimum((45-t)/.65,1)[:,None]
peak=float(np.max(np.abs(audio)));audio*=.25/max(peak,.25)
pcm=(np.clip(audio,-1,1)*32767).astype('<i2')
OUT.mkdir(parents=True,exist_ok=True)
with wave.open(str(OUT/'bgm-original-92bpm.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
(OUT/'BGM-SOURCE.json').write_text(json.dumps({'type':'original programmatic composition and additive synthesis','script':'tools/promo/make_music.py','durationSeconds':45,'bpm':92,'sampleRate':SR,'channels':2,'sampledMusicUsed':False,'knownSongsOrGameAudioUsed':False,'peakDbfs':20*np.log10(np.max(np.abs(audio)))},indent=2)+'\n',encoding='utf-8')
print('Original 45-second music cue saved')
