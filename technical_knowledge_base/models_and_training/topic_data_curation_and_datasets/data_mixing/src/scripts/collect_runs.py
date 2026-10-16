"""Collect the runs of run_pending.sh into ../data/proxy_runs.json (what the page embeds; the parent's Mixing lab reads it too).

Contents: the pools (train and val tokens per domain), every plain training run (weights, held-out loss per domain, tokens,
seconds, device), and each DoReMi run (reference weights, the per-step weights, running average, excess losses, final
averaged weights, held-out losses of the reference and of the Group DRO proxy). The RegMix-style sweep was dropped
(2026-10-15), so no regression is fitted here.
"""
import glob, json, os
W = os.environ['MX2_WORK']; H = os.path.dirname(os.path.abspath(__file__))
names = list(json.load(open(f'{W}/domains.json')))
stats = json.load(open(f'{W}/tok/stats.json'))
runs = [json.load(open(f)) for f in sorted(glob.glob(f'{W}/runs/*.json')) if not os.path.basename(f).startswith('doremi_proxy_')]
keep = ('tag', 'weights', 'val_loss', 'tokens', 'seconds', 'tokens_per_s', 'device', 'params_non_embedding', 'params_total', 'config')
out = {'date': '2026-10-16', 'names': names, 'pools': stats, 'tokenizer': 'GPT-2 (50,257)',
       'sources': {'web': 'DCLM-baseline 1.0 (parquet)', 'wiki': 'Wikipedia 20231101.en', 'code': 'Stack-v2-Edu (Comma v0.1)', 'math': 'FineMath 4+', 'papers': 'peS2o v2'},
       'runs': [{k: r[k] for k in keep if k in r} for r in runs],
       'doremi': [json.load(open(p)) for p in sorted(glob.glob(f'{W}/runs/doremi_proxy_*.json'))]}
json.dump(out, open(f'{H}/../data/proxy_runs.json', 'w'), separators=(',', ':'))
print('runs', len(out['runs']), 'doremi', len(out['doremi']), 'bytes', os.path.getsize(f'{H}/../data/proxy_runs.json'))
