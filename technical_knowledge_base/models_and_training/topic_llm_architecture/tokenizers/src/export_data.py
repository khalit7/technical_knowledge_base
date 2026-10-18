# Turn src/inputs/*.json into the compact data script parts/22_js_tk_0data.js (run by build.sh; stdlib only).
import json, os, re

EM = '\u2014'   # the em-dash character, written as an escape
fl = json.load(open('inputs/flores_counts.json'))
ex = json.load(open('inputs/examples.json'))
cf = json.load(open('inputs/configs.json'))
pc = json.load(open('inputs/petrov_check.json'))

TK = [t['k'] for t in fl['tokenizers']]

def blen(p):   # bytes in one token: '\x00' + hex marks a token that is not valid UTF-8 on its own
    return len(p[1:]) // 2 if p.startswith('\x00') else len(p.encode('utf-8'))

B36 = '0123456789abcdefghijklmnopqrstuvwxyz'
def lens(text, pieces):
    r = lens0(text, pieces)
    # a tokenizer that normalises the text first (Qwen applies NFC) no longer lines up with the original bytes:
    # store its pieces as text instead
    return r if r is not None else pieces
def lens0(text, pieces):
    """Token boundaries as UTF-8 byte lengths, one base-36 character per token; a leading '+' means the
    tokenizer added a space in front (Llama 2's SentencePiece prefix)."""
    L = [blen(p) for p in pieces]
    tb = text.encode('utf-8'); tot = sum(L)
    pre = ''
    if tot == len(tb) + 1: pre = '+'
    elif tot != len(tb): return None
    if max(L) > 35: return pre + '[' + ','.join(map(str, L))
    return pre + ''.join(B36[x] for x in L)

out = {}
out['tok'] = [{'k': t['k'], 'label': t['label'], 'src': t['src'], 'n': t['n_vocab']} for t in fl['tokenizers']]
out['fl'] = [[r['code'], r['name'], r['chars'], r['bytes']] + [r[k] for k in TK] for r in fl['langs']]
out['petrov'] = {k: [v['match'], v['n']] for k, v in pc.items()}
out['ex'] = {}
for c, v in ex['langs'].items():
    out['ex'][c] = {'name': v['name'], 'text': v['text'], 't': {k: lens(v['text'], v[k]) for k in TK}}
out['ex']['code'] = {'name': 'Python code', 'text': ex['code']['text'], 't': {k: lens(ex['code']['text'], ex['code'][k]) for k in TK}}
out['fail'] = {}
for c, v in ex['fail'].items():
    out['fail'][c] = {'text': v['text'], 't': {k: lens(v['text'], v[k]) for k in TK},
                      'ids': {k: v[k + '_ids'] for k in TK}}
out['g4o'] = []
for g in ex['gpt4o']:
    t = g['text']; had = EM in t
    out['g4o'].append([g['lang'], t.replace(EM, '–'), g['pub_cl100k'], g['cl100k'], g['pub_o200k'], g['o200k'], 1 if had else 0])

# Vocabulary rows: open models from config.json (date = Hugging Face repository creation, except the three
# 2018-2019 models whose repositories were migrated in 2022: their paper dates), closed tokenizers from tiktoken.
DATE = {'BERT-base': ('2018-10-11', 'https://arxiv.org/abs/1810.04805'), 'GPT-2': ('2019-02-14', 'https://openai.com/index/better-language-models/'),
        'T5-base': ('2019-10-23', 'https://arxiv.org/abs/1910.10683'), 'LLaMA 7B': ('2023-02-24', 'https://arxiv.org/abs/2302.13971')}
voc = []
for r in cf['rows']:
    if r['label'] == 'Gemma 4 E2B': continue   # per-layer embeddings make its embedding share incomparable
    tie = r['tie'] if r['tie'] is not None else True   # transformers' default when the config omits it
    d, src = DATE.get(r['label'], (r['created'], None))
    voc.append({'m': r['label'], 'fam': r['family'], 'alg': r['alg'], 'V': r['V'], 'd': r['d'], 'tie': tie, 'P': r['params'],
                'date': d, 'dsrc': src, 'repo': r['repo']})
# 2026 models added on 2026-10-18 from the root's map configs (vocab_size, width, tying) and src/tok2026/fetched.json (repository creation date)
MAPD = os.path.join('..', '..', 'src', 'map', 'inputs', 'configs')
FET = {r['repo']: r for r in json.load(open('tok2026/fetched.json')) if r.get('info')}
NEW = [('DeepSeek-V4-Pro', 'deepseek-ai/DeepSeek-V4-Pro', 'DeepSeek', 'byte-level BPE'), ('Kimi K3', 'moonshotai/Kimi-K3', 'Kimi', 'byte-level BPE (tiktoken)'),
       ('Nemotron 3 Super', 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16', 'Nemotron', 'byte-level BPE'), ('MiniMax-M3', 'MiniMaxAI/MiniMax-M3', 'MiniMax', 'byte-level BPE'),
       ('GLM-5', 'zai-org/GLM-5', 'GLM', 'byte-level BPE'), ('Qwen3.5-397B-A17B', 'Qwen/Qwen3.5-397B-A17B', 'Qwen', 'byte-level BPE'),
       ('Olmo 3 32B Think', 'allenai/Olmo-3-32B-Think', 'Olmo', 'byte-level BPE'), ('SmolLM3-3B', 'HuggingFaceTB/SmolLM3-3B-Base', 'SmolLM', 'byte-level BPE')]
for lab, repo, fam, alg in NEW:
    c = json.load(open(os.path.join(MAPD, repo.replace('/', '__') + '.json'))); tc = c.get('text_config') or c
    tie = tc.get('tie_word_embeddings', c.get('tie_word_embeddings')); tie = True if tie is None else tie
    voc.append({'m': lab, 'fam': fam, 'alg': alg, 'V': tc.get('vocab_size') or c.get('vocab_size'), 'd': tc.get('hidden_size'), 'tie': tie, 'P': None,
                'date': FET[repo]['created'], 'dsrc': None, 'repo': repo})
closed = [
    {'m': 'GPT-3 (r50k_base)', 'fam': 'OpenAI', 'alg': 'byte-level BPE', 'V': 50257, 'date': '2020-05-28', 'dsrc': 'https://arxiv.org/abs/2005.14165'},
    {'m': 'GPT-4 (cl100k_base)', 'fam': 'OpenAI', 'alg': 'byte-level BPE', 'V': 100277, 'date': '2023-03-14', 'dsrc': 'https://openai.com/index/gpt-4-research/'},
    {'m': 'GPT-4o (o200k_base)', 'fam': 'OpenAI', 'alg': 'byte-level BPE', 'V': 200019, 'date': '2024-05-13', 'dsrc': 'https://web.archive.org/web/20240513235319/https://openai.com/index/hello-gpt-4o/'},
]
out['voc'] = sorted(voc + closed, key=lambda r: r['date'])

js = '// Generated by export_data.py from src/inputs/ (do not edit by hand)\nwindow.TD=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
assert EM not in js
open('parts/22_js_tk_0data.js', 'w').write(js)
print('22_js_tk_0data.js', len(js.encode('utf-8')), 'bytes')
