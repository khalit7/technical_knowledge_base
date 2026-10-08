"""Write parts/31_js_sim_1data.js: model and hardware presets, the calibration
results and the vLLM comparison, all from out/*.json (so the page embeds exactly
what the scripts recorded; check/check_embed.py verifies it)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from presets import MODELS
CAL = os.environ.get('CAL', 'calib_h100_optimistic_0.json')
h = json.load(open(os.path.join(HERE, 'out', CAL)))
m1 = json.load(open(os.path.join(HERE, 'out', 'calib_m1.json')))
vc = json.load(open(os.path.join(HERE, 'out', 'vllm_check.json')))
mp = json.load(open(os.path.join(HERE, 'out', 'mlperf_pred.json')))
r6 = lambda x: float('%.6g' % x)
def hwd(d, peak, mem, label):
    return {'peak': peak, 'bw': d['bw'], 'ec': r6(d['ec']), 'em': r6(d['em']), 'ovh': r6(d['ovh']), 'ovs': r6(d['ovs']), 'mem': mem, 'label': label}
q4 = dict(m1['model']); q4['name'] = 'Qwen3-0.6B, Q4_K_M weights, F16 KV'
data = {
  'models': {'l8_bf16': MODELS['l8_bf16'], 'l8_fp8': MODELS['l8_fp8'], 'q06_q4': q4},
  'hw': {'h100_bf16': hwd(h['hw'], 989.5e12, 80, 'H100 SXM, BF16 (efficiencies fitted at FP8, assumed to carry over)'),
         'h100_fp8': hwd(h['hw'], 1979e12, 80, 'H100 SXM, FP8 (fitted on NVIDIA NIM measurements)'),
         'm1': hwd(m1['hw'], m1['hw']['peak'], 16, 'Apple M1 Pro GPU (fitted on llama.cpp runs on this machine)')},
  'h100': {'api': r6(h['api']), 'kv_tokens_fit': h.get('kv_tokens_fit'), 'kv_gb_mem': r6(h.get('kv_gb_mem', 0) or 0), 'eng': h['eng'], 'admit': h.get('admit'),
           'skip': h.get('skip_first_wave'), 'source': h['source'], 'fetched': h['fetched'], 'label': h['label'], 'rows': h['rows']},
  'm1': {'eng': m1['eng'], 'pp': m1['pp'], 'tg': m1['tg'], 'server': m1['server']},
  'mlperf': mp,
  'vllm': {'version': 'v0.31.0', 'commit': 'db9527a46873454610df6dbedf79a36d6bf1a7f6',
           'cases': [{'name': c['name'], 'steps': c['steps_vllm'], 'steps_sim': c['steps_sim'], 'identical': c['identical'],
                      'pre': c['preemptions_vllm'], 'pre_sim': c['preemptions_sim'], 'tokens': c['sched_tokens_vllm']} for c in vc]},
}
js = '// ---- Serving simulator (t-sim): data written by src/sim/gen_data.py from src/sim/out/*.json; do not edit by hand ----\nwindow.SIMD=' + json.dumps(data, separators=(',', ':')) + ';\n'
open(os.path.join(HERE, '..', 'parts', '31_js_sim_1data.js'), 'w').write(js)
print(len(js), 'bytes')
