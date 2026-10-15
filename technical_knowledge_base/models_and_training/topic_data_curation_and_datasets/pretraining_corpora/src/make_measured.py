"""Reduce the measurements made in the scratch area to the small files the page embeds:
data/measured.json (one summary per corpus sample, plus short scrubbed excerpts) and data/kept.json (the running
example's 20,617 HTML pages: which ones FineWeb and FineWeb-Edu kept, and the FineWeb-Edu classifier score measured
here for FineWeb's pages). Needs DC_SCRATCH. Prints the facts the prose quotes.
"""
import json, math, os, re, statistics, collections

H = os.path.dirname(os.path.abspath(__file__))
SCR = os.environ['DC_SCRATCH']
PC = os.path.join(SCR, 'data', 'pc')
man = json.load(open(os.path.join(PC, 'samples', 'samples_manifest.json')))

LABEL = {
    'c4_en': ('C4 (en)', 'web'), 'refinedweb': ('RefinedWeb', 'web'), 'fineweb': ('FineWeb (2024-30, running example)', 'web'),
    'fineweb_edu': ('FineWeb-Edu (2024-30, running example)', 'web'), 'dclm_baseline': ('DCLM-Baseline', 'web'),
    'nemo_high': ('Nemotron-CC high (real)', 'web'), 'nemo_medium': ('Nemotron-CC medium (real)', 'web'), 'nemo_low': ('Nemotron-CC low (real)', 'web'),
    'nemo_hq_synth_qa': ('Nemotron-CC high, synthetic QA', 'synthetic'), 'zyda2_dolmacc': ('Zyda-2 (Dolma CC part)', 'web'),
    'comma_cccc': ('Common Pile CC-licensed web', 'open'), 'pile_uncopyrighted': ('The Pile (uncopyrighted copy)', 'mix'),
    'finepdfs_en': ('FinePDFs (English)', 'papers'), 'pes2o_v2': ('peS2o v2 (abstracts)', 'papers'), 'wikipedia_en': ('Wikipedia (en, 2023-11)', 'papers'),
    'finemath_4plus': ('FineMath-4+', 'math'), 'open_web_math': ('OpenWebMath', 'math'), 'stackv2_edu': ('Stack v2 Edu (Common Pile)', 'code'),
    'fineweb2_fra': ('FineWeb2 (French)', 'multi')}
ORDER = list(LABEL)
EMAIL = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
PHONE = re.compile(r'(?:\+?\d[\d ()-]{7,}\d)')
IP = re.compile(r'\b\d{1,3}(?:\.\d{1,3}){3}\b')
SENSITIVE = re.compile(r'(wrote:|@author|faculty|seniority|\\bMD\\b|\\bPhD\\b|\\bDr\\.|porn|\\bsex|penis|dick|bareback|\\bcbd\\b|escort|casino|dating|birthday|\\bmy (wife|husband|son|daughter))', re.I)
PERSONAL_URL = re.compile(r'(people|profile|staff|faculty|expert|pipermail|/~|blog)', re.I)
ORGDOM = re.compile(r'(\.gov|\.edu|\.int|\.ac\.[a-z]+|\.gov\.[a-z]+|\.edu\.[a-z]+|wikipedia\.org)(/|$|:)', re.I)


def scrub(t):
    t = EMAIL.sub('[email]', t)
    t = IP.sub('[ip]', t)
    return PHONE.sub('[number]', t)


def excerpt(t, n=230):
    t = re.sub(r'\s+', ' ', t).strip().replace('\u2014', ', ')  # the page style allows no em-dash: replaced by a comma
    return scrub(t[:n].rsplit(' ', 1)[0] + (' ...' if len(t) > n else ''))


out = {}
facts = {}
for name in ORDER:
    mp = os.path.join(PC, 'measure', name + '.json')
    if not os.path.exists(mp):
        continue
    M = json.load(open(mp))
    s, rows = M['summary'], M['rows']
    docs = [json.loads(l) for l in open(os.path.join(PC, 'samples', name + '.jsonl'))]
    sc_p = os.path.join(PC, 'scores', name + '.json')
    sc = {int(k): v for k, v in json.load(open(sc_p)).items()} if os.path.exists(sc_p) else {}
    hist = [0] * 9  # log10(chars) bins from 1.5 to 6 in 0.5 steps
    for r in rows:
        b = min(8, max(0, int((math.log10(max(r['chars'], 1)) - 1.5) / 0.5)))
        hist[b] += 1
    e = {'label': LABEL[name][0], 'group': LABEL[name][1], 'n': s['n'],
         'src': {k: man[name].get(k) for k in ('repo', 'revision', 'file', 'note')},
         'chars': s['chars'], 'words_p50': s['words']['p50'], 'len_hist': hist,
         'cpt': s['chars_per_token'], 'exact_dup': s['exact_dup_share'], 'near_dup': s['near_dup_share'],
         'pass': s['pass'], 'fail_top': s['fail_reasons'][:6],
         'lang_top': [[l, round(c / s['n'], 4)] for l, c in s.get('lang_top', [])[:5]],
         'lang_score_p50': s.get('lang_score_median')}
    if s.get('domain_top'):
        e['domains'] = {'url_share': s['url_share'], 'distinct_per_1000': round(1000 * s['domains_distinct'] / max(1, sum(1 for r in rows if r.get('domain'))), 1),
                        'top': [[d, round(c / s['n'], 4)] for d, c in s['domain_top'][:8]], 'tld': [[t, round(c / s['n'], 4)] for t, c in s['tld_top'][:6]]}
    if sc:
        v = list(sc.values())
        ints = [int(round(max(0, min(x, 5)))) for x in v]
        e['edu'] = {'n': len(v), 'mean': round(statistics.fmean(v), 3), 'hist': [ints.count(k) for k in range(6)], 'ge3': round(sum(x >= 3 for x in ints) / len(v), 4)}
    # two short excerpts, from organisation domains (or non-web sources), at the highest and lowest classifier score
    NONWEB = {'pes2o_v2', 'stackv2_edu', 'wikipedia_en'}
    cand = [i for i in (sc or {i: 0 for i in range(min(300, len(docs)))})
            if (ORGDOM.search(docs[i].get('url') or '') or (not docs[i].get('url') and name in NONWEB | {'zyda2_dolmacc', 'comma_cccc', 'pile_uncopyrighted'}))
            and len(docs[i]['text']) > 300 and not SENSITIVE.search(docs[i]['text'][:400]) and not PERSONAL_URL.search(docs[i].get('url') or '')]
    if cand:
        hi = max(cand, key=lambda i: sc.get(i, 0))
        lo = min(cand, key=lambda i: sc.get(i, 0))
        pick = [hi] if (hi == lo or (not docs[hi].get('url') and name not in NONWEB)) else [hi, lo]  # no-URL web text: only the top-scored page
        e['ex'] = [{'score': sc.get(i), 'url': docs[i].get('url'), 'text': excerpt(docs[i]['text'])} for i in pick]
    out[name] = e

# the running example: which of the WARC's HTML pages each corpus kept, plus classifier scores for FineWeb's pages
K = json.load(open(os.path.join(PC, 'kept.json')))
fw_docs = [json.loads(l) for l in open(os.path.join(PC, 'samples', 'fineweb.jsonl'))]
fw_sc = {int(k): v for k, v in json.load(open(os.path.join(PC, 'scores', 'fineweb.json'))).items()}
edu_docs = [json.loads(l) for l in open(os.path.join(PC, 'samples', 'fineweb_edu.jsonl'))]
edu_pub = {d['url']: d['meta']['score'] for d in edu_docs}
url_sc = {fw_docs[i]['url']: s for i, s in fw_sc.items()}
url_tok = {d['url']: d['meta'].get('token_count') for d in fw_docs}
toks = []
code = []
scores = []
for r in K['rows']:
    if r['fineweb_edu']:
        code.append('2')
    elif r['fineweb']:
        code.append('1')
    else:
        code.append('0')
    if r['fineweb']:
        scores.append(round(url_sc[r['url']], 2) if r['url'] in url_sc else None)  # one per FineWeb page, in WARC order
        toks.append(url_tok.get(r['url']))

both = [(edu_pub[u], url_sc[u]) for u in edu_pub if u in url_sc]
maxdiff = max(abs(a - b) for a, b in both)
agree = sum(1 for a, b in both if int(round(max(0, min(a, 5)))) == int(round(max(0, min(b, 5)))))
ints = ''.join(str(int(round(max(0, min(x, 5))))) for x in (url_sc[r['url']] for r in K['rows'] if r['fineweb']))  # the classifier's own rounding (run_edu_bert.py line 24), on full-precision scores
mine_ge3 = sum(1 for c in ints if int(c) >= 3)
kept = {'warc': 'crawl-data/CC-MAIN-2024-30/segments/1720763514387.30/warc/CC-MAIN-20240712094214-20240712124214-00000.warc.gz',
        'responses': K['summary']['responses'], 'html200': K['summary']['html_200'], 'code': ''.join(code),
        'edu_scores_measured': scores, 'edu_int': ints, 'fw_tokens_gpt2': toks, 'fineweb': K['summary']['fineweb'], 'fineweb_edu': K['summary']['fineweb_edu'],
        'mine_ge3': mine_ge3, 'edu_pub_vs_mine_maxdiff': round(maxdiff, 3), 'edu_int_agree': agree, 'edu_n': len(both)}
# Nemotron-CC v1: pages of the WARC found by the streamed scan of its CC-MAIN-2024-30 files (scripts/nemo_scan.py)
NS = os.path.join(PC, 'nemo_scan')
if os.path.exists(os.path.join(NS, 'done.txt')):
    import gzip as _gz
    allp = [p for p in _gz.decompress(open(os.path.join(SCR, 'data', 'nemotron_cc', 'data-jsonl.paths.gz'), 'rb').read()).decode().split() if 'CC-MAIN-2024-30-part' in p]
    bk = lambda p: p.split('/data-jsonl/')[1].rsplit('/', 1)[0].replace('quality=', '').replace('kind=', '').replace('kind2=', '')
    tot, dn = collections.Counter(bk(p) for p in allp), collections.Counter(bk(p) for p in open(os.path.join(NS, 'done.txt')).read().split())
    LV = {'low': 1, 'medium-low': 2, 'medium': 3, 'medium-high': 4, 'high': 5}
    rid = {r['id'].replace('<urn:uuid:', '').rstrip('>'): i for i, r in enumerate(K['rows'])}
    real = ['0'] * len(K['rows'])
    synth = collections.Counter()
    found = collections.Counter()
    for line in open(os.path.join(NS, 'matches.jsonl')):
        d = json.loads(line)
        i = rid.get(d.get('warc_record_id'))
        if i is None:
            continue
        b = bk(d['_file'])
        found[b] += 1
        if '/actual/actual' in b:
            real[i] = str(LV[b.split('/')[0]])
        else:
            synth[b] += 1
    buckets = sorted(tot, key=lambda b: (-LV[b.split('/')[0]], b))
    cov = {b: {'files_done': dn[b], 'files': tot[b], 'found': found[b]} for b in buckets}
    nd, nt = sum(dn.values()), sum(tot.values())
    kept_nemo = {'real': ''.join(real), 'coverage': cov, 'files_done': nd, 'files': nt,
                 'bytes_done': sum(int(l.split('\t')[1]) for l in open(os.path.join(NS, 'log.tsv')))}
    nreal = sum(c != '0' for c in real)
    nboth = sum(1 for i, c in enumerate(real) if c != '0' and code[i] != '0')
    facts.update({'nm_files_done': str(nd), 'nm_files': str(nt), 'nm_cov': f'{100 * nd / nt:.0f}%', 'nm_real': f'{nreal:,}',
                  'nm_gb': f"{kept_nemo['bytes_done'] / 1e9:.0f}", 'nm_both': f'{nboth:,}',
                  'nm_only': f'{nreal - nboth:,}', 'nm_fw_not_nemo': f"{sum(1 for i, c in enumerate(real) if c == '0' and code[i] != '0'):,}",
                  'nm_synth': f'{sum(synth.values()):,}'})
    realb = [b for b in buckets if b.endswith('/actual/actual')]
    est = sum(found[b] * tot[b] / dn[b] for b in realb if dn[b])
    rd, rt = sum(dn[b] for b in realb), sum(tot[b] for b in realb)
    edu_in = sum(1 for i, c in enumerate(real) if c != '0' and code[i] == '2')
    facts.update({'nm_real_files_done': str(rd), 'nm_real_files': str(rt), 'nm_real_cov': f'{100 * rd / rt:.0f}%',
                  'nm_est': f'{round(est, -1):,.0f}', 'nm_est_pct': f'{100 * est / len(real):.1f}%',
                  'nm_both_pct': f'{100 * nboth / max(1, nreal):.0f}%', 'nm_edu_in': str(edu_in),
                  'nm_high_found': str(found['high/actual/actual']), 'nm_low_found': str(found['low/actual/actual'])})
    kept_nemo['estimate'] = round(est)
    facts['nm_real_unscanned'] = str(rt - rd)
    facts['nm_rest_hours'] = f'{(nt - nd) * 55 / 3600:.0f}'
else:
    kept_nemo = None
kept['nemo'] = kept_nemo
facts.update({'kp_responses': f"{K['summary']['responses']:,}", 'kp_html': f"{K['summary']['html_200']:,}", 'kp_fw': f"{K['summary']['fineweb']:,}",
              'kp_edu': str(K['summary']['fineweb_edu']), 'kp_fw_pct': f"{100 * K['summary']['fineweb'] / K['summary']['html_200']:.1f}%",
              'kp_edu_pct': f"{100 * K['summary']['fineweb_edu'] / K['summary']['html_200']:.2f}%",
              'kp_edu_of_fw_pct': f"{100 * K['summary']['fineweb_edu'] / K['summary']['fineweb']:.1f}%",
              'kp_mine_ge3': f'{mine_ge3:,}', 'kp_maxdiff': f'{maxdiff:.2f}', 'kp_agree': f'{agree} of {len(both)}'})
# facts the Reading tab quotes
pct = lambda x: f'{100 * x:.1f}%'
facts['ms_n'] = str(len(out))
facts['ms_scored'] = f"{sum(v['edu']['n'] for v in out.values() if 'edu' in v):,}"
facts['ms_fw_gq'] = pct(out['fineweb']['pass']['gopher_quality'])
facts['ms_fw_c4'] = pct(out['fineweb']['pass']['c4_quality'])
facts['ms_fw_fq'] = pct(out['fineweb']['pass']['fineweb_quality'])
facts['ms_owm_gq'] = pct(out['open_web_math']['pass']['gopher_quality'])
facts['ms_fm_gq'] = pct(out['finemath_4plus']['pass']['gopher_quality'])
facts['ms_fra_gq'] = pct(out['fineweb2_fra']['pass']['gopher_quality'])
facts['ms_nh_gq'] = pct(out['nemo_high']['pass']['gopher_quality'])
facts['ms_c4_c4'] = pct(out['c4_en']['pass']['c4_quality'])
em = sorted(((v['edu']['mean'], v['label']) for v in out.values() if 'edu' in v), reverse=True)
facts['ms_nh_edu'] = f"{out['nemo_high']['edu']['mean']:.2f}"
facts['ms_nl_edu'] = f"{out['nemo_low']['edu']['mean']:.2f}"
facts['ms_edu_means'] = '; '.join(f'{l} {m:.2f}' for m, l in em)
fw = out['fineweb']['cpt']
ratio = fw['gpt2'] / fw['qwen3']
facts['tok_fw_qwen_guess'] = f'{18.5 * ratio:.1f}T'
facts['tok_fw_answer'] = (f"About {18.5 * ratio:.1f}T, only {100 * (1 - ratio):.0f}% fewer. On FineWeb's English web text GPT-2 packs {fw['gpt2']:.2f} characters per token and Qwen3 {fw['qwen3']:.2f}: "
                          f"Qwen3's extra vocabulary is spent on other languages and code. On FineWeb2's French the gap is {out['fineweb2_fra']['cpt']['qwen3'] / out['fineweb2_fra']['cpt']['gpt2']:.2f} times, "
                          f"and on The Pile's mixture {out['pile_uncopyrighted']['cpt']['qwen3'] / out['pile_uncopyrighted']['cpt']['gpt2']:.2f} times.")
import tokenizers
facts['tok_code_ratio'] = f"{out['stackv2_edu']['cpt']['qwen3'] / out['stackv2_edu']['cpt']['gpt2']:.1f}"
facts['tok_lib'] = tokenizers.__version__
json.dump({'samples': out, 'order': [n for n in ORDER if n in out]}, open(os.path.join(H, 'data', 'measured.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({'facts': facts, **kept}, open(os.path.join(H, 'data', 'kept.json'), 'w'), separators=(',', ':'))
for k, v in facts.items():
    print(k, v)
print('measured.json bytes', os.path.getsize(os.path.join(H, 'data', 'measured.json')), 'kept.json bytes', os.path.getsize(os.path.join(H, 'data', 'kept.json')))
