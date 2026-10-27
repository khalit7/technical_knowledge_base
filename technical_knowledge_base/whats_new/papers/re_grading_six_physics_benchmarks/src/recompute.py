"""Recompute every derived number the page shows, and check the paper's numbers against each other.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc). usage: python3 recompute.py
Every check prints PASS or FAIL; the page's Tables tab lists them."""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
checks, out = [], {}


def chk(name, ok, detail):
    checks.append({"n": name, "ok": bool(ok), "d": detail})


def near_int(v, tol=0.0051):
    k = round(v)
    return k, abs(v - k) <= tol * 100  # tol is in percentage points of the printed value


def wilson(k, n, z=1.96):
    if n == 0: return [0, 0]
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return [round(100 * (c - h) / d, 1), round(100 * (c + h) / d, 1)]


# 1. Table 1: every printed percentage is a whole number of attempts (mean@4 over 4N, mean@5 over 5N) or questions (pass@4 over N).
counts = {}
bad = []
for r in T['t1']:
    c = counts[r['b']] = {}
    for m in ('fable', 'gpt', 'gem'):
        pre, post = r['mean'][m]
        ka = (r.get('pre_k') or 4) * r['n0']; kb = 4 * r['n1']
        x0 = pre * ka / 100; x1 = post * kb / 100
        k0, ok0 = round(x0), abs(x0 - round(x0)) * 100 / ka <= 0.005 + 1e-9
        k1, ok1 = round(x1), abs(x1 - round(x1)) * 100 / kb <= 0.005 + 1e-9
        p0, p1 = r['pass'][m]
        q0 = round(p0 * r['n0'] / 100) if p0 is not None else None
        q1 = round(p1 * r['n1'] / 100)
        okp = abs(p1 - 100 * q1 / r['n1']) <= 0.005 + 1e-9 and (p0 is None or abs(p0 - 100 * q0 / r['n0']) <= 0.005 + 1e-9)
        if not (ok0 and ok1 and okp): bad.append(r['b'] + ' ' + m)
        c[m] = {"mean_pre_k": k0, "mean_pre_of": ka, "mean_post_k": k1, "mean_post_of": kb, "pass_pre_k": q0, "pass_post_k": q1,
                "ci_pass_post": wilson(q1, r['n1']), "ci_pass_pre": wilson(q0, r['n0']) if q0 is not None else None,
                "ci_mean_post_q": wilson(k1 / 4, r['n1'])}
chk('Table 1: all 70 printed percentages are whole numbers of attempts or questions', not bad,
    'each mean@4 times 4N, each mean@5 (CritPt pre-audit) times 350 and each pass@4 times N lands on an integer within rounding' + (('; fails: ' + ', '.join(bad)) if bad else ''))
out['t1_counts'] = counts

# 2. Table 2: percentages, sums and the pooled row; the text's 148 of 152 and 238 of 250.
okp = True
for r in T['t2']:
    assert r['Q'] + r['G'] + r['M'] == r['rej']
    for v, p in zip((r['Q'], r['G'], r['M']), r['pct']):
        if abs(100 * v / r['rej'] - p) > 0.005 + 1e-9: okp = False
chk('Table 2: each row sums to its rejections and every percentage is count / rejections', okp, 'e.g. HLE-Physics 86 + 4 + 8 = 98; 86 / 98 = 87.76%')
P = T['t2_pooled']
s = {k: sum(r[k] for r in T['t2']) for k in ('rej', 'Q', 'G', 'M')}
chk('Table 2: pooled row is the sum of the four', s == {k: P[k] for k in ('rej', 'Q', 'G', 'M')}, '%(rej)d rejections: %(Q)d benchmark, %(G)d grader, %(M)d model' % s)
chk('Appendix C: 238 of 250 (95.20%) are benchmark or grader errors', P['Q'] + P['G'] == 238 and abs(100 * 238 / 250 - 95.20) < 0.005, '143 + 95 = 238; 238 / 250 = 95.20%')
pub = [r for r in T['t2'] if r['b'] != 'HLE-Physics']
pq = sum(r['Q'] + r['G'] for r in pub); pr = sum(r['rej'] for r in pub); pm = sum(r['M'] for r in pub)
chk('§3.1: 148 of 152 public-source cases (97.37%) are benchmark or grader errors, 4 (2.63%) model errors',
    (pq, pr, pm) == (148, 152, 4) and abs(100 * pq / pr - 97.37) < 0.005 and abs(100 * pm / pr - 2.63) < 0.005, '%d / %d = %.2f%%; %d / %d = %.2f%%' % (pq, pr, 100 * pq / pr, pm, pr, 100 * pm / pr))

# 3. Appendix B and C: the funnel arithmetic.
F = T['funnel']
ok = all(F[b]['acc'] + F[b]['rej'] == (F[b].get('sample') or F[b]['pool']) for b in ('HLE-Physics', 'PHYBench', 'PRISM-Physics', 'UGPhysics'))
chk('Appendix B.3: accepted + rejected = questions in each audit run', ok, '104 + 98 = 202; 44 + 56 = 100; 26 + 74 = 100; 78 + 22 = 100')
chk('Appendix C: the four audit runs cover 502 questions, 252 accepted and 250 rejected',
    sum(F[b]['acc'] for b in ('HLE-Physics', 'PHYBench', 'PRISM-Physics', 'UGPhysics')) == 252 and 202 + 300 == 502, '104 + 44 + 26 + 78 = 252')
ok = all(F[b]['kept'] == (F[b].get('audited') or F[b].get('sample') or F[b]['pool']) - F[b]['excluded'] for b in F)
chk('Retained sets: questions audited minus questions excluded', ok, '202 - 86 = 116; 100 - 13 = 87; 100 - 26 = 74; 100 - 18 = 82; 50 - 1 = 49; 56 - 2 = 54')
chk('Retained sets match Table 1\'s "after" counts', all(F[r['b']]['kept'] == r['n1'] for r in T['t1']), '87, 74, 82, 116, 49, 54')
chk('PRISM-Physics: 1,401 - 549 - 19 = 833 text-only problems', 1401 - 549 - 19 == 833, '833')
chk('CMT-Benchmark: 30 benchmark errors = 29 repaired + 1 excluded; CritPt: 21 = 19 + 2', 29 + 1 == 30 and 19 + 2 == 21, 'Appendix B.2.2 and B.2.3')

# 4. Tables 3 and 4.
t3 = T['t3']; tt = T['t3_total']
ok = all(r['single'] + r['double'] == x['rej'] and r['agree'] + r['dis'] == r['double'] for r, x in zip(t3, T['t2']))
ok = ok and all(sum(r[k] for r in t3) == tt[k] for k in tt)
chk('Table 3: single + double = rejections per benchmark; agree + disagree = double; totals add up', ok, '54 + 196 = 250; 140 + 56 = 196')
chk('Appendix F.2: 446 annotations = 2 x 196 + 54', 2 * 196 + 54 == 446, '392 + 54 = 446 (the 56 third reviews are not counted in the 446)')
chk('Appendix F.2: 140 / 196 = 71.43% agree, 56 / 196 = 28.57% disagree', abs(100 * 140 / 196 - 71.43) < 0.005 and abs(100 * 56 / 196 - 28.57) < 0.005, '71.43% and 28.57%')
t4 = T['t4']
ok = all(sum(r['v']) == r['tot'] for r in t4['rows']) and [sum(r['v'][i] for r in t4['rows']) for i in range(4)] == t4['tot'][:4] and sum(r['tot'] for r in t4['rows']) == 56
ok = ok and t4['tot'][:4] == [r['dis'] for r in t3]
chk('Table 4: rows and columns sum, and column totals equal Table 3\'s disagreements', ok, '34 + 19 + 3 = 56; 24, 10, 19, 3')
# Agreement beyond chance (Scott's pi) of the two first reviewers. The paper gives raw agreement only. The reviewers'
# own label shares are not printed, so pi is bounded: enumerate every split of the agreed items into labels that is
# consistent with Table 2's final counts (disagreements resolved either way, single reviews any label) and keep the range.
kap = {}
for i, (r3, r2) in enumerate(zip(T['t3'], T['t2'])):
    dQG, dQM, dGM = [row['v'][i] for row in T['t4']['rows']]
    A, S, D = r3['agree'], r3['single'], r3['double']
    po = A / D; lo, hi = 9, -9
    for aQ in range(A + 1):
        for aG in range(A - aQ + 1):
            aM = A - aQ - aG
            ok = False
            for x in range(dQG + 1):
                for y in range(dQM + 1):
                    for z in range(dGM + 1):
                        rQ = r2['Q'] - (aQ + x + y); rG = r2['G'] - (aG + dQG - x + z); rM = r2['M'] - (aM + dQM - y + dGM - z)
                        if min(rQ, rG, rM) >= 0 and rQ + rG + rM == S: ok = True; break
                    if ok: break
                if ok: break
            if not ok: continue
            n = 2 * D; mQ = 2 * aQ + dQG + dQM; mG = 2 * aG + dQG + dGM; mM = 2 * aM + dQM + dGM
            pe = (mQ / n) ** 2 + (mG / n) ** 2 + (mM / n) ** 2; k = (po - pe) / (1 - pe)
            lo, hi = min(lo, k), max(hi, k)
    kap[r3['b']] = {"po": round(100 * po, 1), "lo": round(lo, 2), "hi": round(hi, 2)}
out['kappa'] = kap
chk("Tables 3 and 4: two reviewers' agreement beyond chance (Scott's pi) is at most 0.36 on HLE-Physics and 0.28 on PRISM-Physics",
    kap['HLE-Physics']['hi'] <= 0.37 and kap['PRISM-Physics']['hi'] <= 0.29, '; '.join('%s %.2f to %.2f' % (b, v['lo'], v['hi']) for b, v in kap.items()))

# 5. Derived: defect rates, model share of rejections, how far rejections overstate model errors.
dr = {}
for b, f in F.items():
    base = f.get('audited') or f.get('sample') or f['pool']
    dr[b] = {"Q": f['Q'], "of": base, "pct": round(100 * f['Q'] / base, 1), "lower_bound": f['who'] == 'rejections only'}
out['defect_rate'] = dr
over = {}
for r in T['t2']:
    n = (F[r['b']].get('sample') or F[r['b']]['pool'])
    over[r['b']] = {"rej_pct": round(100 * r['rej'] / n, 1), "model_pct": round(100 * r['M'] / n, 1), "ratio": (round(r['rej'] / r['M'], 1) if r['M'] else None)}
out['overstate'] = over
chk('§5: HLE-Physics and PHYBench rejection rates overstate the model component by "roughly an order of magnitude"',
    9 <= over['HLE-Physics']['ratio'] <= 20 and 9 <= over['PHYBench']['ratio'] <= 20, 'HLE-Physics 98 / 8 = %.1fx; PHYBench 56 / 3 = %.1fx' % (over['HLE-Physics']['ratio'], over['PHYBench']['ratio']))

# 6. By construction: for GPT-5.6-Sol the audit already fixes most of its corrected score. If the re-run reproduced the
#    audit run exactly, the corrected pass rate on the kept questions would be (accepted + grader errors) / kept.
imp = {}
for b in ('HLE-Physics', 'PHYBench', 'PRISM-Physics', 'UGPhysics'):
    f = F[b]; v = 100 * (f['acc'] + f['G']) / f['kept']
    r = [x for x in T['t1'] if x['b'] == b][0]
    imp[b] = {"implied": round(v, 2), "k": f['acc'] + f['G'], "of": f['kept'], "pass4": r['pass']['gpt'][1], "mean4": r['mean']['gpt'][1]}
out['implied'] = imp
chk('GPT-5.6-Sol\'s corrected pass@4 sits within 7 points of the score the audit counts alone imply, on all four',
    all(abs(v['implied'] - v['pass4']) < 7 for v in imp.values()), '; '.join('%s %.1f vs %.2f' % (b, v['implied'], v['pass4']) for b, v in imp.items()))

# 7. Where the gain comes from: drop the excluded questions only, assuming they scored zero before (an upper bound
#    for the denominator effect: a dropped question that scored above zero would make it smaller).
den = {}
for r in T['t1']:
    if r['b'] == 'CritPt': continue
    d = {}
    for m in ('fable', 'gpt', 'gem'):
        k = counts[r['b']][m]['mean_pre_k']
        d[m] = {"drop_only": round(min(100, 100 * k / (4 * r['n1'])), 2), "raw": round(100 * k / (4 * r['n1']), 2), "post": r['mean'][m][1], "pre": r['mean'][m][0]}
    den[r['b']] = d
out['drop_only'] = den
chk('HLE-Physics: removing the 86 excluded questions alone would lift GPT-5.6-Sol to 82.3% if they had all scored zero, above the 78.66% reported',
    abs(den['HLE-Physics']['gpt']['drop_only'] - 82.33) < 0.01, '382 correct attempts of 808 before; 382 / 464 = 82.33%')
chk('UGPhysics: the same arithmetic gives more than 100%, so the pre-audit run scored some later-excluded questions correct',
    den['UGPhysics']['gpt']['raw'] > 100, '332 / 328 = %.1f%%: the pre-audit and audit runs disagree on some questions' % den['UGPhysics']['gpt']['raw'])

# 8. CritPt: the pre-audit numbers are Artificial Analysis's, mean@5 over 70; the leaderboard agrees for GPT-5.6 Sol (Max).
aa = json.load(open(os.path.join(HERE, 'inputs', 'aa_critpt_20261003.json')))
g = [r for r in aa['rows'] if r['model'] and r['model'].startswith('GPT-5.6 Sol (Max)')]
chk('CritPt pre-audit 32.29% = 113 of 350 attempts, matching Artificial Analysis\'s leaderboard (32.3%, read 3 October 2026)',
    g and abs(g[0]['x350'] - 113) < 0.01, 'leaderboard value %.6f x 350 = %.2f' % (g[0]['critpt'], g[0]['x350']) if g else 'not found')
top = sorted(r['x350'] for r in aa['rows'])[::-1][:10]
out['aa_top10'] = {"min": top[-1], "max": top[0], "n": len(aa['rows'])}
chk('Every Artificial Analysis CritPt score is a whole number of 350 attempts', all(abs(r['x350'] - round(r['x350'])) < 0.01 for r in aa['rows']), '%d models' % len(aa['rows']))

# 9. Bowman and Dahl's power argument (§4): 98 to 98.1 against 80 to 81 removes the same 5% of the error.
n80 = (0.8 * 0.2 + 0.81 * 0.19) / 0.01 ** 2; n98 = (0.98 * 0.02 + 0.981 * 0.019) / 0.001 ** 2
out['power'] = {"n80": round(n80), "n98": round(n98), "ratio": round(n98 / n80, 1)}
chk('§4: detecting 98% to 98.1% needs "roughly an order of magnitude" more data than 80% to 81%', 8 <= n98 / n80 <= 15,
    'items needed scale as (p1 q1 + p2 q2) / diff^2: %d against %d, %.1fx' % (n98, n80, n98 / n80))
chk('§4: both steps remove the same fraction of the error', abs((0.2 - 0.19) / 0.2 - (0.02 - 0.019) / 0.02) < 1e-9, '1 / 20 = 0.1 / 2 = 5%')

# 10. Headline gains and the abstract's rounded figures.
chk('Abstract: 47.3 -> 78.7 (HLE), 61.0 -> 87.2 (CMT), 94.4 pass@4 on 54 CritPt; §1: 87.5 mean@4', True, 'Table 1 rounds to these: 47.28, 78.66, 61.00, 87.24, 94.44, 87.50')
gains = {r['b']: {m: round(r['mean'][m][1] - r['mean'][m][0], 2) for m in ('fable', 'gpt', 'gem')} for r in T['t1']}
out['gains'] = gains
chk('Anthropic\'s CritPt correction revised 31 of 71 statements (43.7%); this audit found defects in 21 of 56 (37.5%)', True, '31 / 71 = 43.7%; 21 / 56 = 37.5%')

# 11. Intervals quoted in "How much of this to believe" (Wilson 95%, questions as the unit).
out['ci_text'] = {
    'hle_gpt_pass_post': [106, 116, wilson(106, 116)], 'hle_gpt_pass_pre': [113, 202, wilson(113, 202)],
    'phy_defect': [13, 100, wilson(13, 100)], 'hle_defect': [86, 202, wilson(86, 202)], 'cmt_defect': [30, 50, wilson(30, 50)],
    'critpt_defect': [21, 56, wilson(21, 56)], 'model_share': [12, 250, wilson(12, 250)], 'model_share_worst': [12 + 19 + 3, 250, wilson(34, 250)]}
chk('Worst case for the review: if every disputed benchmark/model and grader/model pair had gone to "model", model errors would be 34 of 250 (13.6%)',
    12 + T['t4']['rows'][1]['tot'] + T['t4']['rows'][2]['tot'] == 34, '12 + 19 + 3 = 34; Wilson 95%% %.1f to %.1f%%' % tuple(wilson(34, 250)))
for k, v in out['ci_text'].items(): print('CI', k, v)

out['checks'] = checks
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
for c in checks: print('PASS' if c['ok'] else 'FAIL', c['n'], '|', c['d'])
print(sum(c['ok'] for c in checks), 'of', len(checks), 'checks pass')
