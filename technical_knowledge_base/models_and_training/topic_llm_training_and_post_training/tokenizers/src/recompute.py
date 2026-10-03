# Recompute every derived number the page quotes from src/inputs/, and check that the built page carries it.
# Run from src/: python3 recompute.py   (stdlib; writes inputs/recompute.json)
import json, statistics as S, re
fl = json.load(open('inputs/flores_counts.json')); ex = json.load(open('inputs/examples.json'))
cf = json.load(open('inputs/configs.json')); pc = json.load(open('inputs/petrov_check.json')); ov = json.load(open('inputs/vocab_overlap.json'))
html = open('../index.html').read()
L = {r['code']: r for r in fl['langs']}; e = L['eng_Latn']; TK = [t['k'] for t in fl['tokenizers']]
R = {}
prem = lambda c, k: L[c][k] / e[k]
for k in TK + ['bytes']:
    p = [r[k] / e[k] for r in fl['langs']]
    R[k] = {'median': round(S.median(p), 2), 'over2': sum(x > 2 for x in p), 'over3': sum(x > 3 for x in p), 'max': round(max(p), 2),
            'total_M': round(sum(r[k] for r in fl['langs']) / 1e6, 1), 'eng_chars_per_token': round(e['chars'] / e[k], 2)}
R['tamil'] = {k: round(prem('tam_Taml', k), 2) for k in TK}
R['petrov_cl100k'] = {c: round(prem(c, 'cl100k'), 2) for c in ['ita_Latn', 'bul_Cyrl', 'arb_Arab', 'shn_Mymr', 'por_Latn']}
R['llama2_to_3_flores_gain'] = round(e['llama2'] / e['llama3'] - 1, 3)      # chars/token ratio = token ratio on the same text
R['llama3_paper_gain'] = round(3.94 / 3.17 - 1, 3)
rows = {r['label']: r for r in cf['rows']}
def share(lbl):
    r = rows[lbl]; tie = r['tie'] if r['tie'] is not None else True; emb = r['V'] * r['d'] * (1 if tie else 2); return emb, r['params'], emb / r['params']
g = share('Gemma 3 270M'); R['gemma3_270m'] = {'emb_M': round(g[0] / 1e6, 1), 'total_M': round(g[1] / 1e6, 1), 'rest_M': round((g[1] - g[0]) / 1e6, 1), 'share_pct': round(100 * g[2], 1)}
R['llama32_1b_share_pct'] = round(100 * share('Llama 3.2 1B')[2], 1); R['dsv3_share_pct'] = round(100 * share('DeepSeek-V3')[2], 1)
R['g4o_exact'] = sum(1 for g in ex['gpt4o'] if g['pub_cl100k'] == g['cl100k'] and g['pub_o200k'] == g['o200k'])
R['petrov'] = {k: v['match'] for k, v in pc.items()}
R['burmese'] = {'words': len(ex['langs']['mya_Mymr']['text'].split()), 'bytes': len(ex['langs']['mya_Mymr']['text'].encode()), 'gpt2': len(ex['langs']['mya_Mymr']['gpt2']), 'o200k': len(ex['langs']['mya_Mymr']['o200k'])}
R['overlap'] = ov['shared']; R['voc_rows'] = len(cf['rows']) - 1 + 3
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
# the page must quote these
need = [f"{R['cl100k']['median']}", f"{R['o200k']['median']}", f"{R['cl100k']['over3']} languages pay more than 3 times", f"{R['o200k']['over3']} with o200k", f"{R['gemma3']['over3']} with Gemma 3",
        f"{R['gpt2']['total_M']}M tokens (GPT-2)", f"{R['o200k']['total_M']}M (GPT-4o)", f"{R['gemma3']['total_M']}M (Gemma 3)",
        f"{R['tamil']['llama3']} with Llama 3 to {R['tamil']['gemma3']} with Gemma 3", f"{R['gemma3_270m']['emb_M']}M", f"{R['gemma3_270m']['total_M']}M", f"{R['gemma3_270m']['rest_M']}M",
        f"spends {round(R['llama32_1b_share_pct'])}%", f"DeepSeek-V3 {R['dsv3_share_pct']}%", f"a {round(100*R['llama2_to_3_flores_gain'])}% gain", f"a {round(100*R['llama3_paper_gain'])}% gain",
        f"{R['burmese']['bytes']} bytes", f"{R['burmese']['gpt2']} GPT-2 tokens", f"against {R['burmese']['o200k']} for GPT-4o", f"{R['voc_rows']} models",
        f"{R['overlap']['gemma4_gemma3']:,}", f"{R['overlap']['qwen35_qwen3']:,}", '4.28 and 4.91', 'between 4.82 and 4.96']
text = re.sub(r'<[^>]+>', ' ', html); text = re.sub(r'\s+', ' ', text)
miss = [n for n in need if n not in text]
print(json.dumps({k: R[k] for k in ['cl100k', 'o200k', 'gemma3_270m', 'g4o_exact', 'petrov']}, indent=0))
print('quoted on the page:', len(need) - len(miss), 'of', len(need), '; missing:', miss)
