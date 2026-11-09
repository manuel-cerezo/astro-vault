"""Original background music for the launch video, synthesised from scratch.

No samples and no library track, so there is nothing to license. 100 BPM,
F major, soft electric piano, pad, sub bass and a light beat. Writes
../public/music.mp3 (needs numpy and ffmpeg). Run: python3 music/compose.py
"""
import wave, numpy as np, os, subprocess, tempfile

SR = 48000
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
TOTAL = 35.6 + 0.4
N = int(TOTAL * SR)
rng = np.random.default_rng(7)

def hz(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)

def env(n, a, d, s=0.0, r=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-t / d))
    if r:
        tail = int(r * SR)
        e[-tail:] *= np.linspace(1, 0, tail)
    return e

def lowpass(x, cut, slope=1.5):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X /= np.sqrt(1 + (f / cut) ** (2 * slope))
    return np.fft.irfft(X, len(x))

def highpass(x, cut):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (cut / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))

L = np.zeros(N); R = np.zeros(N)

def put(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))

def epiano(note, dur, vel=1.0):
    n = int((dur + 1.2) * SR); t = np.arange(n) / SR; f = hz(note)
    idx = 2.2 * np.exp(-t / 0.3) * vel
    body = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = 0.22 * np.sin(2 * np.pi * f * 7 * t) * np.exp(-t / 0.05)
    e = env(n, 0.004, 0.9, 0.0, r=0.3)
    off = int(dur * SR)
    e[off:] *= np.exp(-np.arange(n - off) / SR / 0.25)
    return (body + tine) * e * vel

def pad(notes, dur):
    n = int((dur + 1.5) * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for m in notes:
        for det in (-0.09, 0.0, 0.08):
            ph = rng.uniform(0, 1)
            out += 2 * ((hz(m) * (1 + det / 100 * 12) * t + ph) % 1) - 1
    out = highpass(lowpass(out / (3 * len(notes)), 1100), 160)
    a = np.minimum(1, t / 0.8)
    rel = np.clip((t - dur) / 1.5, 0, 1)
    return out * a * (1 - rel)

def bass(note, dur):
    n = int((dur + 0.3) * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * hz(note) * t) + 0.25 * np.sin(4 * np.pi * hz(note) * t)
    return s * env(n, 0.01, 2.5, 0.6, r=0.3)

def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 48 + 70 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)

def shaker(vel):
    n = int(0.12 * SR)
    s = highpass(rng.standard_normal(n), 6000)
    return s * env(n, 0.006, 0.035) * vel

def click():
    n = int(0.06 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008) + 0.4 * highpass(rng.standard_normal(n), 3000) * np.exp(-t / 0.004)
    return s

# F major: Fmaj7, Dm9, Bbmaj7, Csus -> C
CHORDS = [
    (41, [53, 57, 60, 64]),  # Fmaj7
    (38, [53, 57, 60, 64]),  # Dm9 (F A C E over D)
    (34, [50, 53, 57, 62]),  # Bbmaj7 / D F A D
    (36, [52, 55, 60, 65]),  # C(sus4 colour)
]
ARP = [0, 2, 1, 3, 2, 1, 3, 2]  # eighths over the voicing

bars = int(np.ceil(TOTAL / BAR))
for b in range(bars):
    t0 = b * BAR
    root, voicing = CHORDS[b % 4]
    last = t0 + BAR >= 31.2  # the call to action: one chord rings out
    if last and t0 > 31.2:
        break
    hold = TOTAL - t0 if last else BAR
    put(pad([v - 12 for v in voicing[:3]] + [voicing[3]], hold), t0, gain=0.22)
    put(bass(root, hold - 0.05), t0, gain=0.16)
    if last:
        for i, v in enumerate(voicing + [voicing[0] + 12]):
            put(epiano(v + 12, hold - 0.1, 0.55), t0 + i * 0.07, pan=-0.3 + 0.15 * i, gain=0.4)
        break
    intro = b == 0
    for k, step in enumerate(ARP):
        if intro and k % 2: continue
        vel = 0.75 if k % 2 == 0 else 0.5
        swing = 0.03 if k % 2 else 0
        note = voicing[step] + 12 + (12 if (b % 2 and k == 6) else 0)
        put(epiano(note, BEAT * 0.45, vel), t0 + k * BEAT / 2 + swing, pan=(-0.35 if k % 2 else 0.25), gain=0.42)
    if b >= 1:
        for beat in range(4):
            if beat in (0, 2): put(highpass(kick(), 45), t0 + beat * BEAT, gain=0.26)
        for k in range(8):
            put(shaker(0.9 if k % 2 else 0.45), t0 + k * BEAT / 2 + (0.03 if k % 2 else 0), pan=0.4, gain=0.12)

# Cursor clicks, in seconds (site scene: (90 + 310 + frame * 1.35) / 30).
for fr in (135, 210, 317):
    put(click(), (90 + 310 + fr * 1.35) / 30, pan=0.1, gain=0.12)

# Small room reverb from decaying noise.
ir_n = int(1.8 * SR)
ir = rng.standard_normal((2, ir_n)) * np.exp(-np.arange(ir_n) / SR / 0.5)
ir = np.array([lowpass(i, 5000) for i in ir]); ir[:, : int(0.012 * SR)] = 0
def conv(x, h):
    m = len(x) + len(h)
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(h, m), m)[: len(x)]
wetL, wetR = conv(L, ir[0]), conv(R, ir[1])
g = 0.18 / np.sqrt((ir ** 2).sum(axis=1).mean())
L2, R2 = L + g * wetL, R + g * wetR

# Fade in and out, normalise to -1 dBFS, gentle soft clip.
t = np.arange(N) / SR
fade = np.minimum(1, t / 0.3) * np.clip((TOTAL - t) / 1.6, 0, 1)
mix = np.stack([L2, R2]) * fade
mix = np.tanh(mix / np.abs(mix).max() * 1.1) / np.tanh(1.1) * 10 ** (-1 / 20)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'music.mp3')
with tempfile.TemporaryDirectory() as tmp:
    wav = os.path.join(tmp, 'music.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-b:a', '192k', out], check=True)
print('wrote', os.path.normpath(out))
