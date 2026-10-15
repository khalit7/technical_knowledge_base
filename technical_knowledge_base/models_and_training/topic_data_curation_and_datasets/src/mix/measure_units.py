"""Measure unit conversions on the topic's 5-domain samples: chars, UTF-8 bytes, whitespace words, GPT-2 and NeoX tokens,
and (FineMath) the sample's own token_count field. Usage: python -I measure_units.py <samples_dir> <tok_dir> <comma_tokenizer.json> [out.json]"""
import json, sys
from tokenizers import Tokenizer
sd, td = sys.argv[1], sys.argv[2]
toks = {n: Tokenizer.from_file(f'{td}/{n}.json') for n in ('gpt2', 'neox')}
if len(sys.argv) > 3: toks['comma'] = Tokenizer.from_file(sys.argv[3])
out = {}
for name in ('dclm_baseline', 'wikipedia_en', 'stackv2_edu', 'finemath_4plus', 'pes2o_v2'):
    rows = [json.loads(l) for l in open(f'{sd}/{name}.jsonl')]
    texts = [r['text'] for r in rows]
    o = {'n_docs': len(texts), 'chars': sum(map(len, texts)), 'utf8_bytes': sum(len(t.encode()) for t in texts),
         'ws_words': sum(len(t.split()) for t in texts)}
    for k, tk in toks.items():
        o[k] = sum(len(e.ids) for e in tk.encode_batch(texts))
    if name == 'finemath_4plus':
        o['card_token_count_field'] = sum(r['meta']['token_count'] for r in rows)
    if name == 'wikipedia_en':  # row bytes as the dataset_size counts them: id, url, title, text (approximate: UTF-8 lengths)
        import urllib.parse   # the sample keeps url and meta.title; the dataset's num_bytes also counts url and title per row
        o['nontext_bytes_per_row'] = round(sum(len(r['url'].encode()) + len(urllib.parse.unquote(r['url'].rsplit('/', 1)[1]).replace('_', ' ').encode()) for r in rows) / len(rows), 1)
    out[name] = o; print(name, o, flush=True)
json.dump(out, open(sys.argv[4] if len(sys.argv) > 4 else 'units.json', 'w'), indent=1)
