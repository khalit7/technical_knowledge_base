"""Recompute every derived number the page shows for Context Language Models (arXiv 2609.37725v1), and run the
illustrative trajectory replay of the "Replay a trajectory" tab, so the page's JavaScript can be checked against it.

  python3 recompute.py        (build.sh runs it; writes inputs/recompute.json and inputs/replay.json)

Inputs: inputs/figs.json (decode_figs.py) and the printed numbers transcribed below, each with where it is printed.
Comparisons against printed values round half-up with decimal.Decimal, never float round(), so the result does not
depend on the Python version. Every check is listed in the output with its verdict.
"""
import json, math, os
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
checks = []


def q(v, places):
    """Round half-up to `places` decimals, through the shortest repr (so 0.0285 stays 0.0285)."""
    return float(Decimal(repr(float(v))).quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP))


def check(name, got, printed, places, where):
    ok = q(got, places) == q(printed, places)
    checks.append({'name': name, 'got': q(got, places + 2), 'printed': printed, 'ok': ok, 'where': where})
    return ok


# ---------------------------------------------------------------- Appendix C: the prefix-reuse FLOPs model (Eq. 7 to 9)
Q36 = dict(L=64, d=5120, dff=17408, La=16, hq=24, hkv=4, dh=256, Ll=48, hk=16, hv=48, dk=128, dv=128)


def costs(m):
    mlp = 6 * m['L'] * m['d'] * m['dff']
    att = m['La'] * (2 * m['d'] * (2 * m['hq'] * m['dh'] + 2 * m['hkv'] * m['dh']) + 2 * m['hq'] * m['dh'] * m['d'])
    gdn = m['Ll'] * (2 * m['d'] * (2 * m['hk'] * m['dk'] + 2 * m['hv'] * m['dv'] + 2 * m['hv']) + 2 * m['hv'] * m['dv'] * m['d'])
    return dict(mlp=mlp, attn_proj=att, gdn_proj=gdn, c_token=mlp + att + gdn, c_attn=4 * m['La'] * m['hq'] * m['dh'])


C = costs(Q36)
check('C_token (FLOPs per token, x1e9)', C['c_token'] / 1e9, 48.70, 2, 'Appendix C')
check('MLP share (x1e9)', C['mlp'] / 1e9, 34.23, 2, 'Appendix C')
check('full-attention projections (x1e9)', C['attn_proj'] / 1e9, 3.36, 2, 'Appendix C')
check('Gated DeltaNet projections (x1e9)', C['gdn_proj'] / 1e9, 11.12, 2, 'Appendix C')
check('C_attn (FLOPs per query-key pair, x1e5)', C['c_attn'] / 1e5, 3.93, 2, 'Appendix C')


def turn_flops(P, G, R, c=C, split=False):
    """Eq. 9: F_t = C_token (U_t + G_t) + C_attn [ (P_t^2 - R_t^2)/2 + G_t P_t + G_t^2/2 ], U_t = P_t - R_t."""
    lin = c['c_token'] * (P - R + G)
    pre = c['c_attn'] * 0.5 * (P * P - R * R)
    dec = c['c_attn'] * (G * P + 0.5 * G * G)
    if split:
        k = (P - R + G) / c['c_token']
        return dict(mlp=c['mlp'] * (P - R + G), attn_proj=c['attn_proj'] * (P - R + G), gdn_proj=c['gdn_proj'] * (P - R + G),
                    qk_pairs=pre + dec, total=lin + pre + dec)
    return lin + pre + dec


fig16 = {}
nocache = turn_flops(20000, 500, 0)
for R, printed, avoided in ((18000, 10**14 * 1.41, 87), (10000, 10**14 * 5.74, 47), (0, 10**14 * 10.81, 0)):
    f = turn_flops(20000, 500, R, split=True)
    fig16[str(R)] = {k: v for k, v in f.items()}
    check('Figure 16 turn, R=%d (x1e14)' % R, f['total'] / 1e14, printed / 1e14, 2, 'Appendix C, Figure 16')
    check('Figure 16 compute avoided, R=%d (%%)' % R, 100 * (1 - f['total'] / nocache), avoided, 0, 'Figure 16 labels')
check('edit at start / append only', turn_flops(20000, 500, 0) / turn_flops(20000, 500, 18000), 7.7, 1, 'Appendix C')

# the released metric (clm/clm_harness/flops_metrics/kv_cache_flops.py): 2 x N_body per token, 4 x layers x width per pair
code = {'27b': dict(n_body=24.3532e9, attn=(16, 6144)), '9b': dict(n_body=6.9196e9, attn=(8, 4096))}
code_c = {k: dict(c_token=2 * v['n_body'], c_attn=4 * v['attn'][0] * v['attn'][1]) for k, v in code.items()}
check('released code: 2 x N_body(27b) against C_token (x1e9)', code_c['27b']['c_token'] / 1e9, 48.70, 1, 'kv_cache_flops.py N_BODY_PARAMS')
check('released code: 4 x 16 x 6144 against C_attn (x1e5)', code_c['27b']['c_attn'] / 1e5, 3.93, 2, 'kv_cache_flops.py ATTN_GEOMETRY')

# ---------------------------------------------------------------- headline ratios from decoded figures and printed labels
F5 = FIG['fig5']
b, t, l = F5['bcp'], F5['tb21'], F5['tblite']
check('BCP CLM accuracy (Figure 5, decoded)', b['CLM']['acc'], 59.4, 1, '§5.1.1')
check('BCP CLM / Summary accuracy, relative gain (%)', 100 * (b['CLM']['acc'] / b['Summary']['acc'] - 1), 11.4, 1, 'Abstract, §5.1.1')
check('BCP FLOPs saved against Summary (%)', 100 * (1 - b['CLM']['pflops'] / b['Summary']['pflops']), 21.5, 1, 'Abstract, §5.1.1')
check('BCP FLOPs saved against MEM1 (%)', 100 * (1 - b['CLM']['pflops'] / b['MEM1']['pflops']), 28.9, 1, '§5.1.1')
check('TB2.1 CLM accuracy equals Summary (points apart)', t['CLM']['acc'] - t['Summary']['acc'], 0.0, 1, '§5.1.1')
check('TB2.1 CLM FLOPs share of Summary (%)', 100 * t['CLM']['pflops'] / t['Summary']['pflops'], 70, 0, '§5.1.1')
check('TB2.1 FLOPs saved (%)', 100 * (1 - t['CLM']['pflops'] / t['Summary']['pflops']), 29.5, 1, '§1')
check('TBLite CLM accuracy', l['CLM']['acc'], 73.7, 1, '§5.1.1')
check('TBLite Summary accuracy', l['Summary']['acc'], 67.0, 1, '§5.1.1')
check('TBLite CLM FLOPs share of Summary (%)', 100 * l['CLM']['pflops'] / l['Summary']['pflops'], 91, 0, '§5.1.1')
F19 = FIG['fig19']
for k in ('bcp', 'tb21', 'tblite'):
    for m, v in F5[k].items():
        if m.startswith('_'): continue
        w = F19['27b_' + k].get(m)
        # Figure 19's bottom row repeats Figure 5; its circles (not its label assignment) must match
        same = any(abs(x['acc'] - v['acc']) <= 0.3 and abs((x['pflops'] or 0) - v['pflops']) <= 0.05 for n, x in F19['27b_' + k].items() if not n.startswith('_'))
        checks.append({'name': 'Figure 19 repeats Figure 5: %s %s' % (k, m), 'got': same, 'printed': True, 'ok': same, 'where': 'Figures 5 and 19'})
check('9B BCP CLM accuracy (Figure 19)', F19['9b_bcp']['CLM']['acc'], 39.9, 1, 'Appendix F')
check('9B BCP Summary accuracy (Figure 19)', F19['9b_bcp']['Summary']['acc'], 37.7, 1, 'Appendix F')
# EdgeBench-10 and Software World: printed end labels of Figure 8 (and 27)
EB = {'qwen32k': {'CLM': (44.6, 179), 'CLM+subagents': (44.2, 181), 'Summary': (42.3, 437), 'Base': (21.8, 3)},
      'sonnet32k': {'CLM': (51.0, None), 'CLM+subagents': (50.4, None), 'Summary': (42.3, None), 'Base': (24.2, None)},
      'qwen128k': {'CLM': (47.3, 142), 'CLM+subagents': (50.2, 219), 'Summary': (47.8, 222)}}
check('EdgeBench-10 score gain (%)', 100 * (EB['qwen32k']['CLM'][0] / EB['qwen32k']['Summary'][0] - 1), 5, 0, 'Abstract')
check('EdgeBench-10 FLOPs saved (%)', 100 * (1 - EB['qwen32k']['CLM'][1] / EB['qwen32k']['Summary'][1]), 59, 0, 'Abstract')
SW = {'CLM': 1.044, 'Summary': 1.026}
sw_lo = (SW['CLM'] - 0.0005 - 1) / (SW['Summary'] + 0.0005 - 1)
sw_hi = (SW['CLM'] + 0.0005 - 1) / (SW['Summary'] - 0.0005 - 1)
sw_mid = (SW['CLM'] - 1) / (SW['Summary'] - 1)
checks.append({'name': 'Software World: 65% greater speedup within the rounding of the printed 1.044 and 1.026', 'got': [q(100 * (sw_lo - 1), 0), q(100 * (sw_hi - 1), 0)],
               'printed': 65, 'ok': 100 * (sw_lo - 1) <= 65 <= 100 * (sw_hi - 1), 'where': 'Figure 8 (right) labels'})
# Table 1 (best of one run each, Claude 4.6 Sonnet)
T1 = {'OE': [2.541, 0.03127, 0.07690, 0.38123], 'OE-Agent': [2.525, 0.03053, 0.07724, 0.38167],
      'CLM': [2.618, 0.03653, 0.07758, 0.38094], 'CLM (SA)': [2.636, 0.03617, 0.07758, 0.38109]}
check('Heilbronn: CLM over OpenEvolve (%)', 100 * (T1['CLM'][1] / T1['OE'][1] - 1), 16.8, 1, '§1')
check('Circle packing: CLM over OpenEvolve (%)', 100 * (T1['CLM'][0] / T1['OE'][0] - 1), 3.0, 1, '§1')
# in-context evolution (Appendix F) and RL (Table 2)
check('KV Store held-out gain (points)', 74.2 - 38.3, 35.9, 1, 'Abstract, Appendix F')
T2 = {'Summary': {'acc': (34.7, 42.1), 'pf': (4.01, 2.19)}, 'CLM': {'acc': (28.8, 42.5), 'pf': (1.52, 1.34)}}
check('RL: CLM relative accuracy gain (%)', 100 * (T2['CLM']['acc'][1] / T2['CLM']['acc'][0] - 1), 47.6, 1, 'Abstract')
check('RL: CLM FLOPs saved against its own start (%)', 100 * (1 - T2['CLM']['pf'][1] / T2['CLM']['pf'][0]), 12, 0, 'Abstract')
check('RL: CLM gain in points', T2['CLM']['acc'][1] - T2['CLM']['acc'][0], 13.7, 1, '§5.2')
check('RL: CLM over trained Summary (points)', T2['CLM']['acc'][1] - T2['Summary']['acc'][1], 0.4, 1, '§1')
check('RL: FLOPs saved against trained Summary (%)', 100 * (1 - T2['CLM']['pf'][1] / T2['Summary']['pf'][1]), 38.8, 1, '§1')
check('RL: before training, CLM below Summary (points)', T2['Summary']['acc'][0] - T2['CLM']['acc'][0], 6, 0, '§5.2 ("six points")')
# Suffix Cache Reuse (Figures 11, 14, 15 printed labels)
check('SCR: share of standard SGLang FLOPs (%)', 100 * 7.14 / 10.98, 65.0, 1, '§5.3')
check('SCR: reuse beyond prefix hits = stripping + edits (points)', 5.3 + 2.5, 7.8, 1, 'Appendix B, Figure 14')
check('Figure 14 all turns, SCR row sums to 100', 73.9 + 5.3 + 2.5 + 18.3, 100.0, 1, 'Figure 14')
check('Figure 14 edited turns, SCR row sums to 100', 29.9 + 19.3 + 8.9 + 41.8, 99.9, 1, 'Figure 14 (rounding)')
check('Figure 15 all turns, standard row', 72.9 + 9.6 + 8.1 + 8.5, 99.1, 1, 'Figure 15 (an unclassified sliver is unlabelled)')

# ---------------------------------------------------------------- noise: standard errors the paper does not print
def se(p, n): return 100 * math.sqrt(p / 100 * (1 - p / 100) / n)


N_BCP = 830
gap = b['CLM']['acc'] - b['Summary']['acc']
se_gap = math.hypot(se(b['CLM']['acc'], N_BCP), se(b['Summary']['acc'], N_BCP))
rl_gap = T2['CLM']['acc'][1] - T2['Summary']['acc'][1]
se_rl = math.hypot(se(42.5, N_BCP), se(42.1, N_BCP))
noise = {'bcp_gap': q(gap, 1), 'bcp_se_gap': q(se_gap, 1), 'bcp_z': q(gap / se_gap, 1),
         'rl_gap': q(rl_gap, 1), 'rl_se_gap': q(se_rl, 1), 'rl_z': q(rl_gap / se_rl, 2),
         'bcp_se_one': q(se(59.4, N_BCP), 1)}
# TerminalBench 2.1 has 89 pass/fail tasks: which task counts land on the decoded scores?
tbk = {m: [k for k in range(90) if abs(100 * k / 89 - v['acc']) < 0.15] for m, v in t.items() if not m.startswith('_')}
tbk88 = {m: [k for k in range(89) if abs(100 * k / 88 - v['acc']) < 0.15] for m, v in t.items() if not m.startswith('_')}
noise['tb_task_counts_of_89'] = tbk
noise['tb_task_counts_of_88'] = tbk88
noise['tb_step'] = q(100 / 89, 2)
noise['tb_se_53'] = q(se(53.4, 89), 1)

# ---------------------------------------------------------------- the replay (illustrative; same algorithm as parts/23_js_run.js)
# One deep-research episode, the same input stream for every policy. Sizes follow BrowseComp-Plus as Appendix E sets it
# up (search returns 10 snippets of 512 tokens; the reader is capped at 8,192); everything else is illustrative.
TRAJ_SPEC = 'S0 S1 O1:6400 S0 S0 O0:8192 S1 O1:4800 S0 S0 S1 O0:8192 S0 O1:5600 S0 S1 O1:7000 S0 S0 O1:3900 S0 S1 O1:8192 A'
DEF = dict(prefix=1800, budget=28672, window=32768, search=5300, gen_search=300, gen_open=260, gen_answer=420, obs_answer=60,
           sum_at=0.75, sum_instr=150, sum_len=1600, clm_at=0.75, clm_keep=0, clm_gen=260, note_no=45, note_yes_search=240, note_yes_open=420,
           scr_k=6)


def traj(p):
    out = []
    for i, tok in enumerate(TRAJ_SPEC.split()):
        if tok == 'A': out.append(dict(i=i + 1, kind='answer', useful=True, gen=p['gen_answer'], obs=p['obs_answer'])); continue
        k, rest = tok[0], tok[1:]
        useful = rest.startswith('1')
        obs = int(rest.split(':')[1]) if ':' in rest else p['search']
        out.append(dict(i=i + 1, kind='search' if k == 'S' else 'open', useful=useful, gen=p['gen_search'] if k == 'S' else p['gen_open'], obs=obs))
    return out


def simulate(policy, p=DEF, c=C):
    seen = {}          # trie of message keys over every earlier prompt (Appendix C: message-level prefix reuse)
    prev = None        # previous prompt's keys, for Suffix Cache Reuse
    uid = [0]

    def msg(tok, kind, label):
        uid[0] += 1
        return dict(k=uid[0], tok=tok, kind=kind, label=label)
    msgs = [msg(p['prefix'], 'sys', 'system prompt and task')]
    steps = []

    def call(kind, G, label, extra=None):
        nonlocal prev
        pr = msgs + (extra or [])
        keys = [m['k'] for m in pr]
        toks = [m['tok'] for m in pr]
        P = sum(toks)
        node, R, nmatch = seen, 0, 0
        for m in pr:
            if m['k'] not in node: break
            node = node[m['k']]; R += m['tok']; nmatch += 1
        # Suffix Cache Reuse: surviving messages after the matched prefix that were in the previous prompt,
        # grouped into runs of consecutive survivors; the K longest runs keep their cache, the rest are re-prefilled
        pk = set(prev or [])
        runs, cur = [], []
        for j in range(nmatch, len(pr)):
            if pr[j]['k'] in pk: cur.append(j)
            elif cur: runs.append(cur); cur = []
        if cur: runs.append(cur)
        runs.sort(key=lambda r: -sum(toks[j] for j in r))
        reloc_idx = set(j for r in runs[:p['scr_k']] for j in r)
        reloc = sum(toks[j] for j in reloc_idx)
        state = ['hit' if j < nmatch else ('re' if pr[j]['k'] in pk else 'new') for j in range(len(pr))]
        f_std = turn_flops(P, G, R, c)
        kept = R + reloc
        f_scr = c['c_token'] * (P - kept + G) + c['c_attn'] * (0.5 * (P * P - kept * kept) + G * P + 0.5 * G * G)
        steps.append(dict(kind=kind, label=label, P=P, R=R, U=P - R, G=G, reloc=reloc, f_std=f_std, f_scr=f_scr,
                          blocks=[[m['tok'], m['kind'], state[j], 1 if j in reloc_idx else 0] for j, m in enumerate(pr)]))
        node = seen
        for k in keys: node = node.setdefault(k, {})
        prev = keys
        return P

    ctx = lambda: sum(m['tok'] for m in msgs)
    for a in traj(p):
        if policy == 'summary' and ctx() > p['sum_at'] * p['budget']:
            call('compact', p['sum_len'], 'summary call', [msg(p['sum_instr'], 'instr', 'summarise instruction')])
            msgs[:] = [msgs[0], msg(p['sum_len'], 'summary', 'summary of turns so far')]
            steps[-1]['after'] = ctx()
        if policy == 'clm' and ctx() > p['clm_at'] * p['budget']:
            call('edit', p['clm_gen'], 'edit the context file')
            # collapse every finished turn except the newest clm_keep into a one-line note; drop earlier edit commands
            obs_idx = [j for j, m in enumerate(msgs) if m['kind'] == 'obs']
            cut = obs_idx[-p['clm_keep']] - 1 if p['clm_keep'] and len(obs_idx) >= p['clm_keep'] else len(msgs)
            new = []
            for j, m in enumerate(msgs):
                if m['kind'] == 'edit': continue
                if m['kind'] in ('act', 'obs') and j < cut:
                    if m['kind'] == 'obs':
                        a0 = m['a']
                        size = p['note_no'] if not a0['useful'] else (p['note_yes_search'] if a0['kind'] == 'search' else p['note_yes_open'])
                        n = msg(size, 'note', 'note: turn %d' % a0['i']); n['a'] = a0; new.append(n)
                    continue
                new.append(m)
            new.append(msg(p['clm_gen'], 'edit', 'edit command'))
            msgs[:] = new
            steps[-1]['after'] = ctx()
        if ctx() + a['gen'] > p['budget']:
            steps.append(dict(kind='stop', label='out of context', P=ctx(), R=0, U=0, G=0, reloc=0, f_std=0, f_scr=0,
                              blocks=[[m['tok'], m['kind'], 'hit', 0] for m in msgs]))
            break
        call('act', a['gen'], '%s %d' % (a['kind'], a['i']))
        msgs.append(msg(a['gen'], 'act', 'thought and command %d' % a['i']))
        o = msg(a['obs'], 'obs', '%s result %d' % (a['kind'], a['i'])); o['a'] = a
        msgs.append(o)
        steps[-1]['after'] = ctx()
    tot = lambda key: sum(s[key] for s in steps)
    return dict(steps=steps, pflops_std=tot('f_std') / 1e15, pflops_scr=tot('f_scr') / 1e15,
                calls=sum(1 for s in steps if s['kind'] != 'stop'), actions=sum(1 for s in steps if s['kind'] == 'act'),
                edits=sum(1 for s in steps if s['kind'] in ('edit', 'compact')),
                peak=max(s['P'] + s['G'] for s in steps if s['kind'] != 'stop'), mean_prompt=sum(s['P'] for s in steps if s['kind'] != 'stop') / max(1, sum(1 for s in steps if s['kind'] != 'stop')),
                prefilled=tot('U'), prefilled_scr=sum(s['U'] - s['reloc'] for s in steps), generated=tot('G'), stopped=steps[-1]['kind'] == 'stop')


REPLAY = {pol: simulate(pol) for pol in ('base', 'summary', 'clm')}
summ = {pol: {k: (q(v, 6) if isinstance(v, float) else v) for k, v in r.items() if k != 'steps'} for pol, r in REPLAY.items()}
for pol in summ:
    summ[pol]['trace'] = [[s['kind'][0], s['P'], s['R'], s['G'], s['reloc']] for s in REPLAY[pol]['steps']]
# the same replay with one turn kept verbatim at each edit, where Suffix Cache Reuse has something to relocate
keep1 = simulate('clm', dict(DEF, clm_keep=1))
summ['clm_keep1'] = {k: (q(v, 6) if isinstance(v, float) else v) for k, v in keep1.items() if k != 'steps'}
summ['clm_keep1']['trace'] = [[s['kind'][0], s['P'], s['R'], s['G'], s['reloc']] for s in keep1['steps']]
replay_cmp = {'clm_vs_summary_flops_saved_pct': q(100 * (1 - summ['clm']['pflops_std'] / summ['summary']['pflops_std']), 1),
              'keep1_scr_saved_pct': q(100 * (1 - summ['clm_keep1']['pflops_scr'] / summ['clm_keep1']['pflops_std']), 1)}

out = {'checks': checks, 'n_checks': len(checks), 'n_ok': sum(1 for c in checks if c['ok']),
       'C': {k: q(v, 1) for k, v in C.items()}, 'Q36': Q36, 'fig16': {k: {a: q(b, 0) for a, b in v.items()} for k, v in fig16.items()},
       'code_c': code_c, 'noise': noise, 'T1': T1, 'T2': T2, 'EB': EB, 'SW': SW,
       'replay': {'def': DEF, 'spec': TRAJ_SPEC, 'res': summ, 'cmp': replay_cmp}}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=0, sort_keys=True)
bad = [c for c in checks if not c['ok']]
print('recompute: %d checks, %d reproduce' % (len(checks), len(checks) - len(bad)))
for c in bad: print('  DOES NOT REPRODUCE', c)
for pol in ('base', 'summary', 'clm', 'clm_keep1'):
    print(' ', pol, {k: v for k, v in summ[pol].items() if k != 'trace'})
print(' ', replay_cmp)
