"""Replay Figure 3 (six SmolLM2-135M toy environments) from the authors' released training logs.

Input: the same tarball as mk_countdown.py (github.com/jnward/GRAFT@b0767d1c,
rl/paper_data/paper_fig_inputs.tar.gz, sha256 checked there). Each run has a routing_eval.jsonl
(one row per eval step, every 10 steps). Following rl/figures/proto_respmon6_rv2canon_sidebyside.py:
a run's endpoint is the mean of its last 10% of eval rows; retain = target-task reward on all
prompts, hack = hack rate on hackable prompts, split into detectable (monitor would flag) and
undetectable (total minus detectable); base = the first eval row (step 10) of the no-intervention,
reward-penalty and GRAFT runs. The reward penalty dose is the one with the best apparent score
(tail mean of combined proxy reward minus monitor flag rate), the developer's view.

Arms the bundle does not contain (Filtering, GRAFT w/o routing, GRAFT w/o anchoring) are not
replayed here; the page says so.

usage: python3 mk_toyenvs.py <path to paper_fig_inputs.tar.gz>   -> inputs/toyenv_points.json
"""
import json, re, statistics as st, sys, tarfile

R = 'respmon-results/'
ENVS = {  # page name: (run prefix, dn sweep, rp sweeps, gr sweep, gr pattern)
    'addition': ('addition_v2_syco_respmon_iva', 'respmon_iva_dn_3seed', ('respmon_iva_rp_3seed', 'respmon_rp_doses_canon_3seed'), 'respmon_rv2_gr_3seed', 'gr_cls'),
    'cities_qa': ('cities_qa_syco_respmon_iva', 'respmon_iva_dn_3seed', ('respmon_iva_rp_3seed', 'respmon_rp_doses_canon_3seed'), 'respmon_rv2_gr_3seed', 'gr_cls'),
    'object_qa': ('object_qa_syco_respmon_iva_inv', 'respmon_ivainv_dn_rp_3seed', ('respmon_ivainv_dn_rp_3seed', 'respmon_rp_doses_canon_3seed'), 'respmon_objinv_gr_canon_3seed', 'gr_cls_canon'),
    'persona_qa': ('persona_qa_flattery_respmon_bvo', 'respmon_persona_bvo_dn_rp_3seed', ('respmon_persona_bvo_dn_rp_3seed', 'respmon_rp_doses_canon_3seed'), 'respmon_rv2_gr_3seed', 'gr_cls'),
    'repeat_extra': ('repeat_respmon', 'respmon_repeat_sorting_dn_rp_3seed', ('respmon_repeat_sorting_dn_rp_3seed', 'respmon_rp_doses_canon_3seed'), 'respmon_rv2_gr_3seed', 'gr_cls'),
    'sort': ('sortframed', 'sort_framed', ('sort_framed',), 'sort_framed', 'graft_hf'),
}


def main(tgz):
    tf = tarfile.open(tgz)
    logs = {n[len(R):-len('/routing_eval.jsonl')]: n for n in tf.getnames() if n.startswith(R) and n.endswith('/routing_eval.jsonl')}

    def rows(run):
        by = {}
        for l in tf.extractfile(logs[run]).read().decode().splitlines():
            if l.strip():
                r = json.loads(l); by[r['step']] = r
        return [by[s] for s in sorted(by)]

    def key(row, mode, slug):
        ks = [k for k in row if k.startswith('%s/%s/' % (mode, slug))]
        assert len(ks) == 1, (mode, slug, ks)
        return ks[0]

    def tail(rs, mode, slug, first=False):
        sel = rs[:1] if first else rs[-max(1, len(rs) // 10):]
        k = key(sel[0], mode, slug)
        return st.mean(r[k] for r in sel)

    def runs(sweep, prefix, pat):
        return sorted(r for r in logs if r.startswith(sweep + '/' + prefix + '_' + pat))

    def pt(run, mode, first=False):
        rs = rows(run)
        tot = tail(rs, mode, 'hack_freq_hackable', first); det = tail(rs, mode, 'hack_freq_detectable', first)
        return {'run': run.split('/')[-1], 'retain': round(tail(rs, mode, 'retain', first), 4), 'hack': round(tot, 4),
                'detected': round(det, 4), 'undetected': round(max(0.0, tot - det), 4), 'last_step': rs[-1]['step']}

    out = {'source': 'github.com/jnward/GRAFT@b0767d1c rl/paper_data/paper_fig_inputs.tar.gz, respmon-results/*/routing_eval.jsonl; selection as in rl/figures/proto_respmon6_rv2canon_sidebyside.py', 'envs': {}}
    for env, (prefix, dn, rps, gr, grpat) in ENVS.items():
        dnr = runs(dn, prefix, 'donothing'); grr = runs(gr, prefix, grpat)
        doses = {}
        for sw in rps:
            for r in logs:
                m = re.match(re.escape(sw + '/' + prefix) + r'_(rp\d+)_', r)
                if m: doses.setdefault(m.group(1), set()).add(r)
        score = {t: st.mean(tail(rows(r), 'both', 'combined') - tail(rows(r), 'both', 'detected_freq') for r in rs) for t, rs in doses.items() if len(rs) == 3}
        best = max(score, key=score.get)
        e = {'rp_scores': {t: round(v, 4) for t, v in sorted(score.items())}, 'rp_pick': best,
             'No intervention': [pt(r, 'both') for r in dnr],
             'Reward penalty': [pt(r, 'both') for r in sorted(doses[best])],
             'GRAFT: pre-ablation': [pt(r, 'both') for r in grr],
             'GRAFT (ours)': [pt(r, 'retain_only') for r in grr],
             'Base model': [pt(r, 'both', True) for r in dnr + sorted(doses[best]) + grr]}
        out['envs'][env] = e
    json.dump(out, open('inputs/toyenv_points.json', 'w'), indent=1)


def summary():
    d = json.load(open('inputs/toyenv_points.json'))
    res = {}
    for env, e in d['envs'].items():
        res[env] = {a: {k: st.mean(p[k] for p in e[a]) for k in ('retain', 'hack', 'detected', 'undetected')} for a in e if isinstance(e[a], list)}
        res[env]['rp_pick'] = e['rp_pick']
    return res


if __name__ == '__main__':
    if len(sys.argv) > 1: main(sys.argv[1])
    for env, r in summary().items():
        print(env, 'rp pick', r.pop('rp_pick'))
        for a, v in r.items(): print('   %-20s retain %.3f hack %.3f (det %.3f undet %.3f)' % (a, v['retain'], v['hack'], v['detected'], v['undetected']))
