"""The launch video's sound, synthesised from scratch and timed to the cut.

No samples and no library track, so there is nothing to license. There is no
background music: keys while text is typed, cursor clicks, a soft whoosh on
each scene change, small pops for the note picker and the link preview, and
one electric-piano chord that rings out under the call to action. Writes
../public/music.mp3 (needs numpy and ffmpeg). Run: python3 music/compose.py
"""
import wave, numpy as np, os, subprocess, tempfile

SR = 48000
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

def click():
    n = int(0.06 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008) + 0.4 * highpass(rng.standard_normal(n), 3000) * np.exp(-t / 0.004)
    return s

def keypress(vel):
    n = int(0.05 * SR); t = np.arange(n) / SR
    noise = highpass(lowpass(rng.standard_normal(n), 5000), 1200) * np.exp(-t / 0.006)
    thump = np.sin(2 * np.pi * rng.uniform(180, 240) * t) * np.exp(-t / 0.012)
    return (0.6 * noise + 0.5 * thump) * vel

def whoosh(dur=0.7):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return (0.6 * lowpass(x, 1400) + 0.4 * highpass(lowpass(x, 4000), 1500) * e) * e

def pop(f0=880):
    n = int(0.18 * SR); t = np.arange(n) / SR
    f = f0 * (1 + 0.5 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.05)

FPS = 30
def at(scene_start, speed, frame):
    """Seconds for a frame of a scene that plays at `speed` from `scene_start` (video frames)."""
    return (scene_start + frame * speed) / FPS

EDITOR, SETUP, SITE, CTA = 90, 280, 400, 947

# Title: a soft whoosh as each line rises.
put(whoosh(0.9), 0.0, gain=0.10)
put(whoosh(0.9), at(0, 1, 26), gain=0.08)

# Scene changes.
for start in (EDITOR, SETUP, SITE):
    put(whoosh(), start / FPS - 0.35, pan=0.2, gain=0.14)

# Editor: every typed key, the note picker, Enter to pick.
keys = []
for chunk_at, text in ((12, 'Read more about '), (36, '[['), (42, 'Cal')):
    keys += [chunk_at + 1.5 * i for i in range(len(text))]
keys += [68 + 1.6 * j for j in range(1, len(' next.') + 1)]
for k in keys:
    put(keypress(rng.uniform(0.6, 1.0)), at(EDITOR, 1.25, k), pan=rng.uniform(-0.2, 0.2), gain=0.22)
put(pop(1040), at(EDITOR, 1.25, 37), gain=0.08)
put(keypress(1.2), at(EDITOR, 1.25, 56), gain=0.3)

# Setup: the command, Enter, a small two-note chime when it is added, then the option.
for i in range(1, len('npx astro add astro-vault') + 1):
    put(keypress(rng.uniform(0.6, 1.0)), at(SETUP, 1.15, 10 + 1.1 * i), pan=rng.uniform(-0.2, 0.2), gain=0.22)
put(keypress(1.2), at(SETUP, 1.15, 40), gain=0.3)
put(epiano(76, 0.25, 0.5), at(SETUP, 1.15, 42), gain=0.16)
put(epiano(81, 0.5, 0.5), at(SETUP, 1.15, 42) + 0.09, gain=0.16)
put(pop(980), at(SETUP, 1.15, 54), gain=0.07)

# Site: the preview card pops, three clicks, dark mode.
put(pop(1170), at(SITE, 1.35, 90), gain=0.08)
for fr in (135, 210, 317):
    put(click(), at(SITE, 1.35, fr), pan=0.1, gain=0.16)
put(whoosh(0.9), at(SITE, 1.35, 360), pan=-0.2, gain=0.1)

# The close: one chord that rings out under the call to action.
t0 = CTA / FPS - 0.15
hold = TOTAL - t0
put(pad([41, 48, 57, 64], hold), t0, gain=0.2)
put(bass(29, hold - 0.05), t0, gain=0.14)
for i, v in enumerate([65, 69, 72, 76, 77]):
    put(epiano(v, hold - 0.1, 0.55), t0 + i * 0.07, pan=-0.3 + 0.15 * i, gain=0.4)

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
fade = np.clip((TOTAL - t) / 1.6, 0, 1)
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
