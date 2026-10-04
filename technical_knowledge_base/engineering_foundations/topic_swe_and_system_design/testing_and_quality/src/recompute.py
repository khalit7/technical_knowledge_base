"""Recompute every derived number the page shows, independently of its JavaScript, from inputs/.
Run: python3 recompute.py  -> prints JSON and writes recompute_out.json; check_page.mjs compares it with window.TQ.calc."""
import json, os, re, itertools
I = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs')
J = lambda f: json.load(open(os.path.join(I, f)))
seeds = [s for s in J('trace_seeds.json') if s['found']]
km = J('killmatrix.json')['mutants']; cov = J('coverage_per_test.json')
fn = lambda t: os.path.basename(t.split('::')[0])[:-3] + '.' + t.split('::')[1].split('[')[0]
kills = [{fn(t) for t in m['killed_by']} for m in km]
tests = sorted(cov['per_test'])
weak = [t for t in tests if t.startswith('test_weak')]; strong = [t for t in tests if t.startswith('test_strong')]
killed = lambda sel: [i for i, k in enumerate(kills) if k & set(sel)]
crash = lambda i: {v[:4] for v in km[i]['kinds'].values()} == {'Type'}
stm = cov['statements']; covered = lambda sel: {3, 6, 13, 18} | {l for t in sel for l in cov['per_test'][t]}
batches = [int(l.split()[0]) for l in open(os.path.join(I, 'random_batches.txt')).read().strip().splitlines()] + [J('flaky_seq.json')['fails']]
tm = J('timing.json')
minset = next(len(c) for r in range(1, len(tests) + 1) for c in itertools.combinations(tests, r) if len(killed(c)) == len(km))
out = {
 'hypSeedsFound': len(seeds), 'hypMaxTries': max(s['tries_before_fail'] + 1 for s in seeds),
 'hypMinimal': sum(1 for s in seeds if (s['final']['text'], s['final']['size'], s['final']['overlap']) == ('0', 2, 0)),
 'hypCalls': len(J('trace_6.json')['log']),
 'mutN': len(km), 'mutWeak': len(killed(weak)), 'mutStrong': len(killed(strong)),
 'mutWeakPct': f"{100 * len(killed(weak)) / len(km):.1f}", 'covWeak': f"{100 * len([l for l in stm if l in covered(weak)]) / len(stm):.0f}",
 'mutWeakCrash': sum(1 for i in killed(weak) if crash(i)),
 'mutSurvValue': sum(1 for i in range(len(km)) if i not in killed(weak) and not crash(i)),
 'flakyRuns': 2000 * len(batches), 'flakyFails': sum(batches), 'flakyPct': f"{100 * sum(batches) / (2000 * len(batches)):.1f}",
 'pgRatio': f"{tm['pg_conn']['median_ms'] / tm['sqlite_conn']['median_ms']:.0f}", 'pg500': f"{500 * tm['pg_conn']['median_ms'] / 1000:.1f}",
 'minSet': minset,
}
json.dump(out, open(os.path.join(os.path.dirname(I), 'recompute_out.json'), 'w'), indent=1)
print(json.dumps(out))
