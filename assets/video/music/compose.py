"""The launch video's soundtrack, timed to the cut.

- Music: an upbeat house-style groove at 120 BPM, synthesised here with numpy
  (no samples, nothing to license). It builds under the typing, drops in the
  middle of the dissolve from note to page, adds a hook, builds again under the
  dark-mode switch and lands on one chord on the call to action.
- Keys: real recordings of a mechanical keyboard (Cherry MX Brown) from kbsim
  by Thomas Lai, MIT licence, in music/keys/ with their LICENSE.md.
- Cursor clicks, pops, a digital crackle on the dissolve and small chimes: synthesised.

Writes ../public/music.mp3 and the typing rhythm the video follows,
../src/timing.json. Needs numpy and ffmpeg. Run: python3 music/compose.py
"""
import json
import os
import subprocess
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
FPS = 30
TOTAL = 25.0 + 0.4
N = int(TOTAL * SR)
rng = np.random.default_rng(7)

# Video frames where each part starts (see src/Promo.tsx).
EDITOR, DISSOLVE, CTA = 60, 135, 630
# The beat is every 15 frames (120 BPM at 30 fps, counted from frame 0), and
# every cut and click lands on it. The site part was first timed in its own
# frames; this maps video frames since the dissolve to site frames, pinning the
# link preview, the three clicks and the dark mode to beats.
SITE_WARP = [(0, -50), (150, 90), (195, 135), (285, 210), (405, 317), (450, 363), (495, 405)]


def site(frame):
    """Seconds for a frame of the site part as it was first timed."""
    d = np.interp(frame, [f for _, f in SITE_WARP], [d for d, _ in SITE_WARP])
    return (DISSOLVE + d) / FPS


def at(scene_start, speed, frame):
    """Seconds for a frame of a scene that plays at `speed` from `scene_start`."""
    return (scene_start + frame * speed) / FPS


# --- helpers -----------------------------------------------------------------

def hz(n):
    return 440 * 2 ** ((n - 69) / 12)


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


def svf(x, cutoff, q=0.7):
    """Resonant low-pass with a cutoff that can change per sample."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    fcoef = 2 * np.sin(np.pi * np.minimum(cutoff, SR / 6) / SR)
    damp = 1 / q
    low = band = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        low += fcoef[i] * band
        high = x[i] - low - damp * band
        band += fcoef[i] * high
        out[i] = low
    return out


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + phase) % 1) - 1


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def put(self, sig, t, pan=0.0, gain=1.0):
        i = int(round(t * SR))
        if i >= N:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        sig = sig[: N - i] * gain
        self.L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
        self.R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def reverb(bus, size=0.5, amount=0.18, cut=5000, seed=1):
    r = np.random.default_rng(seed)
    n = int(size * 3.6 * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal((2, n)) * np.exp(-t / size)
    ir = np.array([lowpass(i, cut) for i in ir])
    ir[:, : int(0.015 * SR)] = 0
    ir *= amount / np.sqrt((ir ** 2).sum(axis=1).mean())

    def conv(x, h):
        m = len(x) + len(h)
        return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(h, m), m)[: len(x)]

    bus.L, bus.R = bus.L + conv(bus.L, ir[0]), bus.R + conv(bus.R, ir[1])


def load(path):
    raw = subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(float)


# --- typing rhythm (shared with the video) -------------------------------------

def schedule(text, start, end):
    """Frames at which each character appears, typed like a person: quick runs
    inside words, a beat after spaces, a little hesitation on symbols."""
    w = []
    for i, ch in enumerate(text):
        x = rng.uniform(0.7, 1.4)
        if i and text[i - 1] == ' ':
            x *= 1.7
        if ch in '[]{}.-:':
            x *= 1.4
        w.append(x)
    w = np.cumsum(w)
    if len(w) == 1:
        return [float(start)]
    w = (w - w[0]) / (w[-1] - w[0])
    return [round(float(start + v * (end - start)), 2) for v in w]


TYPING = {
    'editor': schedule('Next, read ', 5, 22) + schedule('[[', 25, 27.5) + schedule('Cal', 32, 38),
    'tail': schedule('.', 50, 50),
    'cta': schedule('npx astro add astro-vault', 14, 44),
}
with open(os.path.join(HERE, '..', 'src', 'timing.json'), 'w') as fh:
    json.dump({'typing': TYPING, 'siteWarp': SITE_WARP}, fh)
    fh.write('\n')

# --- sound effects -------------------------------------------------------------

fx = Bus()
KEYS = os.path.join(HERE, 'keys')
PRESS = [load(os.path.join(KEYS, f'press-{i}.mp3')) for i in range(5)]
SPACE = load(os.path.join(KEYS, 'press-space.mp3'))
ENTER = load(os.path.join(KEYS, 'press-enter.mp3'))
RELEASE = load(os.path.join(KEYS, 'release.mp3'))


def vary(x, cents):
    """Resample slightly so repeated samples do not sound identical."""
    r = 2 ** (cents / 1200)
    idx = np.arange(0, len(x) - 1, r)
    return np.interp(idx, np.arange(len(x)), x)


def key(t, kind='key', vel=1.0):
    sample = {'space': SPACE, 'enter': ENTER}.get(kind)
    if sample is None:
        sample = PRESS[rng.integers(len(PRESS))]
    pan = rng.uniform(-0.25, 0.25)
    vel *= 3.5  # the recordings are quiet
    fx.put(vary(sample, rng.uniform(-60, 60)), t, pan, vel * rng.uniform(0.75, 1.0))
    fx.put(vary(RELEASE, rng.uniform(-60, 60)), t + rng.uniform(0.07, 0.11), pan, vel * rng.uniform(0.35, 0.55))


def type_out(times, text, scene, speed):
    for k, ch in zip(times, text):
        key(at(scene, speed, k) + rng.uniform(-0.005, 0.005), 'space' if ch == ' ' else 'key')


def click():
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008)
            + 0.4 * highpass(rng.standard_normal(n), 3000) * np.exp(-t / 0.004))


def pop(f0):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.5 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.002) * np.exp(-t / 0.05)


def bell(note, dur=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(note)
    return np.sin(2 * np.pi * f * t + 1.5 * np.exp(-t / 0.2) * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / 0.25)


type_out(TYPING['editor'], 'Next, read [[Cal', EDITOR, 1)
fx.put(pop(1040), at(EDITOR, 1, 30), gain=0.10)
key(at(EDITOR, 1, 45), 'enter')
type_out(TYPING['tail'], '.', EDITOR, 1)

# The dissolve: a crackle of digital noise that changes on twos, like the glyphs.
crackle = np.zeros(int(1.0 * SR))
for k in range(15):
    i = int(k * 2 / FPS * SR)
    n = int(2 / FPS * SR)
    seg = highpass(rng.standard_normal(n), rng.uniform(2500, 6000))
    seg = np.round(seg * 3) / 3  # a little bit-crushed
    crackle[i:i + n] += seg * np.sin(np.pi * (k + 0.5) / 15) * rng.uniform(0.5, 1)
fx.put(crackle, DISSOLVE / FPS, 0.0, 0.05)

fx.put(pop(1170), site(90), gain=0.10)
for fr in (135, 210, 317):
    fx.put(click(), site(fr), 0.1, 0.18)

# Call to action: the command and the copy button.
type_out(TYPING['cta'], 'npx astro add astro-vault', CTA, 1)
fx.put(click(), at(CTA, 1, 60), 0.1, 0.18)
fx.put(bell(88), at(CTA, 1, 60) + 0.03, gain=0.07)

reverb(fx, size=0.25, amount=0.08, seed=3)

# --- music ---------------------------------------------------------------------

BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
S16 = BEAT / 4
DROP = (DISSOLVE + 15) / FPS  # the beat drops in the middle of the dissolve (5.0 s)
END_HIT = DROP + 8 * BAR      # the last chord (21.0 s), on the call to action


def bt(bar, pos16=0.0):
    return DROP + bar * BAR + pos16 * S16


drums = Bus()
music = Bus()   # everything that ducks under the kick


def kick():
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    tick = highpass(rng.standard_normal(n), 2000) * np.exp(-t / 0.002) * 0.3
    return np.tanh(1.6 * (body + tick)) / np.tanh(1.6)


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = highpass(lowpass(rng.standard_normal(n), 6000), 900)
    e = np.zeros(n)
    for k, d in enumerate((0.0, 0.011, 0.022)):
        i = int(d * SR)
        e[i:] += np.exp(-(t[: n - i]) / (0.006 if k < 2 else 0.11))
    return noise * e


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 8000) * np.exp(-t / (0.07 if open_ else 0.012))


def crash():
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 4500) * np.exp(-t / 0.9)


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    return svf(x, 300 + 7000 * (t / dur) ** 2, q=2.0) * (t / dur) ** 1.5


def stab(notes, length, cut=2400):
    n = int((length + 0.08) * SR)
    t = np.arange(n) / SR
    x = sum(saw(hz(m) * d, n, rng.uniform()) for m in notes for d in (0.996, 1.0, 1.004))
    x = x / (3 * len(notes))
    y = svf(x, 400 + cut * np.exp(-t / 0.09), q=1.2)
    return y * np.minimum(1, t / 0.003) * np.exp(-t / 0.22) * (t < length + 0.06)


def bass_note(note, length):
    n = int((length + 0.03) * SR)
    t = np.arange(n) / SR
    x = 0.7 * saw(hz(note), n) + 0.5 * np.sin(2 * np.pi * hz(note - 12) * t)
    y = svf(x, 180 + 900 * np.exp(-t / 0.06), q=1.4)
    return y * np.minimum(1, t / 0.004) * np.clip((length + 0.03 - t) / 0.03, 0, 1)


def pluck(note, length):
    n = int((length + 0.4) * SR)
    t = np.arange(n) / SR
    x = saw(hz(note), n) + 0.6 * np.sign(np.sin(2 * np.pi * hz(note) * 1.003 * t))
    y = svf(x, 600 + 4200 * np.exp(-t / 0.07), q=1.6)
    return y * np.minimum(1, t / 0.002) * np.exp(-t / 0.28) * 0.5


CHORDS = [  # (bass root, stab voicing)
    (41, [64, 67, 69, 72]),   # Fmaj7  (A C E over F, with G for colour)
    (45, [64, 67, 69, 72]),   # Am7
    (38, [62, 65, 69, 72]),   # Dm7
    (46, [62, 65, 69, 74]),   # Bbmaj7 (add D on top)
]
STAB_POS = [2, 6, 10, 13]
BASS = [(0, 0, 2), (3, 12, 1), (6, 0, 2), (8, 0, 1), (10, 12, 1), (11, 0, 2), (14, 7, 2)]
HOOK = {
    'A': [(0, 72, 2), (2, 74, 2), (4, 77, 3), (8, 76, 2), (10, 74, 2), (12, 72, 4)],
    'B': [(0, 69, 2), (3, 72, 2), (6, 74, 3), (10, 72, 2), (12, 69, 2), (14, 67, 2)],
    'C': [(0, 77, 2), (2, 76, 2), (4, 74, 2), (6, 72, 4), (12, 74, 2), (14, 76, 2)],
}

# Intro under the title: filtered chords on the beat and a riser into the drop.
for i in range(8):
    b = -2 + i * 0.25
    chord = CHORDS[2][1] if i < 4 else CHORDS[3][1]
    music.put(stab(chord, 0.2, cut=400 + 260 * i), bt(b), gain=0.5)
for p in range(2, 16, 4):
    drums.put(hat(), bt(-1, p), 0.3, 0.05)
music.put(riser(2 * BEAT * 2), DROP - 2 * BEAT * 2, gain=0.10)
drums.put(crash(), DROP, 0.0, 0.10)

kicks = []
for bar in range(8):
    root, voicing = CHORDS[bar % 4]
    build = bar == 7
    # Drums
    for beat in range(4):
        if not (build and beat >= 2):
            drums.put(kick(), bt(bar, beat * 4), gain=0.55)
            kicks.append(bt(bar, beat * 4))
    if not build:
        for beat in (1, 3):
            drums.put(clap(), bt(bar, beat * 4), 0.05, 0.22)
    for p in range(2, 16, 4):
        drums.put(hat(open_=bar >= 4 and p in (6, 14)), bt(bar, p), 0.3, 0.07)
    if bar >= 2:
        for p in range(0, 16, 2):
            if p % 4:
                continue
            drums.put(hat(), bt(bar, p + 1), -0.3, 0.035)
            drums.put(hat(), bt(bar, p + 3), -0.3, 0.05)
    if build:  # clap roll into the last chord
        for k, p in enumerate(range(8, 16)):
            drums.put(clap(), bt(bar, p), 0.05, 0.08 + 0.02 * k)
        music.put(riser(BAR / 2), bt(bar, 8), gain=0.10)
    # Chords and bass
    for p in STAB_POS:
        music.put(stab(voicing, S16 * 1.6), bt(bar, p), -0.15, 0.30)
    for p, iv, ln in BASS:
        music.put(bass_note(root - 12 + iv, S16 * ln * 0.9), bt(bar, p), gain=0.42)
    # Hook from bar 4: A B A B, then A C A C.
    if 2 <= bar < 7:
        part = 'AB'[bar % 2] if bar < 4 else 'AC'[bar % 2]
        for p, note, ln in HOOK[part]:
            s = pluck(note, S16 * ln)
            music.put(s, bt(bar, p), 0.2, 0.16)
            music.put(s, bt(bar, p + 3), -0.5, 0.06)   # dotted-eighth echo
            music.put(s, bt(bar, p + 6), 0.5, 0.03)

# Duck everything melodic under each kick.
duck = np.ones(N)
tt = np.arange(int(0.3 * SR)) / SR
shape = 1 - 0.55 * np.exp(-tt / 0.08)
for k in kicks:
    i = int(k * SR)
    j = min(N, i + len(shape))
    duck[i:j] = np.minimum(duck[i:j], shape[: j - i])
music.L *= duck
music.R *= duck

# The last chord: kick, crash, a wide open chord and a low F that ring out.
hit = Bus()
hit.put(kick(), END_HIT, gain=0.55)
hit.put(crash(), END_HIT, 0.0, 0.12)
n_end = N - int(END_HIT * SR)
tt = np.arange(n_end) / SR
final = sum(saw(hz(m) * d, n_end, rng.uniform()) for m in (53, 60, 64, 67, 69, 72, 76) for d in (0.995, 1.0, 1.005))
final = svf(final / 21, 500 + 2500 * np.exp(-tt / 0.6), q=0.9) * np.exp(-tt / 2.2) * np.minimum(1, tt / 0.005)
hit.put(final, END_HIT, gain=0.45)
low = bass_note(41, TOTAL - END_HIT - 0.3)
hit.put(low * np.exp(-np.arange(len(low)) / SR / 1.5), END_HIT, gain=0.45)
for i, note in enumerate((72, 76, 79, 84)):
    hit.put(pluck(note, 0.6), END_HIT + i * S16, (-0.4, 0.4)[i % 2], 0.12)

reverb(music, size=0.45, amount=0.16, seed=1)
reverb(hit, size=0.9, amount=0.25, seed=2)
reverb(drums, size=0.2, amount=0.06, seed=4)

# --- mix -----------------------------------------------------------------------

t = np.arange(N) / SR
fade = np.clip((TOTAL - t) / 1.4, 0, 1)
M = 0.55  # music level under the effects
mix = np.stack([
    M * (music.L + drums.L + hit.L) + fx.L,
    M * (music.R + drums.R + hit.R) + fx.R,
]) * fade
mix = np.tanh(mix / np.abs(mix).max() * 1.2) / np.tanh(1.2) * 10 ** (-1 / 20)

out = os.path.join(HERE, '..', 'public', 'music.mp3')
with tempfile.TemporaryDirectory() as tmp:
    wav = os.path.join(tmp, 'music.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-b:a', '192k', out], check=True)
print('wrote', os.path.normpath(out))
