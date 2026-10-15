"""Fold the recorded runs (in the scratchpad, see src/README.md) into the small committed data files the page embeds:
  data/syn_data.json   everything the page's JavaScript reads (window.SY)
  data/facts.json      every number the prose quotes, as @@key@@ placeholders that build.sh fills
A fact whose run has not happened yet (the pending GPU runs) is left out, so build.sh prints UNFILLED FACT for it.
Run with DC_SCRATCH=<scratch>/dc when a run changes; build.sh itself only reads data/.
"""
import os, json, re, statistics
H = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(H, 'data')
SC = os.environ.get('DC_SCRATCH'); SY = os.path.join(SC, 'syn') if SC else None
def j(p):
    return json.load(open(p)) if p and os.path.exists(p) else None

prev = j(os.path.join(DATA, 'syn_data.json')) or {}
out, F = {}, {}

# ---- diversity and hygiene measures (measure_sets.py + embed_sets.py) ----
ms = j(SY and os.path.join(SY, 'measure_sets.json')); em = j(SY and os.path.join(SY, 'embed_sets.json'))
if ms:
    ek = {e['key']: e for e in (em or {}).get('sets', [])}
    rows = []
    for s in ms['sets']:
        r = {k: s[k] for k in ('key', 'label', 'group', 'docs', 'words_median', 'distinct1', 'distinct2', 'distinct4', 'gzip_ratio',
                               'openings_top10_share', 'openings_top3', 'neardup_share', 'bench13_share', 'llm_phrases_per10k', 'delve_per10k')}
        e = ek.get(s['key'])
        if e: r.update(edu_mean=e['edu_mean'], edu_ge3=e['edu_ge3'], edu_hist=e['edu_hist'], homogeneity=e['homogeneity'])
        rows.append(r)
    out['sets'] = rows; out['bench_13grams'] = ms['bench_13grams']
else:
    out['sets'] = prev.get('sets'); out['bench_13grams'] = prev.get('bench_13grams')

bc = j(SY and os.path.join(SY, 'budget_curves.json'))
out['curves'] = bc or prev.get('curves')
# where each sample came from (repo, revision, file), for the Diversity meter's detail view
srcs = prev.get('set_sources') or {}
man = SY and os.path.join(SC, 'data', 'syn', 'samples', 'manifest.jsonl')
if man and os.path.exists(man):
    for l in open(man):
        m = json.loads(l); srcs[m['name'].replace('cosmo_khanacademy', 'cosmo_khan').replace('cosmo_auto_math', 'cosmo_math').replace('megamath_qa_llama', 'megamath_qa').replace('megamath_text_code', 'megamath_tcb')] = f"{m['repo']} @ {m['revision'][:10]}, {m['file']}, row group {m['row_group']}"
    NMF = 'Common Crawl contrib/Nemotron/Nemotron-CC/data-jsonl/quality={q}/kind={k}/kind2={k2}/CC-MAIN-2024-30-part-00000.jsonl.zstd, first 1,000 rows'
    for key, q, k, k2 in [('nemo_hq_real', 'high', 'actual', 'actual'), ('nemo_lq_real', 'low', 'actual', 'actual'), ('nemo_lq_wiki', 'low', 'synthetic', 'wrap_medium'),
                          ('nemo_hq_wiki', 'high', 'synthetic', 'wrap_medium'), ('nemo_qa', 'high', 'synthetic', 'diverse_qa_pairs'), ('nemo_distill', 'high', 'synthetic', 'distill'),
                          ('nemo_extract', 'high', 'synthetic', 'extract_knowledge'), ('nemo_klist', 'high', 'synthetic', 'knowledge_list')]:
        srcs[key] = NMF.format(q=q, k=k, k2=k2)
    srcs['fineweb'] = 'HuggingFaceFW/fineweb @ 9bb295ddab, data/CC-MAIN-2024-30, seeded random 50k rows (shared running-example sample), first 1,000'
    srcs['fineweb_edu'] = 'HuggingFaceFW/fineweb-edu @ 87f09149ef, data/CC-MAIN-2024-30, seeded random 50k rows (shared sample), first 1,000'
    srcs['dclm'] = 'mlfoundations/dclm-baseline-1.0-parquet @ 817d675276, first 50k rows of one shard (shared sample), first 1,000'
    srcs['wikipedia'] = 'wikimedia/wikipedia @ b04c8d1ceb, 20231101.en/train-00000-of-00041.parquet, first 1,000 articles in file order'
out['set_sources'] = srcs

# ---- bigram collapse on TinyStories ----
bg = j(SY and os.path.join(SY, 'bigram_tinystories.json')) or prev.get('bigram')
if bg and 'modes' in bg and SY and os.path.exists(os.path.join(SY, 'bigram_tinystories.json')):
    for m, rows in bg['modes'].items():
        for r in rows: r['examples'] = r['examples'][:2]
out['bigram'] = bg

# ---- categorical collapse reference (parity check target for the in-page simulation) ----
out['collapse_ref'] = j(os.path.join(DATA, 'collapse_ref.json'))

# ---- real before/after pairs: Nemotron-CC rows and the Common Crawl records they came from ----
src = j(SY and os.path.join(SY, 'sources.json'))
if src:
    def cut(t, n):
        t = t.strip(); return t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + ' [...]'
    pairs = []
    for k, v in src.items():
        before = v['justext']
        if v['kind'] == 'diverse_qa_pairs':
            before = before.split('Subscribe to Our Blog')[0]  # stop before the author box (a staff member's name and bio)
        pairs.append(dict(kind=v['kind'], url=v['url'], warc_record_id=v['warc_record_id'], warc_file=v['warc_file'],
                          before=cut(before, 2600), after=cut(v['synthetic'], 2600),
                          before_words=len(before.split()), after_words=len(v['synthetic'].split())))
    out['pairs'] = pairs
else:
    out['pairs'] = prev.get('pairs')

# ---- Cosmopedia examples (prompt anatomy) ----
cz = j(SY and os.path.join(SY, 'cosmo_examples.json')) or prev.get('cosmo')
out['cosmo'] = cz

# ---- rephrasing with Qwen3: CPU smoke test now, the 200-document run is pending ----
sm = os.path.join(SY, 'rephrase_smoke.jsonl') if SY else None
if sm and os.path.exists(sm):
    out['rephrase_smoke'] = [json.loads(l) for l in open(sm)]
else:
    out['rephrase_smoke'] = prev.get('rephrase_smoke')
out['rephrase_stats'] = j(SY and os.path.join(SY, 'rephrase_stats.json')) or prev.get('rephrase_stats')
out['collapse_gpt'] = j(SY and os.path.join(SY, 'collapse_gpt.json')) or prev.get('collapse_gpt')

# ---- facts quoted in prose ----
S = {s['key']: s for s in out.get('sets') or []}
pc = lambda x: f'{100 * x:.0f}%' if x >= 0.1 else f'{100 * x:.1f}%'
if S:
    F['ts_once'] = pc(S['tinystories']['openings_top3'][0][1] / S['tinystories']['docs'])
    F['cs_once'] = pc(S['cosmo_stories']['openings_top3'][0][1] / S['cosmo_stories']['docs'])
    F['wh_title'] = pc(S['cosmo_wikihow']['openings_top3'][0][1] / S['cosmo_wikihow']['docs'])
    F['ka_welcome'] = pc(S['cosmo_khan']['openings_top3'][0][1] / S['cosmo_khan']['docs'])
    F['fw_open10'] = pc(S['fineweb']['openings_top10_share']); F['ts_open10'] = pc(S['tinystories']['openings_top10_share'])
    F['ka_open10'] = pc(S['cosmo_khan']['openings_top10_share'])
    F['fw_d2'] = f"{S['fineweb']['distinct2']:.2f}"; F['ts_d2'] = f"{S['tinystories']['distinct2']:.2f}"
    F['ka_d2'] = f"{S['cosmo_khan']['distinct2']:.2f}"; F['wiki_d2'] = f"{S['wikipedia']['distinct2']:.2f}"
    F['nlw_d2'] = f"{S['nemo_lq_wiki']['distinct2']:.2f}"; F['nlr_d2'] = f"{S['nemo_lq_real']['distinct2']:.2f}"
    F['fw_gz'] = f"{S['fineweb']['gzip_ratio']:.2f}"; F['ts_gz'] = f"{S['tinystories']['gzip_ratio']:.2f}"; F['ka_gz'] = f"{S['cosmo_khan']['gzip_ratio']:.2f}"
    F['fw_delve'] = f"{S['fineweb']['delve_per10k']:.2f}"; F['cw2_delve'] = f"{S['cosmo_web_v2']['delve_per10k']:.1f}"
    F['cw1_delve'] = f"{S['cosmo_web_v1']['delve_per10k']:.1f}"
    F['fw_llm'] = f"{S['fineweb']['llm_phrases_per10k']:.2f}"; F['cw2_llm'] = f"{S['cosmo_web_v2']['llm_phrases_per10k']:.1f}"
    F['nhq_llm'] = f"{S['nemo_hq_real']['llm_phrases_per10k']:.2f}"
    F['mm_tcb_d2'] = f"{S['megamath_tcb']['distinct2']:.2f}"; F['mm_tcb_gz'] = f"{S['megamath_tcb']['gzip_ratio']:.2f}"
    F['dclm_llm'] = f"{S['dclm']['llm_phrases_per10k']:.2f}"; F['wiki_llm'] = f"{S['wikipedia']['llm_phrases_per10k']:.2f}"; F['nhqw_llm'] = f"{S['nemo_hq_wiki']['llm_phrases_per10k']:.2f}"; F['cv2_llm'] = f"{S['cosmo_v2']['llm_phrases_per10k']:.1f}"; F['nqa_d2'] = f"{S['nemo_qa']['distinct2']:.2f}"; F['ndi_d2'] = f"{S['nemo_distill']['distinct2']:.2f}"; F['cw2_d2'] = f"{S['cosmo_web_v2']['distinct2']:.2f}"
    F['n_sets'] = str(len(S)); F['max_neardup'] = pc(max(s['neardup_share'] for s in S.values()))
    syn = [s for s in S.values() if s['group'] != 'real']
    F['syn_bench_max'] = pc(max(s['bench13_share'] for s in syn)); F['bench_grams'] = f"{out['bench_13grams'] / 1e6:.1f} million"
    if 'edu_ge3' in S['fineweb']:
        F['fw_edu3'] = pc(S['fineweb']['edu_ge3']); F['fwe_edu3'] = pc(S['fineweb_edu']['edu_ge3'])
        cos = [s for s in S.values() if s['key'].startswith('cosmo') and 'edu_ge3' in s]
        if cos:
            F['cosmo_edu3_min'] = pc(min(s['edu_ge3'] for s in cos)); F['cosmo_edu3_max'] = pc(max(s['edu_ge3'] for s in cos))
        for k in ('cosmo_web_v2', 'cosmo_web_v1', 'cosmo_stories', 'cosmo_khan', 'cosmo_stanford', 'nemo_qa', 'nemo_distill', 'nemo_extract', 'nemo_klist', 'tinystories', 'nemo_lq_real', 'nemo_lq_wiki', 'nemo_hq_real', 'nemo_hq_wiki', 'wikipedia'):
            if 'edu_ge3' in S.get(k, {}): F[f'{k}_edu3'] = pc(S[k]['edu_ge3'])
        if 'homogeneity' in S['fineweb']:
            for k in ('fineweb', 'tinystories', 'cosmo_khan', 'cosmo_stories', 'cosmo_web_v2', 'wikipedia', 'nemo_lq_real', 'nemo_lq_wiki'):
                if 'homogeneity' in S[k]: F[f'{k}_hom'] = f"{S[k]['homogeneity']:.2f}"
if bg and 'modes' in bg:
    R = bg['modes']['replace']; K = bg['modes']['keep10']; A = bg['modes']['accumulate']; G = len(R) - 1
    F['bg_G'] = str(G); F['bg_train'] = f"{bg['params']['train_tokens']:,}"; F['bg_test'] = f"{bg['params']['test_tokens']:,}"
    F['bg_ppl0'] = f"{R[0]['test_ppl']:.1f}"; F['bg_pplR'] = f"{R[-1]['test_ppl']:.1f}"; F['bg_pplK'] = f"{K[-1]['test_ppl']:.1f}"; F['bg_pplA'] = f"{A[-1]['test_ppl']:.1f}"
    F['bg_v0'] = f"{R[0]['vocab']:,}"; F['bg_vR'] = f"{R[-1]['vocab']:,}"; F['bg_vK'] = f"{K[-1]['vocab']:,}"; F['bg_vA'] = f"{A[-1]['vocab']:,}"
    F['bg_vR_lost'] = pc(1 - R[-1]['vocab'] / R[0]['vocab'])
    F['bg_b0'] = f"{R[0]['bigrams']:,}"; F['bg_bR'] = f"{R[-1]['bigrams']:,}"; F['bg_bK'] = f"{K[-1]['bigrams']:,}"
    F['bg_bR_lost'] = pc(1 - R[-1]['bigrams'] / R[0]['bigrams'])
    meds = [r['gen_ppl_q'][2] for r in R]; F['bg_gmed_lo'] = f"{min(meds):.1f}"; F['bg_gmed_hi'] = f"{max(meds):.1f}"
    F['bg_ppl_rise'] = f"{R[-1]['test_ppl'] / R[0]['test_ppl']:.2f}"
cr = out['collapse_ref']
if cr:
    F['cat_exp0'] = f"{cr['expected_alive_gen0']:.0f}"; F['cat_alive0'] = str(cr['runs']['replace'][0]['alive'])
    for m in ('replace', 'accumulate', 'subsample', 'fresh'):
        F[f'cat_{m}_med'] = f"{cr['alive_at_G_50_seeds'][m]['median']:.0f}"
        F[f'cat_{m}_rng'] = f"{cr['alive_at_G_50_seeds'][m]['min']} to {cr['alive_at_G_50_seeds'][m]['max']}"
if out.get('pairs'):
    P = {p['kind']: p for p in out['pairs']}
    for k, p in P.items(): F[f'pair_{k}_bw'] = str(p['before_words']); F[f'pair_{k}_aw'] = str(p['after_words'])
cz = out.get('cosmo')
if cz and 'avoid' in cz:
    t, n = cz['avoid']['told'], cz['avoid']['not_told']
    F['av_told_n'] = str(t[0]); F['av_told_k'] = str(t[1]); F['av_told_pct'] = f'{100 * t[1] / t[0]:.1f}%'
    F['av_not_n'] = str(n[0]); F['av_not_k'] = str(n[1]); F['av_not_pct'] = f'{100 * n[1] / n[0]:.1f}%'
rs = out.get('rephrase_stats')
if rs:
    F['rp_docs'] = str(rs['docs'])
    for st, d in rs['styles'].items():
        F[f'rp_{st}_len'] = f"{d['len_ratio']:.2f}"; F[f'rp_{st}_nov'] = pc(d['novel4']); F[f'rp_{st}_num'] = pc(d['num_kept'])
os.makedirs(DATA, exist_ok=True)
json.dump(out, open(os.path.join(DATA, 'syn_data.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
json.dump(F, open(os.path.join(DATA, 'facts.json'), 'w'), indent=0, ensure_ascii=False)
print('syn_data.json', os.path.getsize(os.path.join(DATA, 'syn_data.json')), 'bytes;', len(F), 'facts')
