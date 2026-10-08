"""Predict MLPerf Inference v5.1's Server run of Llama 3.1 8B on 1x H100 SXM (Red Hat,
vLLM 0.10.0, FP8 weights and KV; 39.56 samples/s Poisson; dataset mean 778 input tokens,
128.0 output tokens per sample in the logs) with the NIM-fitted H100 model, as an
out-of-sample check on a different engine. Published values from the shared FACTS
(https://github.com/mlcommons/inference_results_v5.1/tree/main/closed/RedHat/results).
Writes out/mlperf_pred.json."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sim
from presets import MODELS
d = json.load(open(os.path.join(HERE, 'out', 'calib_h100_optimistic_0.json')))
M = MODELS['l8_fp8']
w = {'n': 2000, 'rate': 39.56, 'plo': 300, 'phi': 1256, 'olo': 128, 'ohi': 128, 'maxtok': 128, 'sys': 0, 'share': 0,
     'groups': 1, 'turns': 1, 'gap': 0, 'seed': 21}
c = {'mode': 'cont', 'kv': 'paged', 'bs': 16, 'nblocks': d['kv_tokens_fit'] // 16, 'pc': False, 'chunk': True,
     'budget': 8192, 'maxseq': 1024, 'preempt': 'recompute', 'swapbw': 25e9}
r, e, _ = sim.run({'w': w, 'hw': d['hw'], 'm': M, 'c': c, 'slo': [2, 0.1], 'api': d['api']})
m = sim.metrics(r, e, [2, 0.1])
out = {'pub': {'ttft_p50': 0.224, 'ttft_p99': 1.911, 'tpot_mean': 0.0231, 'tpot_p99': 0.0251, 'tps': 5103.99, 'rate': 39.56},
       'sim': {'ttft_p50': m['ttft'][0], 'ttft_p99': m['ttft'][2], 'tpot_mean': m['tpot'][3], 'tpot_p99': m['tpot'][2], 'tps': m['tps']},
       'note': 'prompt lengths uniform 300 to 1,256 (mean 778; the distribution is not published), 128 output tokens'}
json.dump(out, open(os.path.join(HERE, 'out', 'mlperf_pred.json'), 'w'), indent=1)
print(out)
