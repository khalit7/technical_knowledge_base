# Reduce the cached raw inputs (fetch_inputs.py) into small JSON files in src/inputs/.
# Run: uv run --with pandas --with pyarrow --with scipy --with ijson python mk_inputs.py [cache_dir] [part]
# part: board | pvc | battles | all (default all). OMP_NUM_THREADS=2 recommended.
import os, sys, json, math
import pandas as pd, numpy as np
C = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('HP_CACHE', os.path.expanduser('~/.cache/kb_human_preference'))
PART = sys.argv[2] if len(sys.argv) > 2 else 'all'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'inputs')
AA = os.path.join(HERE, '../../../../models_and_training/topic_llms/src/data/aa_snapshot.json')
os.makedirs(OUT, exist_ok=True)
def lb(c):
    return pd.read_parquet(os.path.join(C, 'lb_%s.parquet' % c))
def dump(name, obj):
    p = os.path.join(OUT, name)
    json.dump(obj, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
    print('wrote', name, os.path.getsize(p))

def spread(d, m):
    # Arena's rank spread (blog "Arena's Ranking Method", 14 Nov 2025) over every model on that board:
    # best = 1 + #{lower CI > m's upper CI}, worst = 1 + #{upper CI > m's lower CI} (others only)
    if m not in d.index: return None
    lo, hi = float(d.loc[m].rating_lower), float(d.loc[m].rating_upper)
    o = d.drop(index=m)
    return [1 + int((o.rating_lower > hi).sum()), 1 + int((o.rating_upper > lo).sum())]
CATS = ['overall', 'hard_prompts', 'coding', 'math', 'creative_writing', 'instruction_following', 'multi_turn', 'longer_query', 'expert', 'industry_legal_and_government', 'industry_medicine_and_healthcare', 'non_english']
if PART in ('board', 'all'):
    raw, sc, fa = lb('text'), lb('text_style_control'), lb('text_factuality')
    out = {'source': 'lmarena-ai/leaderboard-dataset (CC-BY-4.0), latest split: text, text_style_control, text_factuality; read 2026-10-04',
           'url': 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
           'published': str(sc.leaderboard_publish_date.max()), 'cats': {}}
    for cat in CATS:
        s = sc[sc.category == cat].sort_values('rank')
        r = raw[raw.category == cat].set_index('model_name')
        f = fa[fa.category == cat].set_index('model_name')
        top = s.head(30)
        rows = []
        for _, x in top.iterrows():
            m = x.model_name
            def tri(d):
                if m not in d.index: return None
                y = d.loc[m]
                return [round(float(y.rating), 1), round(float(y.rating_lower), 1), round(float(y.rating_upper), 1), int((d.rating > float(y.rating)).sum()) + 1]
            rows.append({'m': m, 'o': x.organization, 'lic': x.license, 'v': int(x.vote_count), 'sc': tri(s.set_index('model_name')), 'raw': tri(r), 'fact': tri(f),
                         'sp': {k: spread(d, m) for k, d in (('sc', s.set_index('model_name')), ('raw', r), ('fact', f))}})
        out['cats'][cat] = {'n_models': int(len(s)), 'rows': rows}
    out['n_models_overall'] = int(len(sc[sc.category == 'overall']))
    # search arena: raw against style control, all 34 models
    srw, ssc = lb('search').set_index('model_name'), lb('search_style_control')
    out['search'] = {'published': str(ssc.leaderboard_publish_date.max()),
                     'rows': [{'m': x.model_name, 'o': x.organization, 'v': int(x.vote_count), 'sc': round(float(x.rating), 1), 'raw': round(float(srw.loc[x.model_name].rating), 1)} for _, x in ssc.sort_values('rank').iterrows()]}
    wd = lb('webdev'); wd = wd[wd.category == 'overall'].sort_values('rank').head(10)
    out['webdev'] = {'published': str(wd.leaderboard_publish_date.max()), 'rows': [{'m': x.model_name, 'r': round(float(x.rating), 1), 'lo': round(float(x.rating_lower), 1), 'hi': round(float(x.rating_upper), 1), 'v': int(x.vote_count)} for _, x in wd.iterrows()]}
    dump('board_2026-10-02.json', out)

# Preference against capability: Arena text (style control, overall) against the AA Intelligence Index v4.3.
# Matched by hand; 'same' = the same reasoning-effort setting on both boards.
PVC = [
    ('claude-opus-5-5', 'claude-opus-5.5-high', 0), ('claude-sonnet-5-5', 'claude-sonnet-5.5-xhigh', 0), ('claude-fable-5-1', 'claude-fable-5.1-max', 1),
    ('claude-opus-5', 'claude-opus-5-max', 1), ('gpt-6-astra', 'gpt-6-astra-max', 1), ('gpt-6-1-sol', 'gpt-6.1-sol-max', 1), ('gpt-6-sol', 'gpt-6-sol-max', 1),
    ('gpt-6-luna', 'gpt-6-luna-max', 1), ('gpt-5-6-terra', 'gpt-5.6-terra-xhigh', 0), ('gpt-5-6-sol', 'gpt-5.6-sol-xhigh', 0), ('gpt-oss-120b', 'gpt-oss-120b', 0),
    ('gemini-4-argon', 'gemini-4-argon-high', 1), ('gemini-3-8-flash', 'gemini-3.8-flash-high', 1), ('gemini-3-7-flash', 'gemini-3.7-flash-high', 1),
    ('gemini-3-1-pro-preview', 'gemini-3.1-pro-preview', 1), ('gemma-4-31b', 'gemma-4-31b', 0), ('muse-spark-1-3', 'muse-spark-1.3-max', 1), ('muse-glimmer', 'muse-glimmer', 0),
    ('grok-4-7', 'grok-4.7-xhigh', 1), ('grok-4-6', 'grok-4.6-high', 1), ('deepseek-v4-1-flash', 'deepseek-v4.1-flash-max', 1), ('deepseek-v4-pro', 'deepseek-v4-pro-high-20260813', 0),
    ('qwen3-8-max', 'qwen3.8-max', 1), ('qwen3-8-27b', 'qwen3.8-27b', 0), ('kimi-k3', 'kimi-k3-max', 1), ('glm-5-3', 'glm-5.3-max', 1), ('glm-5-3-flash', 'glm-5.3-flash', 1),
    ('glm-5-2', 'glm-5.2-max', 1), ('minimax-m3', 'minimax-m3', 1), ('mistral-medium-3-5', 'mistral-medium-3.5', 1), ('mistral-large-3', 'mistral-large-3', 1),
    ('mimo-v2-6-pro', 'mimo-v2.6-pro', 1), ('mimo-v2-6-flash', 'mimo-v2.6-flash', 1), ('hy3', 'hy3', 1), ('claude-4-5-haiku-reasoning', 'claude-haiku-4-5-20251001', 0),
]
if PART in ('pvc', 'all'):
    aa = {r['aa_slug']: r for r in json.load(open(AA))['rows']}
    s = lb('text_style_control'); s = s[s.category == 'overall'].set_index('model_name')
    s2 = lb('text_style_control'); s2 = s2[s2.category == 'hard_prompts'].set_index('model_name')
    rows = []
    for slug, m, same in PVC:
        a = aa[slug]
        rows.append({'aa': a['aa_short_name'] if a.get('aa_short_name') else a['model'], 'm': m, 'lab': a['lab'], 'same': same,
                     'idx': a['aa_index'], 'r': round(float(s.loc[m].rating), 1), 'lo': round(float(s.loc[m].rating_lower), 1), 'hi': round(float(s.loc[m].rating_upper), 1),
                     'hp': round(float(s2.loc[m].rating), 1) if m in s2.index else None})
    dump('pref_vs_cap.json', {'aa': 'Artificial Analysis Intelligence Index v4.3, snapshot 2026-10-01 (topic_llms/src/data/aa_snapshot.json)',
                              'arena': 'Arena text, style control, overall and hard prompts, published 2026-10-02', 'rows': rows})

# ---- 2024 public votes: reproduce LMArena's published ratings, with and without style control ----
# battles CSV: one row per vote, written by extract_battles() from the cached public JSON log (ijson stream).
def extract_battles(src, dst):
    import ijson, csv
    def s(v):
        if v is None: return -1
        if isinstance(v, dict): return sum(int(x) for x in v.values())
        return int(v)
    w = csv.writer(open(dst, 'w', newline=''))
    w.writerow(['a', 'b', 'w', 'anony', 'lang', 't', 'samp', 'hf', 'code', 'ref', 'turn', 'la', 'lb', 'ha', 'hb', 'lia', 'lib', 'ba', 'bb', 'crit', 'math', 'if'])
    for r in ijson.items(open(src, 'rb'), 'item'):
        m = r.get('conv_metadata') or {}; ct = r.get('category_tag') or {}; cr = ct.get('criteria_v0.1') or {}; dd = r.get('dedup_tag') or {}
        w.writerow([r['model_a'], r['model_b'], {'model_a': 'a', 'model_b': 'b', 'tie': 't', 'tie (bothbad)': 'tb'}.get(r['winner'], r['winner']),
                    int(bool(r.get('anony'))), r.get('language', ''), int(float(r.get('tstamp', 0))), int(bool(dd.get('sampled', True))), int(bool(dd.get('high_freq', False))),
                    int(bool(r.get('is_code'))), int(bool(r.get('is_refusal'))), r.get('turn', 1),
                    s(m.get('sum_assistant_a_tokens')), s(m.get('sum_assistant_b_tokens')), s(m.get('header_count_a')), s(m.get('header_count_b')),
                    s(m.get('list_count_a')), s(m.get('list_count_b')), s(m.get('bold_count_a')), s(m.get('bold_count_b')),
                    sum(1 for v in cr.values() if v), int(bool((ct.get('math_v0.1') or {}).get('math'))), int(bool((ct.get('if_v0.1') or {}).get('if')))])

if PART in ('battles', 'all'):
    import pickle
    from scipy.special import expit
    from scipy.optimize import minimize
    class _Stub:
        def __init__(self, *a, **k): pass
        def __setstate__(self, s): pass
    class _U(pickle.Unpickler):  # the published pickles hold plotly figures; stub them out
        def find_class(self, mod, name):
            return _Stub if mod.startswith('plotly') else super().find_class(mod, name)
    def pkl(f): return _U(open(os.path.join(C, f), 'rb')).load()['text']
    csvp = os.path.join(C, 'battles0826.csv')
    if not os.path.exists(csvp): extract_battles(os.path.join(C, 'cb0826.json'), csvp)
    Bt = pd.read_csv(csvp, keep_default_na=False)
    ALPHA = math.log(10)
    def mats(df):
        m, models = pd.factorize(pd.concat([df.a, df.b])); n = len(df)
        return np.column_stack([m[:n], m[n:]]), list(models)
    def outc(df):
        o = np.full(len(df), 0.5); o[(df.w == 'a').values] = 1.0; o[(df.w == 'b').values] = 0.0; return o
    def anchor(r, models):
        s_ = r * 400 + 1000
        if 'mixtral-8x7b-instruct-v0.1' in models: s_ += 1114 - s_[models.index('mixtral-8x7b-instruct-v0.1')]
        return pd.Series(s_, index=models)
    def bt(df):  # FastChat compute_bt: unique (pair, outcome) rows weighted by counts, L-BFGS, no regularisation
        M, models = mats(df); o = outc(df)
        u, c = np.unique(np.column_stack([M, (o * 2).astype(int)]), axis=0, return_counts=True)
        Mu, ou, wu = u[:, :2], u[:, 2] / 2.0, c.astype(float)
        def f(r):
            p = expit(ALPHA * (r[Mu[:, 0]] - r[Mu[:, 1]]))
            g = -ALPHA * (ou - p) * wu; G = np.zeros_like(r); np.add.at(G, Mu, g[:, None] * np.array([1., -1.]))
            return -((np.log(p) * ou + np.log(1 - p) * (1 - ou)) * wu).sum(), G
        return anchor(minimize(f, np.zeros(len(models)), jac=True, method='L-BFGS-B', options={'maxiter': 100, 'gtol': 1e-6})['x'], models)
    FEAT = [('la', 'lb'), ('ha', 'hb'), ('lia', 'lib'), ('ba', 'bb')]
    def style(df, feats=(0, 1, 2, 3), reg=0.5):  # FastChat compute_style_control (contextual BT, ridge 0.5)
        M, models = mats(df); o = outc(df); Z = []
        for i in feats:
            x, y = FEAT[i]; a = df[x].values.astype(float); b = df[y].values.astype(float)
            d = (a - b) / (a + b + 1); Z.append((d - d.mean()) / d.std())
        Z = np.array(Z).T; nm = len(models)
        def f(p):
            r = p[:nm]; pr = expit(ALPHA * (r[M[:, 0]] - r[M[:, 1]]) + Z @ p[nm:])
            e = o - pr; G = reg * p
            np.add.at(G[:nm], M, (-ALPHA * e)[:, None] * np.array([1., -1.])); G[nm:] -= Z.T @ e
            return -(np.log(pr) * o + np.log(1 - pr) * (1 - o)).sum() + (reg / 2) * np.inner(p, p), G
        p = minimize(f, np.zeros(nm + Z.shape[1]), jac=True, method='L-BFGS-B', options={'maxiter': 100, 'gtol': 1e-6})['x']
        return anchor(p[:nm], models), p[nm:]
    LAB = ['chatgpt-4o-latest', 'gpt-4o-2024-05-13', 'claude-3-5-sonnet-20240620', 'gemini-1.5-pro-api-0514', 'llama-3.1-405b-instruct', 'gpt-4o-mini-2024-07-18',
           'llama-3.1-70b-instruct', 'gemma-2-27b-it', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
    off = pkl('elo_results_20240828.pkl')
    T = off['full']['last_updated_tstamp']
    A = Bt[(Bt.anony == 1) & (Bt.samp == 1) & (Bt.t <= T)]
    S = A[(A[['la', 'lb', 'ha', 'hb', 'lia', 'lib', 'ba', 'bb']] >= 0).all(axis=1)]
    H6 = A[A.crit >= 6]; H6s = S[S.crit >= 6]
    print('votes', len(Bt), 'anonymous dedup <= official', len(A), 'with style metadata', len(S), 'hard', len(H6))
    res = {'source': 'clean_battle_20240826_public.json (LMArena public battle log) against elo_results_20240828.pkl (LMArena leaderboard app); FastChat rating_systems.py reproduced',
           'urls': {'battles': 'https://storage.googleapis.com/arena_external_data/public/clean_battle_20240826_public.json', 'official': 'https://huggingface.co/spaces/lmarena-ai/arena-leaderboard', 'code': 'https://github.com/lm-sys/FastChat/blob/main/fastchat/serve/monitor/rating_systems.py'},
           'official_last_updated': str(off['full']['last_updated_datetime']),
           'n': {'all': int(len(Bt)), 'used': int(len(A)), 'style': int(len(S)), 'hard': int(len(H6)), 'hard_style': int(len(H6s)),
                 'hard_share': round(float((A.crit >= 6).mean()), 4), 'first_vote': int(Bt.t.min()), 'last_vote': int(Bt.t.max()), 'tie_share': round(float(A.w.isin(['t', 'tb']).mean()), 4)},
           'boards': {}}
    for key, plain_df, sty_df, ok_plain, ok_sc in [('overall', A, S, 'full', 'full_style_control'), ('hard', H6, H6s, 'hard_6', 'hard_6_style_control')]:
        r0 = bt(plain_df); r1, coef = style(sty_df); rl, cl = style(sty_df, (0,)); rm, cm = style(sty_df, (1, 2, 3))
        o0 = off[ok_plain]['leaderboard_table_df'] if ok_plain in off else None
        o1 = off[ok_sc]['leaderboard_table_df'] if ok_sc in off else None
        top = r0.sort_values(ascending=False).head(24).index.tolist()
        top1 = r1.sort_values(ascending=False).head(24).index.tolist()
        names = top + [m for m in top1 if m not in top]; names += [m for m in LAB if m not in names]
        def cmp(mine, o):
            if o is None: return None
            j = pd.concat([mine.rename('m'), o.rating.rename('o')], axis=1, join='inner'); d = (j.m - j.o).abs()
            t20 = j.sort_values('o', ascending=False).head(20)
            return {'n': int(len(j)), 'mean_abs': round(float(d.mean()), 2), 'max_abs': round(float(d.max()), 2), 'top20_max_abs': round(float((t20.m - t20.o).abs().max()), 2), 'spearman': round(float(j.m.rank().corr(j.o.rank())), 4)}
        res['boards'][key] = {'coef': [round(float(x), 4) for x in coef], 'coef_len_only': [round(float(x), 4) for x in cl], 'coef_md_only': [round(float(x), 4) for x in cm],
                              'vs_official_plain': cmp(r0, o0), 'vs_official_sc': cmp(r1, o1),
                              'rows': [{'m': m, 'bt': round(float(r0.get(m, np.nan)), 1), 'sc': round(float(r1.get(m, np.nan)), 1), 'len': round(float(rl.get(m, np.nan)), 1), 'md': round(float(rm.get(m, np.nan)), 1),
                                        'obt': (round(float(o0.rating[m]), 1) if o0 is not None and m in o0.index else None), 'osc': (round(float(o1.rating[m]), 1) if o1 is not None and m in o1.index else None),
                                        'v': int(((plain_df.a == m) | (plain_df.b == m)).sum())} for m in names]}
        print(key, res['boards'][key]['coef'], res['boards'][key]['vs_official_plain'], res['boards'][key]['vs_official_sc'])
    # also the 13 August board from the 14 August file, if it was extracted (the first reproduction)
    c14 = os.path.join(C, 'battles0814.csv')
    if os.path.exists(c14):
        B14 = pd.read_csv(c14, keep_default_na=False); o13 = pkl('elo_results_20240813.pkl')['full']
        A14 = B14[(B14.anony == 1) & (B14.samp == 1) & (B14.t <= o13['last_updated_tstamp'])]
        r = bt(A14); j = pd.concat([r.rename('m'), o13['leaderboard_table_df'].rating.rename('o')], axis=1, join='inner'); d = (j.m - j.o).abs()
        res['aug13'] = {'n_votes': int(len(A14)), 'n_models': int(len(j)), 'mean_abs': round(float(d.mean()), 2), 'max_abs': round(float(d.max()), 2), 'spearman': round(float(j.m.rank().corr(j.o.rank())), 4),
                        'without_dedup_mean_abs': None}
        print('aug13', res['aug13'])
    dump('arena2024_fits.json', res)

    # ---- lab sample: ten models, votes between them, in time order ----
    L = S[S.a.isin(LAB) & S.b.isin(LAB)]
    L = L[L.t >= L[(L.a == 'chatgpt-4o-latest') | (L.b == 'chatgpt-4o-latest')].t.min()]
    rng = np.random.default_rng(20240826)
    N = 6000
    L = L.iloc[np.sort(rng.choice(len(L), size=min(N, len(L)), replace=False))]
    ALPH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'
    enc = []
    for _, x in L.iterrows():
        ia, ib = LAB.index(x.a), LAB.index(x.b); oc = {'a': 0, 'b': 1, 't': 2, 'tb': 3}[x.w]
        q = []
        for (u, v) in FEAT:
            ratio = (x[u] - x[v]) / (x[u] + x[v] + 1)
            q.append(ALPH[int(round(ratio * 31)) + 31])
        enc.append(ALPH[ia] + ALPH[ib] + ALPH[oc] + ''.join(q))
    dump('lab_sample.json', {'about': 'Random sample (seed 20240826) of anonymous, de-duplicated votes with style metadata among ten models, from the public log of 26 Aug 2024, in time order. Each vote is 7 characters: model a, model b, outcome (0 a wins, 1 b wins, 2 tie, 3 both bad), then (x_a - x_b)/(x_a + x_b + 1) quantised to 1/31 for tokens, headers, lists, bold.',
                             'alphabet': ALPH, 'models': LAB, 'n': len(enc), 'first': int(L.t.min()), 'last': int(L.t.max()), 'votes': ''.join(enc)})
