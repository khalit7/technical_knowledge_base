# Real errors and one silent bad output, recorded for the Mistakes section (CPU).
# usage: OMP_NUM_THREADS=4 nice -n 15 $GM_SCRATCH/venv/bin/python -I mistakes.py <audio dir> <out json>
import sys, json, traceback, numpy as np, torch
from scipy.io import wavfile
from transformers import EncodecModel, MimiModel, AutoProcessor
torch.set_num_threads(4)
AD, OUT = sys.argv[1], sys.argv[2]
res = {}
sr, x16 = wavfile.read(f'{AD}/speech.wav'); x16 = x16.astype(np.float32)
m = EncodecModel.from_pretrained('facebook/encodec_24khz', revision='c1dbe2ae3f1de713481a3b3e7c47f357092ee040').eval()
def err(f):
    try: f(); return None
    except Exception as e: return f'{type(e).__name__}: {e}'
with torch.inference_mode():
    x = torch.from_numpy(x16)[None, None]
    res['encodec_bandwidth_5'] = err(lambda: m.encode(x, bandwidth=5.0))
    proc = AutoProcessor.from_pretrained('facebook/encodec_24khz', revision='c1dbe2ae3f1de713481a3b3e7c47f357092ee040')
    res['processor_wrong_rate'] = err(lambda: proc(raw_audio=x16, sampling_rate=16000, return_tensors='pt'))
    # the silent mistake: 16 kHz samples handed to the 24 kHz model as if they were 24 kHz
    codes = m.encode(x, bandwidth=6.0).audio_codes
    y = m.decode(codes, [None])[0][0, 0].numpy()
    wavfile.write(f'{AD}/speech_wrongrate.wav', 24000, y.astype(np.float32))
    res['wrong_rate'] = {'input_samples': int(len(x16)), 'input_seconds_true': round(len(x16) / 16000, 3),
                         'output_seconds_at_24k': round(len(y) / 24000, 3), 'frames': int(codes.shape[-1]), 'pitch_factor': 1.5}
mm = MimiModel.from_pretrained('kyutai/mimi', revision='89091b3e466eb6a9d11e537bf26b144f194978f7').eval()
with torch.inference_mode():
    x24 = torch.zeros(1, 1, 24000)
    res['mimi_40_codebooks'] = err(lambda: mm.encode(x24, num_quantizers=40))
json.dump(res, open(OUT, 'w'), indent=1); print(json.dumps(res, indent=1))
