# Prepare the two input clips and the Opus baselines (tool env: uv run --no-project --with pyarrow --with soundfile --with av).
# usage: python -I prep.py <librispeech parquet> <out dir>
# speech: LibriSpeech dev-clean 1272-135031-0008 (CC BY 4.0, from hf-internal-testing/librispeech_asr_dummy), 16 kHz.
# music: synthesised here (deterministic), 48 kHz, 3.5 s: plucked harmonic melody, bass, kick and hi-hat.
import sys, io, json, numpy as np, soundfile as sf, pyarrow.parquet as pq, av
pq_path, out = sys.argv[1], sys.argv[2]
rows = pq.read_table(pq_path).to_pylist()
row = [r for r in rows if r['id'] == '1272-135031-0008'][0]
a, sr = sf.read(io.BytesIO(row['audio']['bytes']), dtype='float32')
sf.write(f'{out}/speech.wav', a, sr, subtype='FLOAT')
meta = {'speech': {'id': row['id'], 'speaker_id': row['speaker_id'], 'text': row['text'], 'sr': sr, 'seconds': round(len(a) / sr, 3)}}

SR = 48000; T = 3.5; n = int(SR * T); t = np.arange(n) / SR
rng = np.random.default_rng(0); x = np.zeros(n)
def note(f0, start, dur, amp, harm=6, decay=3.0):
    i0, i1 = int(start * SR), min(n, int((start + dur) * SR)); tt = t[i0:i1] - start
    env = np.exp(-decay * tt) * np.minimum(1, tt / 0.005)
    s = sum((0.6 ** (h - 1)) * np.sin(2 * np.pi * f0 * h * tt) for h in range(1, harm + 1))
    x[i0:i1] += amp * env * s
mel = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 698.46, 880.0, 1174.66, 880.0, 698.46, 523.25, 659.25]
for k, f in enumerate(mel): note(f, k * 0.25, 0.5, 0.18)
for k, f in enumerate([130.81, 146.83, 130.81, 98.0]): note(f, k * 0.875, 0.85, 0.30, harm=3, decay=1.5)
for b in np.arange(0, T, 0.4375):
    i0 = int(b * SR); tt = t[i0:i0 + int(0.15 * SR)] - b
    x[i0:i0 + len(tt)] += 0.5 * np.exp(-30 * tt) * np.sin(2 * np.pi * (50 + 100 * np.exp(-40 * tt)) * tt)
for b in np.arange(0.21875, T, 0.4375):
    i0 = int(b * SR); m = int(0.05 * SR); nz = rng.standard_normal(m)
    nz = np.diff(nz, prepend=0)  # crude high-pass
    x[i0:i0 + m] += 0.08 * nz * np.exp(-60 * np.arange(m) / SR)
x = (0.8 * x / np.abs(x).max()).astype('float32')
sf.write(f'{out}/music.wav', x, SR, subtype='FLOAT')
meta['music'] = {'sr': SR, 'seconds': T, 'what': 'synthesised in prep.py (seed 0)'}

def opus_roundtrip(wav, sr, kbps, dst):
    # encode to Opus at a fixed bitrate (libopus resamples to 48 kHz), decode back, save float wav
    buf = io.BytesIO(); c = av.open(buf, 'w', format='ogg'); s = c.add_stream('libopus', rate=48000)
    s.bit_rate = int(kbps * 1000); s.layout = 'mono'
    y48 = np.interp(np.arange(int(len(wav) * 48000 / sr)) * sr / 48000, np.arange(len(wav)), wav).astype('float32')
    fr = av.AudioFrame.from_ndarray(y48[None, :], format='flt', layout='mono'); fr.sample_rate = 48000
    for p in s.encode(fr): c.mux(p)
    for p in s.encode(None): c.mux(p)
    c.close(); size = len(buf.getvalue()); buf.seek(0)
    d = av.open(buf); outs = [f.to_ndarray().reshape(-1) for f in d.decode(audio=0)]; d.close()
    y = np.concatenate(outs).astype('float32')
    sf.write(dst, y, 48000, subtype='FLOAT'); return size
for name in ('speech', 'music'):
    w, r = sf.read(f'{out}/{name}.wav', dtype='float32')
    for kb in (6, 12):
        size = opus_roundtrip(w, r, kb, f'{out}/{name}_opus{kb}.wav')
        meta[name][f'opus{kb}_bytes'] = size
json.dump(meta, open(f'{out}/inputs_meta.json', 'w'), indent=1)
print(json.dumps(meta, indent=1))
