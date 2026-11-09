"""The launch video's sound, synthesised from scratch and timed to the cut.

No samples and no library track, so there is nothing to license. A quiet bed
of slow chords that never repeat sits under keys while text is typed, cursor
clicks, a faint swish on each scene change and small pops for the note picker
and the link preview, and it resolves into one electric-piano chord that rings
out under the call to action. Writes
../public/music.mp3 and the typing rhythm the video follows, ../src/typing.json (needs numpy and ffmpeg). Run: python3 music/compose.py
"""
import json, wave, numpy as np, os, subprocess, tempfile

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

def pad(notes, dur, cut=1100):
    n = int((dur + 1.5) * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for m in notes:
        for det in (-0.09, 0.0, 0.08):
            ph = rng.uniform(0, 1)
            out += 2 * ((hz(m) * (1 + det / 100 * 12) * t + ph) % 1) - 1
    out = highpass(lowpass(out / (3 * len(notes)), cut), 160)
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

def keypress(vel, kind='key'):
    """One keystroke: the cap's plastic click, the bottom-out thock, then the
    quieter release. Every key gets its own resonances, so no two sound alike."""
    n = int(0.16 * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    low = (90, 160) if kind == 'space' else (170, 320)
    # Press: a very short bright tick and a few damped plastic modes.
    out += highpass(rng.standard_normal(n), 2500) * np.exp(-t / 0.0012) * 0.5
    for _ in range(3):
        f = rng.uniform(1400, 4200)
        out += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / rng.uniform(0.004, 0.009)) * 0.18
    # Bottom-out: a soft, low thock a few milliseconds later.
    d = int(rng.uniform(0.004, 0.009) * SR)
    td = t[: n - d]
    thock = np.sin(2 * np.pi * rng.uniform(*low) * td) * np.exp(-td / (0.03 if kind == 'space' else 0.016))
    thock += lowpass(rng.standard_normal(n - d), 900) * np.exp(-td / 0.01) * 0.6
    out[d:] += thock * (0.8 if kind == 'space' else 0.55)
    # Release, 45–90 ms later.
    r = int(rng.uniform(0.045, 0.09) * SR)
    tr = t[: n - r]
    out[r:] += highpass(rng.standard_normal(n - r), 2000) * np.exp(-tr / 0.0015) * 0.18
    out[r:] += np.sin(2 * np.pi * rng.uniform(1800, 3500) * tr) * np.exp(-tr / 0.005) * 0.06
    return lowpass(out, 9000) * vel

def schedule(text, start, end):
    """Frames at which each character of `text` appears, typed like a person:
    quick runs inside words, a beat after spaces, a little hesitation on symbols."""
    w = []
    for i, ch in enumerate(text):
        x = rng.uniform(0.7, 1.4)
        if i and text[i - 1] == ' ': x *= 1.7
        if ch in '[]{}.-:': x *= 1.4
        w.append(x)
    w = np.cumsum(w); w = (w - w[0]) / (w[-1] - w[0]) if len(w) > 1 else w * 0
    return [round(float(start + v * (end - start)), 2) for v in w]

# Typing, in scene frames before the slow-down. The video reads these too.
TYPING = {
    'editor': schedule('Read more about ', 4, 31) + schedule('[[', 35, 37.5) + schedule('Cal', 42, 47.5),
    'tail': schedule(' next.', 68, 80),
    'command': schedule('npx astro add astro-vault', 8, 46),
}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'typing.json'), 'w') as fh:
    json.dump(TYPING, fh)
    fh.write('\n')

def whoosh(dur=0.7):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return highpass(lowpass(x, 3000), 900) * e

def pop(f0=880):
    n = int(0.18 * SR); t = np.arange(n) / SR
    f = f0 * (1 + 0.5 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.05)

FPS = 30
def at(scene_start, speed, frame):
    """Seconds for a frame of a scene that plays at `speed` from `scene_start` (video frames)."""
    return (scene_start + frame * speed) / FPS

EDITOR, SETUP, SITE, CTA = 90, 280, 400, 947


# A quiet bed under everything: slow chords that never repeat, one soft piano
# note on each, and it resolves into the closing chord.
BED = [  # (bass, pad voicing, piano note)
    (41, [57, 60, 64, 67], 81),  # Fmaj9
    (45, [55, 60, 64, 67], 79),  # Am7
    (38, [57, 60, 64, 65], 77),  # Dm9
    (34, [57, 62, 65, 69], 76),  # Bbmaj7
    (45, [53, 57, 60, 64], 74),  # F/A
    (43, [53, 58, 62, 69], 72),  # Gm9
    (46, [57, 62, 65, 69], 74),  # Bbmaj7
    (36, [55, 58, 62, 65], 72),  # C7sus
]
step = (CTA / FPS - 0.15) / len(BED)
for i, (root, voicing, top) in enumerate(BED):
    t0 = i * step
    put(pad(voicing, step + 0.4, cut=750), t0, gain=0.11)
    put(bass(root - 12 if root > 40 else root, step), t0, gain=0.07)
    put(epiano(top, step * 0.6, 0.35), t0 + 0.4, pan=0.15, gain=0.14)

# Scene changes.
for start in (EDITOR, SETUP, SITE):
    put(whoosh(0.5), start / FPS - 0.25, pan=0.2, gain=0.035)

def type_out(times, text, scene, speed):
    for k, ch in zip(times, text):
        kind = 'space' if ch == ' ' else 'key'
        jitter = rng.uniform(-0.006, 0.006)
        put(keypress(rng.uniform(0.55, 1.0), kind), at(scene, speed, k) + jitter, pan=rng.uniform(-0.25, 0.25), gain=0.2)

# Editor: every typed key, the note picker, Enter to pick.
type_out(TYPING['editor'], 'Read more about [[Cal', EDITOR, 1.25)
put(pop(1040), at(EDITOR, 1.25, 37), gain=0.08)
put(keypress(1.0), at(EDITOR, 1.25, 56), gain=0.24)
type_out(TYPING['tail'], ' next.', EDITOR, 1.25)

# Setup: the command, Enter, a small two-note chime when it is added, then the option.
type_out(TYPING['command'], 'npx astro add astro-vault', SETUP, 1.15)
put(keypress(1.0, 'space'), at(SETUP, 1.15, 50), gain=0.24)
put(epiano(76, 0.25, 0.5), at(SETUP, 1.15, 52), gain=0.16)
put(epiano(81, 0.5, 0.5), at(SETUP, 1.15, 52) + 0.09, gain=0.16)
put(pop(980), at(SETUP, 1.15, 62), gain=0.07)

# Site: the preview card pops, three clicks, dark mode.
put(pop(1170), at(SITE, 1.35, 90), gain=0.08)
for fr in (135, 210, 317):
    put(click(), at(SITE, 1.35, fr), pan=0.1, gain=0.16)
put(whoosh(0.6), at(SITE, 1.35, 360), pan=-0.2, gain=0.03)

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
fade = np.minimum(1, t / 0.6) * np.clip((TOTAL - t) / 1.6, 0, 1)
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
