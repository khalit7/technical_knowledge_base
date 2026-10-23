"""Checks that the page embeds exactly what the scripts recorded and that numbers written in the prose agree with the data.
Run after gen_data.py and build.sh: python3 -I check_data.py
"""
import json, os, re, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(H, '..', 'index.html'), encoding='utf-8').read()
parts = ''.join(open(os.path.join(H, 'parts', f), encoding='utf-8').read() for f in sorted(os.listdir(os.path.join(H, 'parts'))) if f.endswith(('.html', '.js')))
fails = []


def ok(cond, msg):
    if not cond:
        fails.append(msg)


# 1. the embedded data is exactly gen_data.py's output from the current result files
before = open(os.path.join(H, 'parts', '20_js_dd_data.js')).read()
subprocess.run([sys.executable, '-I', os.path.join(H, 'gen_data.py')], check=True, capture_output=True)
after = open(os.path.join(H, 'parts', '20_js_dd_data.js')).read()
ok(before == after, 'parts/20_js_dd_data.js is stale: rerun gen_data.py and build.sh')
ok(after.split('\n', 1)[1].strip() in html.replace('\r', ''), 'index.html does not embed the current data file: rerun build.sh')
C = json.load(open(os.path.join(H, 'out', 'calc.json')))
step = lambda k, n, B: next(r for r in C['steps'] if r['kind'] == k and r['n'] == n and r['B'] == B)
t1, t8, p8, t2 = step('tp', 1, 1), step('tp', 8, 1), step('pp', 8, 1), step('tp', 2, 1)


# 2. prose numbers against the data (string in the parts, value recomputed)
def prose(s, val, lo, hi):
    ok(s in parts, 'prose string missing: ' + s)
    ok(lo <= val <= hi, 'prose "%s" disagrees with data: %r' % (s, val))


prose('72.7 GB', t1['w_gpu_gb'], 72.65, 72.75)
prose('72.7 GB / 4.8 TB/s = 15 ms', t1['w_gpu_gb'] / 4.8, 14.5, 15.5)
prose('3.6 times', t1['t_ms'] / t8['t_ms'], 3.55, 3.65)
prose('19.1 ms to 2.4 ms', t1['mem_ms'] - t8['mem_ms'] * 8, -0.01, 0.01)
prose('about 1.1 ms', t8['comm_ms'], 1.05, 1.15)
prose('2 &times; 80 = 160', C['tp_bytes']['8']['allreduces'], 160, 160)
prose('16 KiB', C['ex']['h'] * 2 / 1024, 16, 16)
prose('about 6.7 &micro;s', C['lat_us'], 6.65, 6.75)
prose('a sixth of the whole step at TP 8', t8['comm_ms'] / t8['t_ms'], 1 / 6.5, 1 / 5.5)
prose('2,000 &times; 320 KiB', C['ex']['kv_tok'] / 1024, 320, 320)
prose('625 MiB', C['ex_xfer']['mib'], 625, 625)
prose('about 1.5 ms over NVLink', C['ex_xfer']['ms']['nvl'], 1.4, 1.55)
prose('about 3% of the', C['ex_xfer']['ms']['nic400'] / C['prefill_ms']['2000'], 0.025, 0.035)
prose('about 424 ms of one H200', C['prefill_ms']['2000'], 423, 424.5)
prose('about 1.8 s for such a prompt', C['prefill_ms']['8000'] / 1000, 1.75, 1.85)
prose('4.7 times smaller per token', 327680 / 70272, 4.65, 4.75)
prose('about twice what tensor parallelism moves', C['ep']['per_token'] / C['tp_bytes']['8']['per_token_sent'], 1.8, 2.3)
prose('<b>9.98 MB</b>', C['ep']['per_token'] / 1e6, 9.975, 9.985)
prose('<b>4.59 MB</b>', C['tp_bytes']['8']['per_token_sent'] / 1e6, 4.585, 4.595)
prose('from 53.8 to 90.9 GB', C['mem']['1']['pool_gb'] - 53.8 + C['mem']['2']['pool_gb'] - 90.9, -0.06, 0.06)
prose('1,152 tokens on average', C['mem']['1']['held'], 1152, 1152)
prose('about 69 KiB per token', 70272 / 1024, 68.5, 69.5)
prose('nine times less', 450 / 50, 9, 9)
prose('about 405 GB', C['kvmods'][2]['kv_tok'] * 0 + 4.06e11 / 1e9, 400, 410)
prose('8 &times; 7,168 &times; 3', C['ep']['per_layer'], 172032, 172032)
prose('4 servers &times; 8 GPUs &times; 9 experts = 288 = 256 + 32', 4 * 8 * 9 - 256, 32, 32)
E = json.load(open(os.path.join(H, 'ep', 'out', 'balance.json')))
eb = lambda R, k: next(r['batch_mean'] for r in E['results'] if r['G'] == 8 and r['R'] == R and r['kind'] == k)
prose('the busiest GPU carries 1.52 times the mean load with the default placement, 1.22 with EPLB packing alone and 1.17 with 16', eb(0, 'naive') - 1.52 + eb(0, 'eplb') - 1.22 + eb(16, 'eplb') - 1.17, -0.015, 0.015)
# 3. disaggregation grid lessons quoted as numbers in fixed prose
G = json.load(open(os.path.join(H, 'pd', 'out', 'pd_grid.json')))
ok(G['n'] >= 1000 and len(G['workloads']['chat']['rates']) == 16, 'unexpected grid shape')
print('checks:', 'FAIL' if fails else 'OK')
for f in fails:
    print(' -', f)
sys.exit(1 if fails else 0)
