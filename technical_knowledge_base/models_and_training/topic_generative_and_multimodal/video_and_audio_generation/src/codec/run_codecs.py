# Neural audio codec round trips on CPU (no GPU): EnCodec 24 kHz, DAC 44.1 kHz, Mimi; every prefix of the residual codebooks.
# usage: OMP_NUM_THREADS=4 nice -n 15 $GM_SCRATCH/venv/bin/python -I run_codecs.py <audio dir> <out json>
import sys, json, time, numpy as np, torch
from scipy.io import wavfile
from scipy.signal import resample_poly
from transformers import EncodecModel, DacModel, MimiModel
torch.set_num_threads(4)
AD, OUT = sys.argv[1], sys.argv[2]
REVS = {'facebook/encodec_24khz': 'c1dbe2ae3f1de713481a3b3e7c47f357092ee040',
        'descript/dac_44khz': 'c1bc521685adf9cfe247bc39a5ca58917eda1ac4',
        'kyutai/mimi': '89091b3e466eb6a9d11e537bf26b144f194978f7'}

def load(name):
    sr, x = wavfile.read(f'{AD}/{name}.wav'); return sr, x.astype(np.float32)
def resample(x, sr, to):
    if sr == to: return x.copy()
    g = np.gcd(int(sr), int(to)); return resample_poly(x, to // g, sr // g).astype(np.float32)
def save(name, x, sr): wavfile.write(f'{AD}/{name}.wav', int(sr), x.astype(np.float32))

# log-mel at 24 kHz: 1024-point FFT, 10 ms hop, 80 mel bands, log10 power floored 60 dB below the reference's peak; metric = mean |difference| (1.0 = 10 dB)
def mel_fb(sr, n_fft, n_mels, fmax):
    hz2m = lambda f: 2595 * np.log10(1 + f / 700); m2hz = lambda m: 700 * (10 ** (m / 2595) - 1)
    pts = m2hz(np.linspace(hz2m(0), hz2m(fmax), n_mels + 2)); bins = np.fft.rfftfreq(n_fft, 1 / sr)
    fb = np.zeros((n_mels, len(bins)))
    for i in range(n_mels):
        l, c, r = pts[i], pts[i + 1], pts[i + 2]
        fb[i] = np.clip(np.minimum((bins - l) / (c - l), (r - bins) / (r - c)), 0, None)
    return fb
def logmel(x, sr=24000, n_fft=1024, hop=240, n_mels=80):
    w = np.hanning(n_fft); fr = 1 + (len(x) - n_fft) // hop
    S = np.abs(np.stack([np.fft.rfft(w * x[i * hop:i * hop + n_fft]) for i in range(fr)])) ** 2
    return np.log10(mel_fb(sr, n_fft, n_mels, sr / 2) @ S.T + 1e-5)
def metrics(ref24, rec24):
    n = min(len(ref24), len(rec24)); a, b = ref24[:n], rec24[:n]
    snr = 10 * np.log10((a ** 2).sum() / max(((a - b) ** 2).sum(), 1e-12))
    ma, mb = logmel(a), logmel(b); floor = ma.max() - 6  # 60 dB below the reference's peak, applied to both
    ma, mb = np.maximum(ma, floor), np.maximum(mb, floor)
    return {'snr_db': round(float(snr), 2), 'mel_l1': round(float(np.abs(ma - mb).mean()), 4)}

res = {'revisions': REVS, 'torch': torch.__version__, 'clips': {}}
for clip in ('speech', 'music'):
    sr0, x0 = load(clip); ref24 = resample(x0, sr0, 24000); save(f'{clip}_ref24', ref24, 24000)
    R = res['clips'][clip] = {'seconds': round(len(x0) / sr0, 3), 'codecs': {}}
    for kb in (6, 12):
        sro, xo = load(f'{clip}_opus{kb}'); R['codecs'][f'opus{kb}'] = metrics(ref24, resample(xo, sro, 24000))
    # EnCodec 24 kHz: 32 codebooks of 1,024 at 75 frames per second
    m = EncodecModel.from_pretrained('facebook/encodec_24khz', revision=REVS['facebook/encodec_24khz']).eval()
    x = torch.from_numpy(ref24)[None, None]
    with torch.inference_mode():
        t0 = time.time(); enc = m.encode(x, bandwidth=24.0); t_enc = time.time() - t0
        codes = enc.audio_codes  # (1 chunk, batch 1, 32 codebooks, frames)
        emb = m.encoder(x); e2 = float((emb ** 2).sum())
        rows = []
        for k in range(1, 33):
            t0 = time.time(); y = m.decode(codes[:, :, :k], [None])[0][0, 0].numpy(); t_dec = time.time() - t0
            q = m.quantizer.decode(codes[0, :, :k].transpose(0, 1))  # (k, batch, frames) -> sum of k code vectors
            r = dict(k=k, kbps=round(k * 75 * 10 / 1000, 2), resid=round(float(((emb - q) ** 2).sum()) / e2, 5), **metrics(ref24, y), dec_s=round(t_dec, 3))
            rows.append(r); save(f'{clip}_encodec_k{k}', y, 24000)
        R['codecs']['encodec'] = {'frames': int(codes.shape[-1]), 'enc_s': round(t_enc, 3), 'rows': rows,
                                  'codes_first8_stage1': codes[0, 0, 0, :8].tolist()}
        print(clip, 'encodec', rows[0], rows[7], rows[-1], flush=True)
    del m
    # DAC 44.1 kHz: 9 codebooks of 1,024 at 86.1 frames per second
    m = DacModel.from_pretrained('descript/dac_44khz', revision=REVS['descript/dac_44khz']).eval()
    x44 = resample(x0, sr0, 44100); xt = torch.from_numpy(x44)[None, None]
    with torch.inference_mode():
        t0 = time.time(); enc = m.encode(xt); t_enc = time.time() - t0
        codes = enc.audio_codes; z = m.encoder(xt); z2 = float((z ** 2).sum()); rows = []
        for k in range(1, 10):
            t0 = time.time(); y = m.decode(audio_codes=codes[:, :k]).audio_values[0].numpy(); t_dec = time.time() - t0
            zq = m.quantizer.from_codes(codes[:, :k])[0]
            y24 = resample(y, 44100, 24000)
            r = dict(k=k, kbps=round(k * 44100 / 512 * 10 / 1000, 2), resid=round(float(((z - zq) ** 2).sum()) / z2, 5), **metrics(ref24, y24), dec_s=round(t_dec, 3))
            rows.append(r); save(f'{clip}_dac_k{k}', y, 44100)
        R['codecs']['dac'] = {'frames': int(codes.shape[-1]), 'enc_s': round(t_enc, 3), 'rows': rows}
        print(clip, 'dac', rows[0], rows[-1], flush=True)
    del m
    # Mimi: 1 semantic + 31 acoustic codebooks of 2,048 at 12.5 frames per second (Moshi uses the first 8)
    m = MimiModel.from_pretrained('kyutai/mimi', revision=REVS['kyutai/mimi']).eval()
    with torch.inference_mode():
        t0 = time.time(); enc = m.encode(x, num_quantizers=32); t_enc = time.time() - t0
        codes = enc.audio_codes; rows = []
        for k in range(1, 33):
            t0 = time.time(); y = m.decode(codes[:, :k]).audio_values[0, 0].numpy(); t_dec = time.time() - t0
            r = dict(k=k, kbps=round(k * 12.5 * 11 / 1000, 3), **metrics(ref24, y), dec_s=round(t_dec, 3))
            rows.append(r); save(f'{clip}_mimi_k{k}', y, 24000)
        R['codecs']['mimi'] = {'frames': int(codes.shape[-1]), 'enc_s': round(t_enc, 3), 'rows': rows}
        print(clip, 'mimi', rows[0], rows[7], rows[-1], flush=True)
    del m
json.dump(res, open(OUT, 'w'), indent=1)
print('done')
