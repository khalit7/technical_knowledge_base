"""Recompute every derived number on the DSec page from the paper's printed numbers and from the
figures decoded by decode_figs.py (inputs/figs.json). Writes inputs/recompute.json; build.sh runs it.
Each check records the paper's figure, ours, and a verdict."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
F = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
R = {}; CHECKS = []


def chk(id, claim, where, paper, ours, verdict, note=''):
    CHECKS.append(dict(id=id, claim=claim, where=where, paper=paper, ours=ours, verdict=verdict, note=note))


def cross(curve, level):
    """first x where a monotone CDF curve reaches level (linear interpolation)"""
    for (x0, y0), (x1, y1) in zip(curve, curve[1:]):
        if y0 < level <= y1:
            return x0 if y1 == y0 else x0 + (x1 - x0) * (level - y0) / (y1 - y0)
    return None


def at(curve, x):
    for (x0, y0), (x1, y1) in zip(curve, curve[1:]):
        if x0 <= x <= x1:
            return y0 if x1 == x0 else y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return None


def integ(curve, a=-1e9, b=1e9):
    s = 0
    for (x0, y0), (x1, y1) in zip(curve, curve[1:]):
        lo, hi = max(x0, a), min(x1, b)
        if hi > lo and x1 > x0:
            ya = y0 + (y1 - y0) * (lo - x0) / (x1 - x0); yb = y0 + (y1 - y0) * (hi - x0) / (x1 - x0)
            s += (ya + yb) / 2 * (hi - lo)
    return s


def last_above(curve, thr):
    t = None
    for x, y in curve:
        if y > thr: t = x
    return t

# ---------------- Production scale (abstract, §2.4) ----------------
per_day, peak_rate, conc, nodes, cores, dram_tb = 3e6, 5000, 380e3, 160, 30e3, 250
mean_rate = per_day / 86400
R['scale'] = dict(mean_rate=mean_rate, peak_over_mean=peak_rate / mean_rate, per_node=conc / nodes, cores_per_node=cores / nodes,
                  per_core=conc / cores, gb_per_sandbox=dram_tb * 1000 / conc, burst32k_s=32768 / peak_rate,
                  creations_per_node_s=peak_rate / nodes)
chk('rate', 'about 3M sandboxes a day is a mean of 34.7 created per second', 'Abstract, §2.4', '3M/day, >5,000/s peak', '%.1f/s mean; peak is %.0f× the mean' % (mean_rate, peak_rate / mean_rate), 'derived')
chk('pernode', 'peak concurrency per node', '§2.4, §1, §4.3', '~380K over nearly 160 nodes; up to 3,200 containers or 800 microVMs per node', '{:,.0f} per node at peak; '.format(conc / nodes) + '%.1f per core; %.2f GB of DRAM each' % (conc / cores, dram_tb * 1000 / conc), 'derived',
    'consistent with the stated per-node maxima only if most of the peak is containers')

# Little's law with Figure 7's lifetimes
life = {}
for k in ('Container', 'microVM'):
    c = F['fig7']['series'][k]
    # mean of a distribution from its CDF: integral of (1 - F) over x, plus the left edge
    pts = sorted(c)
    x0 = pts[0][0]
    m = x0 + sum((x1 - xa) * (1 - (ya + y1) / 2) for (xa, ya), (x1, y1) in zip(pts, pts[1:]))
    life[k] = dict(p50=cross(c, .5), p90=cross(c, .9), p99=cross(c, .99), mean=m, maxx=pts[-1][0])
R['life'] = life
avg_conc = mean_rate * life['Container']['mean'] * 60
R['scale']['little_avg_conc'] = avg_conc
chk('p50life', 'median lifetimes 17.4 min (containers) and 15.5 min (microVMs)', '§4.3, Figure 7', '17.4 / 15.5 min', '%.1f / %.1f min from the decoded curves' % (life['Container']['p50'], life['microVM']['p50']), 'reproduces')
chk('p99life', 'p99 lifetimes exceed three hours', '§4.3, Figure 7', '231.5 / 213.9 min printed in the figure', 'about %.0f / %.0f min from the curves' % (life['Container']['p99'], life['microVM']['p99']), 'reproduces', 'the curve is nearly flat at 0.99 on a log axis, so a few minutes either way')
chk('little', "Little's law: average concurrency = creation rate × mean lifetime", 'Figure 7 with §2.4 (beyond the paper)', 'not computed in the paper',
    '%.1f/s × %.0f min = about %.0fK on average, against a peak of ~380K' % (mean_rate, life['Container']['mean'], avg_conc / 1000), 'derived',
    'assumes the one-week sample of 30K containers is representative of the 3M a day; it is only indicative')

# ---------------- Workload (§4) ----------------
T2 = dict(container=dict(base=11266, ws=102171, tb=82.8), microvm=dict(base=2, ws=53590, snap=4889, tb=50.9))
T3 = {'C++': (8.7, 4.9), 'Go': (13.3, 4.1), 'Java': (9.2, 12.1), 'JavaScript': (4.2, 9.6), 'Python': (6.0, 6.0)}
acc = {k: round(p / 100 * s, 3) for k, (p, s) in T3.items()}
R['t3'] = dict(accessed_gb=acc, total_accessed=sum(acc.values()), total_size=sum(s for p, s in T3.values()),
               weighted=sum(acc.values()) / sum(s for p, s in T3.values()))
chk('t2sum', 'artifacts active in one week occupy more than 130 TB', '§4.4, Table 2', '>130 TB', '82.8 + 50.9 = %.1f TB' % (82.8 + 50.9), 'reproduces')
chk('t3', 'runtime access covers 4.2% to 13.3% of image data', '§4.4, Table 3', '4.2% to 13.3%', 'range reproduces; size-weighted over the five images %.1f%% (%.2f of %.1f GB)' % (100 * R['t3']['weighted'], R['t3']['total_accessed'], R['t3']['total_size']), 'reproduces')
pc = {}
for k in ('Container', 'microVM'):
    c = F['fig2']['series'][k]
    pc[k] = dict(p50=cross(c, .5), p90=cross(c, .9), p99=cross(c, .99))
R['fig2'] = pc
chk('fig2', 'sandboxes per task: p50 2,528, p90 7,969, p99 16,388 (containers); 352, 1,835, 4,044 (microVMs)', 'Figure 2 labels', 'printed labels',
    'curves give %s / %s / %s and %s / %s / %s' % tuple('{:,.0f}'.format(v) for v in (pc['Container']['p50'], pc['Container']['p90'], pc['Container']['p99'], pc['microVM']['p50'], pc['microVM']['p90'], pc['microVM']['p99'])), 'reproduces', 'within the curve resolution')
fo = {k: dict(p50=cross(F['fig8']['series'][k], .5), p90=cross(F['fig8']['series'][k], .9)) for k in ('Container', 'microVM')}
R['fig8'] = fo
chk('fig8', 'image fanout: median 3 and p90 28 (containers); median 1, p90 3 (microVMs)', '§4.4, Figure 8', '3 / 28; 1 / 3', 'curves reach 50%% at %.1f and 90%% at %.1f; %.1f and %.1f' % (fo['Container']['p50'], fo['Container']['p90'], fo['microVM']['p50'], fo['microVM']['p90']), 'reproduces', 'step CDF of integers')
u = {}
for k in ('Container CPU avg', 'microVM CPU avg', 'Container mem avg', 'microVM mem avg', 'Container CPU peak', 'microVM CPU peak', 'Container mem peak', 'microVM mem peak'):
    c = F['fig5']['series'][k]
    u[k] = dict(le5=at(c, 5.0), p50=cross(c, .5), p90=cross(c, .9))
R['fig5'] = u
chk('fig5', 'about 90% of sandboxes use no more than 5% of requested CPU on average', '§4.3, Figure 5', '~90%', '%.0f%% of containers, %.0f%% of microVMs at 5%%' % (100 * u['Container CPU avg']['le5'], 100 * u['microVM CPU avg']['le5']), 'reproduces')
pk = {k: max(y for x, y in F['fig6']['series'][k]) for k in ('Container', 'microVM')}
R['fig6'] = pk
chk('fig6', 'one node peaks at 1,048 containers and 524 microVMs over a day', '§4.3, Figure 6', '1,048 / 524', '{:,.0f} / {:,.0f} from the curves'.format(pk['Container'], pk['microVM']), 'reproduces')
R['layers'] = dict(N=T2['container']['ws'], M=T2['container']['base'], K=103)
chk('meta', 'struct page metadata is 1/64 of the pmem device: 128 GB needs 2 GB of guest RAM', '§5.2', '1/64; 2 GB', '64 B / 4,096 B = 1/64; 128 / 64 = 2 GB', 'reproduces')

# ---------------- Evaluation (§8) ----------------
f10 = F['fig10']['series']
e = {}
for k, v in f10.items():
    run = v['running']
    e[k] = dict(peak=max(y for x, y in run), t_peak=[x for x, y in run if y == max(yy for xx, yy in run)][0],
                done=last_above(run, 0.0), total=max(y for x, y in v['total_gb']), iops_peak=max(y for x, y in v['iops']),
                area=integ(run))
R['fig10'] = e
cold, ero, cac = e['Docker (cold)'], e['EROFS'], e['Docker (cached)']
chk('f10time', 'on-demand finishes in ~35 min, eager pulling over 60 min: 1.71× slower', '§8.2, Figure 10', '~35 vs >60 min, 1.71×', 'last running container at %.1f, %.1f (cached) and %.1f min (cold): %.2f×' % (ero['done'], cac['done'], cold['done'], cold['done'] / ero['done']), 'partly', '1.71× is 60 / 35, the text\'s rounded readings; the decoded curves give a slightly smaller ratio, and cold pulling ends before the 60 min edge of the plot, not after it')
chk('f10writes', 'eager pulling writes over 1,600 GB per node; on-demand plateaus at ~700 GB, about 57% less; local ~600 GB', '§8.2, Figure 10', '1,600 / 700 / 600 GB; 57%', '{:,.0f} / {:,.0f} / {:,.0f} GB; '.format(cold['total'], ero['total'], cac['total']) + '%.1f%% less' % ( 100 * (1 - ero['total'] / cold['total'])), 'reproduces')
chk('f10iops', 'eager pulling reaches nearly twice the peak write IOPS of on-demand', '§8.2, Figure 10', 'nearly 2×', '{:,.0f} against {:,.0f}: '.format(cold['iops_peak'], ero['iops_peak']) + '%.2f×' % (cold['iops_peak'] / ero['iops_peak']), 'reproduces')
chk('f10peak', 'burst of 8,192 containers across 10 nodes', '§8.2, Figure 10', '8,192 / 10 = 819 per node', 'peak %.0f running per VM (EROFS), %.0f (cached)' % (ero['peak'], cac['peak']), 'note', 'the figure plots running containers per VM; a peak a little above 819 means the burst was not spread exactly evenly, or the plotted VM is one of the busier ones; the paper does not say which')
f11 = F['fig11']['series']
t = {}
for k, v in f11.items():
    w = v['write_mb_s']; c = v['cpu']
    t[k] = dict(done=last_above(c, 2.0), writes_tb=integ(w) * 60 / 1e6, write_peak=max(y for x, y in w), cpu_mean=integ(c, 4, last_above(c, 2.0)) / (last_above(c, 2.0) - 4),
                cpu_peak=max(y for x, y in c))
R['fig11'] = t
chk('f11time', 'tar extraction takes 79 min end to end, EROFS 45 min: 1.76×', '§8.3, Figure 11', '79 / 45 min, 1.76×', 'CPU falls below 2%% at %.1f and %.1f min: %.2f×' % (t['Tar']['done'], t['EROFS']['done'], t['Tar']['done'] / t['EROFS']['done']), 'partly', 'the figure ends a few minutes later than the text; the text may time task completion rather than the CPU trace')
chk('f11writes', 'tar generates about 5.5× the total disk writes and 3.4× the peak write throughput', '§8.3, Figure 11', '5.5× / 3.4×', '%.1f against %.1f TB (%.1f×); ' % (t['Tar']['writes_tb'], t['EROFS']['writes_tb'], t['Tar']['writes_tb'] / t['EROFS']['writes_tb']) + '{:,.0f} against {:,.0f} MB/s'.format(t['Tar']['write_peak'], t['EROFS']['write_peak']) + ' (%.1f×)' % (t['Tar']['write_peak'] / t['EROFS']['write_peak']), 'reproduces', 'totals integrate the plotted mean line; the shaded band is not explained')
f12 = F['fig12']['series']
m = {}
for k, v in f12.items():
    ml = [p for p in v['mem_line'] if p[0] >= 0]
    ce = v['cpu_line_early']
    m[k] = dict(mem_peak=max(y for x, y in ml), mem_int=integ(ml, 0, 46), cpu_peak1=max(y for x, y in ce if x < 1.5), cpu_peak2=max(y for x, y in ce if 2 <= x <= 5))
R['fig12'] = m
b = m['baseline']
chk('f12peak', 'virtio-pmem with DAX cuts peak host memory by 40.2%', '§8.4, Figure 12', '40.2%', '{:,.0f} against {:,.0f} GB: '.format(m['pmem']['mem_peak'], b['mem_peak']) + '%.1f%%' % ( 100 * (1 - m['pmem']['mem_peak'] / b['mem_peak'])), 'reproduces')
chk('f12fpr', 'DAMON + balloon FPR leaves the peak largely unchanged but cuts time-integrated memory by 21.2%', '§8.4, Figure 12', '21.2%; peak largely unchanged',
    'integral over 0 to 46 min %.1f%% lower; peak %.0f against %.0f GB (%.1f%% lower)' % (100 * (1 - m['fpr']['mem_int'] / b['mem_int']), m['fpr']['mem_peak'], b['mem_peak'], 100 * (1 - m['fpr']['mem_peak'] / b['mem_peak'])), 'reproduces', 'the window is ours; the paper does not state the interval it integrates over')
chk('f12comb', 'combining both gives the lowest memory', '§8.4, Figure 12', 'lowest overall', 'pmem+fpr integral %.1f%% below baseline, pmem alone %.1f%%' % (100 * (1 - m['pmem+fpr']['mem_int'] / b['mem_int']), 100 * (1 - m['pmem']['mem_int'] / b['mem_int'])), 'reproduces')
chk('f12cpu', 'virtio-pmem raises transient peak CPU from 26.5% to 41.4%', '§8.4, Figure 12', '26.5% → 41.4%', 'second burst (2 to 5 min): %.1f%% → %.1f%%; first burst (0 to 1.5 min): %.1f%% → %.1f%%' % (b['cpu_peak2'], m['pmem']['cpu_peak2'], b['cpu_peak1'], m['pmem']['cpu_peak1']), 'partly',
    'the text matches the second burst; in the first burst the baseline already reaches %.0f%%, so the rise there is smaller' % b['cpu_peak1'])
q = F['fig13']; S = q['series']; nl = q['no_load']
by = {k: {p['load']: p for p in v} for k, v in S.items()}
qq = dict(no_load=nl, base50=by['baseline'][50]['t'] / nl - 1, core50=by['idle + core'][50]['t'] / nl - 1,
          idle_gain={L: 1 - by['idle'][L]['t'] / by['baseline'][L]['t'] for L in (10, 20, 30, 40, 50)},
          overlap={L: (by['idle'][L]['bar'][0] <= by['baseline'][L]['bar'][1] and by['baseline'][L]['bar'][0] <= by['idle'][L]['bar'][1]) for L in (10, 20, 30, 40, 50)})
R['fig13'] = qq
chk('f13base', 'without QoS, per-step latency rises 45.2% at 50% background load', '§8.5, Figure 13', '45.2%', '%.4f s against %.4f s with no load: +%.1f%%' % (by['baseline'][50]['t'], nl, 100 * qq['base50']), 'reproduces')
chk('f13core', 'SCHED_IDLE plus core scheduling limits it to 17.3%', '§8.5, Figure 13', '17.3%', '+%.1f%%' % (100 * qq['core50']), 'reproduces')
chk('f13idle', 'SCHED_IDLE alone improves latency by at most 3.4%', '§8.5, Figure 13', 'at most 3.4%', 'gains %s; error bars overlap the baseline at %d of 5 loads' % (', '.join('%.1f%%' % (100 * qq['idle_gain'][L]) for L in (10, 20, 30, 40, 50)), sum(qq['overlap'].values())), 'reproduces', 'the bars are not defined in the paper (standard deviation? range? how many runs?)')
chk('intro17', 'eager pulling stretches completion 1.7× (intro) and 1.71× (§8.2)', '§1, §8.2', '1.7× / 1.71×', 'same measurement, rounded differently', 'consistent')
chk('authors', '131 authors; the old summary said "Wenfeng Liang with more than 99 co-authors"', 'Title page', '', '131 names, 16 marked as DSec project developers; first author Jialiang Huang (Tsinghua PhD student, intern), Wenfeng Liang last', 'correction')
R['checks'] = CHECKS
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, default=lambda o: round(o, 6))
for c in CHECKS: print('%-10s %-11s %s' % (c['id'], c['verdict'], c['ours']))
