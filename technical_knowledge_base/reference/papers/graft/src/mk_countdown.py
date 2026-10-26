"""Replay the Countdown-Code endpoints of Figure 2 (left) from the authors' released figure data.

Input: rl/paper_data/paper_fig_inputs.tar.gz from https://github.com/jnward/GRAFT at commit
b0767d1c40e5a03d78fc5ff4b6abc92829168386 (MIT licence; sha256 checked below). The tarball is
7.6 MB, so it is not kept in the repo; this script reads the few files Figure 2 uses straight
out of it and writes the per-seed points to inputs/countdown_points.json (kept in the repo).

The arms, files and scales are those of rl/figures/countdown_figure1.py (same commit):
x = hack_freq (all hack types, n=256 eval prompts, from the fseval JSONs),
y = expr-only pass@1 (rl/tools/expr_only_probe.py: the clean environment, hacking impossible).
Means and SEM over seeds as in that script.

usage: python3 mk_countdown.py <path to paper_fig_inputs.tar.gz>
       (without an argument it only re-derives the summary from inputs/countdown_points.json)
"""
import hashlib, json, re, statistics as st, sys, tarfile

SHA = '3bd3911c5760f4f4ba311c47868e86be40677deb608d6d2ce33d0ef2756f7797'
ARMS = [  # (label, fseval glob regex inside output/, scale)
    ('No intervention', r'output/countdown_code_rp2-0702-0026_fseval/countdown_code_hack_reward_penalty_amountmissing_s(\d+)\.json', '1.0'),
    ('Reward penalty', r'output/countdown_hf100_rp_lccoh64_fseval/cdhf100_rp2_lc64_lr1_s(\d+)\.json', '1.0'),
    ('Inoculation prompting', r'output/countdown_hf100_ip_fseval/cdhf100_ip_mand-tw_s(\d+)\.json', '1.0'),
    ('Preventative steering', r'output/countdown_hf100_pps_fseval/cdhf100_pps_L20_a2_s(\d+)\.json', '1.0'),
    ('Anchor environment only', r'output/countdown_hf100_lconly_fseval/lconly_full_s(\d+)\.json', '1.0'),
    ('GRAFT w/o routing', r'output/cdhf100_noroute_fseval_rerun/cdhf100_noroute_anchor_s(\d+)\.json', '0.0'),
    ('GRAFT (ours)', r'output/countdown_hf100_gr_lccoh64_lr3(?:_seeds5)?_fseval/cdhf100_gr_lccoh64_lr3_s(\d+)\.json', '0.0'),
]
BASE = ('output/countdown_hf100_gr_lccoh64_lr3_fseval/cdhf100_gr_lccoh64_lr3_s9__r0.0.json', 'cdhf100_gr_lccoh64_lr3_s16__r0.0')
KEYS = {'hack': 'hack_freq/', 'detected': 'hack_freq_detectable/', 'undetected': 'hack_freq_undetectable/',
        'constraint_relax': 'hack_freq_constraint_relax/', 'modify_input': 'hack_freq_modify_input/',
        'other': 'hack_freq_other/', 'proxy': 'combined/', 'retain': 'retain/'}


def val(d, p):
    hits = [v for k, v in d.items() if k.startswith(p) and '/' not in k[len(p):]]
    return hits[0] if hits else None


def point(fs, probe, scale):
    m = fs['scales'][scale]
    r = {k: val(m, p) for k, p in KEYS.items()}
    r['clean'] = probe['scales'][scale]['true_pass1'] if probe else None
    return r


def build(tgz):
    h = hashlib.sha256(open(tgz, 'rb').read()).hexdigest()
    if h != SHA: raise SystemExit('tarball hash differs: ' + h)
    tf = tarfile.open(tgz)
    names = tf.getnames()
    rd = lambda n: json.load(tf.extractfile(n))
    probe = lambda run: rd('output/expr_only_probe_arms/%s.json' % run) if 'output/expr_only_probe_arms/%s.json' % run in names else None
    out = {'source': 'github.com/jnward/GRAFT@b0767d1c rl/paper_data/paper_fig_inputs.tar.gz (sha256 %s...%s), arms as in rl/figures/countdown_figure1.py' % (SHA[:8], SHA[-4:]), 'arms': []}
    for label, rx, scale in ARMS:
        pts = []
        for n in sorted(names):
            mm = re.fullmatch(rx, n)
            if not mm: continue
            fs = rd(n)
            p = point(fs, probe(fs['run_name']), scale); p['seed'] = int(mm.group(1)); p['n_eval'] = fs['n_eval']
            pts.append(p)
        out['arms'].append({'label': label, 'scale': scale, 'seeds': sorted(pts, key=lambda p: p['seed'])})
    b = point(rd(BASE[0]), probe(BASE[1]), '0.0'); b['seed'] = None; b['n_eval'] = 256
    out['arms'].append({'label': 'Base model', 'scale': '0.0', 'seeds': [b]})
    json.dump(out, open('inputs/countdown_points.json', 'w'), indent=1)


def summary():
    d = json.load(open('inputs/countdown_points.json'))
    res = {}
    for a in d['arms']:
        s = a['seeds']; n = len(s)
        row = {'n': n}
        for k in ('hack', 'detected', 'undetected', 'constraint_relax', 'clean', 'proxy', 'retain'):
            xs = [p[k] for p in s if p[k] is not None]
            row[k] = st.mean(xs)
            row[k + '_sem'] = st.stdev(xs) / len(xs) ** .5 if len(xs) > 1 else 0.0
        res[a['label']] = row
    return res


if __name__ == '__main__':
    if len(sys.argv) > 1: build(sys.argv[1])
    for k, r in summary().items():
        print('%-24s n=%d hack %.3f+-%.3f (detected %.3f, constraint %.3f) clean %.3f+-%.3f proxy %.3f' % (
            k, r['n'], r['hack'], r['hack_sem'], r['detected'], r['constraint_relax'], r['clean'], r['clean_sem'], r['proxy']))
