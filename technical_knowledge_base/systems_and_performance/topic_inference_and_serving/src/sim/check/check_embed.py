"""Checks that ../index.html embeds exactly the data gen_data.py writes from out/*.json,
and that the numbers written into the tab's prose agree with that data or with their source.
Run: python3 check_embed.py"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(os.path.dirname(HERE))
page = open(os.path.join(SRC, '..', 'index.html')).read()
part = open(os.path.join(SRC, 'parts', '31_js_sim_1data.js')).read()
fails = []
subprocess.run([sys.executable, os.path.join(SRC, 'sim', 'gen_data.py')], check=True, capture_output=True)
if open(os.path.join(SRC, 'parts', '31_js_sim_1data.js')).read() != part:
    fails.append('31_js_sim_1data.js is stale: rerun gen_data.py')
m = re.search(r'window\.SIMD=(\{.*?\});\n', page)
D = json.loads(m.group(1)) if m else None
if D is None or json.dumps(D, separators=(',', ':')) not in part:
    fails.append('index.html does not embed the current data (rebuild)')
html = open(os.path.join(SRC, 'parts', '31_tab_sim.html')).read()
text = re.sub(r'<[^>]+>', ' ', html)
def need(cond, msg):
    if not cond:
        fails.append(msg)
# vLLM facts quoted in prose (checked in the pinned source by hand; values here as in vllm/engine/arg_utils.py and config/cache.py)
need('db9527a' in html and D['vllm']['commit'].startswith('db9527a'), 'vLLM commit')
need('16 tokens by default in vLLM' in text, 'block size sentence')
# H100 table row quoted in prose
r = [x for x in D['h100']['rows'] if x['isl'] == 1000 and x['C'] == 25][0]
need(round(r['pub'][0]) == 268 and '268 ms at 25 clients and 1,000-token prompts' in open(os.path.join(SRC, 'parts', '31_js_sim_6val.js')).read(), 'NIM 268 ms row')
# chip peaks used in data and prose
need(D['hw']['h100_bf16']['peak'] == 989.5e12 and D['hw']['h100_fp8']['peak'] == 1979e12 and D['hw']['h100_bf16']['bw'] == 3.35e12, 'H100 peaks')
need('989.5 TFLOP/s BF16 and 1,979 FP8 dense, 3.35 TB/s' in text, 'H100 prose')
need(abs(D['hw']['m1']['peak'] - 5.308e12) < 1 and D['hw']['m1']['bw'] == 200e9 and '5.3 TFLOP/s' in text and '200 GB/s' in text, 'M1 peaks')
need(abs(3.35e12 / 200e9 - 17) < 0.5 and '1/17' in text, '1/17 bandwidth ratio')
ins = [s['in_tok_per_req'] for s in json.load(open(os.path.join(SRC, 'sim', 'inputs', 'm1', 'ibench_m1.json')))['llama_server_closed']['runs']]
need(all(400 <= x <= 420 for x in ins) and 'about 410-token prompts' in text, 'server prompt length')
need(D['vllm']['cases'] and all(c['identical'] for c in D['vllm']['cases']), 'vLLM traces not all identical')
print('fails:', fails if fails else 0)
sys.exit(1 if fails else 0)
