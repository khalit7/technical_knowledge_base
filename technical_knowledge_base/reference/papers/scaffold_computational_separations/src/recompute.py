"""Recompute every derived number the page shows from tables.json and inputs/sweep.json; write inputs/recompute.json.

  python3 recompute.py      (build.sh runs it)

Each check records the paper's claim, the page's number, how it was computed and a status:
'reproduces' (independently), 'reproduces by construction', 'does not reproduce', or 'derived' (a number the
paper does not state). Exact decimals (half-up) so output does not depend on the Python version.
"""
import json, math, os
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
S = json.load(open(os.path.join(HERE, 'inputs', 'sweep.json')))
R = lambda v, n=1: float(Decimal(repr(v)).quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_UP))
C = []


def chk(cid, what, paper, page, how, status, at):
    C.append({'id': cid, 'what': what, 'paper': paper, 'page': page, 'how': how, 'status': status, 'at': at})


# 1. calls per tree shape: sum_{i=0..L} d^i against Figure 12d's printed counts
f5 = T['fig5a']
calc = [sum(int(s[1]) ** i for i in range(int(s[3]) + 1)) for s in f5['shapes']]
ok = calc == [int(c) for c in f5['calls']]
chk('calls', 'Model calls per Branching tree, sum of d^i for i = 0..L (E.1)', 'Figure 12d: ' + ', '.join('%d' % c for c in f5['calls']),
    ', '.join(map(str, calc)), 'formula of Appendix E.1 applied to each (d, L)', 'reproduces' if ok else 'does not reproduce', 'A1.F12')

# 2. the headline 43.6 vs "saturates near 36"
best = max(v for v in f5['student'] if v is not None)
bi = f5['student'].index(best)
chk('headline', 'Harness 43.6% at 85 calls against a student "near 36%" (Section 1.1)', '43.6% vs near 36%',
    'teacher 43.6%% at (4,3) has no student (n/a); best student %.1f%% at %s (%d calls); student at (3,3) %.1f%%' % (best, f5['shapes'][bi], f5['calls'][bi], f5['student'][7]),
    'max over the printed student bars of Figure 5a', 'reproduces, across different tree shapes', 'S5.F5')
chk('below_base', 'Student of the (3,3) tree against the untouched base model', '"collapses once the tree reaches depth three"',
    '%.1f%% against base %.1f%% (%+.1f points)' % (f5['student'][7], f5['base'], f5['student'][7] - f5['base']), 'printed labels of Figure 5a', 'reproduces', 'S5.F5')

# 3. gaps and their binomial noise, 500 evaluation problems, unpaired (the paper gives no intervals)
n = 500
gaps = []
for s, t, st in zip(f5['shapes'], f5['teacher'], f5['student']):
    if st is None: continue
    se = math.sqrt(t / 100 * (1 - t / 100) / n + st / 100 * (1 - st / 100) / n) * 100
    gaps.append({'shape': s, 'gap': R(t - st), 'se': R(se, 2), 'z': R((t - st) / se, 1)})
chk('noise', 'Teacher minus student, in standard errors (500 problems, one run, unpaired binomial)', 'no intervals given',
    '; '.join('%s %+.1f (%.1f SE)' % (g['shape'], g['gap'], g['z']) for g in gaps), 'sqrt(p(1-p)/500) per arm, added in quadrature', 'derived', 'S5')

# 4. LoRA rank against full fine-tuning
cap = T['fig13']['capacity']['v']
chk('lora', 'Gain from more trainable parameters at fixed backbone (Figure 13b)', '"Increasing the LoRA rank improves the student by only 2.2 percentage points" (Section 1.1)',
    'rank 16 to 64: %+.1f; rank 16 to full fine-tuning: %+.1f' % (R(cap[2] - cap[1]), R(cap[3] - cap[1])), 'printed labels', 'does not reproduce as worded: 2.2 is the full fine-tune', 'A1.F13')
bb = T['fig13']['backbone']['v']
se4 = math.sqrt(bb[0] / 100 * (1 - bb[0] / 100) / n + bb[2] / 100 * (1 - bb[2] / 100) / n) * 100
chk('backbone', '4B student against the teacher (Figure 13a)', '"closes the gap and surpasses the teacher" (Section 5)',
    '4B %.1f%% vs teacher %.1f%%: %+.1f points, %.1f SE; the 4B model\'s own score without distillation is not reported' % (bb[2], bb[0], R(bb[2] - bb[0]), R((bb[2] - bb[0]) / se4, 1)),
    'printed labels; unpaired binomial SE at 500 problems', 'reproduces "closes"; "surpasses" is within noise', 'A1.F13')
chk('teacher_mismatch', 'The same tree\'s teacher in two figures', 'Figure 13a teacher 40.0 (the ks=[3,3] = (3,2) tree, student 35.2); Figure 12 teacher line %.1f (ks=[3])' % T['fig12']['teacher'],
    'Figure 5a gives (3,2) teacher 40.4 and (3,1) teacher 36.4', 'printed labels and the decoded dashed line', 'minor mismatch (0.4 points)', 'A1.F12')

# 5. chain-of-thought length: greedy against scaffold
for key in ('fig3', 'fig11'):
    f = T[key]
    d = [g - s for g, s in zip(f['greedy'], f['scaffold'])]
    chk('cot_' + key, 'Greedy minus scaffold at each training CoT length L, n_ops = %d' % f['n_ops'], '"match and eventually exceed" (Section 1)',
        ', '.join('L=%d: %+d' % (L, x) for L, x in zip(f['L'], d)) + '; greedy never above the scaffold',
        'printed labels (decoded to 0.1: max greedy minus scaffold %+.1f)' % max(g - s for g, s in zip(f['greedy_dec'], f['scaffold_dec'])),
        'matches at the last one or two L; does not exceed', f['anchor'])

# 6. Figure 1 teacher lines against Figure 8's caption
f1 = T['fig1']['settings']
chk('teachers', 'Teacher accuracy, decoded from Figure 1\'s dashed lines', 'Figure 8 caption: VGB 0.765/0.605, A* 0.99/0.98',
    'VGB/Sokoban %.3f/%.3f; A*/Sokoban %.3f/%.3f; VGB/Dyck %.3f/%.3f' % (f1[1]['rows'][3]['id'], f1[1]['rows'][3]['ood'], f1[2]['rows'][3]['id'], f1[2]['rows'][3]['ood'], f1[0]['rows'][3]['id'], f1[0]['rows'][3]['ood']),
    'vector geometry, tick-calibrated', 'reproduces', 'S1.F1')

# 7. Figure 2c against Table 2
t2 = {r[0]: r[1] for r in T['table2']['rows']}
f2c = T['fig2c']
same = [round(a, 2) == round(b, 2) for a, b in zip(f2c['id'][1:], t2['with <BT>, ID'][2:5])] + [round(a, 2) == round(b, 2) for a, b in zip(f2c['ood'][1:], t2['with <BT>, OOD'][2:5])]
chk('fig2c', 'Figure 2c bars against Table 2\'s <BT> rows', 'Table 2: ID 0.966/0.970/0.957, OOD 0.543/0.677/0.680; teacher 0.996/0.873',
    'decoded ID %s, OOD %s; teacher %.3f/%.3f' % ('/'.join('%.3f' % v for v in f2c['id'][1:]), '/'.join('%.2f' % v for v in f2c['ood'][1:]), f2c['teacher']['blue'], f2c['teacher']['magenta']),
    'vector geometry', 'reproduces' if all(same) else 'does not reproduce', 'A1.T2')

# 8. the size sweep's teacher-size point against Figure 1
f2b = T['fig2b']
i68 = f2b['params_M'].index(0.68)
chk('size068', 'VGB on Dyck: the 0.68M student of the size sweep against the 0.68M students of Figure 1', 'Section 2: a same-size student never closes the gap',
    'size sweep at 0.68M: %.3f ID / %.3f OOD (best over clean ratios and checkpoints); Figure 1: fine-tuned %.2f/%.2f, from scratch %.2f/%.2f; teacher %.2f/%.2f' % (
        f2b['id'][i68], f2b['ood'][i68], f1[0]['rows'][2]['id'], f1[0]['rows'][2]['ood'], f1[0]['rows'][1]['id'], f1[0]['rows'][1]['ood'], f1[0]['rows'][3]['id'], f1[0]['rows'][3]['ood']),
    'decoded bars; the sweep picks the best of many runs on the evaluation split', 'the gap at teacher size is 0.016 ID / 0.230 OOD in the sweep', 'S2.F2')

# 9. A* gap 0.65 -> 0.13 (Appendix C.1), and VGB students passing the teacher
a = T['fig9']['panels'][0]; v = T['fig9']['panels'][1]
chk('astar_gap', 'A* on Sokoban: teacher minus best student, ID, smallest and largest size', 'Appendix C.1: "from 0.65 to 0.13"',
    '%.2f at %.2fM, %.2f at %.2fM' % (a['teacher'][0] - a['id'][0], a['params_M'][0], a['teacher'][0] - a['id'][-1], a['params_M'][-1]), 'decoded bars and teacher line', 'reproduces (ID split)', 'A1.F9')
chk('vgb_pass', 'VGB on Sokoban: largest student against the teacher', 'Appendix C.1: "the largest students go past the teacher, both ID and OOD"',
    '%.3f vs %.3f ID, %.3f vs %.3f OOD at %.2fM' % (v['id'][-1], v['teacher'][0], v['ood'][-1], v['teacher'][1], v['params_M'][-1]), 'decoded', 'reproduces', 'A1.F9')
chk('scales', 'Which sizes were run', 'Section 3.1: 12 scales, 0.10M to 11.5M; Appendix C.1: 0.10M to 5.65M; Table 1: VGB on the 8 scales "tiny to m_plus"',
    'Figure 2b plots 8 VGB sizes up to 5.65M (skipping 0.98 and 1.77); Figure 9 plots A* at 5 sizes up to 1.77M; tiny to m_plus is 11 rows of Table 1; nothing at 11.5M is plotted',
    'x labels of the decoded figures', 'the text, Table 1 and the figures disagree', 'A1.T1')

# 10. parameter counts: 12 L d^2 plus c d
rows = T['table1']['rows']
xs = [r[1] for r in rows]; ys = [r[4] * 1e6 - 12 * r[2] * r[1] ** 2 for r in rows]
c = sum(x * y for x, y in zip(xs, ys)) / sum(x * x for x in xs)
res = [(12 * r[2] * r[1] ** 2 + c * r[1]) / (r[4] * 1e6) - 1 for r in rows]
chk('params', 'Table 1 parameter counts against a standard block (12 L d^2) plus c d for embeddings', 'Table 1',
    'c = %d fits all 12 rows within %.1f%% (worst: %s)' % (round(c), 100 * max(abs(x) for x in res), rows[max(range(12), key=lambda i: abs(res[i]))][0]),
    'least squares for c; configs are not released, so c is fitted (vocabulary plus positions, untied)', 'derived', 'A1.T1')

# 11. QED-Nano
q = T['fig13']['qed']
w = [h - l for l, h in zip(q['lo'], q['hi'])]
chk('qed', 'QED-Nano: harness gain over one call, 95% paired-bootstrap interval (300 problems, one run)', 'Only the 40-call shape excludes zero',
    '; '.join('%s %+.1f [%.1f, %.1f]' % (s, g, l, h) for s, g, l, h in zip(q['shapes'], q['gain'], q['lo'], q['hi'])) + '; intervals %.1f to %.1f points wide' % (min(w), max(w)),
    'printed gains, intervals decoded from the error bars', 'reproduces; the small shapes cannot rule out gains of 4 to 8 points', 'A1.F13')
f5b = T['fig5b']
chk('qed_shapes', 'Figure 5b against Table 3', 'Table 3: (1,4) 208k, (1,5) 253k, (1,6) 309k; context 262k',
    'Figure 5b: (1,3) %.1fk gain +0.1, (1,4) %.1fk, (1,5) %.1fk; window %.1fk (2^18 = 262,144 tokens); (1,3) is in no table and Figure 13c' % (f5b['trace_k'][0], f5b['trace_k'][1], f5b['trace_k'][2], f5b['window_k']),
    'decoded bars', 'reproduces for the shared shapes; one extra shape in Figure 5b', 'S5.F5')

# 12. the theorem's harness and Lemma 1, on numbers
N = 100; nbits = N * N; Tc = math.ceil(1 * math.log2(nbits + 1))
chk('lemma1', 'Lemma 1 on a concrete size: transcripts of a log-length chain of thought', '|Sigma|^(c log2(n+1)) = poly(n)',
    'N = %d vertices, n = %d input bits, c = 1, binary alphabet: T = %d tokens, %d transcripts (about n^1)' % (N, nbits, Tc, 2 ** Tc), 'the definition of T_c(n) with c = 1', 'derived', 'S4.SS2')
chk('bfs_calls', 'The lab\'s BFS harness never exceeds N^2 oracle calls', 'Theorem 1 (i): at most N^2 calls, O(N) bits of state',
    'max calls / N^2 over 600 graphs: %.3f; state 3N bits; reader by squaring equals the distance rule in %s cases' % (S['check']['max_calls_over_N2'], S['check']['reader_vs_distance_rule']),
    'src/sweep.cjs, the page\'s own engine', 'reproduces (in the toy)', 'S4.SS2')
loc = S['fam']['local']
chk('toy_depth', 'The toy: reader layers needed for every local-family graph to be answered right', 'the theorem: depth must grow (for any fixed depth, some inputs fail)',
    ', '.join('N=%d: k=%d' % (N_, next(k for k in S['Ks'] if loc['acc'][str(k)][i] == 1)) if any(loc['acc'][str(k)][i] == 1 for k in S['Ks']) else 'N=%d: more than %d' % (N_, S['Ks'][-1]) for i, N_ in enumerate(S['Ns'])),
    'the smallest k with accuracy 1 in inputs/sweep.json', 'illustration (one strategy, not a proof)', 'S4.F4')

out = {'_doc': 'Written by recompute.py; do not edit by hand.', 'checks': C, 'gaps': gaps}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
for x in C: print('%-14s %-40s %s' % (x['id'], x['status'][:40], x['page'][:150]))
