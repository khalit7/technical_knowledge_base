# Page assets from the codec run: log-mel pictures (WebP, grey) and short MP3 copies for the players.
# usage (tool env: uv run --no-project --with soundfile --with av --with pillow --with scipy): python -I make_assets.py <audio dir> <out dir>
import sys, io, json, base64, numpy as np, soundfile as sf, av
from PIL import Image
from scipy.signal import resample_poly
AD, OUT = sys.argv[1], sys.argv[2]
def load24(name):
    x, sr = sf.read(f'{AD}/{name}.wav', dtype='float32')
    if sr != 24000:
        g = np.gcd(sr, 24000); x = resample_poly(x, 24000 // g, sr // g).astype('float32')
    return x
def mel_fb(sr, n_fft, n_mels, fmax):
    hz2m = lambda f: 2595 * np.log10(1 + f / 700); m2hz = lambda m: 700 * (10 ** (m / 2595) - 1)
    pts = m2hz(np.linspace(hz2m(0), hz2m(fmax), n_mels + 2)); bins = np.fft.rfftfreq(n_fft, 1 / sr)
    return np.stack([np.clip(np.minimum((bins - pts[i]) / (pts[i + 1] - pts[i]), (pts[i + 2] - bins) / (pts[i + 2] - pts[i + 1])), 0, None) for i in range(n_mels)])
FB = mel_fb(24000, 1024, 64, 12000)
def logmel(x, hop=480):
    w = np.hanning(1024); fr = 1 + (len(x) - 1024) // hop
    S = np.abs(np.stack([np.fft.rfft(w * x[i * hop:i * hop + 1024]) for i in range(fr)])) ** 2
    return np.log10(FB @ S.T + 1e-10)
def webp(M, lo, hi):
    a = np.clip((M - lo) / (hi - lo), 0, 1)[::-1]  # low frequencies at the bottom
    im = Image.fromarray((a * 255).astype('uint8'), 'L'); b = io.BytesIO(); im.save(b, 'WEBP', quality=70, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
def mp3(x, kbps=32):
    b = io.BytesIO(); c = av.open(b, 'w', format='mp3'); s = c.add_stream('libmp3lame', rate=24000); s.bit_rate = kbps * 1000; s.layout = 'mono'
    for i in range(0, len(x), 1152 * 8):
        fr = av.AudioFrame.from_ndarray(x[None, i:i + 1152 * 8].astype('float32'), format='flt', layout='mono'); fr.sample_rate = 24000
        for p in s.encode(fr): c.mux(p)
    for p in s.encode(None): c.mux(p)
    c.close(); return 'data:audio/mpeg;base64,' + base64.b64encode(b.getvalue()).decode()
SETS = {'encodec': [1, 2, 3, 4, 6, 8, 12, 16, 24, 32], 'dac': list(range(1, 10)), 'mimi': [1, 2, 4, 8, 16, 32]}
PLAY = {'speech': {'encodec': [1, 2, 8, 32], 'dac': [9], 'mimi': [8]}, 'music': {'encodec': [2, 32], 'dac': [9], 'mimi': [8]}}
res = {'spec': {}, 'audio': {}, 'note': '64 mel bands 0-12 kHz at 24 kHz, 20 ms hop; grey = log10 power, 70 dB range below the reference peak; MP3 32 kbps copies for playback'}
for clip in ('speech', 'music'):
    ref = load24(f'{clip}_ref24'); Mr = logmel(ref); hi = Mr.max(); lo = hi - 7
    n = Mr.shape[1]; sp = {'ref': webp(Mr, lo, hi), 'frames': int(n)}; au = {'ref': mp3(ref)}
    for kb in (6, 12):
        y = load24(f'{clip}_opus{kb}')[:len(ref)]; sp[f'opus{kb}'] = webp(logmel(y)[:, :n], lo, hi)
        if kb == 6 and clip == 'speech': au['opus6'] = mp3(y)
    for codec, ks in SETS.items():
        for k in ks:
            y = load24(f'{clip}_{codec}_k{k}')[:len(ref)]
            sp[f'{codec}{k}'] = webp(logmel(y)[:, :n], lo, hi)
            if k in PLAY[clip][codec]: au[f'{codec}{k}'] = mp3(y)
    if clip == 'speech': au['wrongrate'] = mp3(load24('speech_wrongrate'))  # mistakes.py: 16 kHz samples fed as 24 kHz
    e = ref[:len(ref) // 240 * 240].reshape(-1, 240); res.setdefault('env', {})[clip] = [[int(round(v * 127)) for v in e.min(1)], [int(round(v * 127)) for v in e.max(1)]]  # waveform min/max per 10 ms, x127
    res['spec'][clip] = sp; res['audio'][clip] = au
    print(clip, 'spec KB', round(sum(len(v) for k, v in sp.items() if k != 'frames') / 1024), 'audio KB', round(sum(len(v) for v in au.values()) / 1024), flush=True)
json.dump(res, open(f'{OUT}/assets.json', 'w'))
print('total KB', round(len(json.dumps(res)) / 1024))
