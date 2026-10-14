"""Measure every corpus sample on the same metrics (CPU only, deterministic).

Per corpus: document length (characters, words), tokens with several tokenizers (and characters per token),
language (fastText lid.176), URL domains and top-level domains, exact and near duplicates inside the sample
(MinHash LSH), and the share of documents that pass other corpora's heuristic rules (datatrove's Gopher,
C4 and FineWeb filters with their default thresholds).
Classifier scores are a separate script (score_samples.py) because they load neural models.

Usage: DC_SCRATCH=<scratch>/dc python -I measure_samples.py
Reads  $DC_SCRATCH/data/pc/samples/*.jsonl (and the setup agent's curated samples, through samples_extra.json)
Writes $DC_SCRATCH/data/pc/measure/<name>.json (per-corpus summary and per-document rows)
"""
import json, os, re, sys, hashlib, math, collections, statistics
from urllib.parse import urlsplit

SCR = os.environ['DC_SCRATCH']
SAMP = os.path.join(SCR, 'data', 'pc', 'samples')
OUT = os.path.join(SCR, 'data', 'pc', 'measure')
os.makedirs(OUT, exist_ok=True)
TOK = json.load(open(os.path.join(SCR, 'data', 'pc', 'tokenizers.json')))  # {name: path to tokenizer.json}
LID = os.environ.get('PC_LID')  # path to lid.176.bin


def load(name):
    p = os.path.join(SAMP, name + '.jsonl')
    return [json.loads(l) for l in open(p)]


def norm(t):
    return re.sub(r'\s+', ' ', t.lower()).strip()


def reg_domain(host):
    # approximate registered domain: last two labels, three when the second-level label is short (co.uk, com.au)
    host = (host or '').lower().split(':')[0]
    if host.startswith('www.'):
        host = host[4:]
    parts = host.split('.')
    if len(parts) >= 3 and len(parts[-2]) <= 3 and len(parts[-1]) == 2:
        return '.'.join(parts[-3:])
    return '.'.join(parts[-2:])


def quantiles(xs):
    xs = sorted(xs)
    q = lambda p: xs[min(len(xs) - 1, int(p * (len(xs) - 1) + 0.5))]
    return {'p10': q(.1), 'p25': q(.25), 'p50': q(.5), 'p75': q(.75), 'p90': q(.9), 'mean': round(statistics.fmean(xs), 1)}


def main(names):
    from tokenizers import Tokenizer
    toks = {k: Tokenizer.from_file(v) for k, v in TOK.items()}
    lid = None
    if LID:
        import fasttext
        lid = fasttext.load_model(LID)
    from datasketch import MinHash, MinHashLSH
    from datatrove.data import Document
    from datatrove.pipeline.filters import GopherQualityFilter, GopherRepetitionFilter, C4QualityFilter, FineWebQualityFilter
    filters = {'gopher_quality': GopherQualityFilter(), 'gopher_repetition': GopherRepetitionFilter(),
               'c4_quality': C4QualityFilter(filter_no_terminal_punct=False), 'fineweb_quality': FineWebQualityFilter()}
    for name in names:
        docs = load(name)
        rows = []
        lsh = MinHashLSH(threshold=0.8, num_perm=128)
        mhs = []
        seen = collections.Counter()
        for i, d in enumerate(docs):
            t = d['text'] or ''
            r = {'i': i, 'chars': len(t), 'words': len(t.split())}
            for k, tk in toks.items():
                r['tok_' + k] = len(tk.encode(t[:200000]).ids) if t else 0
            if t and len(t) > 200000:
                r['truncated_for_tokens'] = True
            if lid is not None:
                lab, sc = lid.predict(t.replace('\n', ' ')[:20000])
                r['lang'] = lab[0].replace('__label__', '')
                r['lang_score'] = round(float(sc[0]), 3)
            u = d.get('url')
            if u:
                host = urlsplit(u).hostname or ''
                r['domain'] = reg_domain(host)
                r['tld'] = host.rsplit('.', 1)[-1] if '.' in host else ''
            h = hashlib.sha1(norm(t).encode()).hexdigest()
            r['exact_dup'] = seen[h] > 0
            seen[h] += 1
            words = norm(t).split()
            sh = {' '.join(words[j:j + 5]) for j in range(max(1, len(words) - 4))}
            m = MinHash(num_perm=128, seed=1)
            for s in sh:
                m.update(s.encode())
            r['near_dup'] = bool(lsh.query(m)) if words else False
            lsh.insert(str(i), m)
            for fk, f in filters.items():
                try:
                    res = f.filter(Document(text=t, id=str(i), metadata={}))
                    r['pass_' + fk] = (res is True) or (isinstance(res, tuple) and res[0] is True)
                    if isinstance(res, tuple) and not res[0]:
                        r['why_' + fk] = res[1]
                except Exception as e:
                    r['pass_' + fk] = None
            rows.append(r)
        n = len(rows)
        summ = {'name': name, 'n': n,
                'chars': quantiles([r['chars'] for r in rows]),
                'words': quantiles([r['words'] for r in rows]),
                'chars_per_token': {k: round(sum(r['chars'] for r in rows if not r.get('truncated_for_tokens')) /
                                            max(1, sum(r['tok_' + k] for r in rows if not r.get('truncated_for_tokens'))), 3) for k in toks},
                'tokens_total': {k: sum(r['tok_' + k] for r in rows) for k in toks},
                'exact_dup_share': round(sum(r['exact_dup'] for r in rows) / n, 4),
                'near_dup_share': round(sum(r['near_dup'] for r in rows) / n, 4),
                'pass': {fk: round(sum(1 for r in rows if r.get('pass_' + fk)) / n, 4) for fk in filters}}
        if lid is not None:
            c = collections.Counter(r['lang'] for r in rows)
            summ['lang_top'] = c.most_common(8)
            summ['lang_score_median'] = statistics.median(r['lang_score'] for r in rows)
        dom = [r for r in rows if r.get('domain')]
        if dom:
            c = collections.Counter(r['domain'] for r in dom)
            summ['url_share'] = round(len(dom) / n, 4)
            summ['domains_distinct'] = len(c)
            summ['domain_top'] = c.most_common(12)
            summ['tld_top'] = collections.Counter(r['tld'] for r in dom).most_common(10)
        why = collections.Counter()
        for r in rows:
            for fk in filters:
                if r.get('why_' + fk):
                    why[fk + ':' + r['why_' + fk]] += 1
        summ['fail_reasons'] = why.most_common(30)
        json.dump({'summary': summ, 'rows': rows}, open(os.path.join(OUT, name + '.json'), 'w'))
        print(name, json.dumps({k: summ[k] for k in ('n', 'chars_per_token', 'exact_dup_share', 'near_dup_share', 'pass')}), flush=True)


if __name__ == '__main__':
    have = sorted(f[:-6] for f in os.listdir(SAMP) if f.endswith('.jsonl'))
    main(sys.argv[1:] or have)
