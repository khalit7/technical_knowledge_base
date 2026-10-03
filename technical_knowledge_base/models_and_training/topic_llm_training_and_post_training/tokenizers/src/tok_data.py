# Tokenize real text with real tokenizers, offline, and store the small results the page shows.
# Run from src/:  uv run --with tokenizers --with tiktoken --with huggingface_hub python tok_data.py <flores200_dataset dir> <petrov tokenization_lengths.csv> <petrov flores_language_map.csv>
#   FLORES-200: https://dl.fbaipublicfiles.com/nllb/flores200_dataset.tar.gz (CC BY-SA 4.0; not stored here, 25 MB)
#   Petrov et al. 2023 results: https://github.com/AleksandarPetrov/tokenization-fairness (assets/tokenization_lengths.csv, compute/flores_language_map.csv)
# Writes inputs/flores_counts.json, inputs/petrov_check.json, inputs/examples.json.
# Tokenizer files come from the Hugging Face cache (tokenizer.json only); tiktoken vocabularies from tiktoken.
import json, os, re, sys, csv
import tiktoken
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download

FL, PCSV, PMAP = sys.argv[1], sys.argv[2], sys.argv[3]

# (key, label, source). Mirrors are used where the official repository is gated; each has the official vocabulary.
TOKS = [
    ('gpt2',  'GPT-2 / GPT-3 (r50k_base)', ('tt', 'r50k_base')),
    ('cl100k','GPT-4 (cl100k_base)',       ('tt', 'cl100k_base')),
    ('o200k', 'GPT-4o / GPT-5 (o200k_base)', ('tt', 'o200k_base')),
    ('llama2','Llama 2 (32K SentencePiece BPE)', ('hf', 'NousResearch/Llama-2-7b-hf')),
    ('llama3','Llama 3 (128K)',            ('hf', 'NousResearch/Meta-Llama-3-8B')),
    ('llama4','Llama 4 (202K)',            ('hf', 'unsloth/Llama-4-Scout-17B-16E-Instruct')),
    ('qwen3', 'Qwen3 (152K)',              ('hf', 'Qwen/Qwen3-8B')),
    ('qwen35','Qwen3.5 (248K)',            ('hf', 'Qwen/Qwen3.5-0.8B')),
    ('gemma3','Gemma 3 (262K)',            ('hf', 'unsloth/gemma-3-1b-it')),
    ('dsv3',  'DeepSeek-V3 (129K)',        ('hf', 'deepseek-ai/DeepSeek-V3')),
]

def bytes_to_unicode():
    bs = list(range(ord('!'), ord('~')+1)) + list(range(ord('¡'), ord('¬')+1)) + list(range(ord('®'), ord('ÿ')+1))
    cs = bs[:]; n = 0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256+n); n += 1
    return {chr(c): b for b, c in zip(bs, cs)}
U2B = bytes_to_unicode()

class TT:
    def __init__(s, name): s.e = tiktoken.get_encoding(name); s.n_vocab = s.e.n_vocab
    def count(s, t): return len(s.e.encode_ordinary(t))
    def pieces(s, t): return [s.e.decode_single_token_bytes(i) for i in s.e.encode_ordinary(t)]
    def ids(s, t): return s.e.encode_ordinary(t)

class HF:
    def __init__(s, repo):
        p = hf_hub_download(repo, 'tokenizer.json'); s.t = Tokenizer.from_file(p)
        j = json.load(open(p)); s.bl = 'ByteLevel' in json.dumps(j.get('decoder'))
        s.n_vocab = s.t.get_vocab_size(with_added_tokens=True)
    def count(s, t): return len(s.t.encode(t, add_special_tokens=False).ids)
    def ids(s, t): return s.t.encode(t, add_special_tokens=False).ids
    def pieces(s, t):
        out = []
        for tok in s.t.encode(t, add_special_tokens=False).tokens:
            m = re.fullmatch(r'<0x([0-9A-Fa-f]{2})>', tok)
            if m: out.append(bytes([int(m.group(1), 16)]))
            elif s.bl: out.append(bytes(U2B[c] for c in tok))
            else: out.append(tok.replace('▁', ' ').encode('utf-8'))
        return out

T = {k: (TT(src[1]) if src[0] == 'tt' else HF(src[1])) for k, _, src in TOKS}

def lang_text(code):
    dev = open(f'{FL}/dev/{code}.dev').read().split('\n')
    dt = open(f'{FL}/devtest/{code}.devtest').read().split('\n')
    return dev, dt, ' '.join(dev + dt)   # exactly Petrov et al.'s construction (compute_tokenizations.py)

# ---- 1. Every FLORES-200 language, every tokenizer ----
pmap = {}
for row in csv.reader(open(PMAP)):
    if len(row) == 2 and row[1].strip() != 'FLORES-200 code': pmap[row[1].strip()] = row[0].strip()
codes = sorted(f[:-4] for f in os.listdir(f'{FL}/dev') if f.endswith('.dev'))
langs = []
for c in codes:
    _, _, txt = lang_text(c)
    r = {'code': c, 'name': pmap.get(c, c), 'chars': len(txt), 'bytes': len(txt.encode('utf-8'))}
    for k, _, _ in TOKS: r[k] = T[k].count(txt)
    langs.append(r)
    print(c, r['cl100k'], file=sys.stderr)
json.dump({'note': 'Token counts over FLORES-200 dev + devtest joined by spaces (Petrov et al. construction), no special tokens. chars = Unicode code points (UTF-32 length), bytes = UTF-8 length (ByT5 uses one token per byte).',
           'tokenizers': [{'k': k, 'label': l, 'src': s[1], 'n_vocab': T[k].n_vocab} for k, l, s in TOKS],
           'langs': langs}, open('inputs/flores_counts.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# ---- 2. Reproduce Petrov et al.'s published lengths ----
rows = list(csv.DictReader(open(PCSV)))
byname = {r['Language']: r for r in rows}
chk = {'r50k_base': 'gpt2', 'cl100k_base': 'cl100k', 'LLAMA': 'llama2', 'ByT5': 'bytes', 'UTF-32': 'chars'}
res = {k: {'match': 0, 'n': 0, 'diffs': []} for k in chk}
for r in langs:
    p = byname.get(r['name'])
    if not p: continue
    for col, k in chk.items():
        mine = r[k]
        if col == 'ByT5': theirs = int(p[col])
        else: theirs = int(p[col])
        res[col]['n'] += 1
        if mine == theirs: res[col]['match'] += 1
        elif len(res[col]['diffs']) < 8: res[col]['diffs'].append([r['code'], mine, theirs])
json.dump(res, open('inputs/petrov_check.json', 'w'), indent=1)
print(json.dumps({k: (v['match'], v['n']) for k, v in res.items()}), file=sys.stderr)

# ---- 3. Examples shown token by token ----
EX_LANGS = ['eng_Latn', 'fra_Latn', 'deu_Latn', 'spa_Latn', 'rus_Cyrl', 'ell_Grek', 'zho_Hans', 'jpn_Jpan', 'kor_Hang',
            'arb_Arab', 'heb_Hebr', 'hin_Deva', 'tam_Taml', 'tha_Thai', 'vie_Latn', 'swh_Latn', 'yor_Latn', 'amh_Ethi', 'mya_Mymr', 'shn_Mymr']
SENT = 366   # index in dev + devtest; "The major organ of the circulatory system is the heart, which pumps the blood."
CODE = 'def mean(xs):\n    total = 0\n    for x in xs:\n        total += x\n    return total / len(xs)\n'
FAIL = {
    'strawberry': 'How many r are in strawberry?',
    'num': '12345678 + 87654321 = 99999999',
    'year': 'In 2024 the price rose from 1,299 to 13,999.',
    'space_a': 'The capital of France is',
    'space_b': 'The capital of France is ',
    'space_c': 'The capital of France is Paris',
    'blt': 'Daenerys Targaryen is in Game of Thrones, a fantasy epic by George R.R. Martin.',
    'magikarp': ' SolidGoldMagikarp',
    'petertodd': ' petertodd',
    'chat': '<|user|>',
}
def enc(s):
    out = {}
    for k, _, _ in TOKS:
        ps = T[k].pieces(s)
        out[k] = ['\x00' + p.hex() if not valid(p) else p.decode('utf-8') for p in ps]
        out[k + '_ids'] = T[k].ids(s)
    return out
def valid(b):
    try: b.decode('utf-8'); return True
    except UnicodeDecodeError: return False
ex = {'sentence_index': SENT, 'langs': {}, 'code': {'text': CODE, **enc(CODE)}, 'fail': {}}
for c in EX_LANGS:
    dev, dt, _ = lang_text(c)
    s = (dev + dt)[SENT]
    ex['langs'][c] = {'name': pmap.get(c, c), 'text': s, **enc(s)}
for k, s in FAIL.items(): ex['fail'][k] = {'text': s, **enc(s)}
# OpenAI's "Hello GPT-4o" language-tokenization sentences, verbatim from the 13 May 2024 Wayback capture
# (https://web.archive.org/web/20240513235319id_/https://openai.com/index/hello-gpt-4o/), with the page's published cl100k -> o200k counts.
ex['gpt4o'] = []
for line in open('inputs/gpt4o_sentences.tsv', encoding='utf-8'):
    if line.startswith('#') or not line.strip(): continue
    lang, a, b, sent = line.rstrip('\n').replace('\\u2014', '\u2014').split('\t')
    ex['gpt4o'].append({'lang': lang, 'pub_cl100k': int(a), 'pub_o200k': int(b), 'text': sent,
                        'cl100k': T['cl100k'].count(sent), 'o200k': T['o200k'].count(sent)})
json.dump(ex, open('inputs/examples.json', 'w'), ensure_ascii=True, separators=(',', ':'))  # ASCII-escaped: one source sentence contains U+2014
print('done', file=sys.stderr)
