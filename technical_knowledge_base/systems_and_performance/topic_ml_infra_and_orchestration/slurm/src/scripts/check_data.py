"""Check that ../index.html embeds exactly sl_data.json, and that numbers written in the prose match the data.
usage: python3 scripts/check_data.py   (from src/)"""
import json, re, html as H
page = open('../index.html').read()
m = re.search(r'window\.SL=(\{.*?\});\n', page, re.S)
emb = json.loads(m.group(1)); ref = json.load(open('sl_data.json'))
assert emb == ref, 'embedded data differs from sl_data.json'
text = H.unescape(re.sub(r'<[^>]+>', ' ', page)); text = re.sub(r'\s+', ' ', text)
d = ref; b, i = d['busy'], d['idle']
ev = lambda r, k, last=False: [e['t'] for e in r['events'] if e['k'] == k][-1 if last else 0]
sub = lambda r: ev(r, 'submit')
checks = [
 ('busy pending 23 s', round(ev(b, 'alloc') - sub(b)) == 23 and 'PENDING (Resources, 23 s)' in page),
 ('12 backfill plans', b['nplan'] == 12 and '12 times' in text),
 ('alloc 22 ms after blocker end', round((ev(b, 'alloc') - [e['t'] for e in b['events'] if 'ends' in e['txt']][0]) * 1000) == 22 and '22 ms later' in text),
 ('idle start 444 ms', round((ev(i, 'alloc') - sub(i)) * 1000) == 444 and '444 ms' in text),
 ('gloss both runs', b['gloss'] == i['gloss'] == 2.2638769149780273 and '2.2638769149780273' in text),
 ('alloc to last epilog 9.7 / 9.4', round(ev(b, 'epilog', True) - ev(b, 'alloc'), 1) == 9.7 and round(ev(i, 'epilog', True) - ev(i, 'alloc'), 1) == 9.4 and '9.7 s and 9.4 s' in text),
 ('steps 12 s vs 6 s', max(r['e'] for r in d['steps']['plain']) - min(r['s'] for r in d['steps']['plain'] if r['name'].startswith('sl-par')) == 12),
 ('steps --exact cpu 1, plain cpu 2', {r['cpu'] for r in d['steps']['exact'] if r['name'].startswith('sl-par')} == {1} and {r['cpu'] for r in d['steps']['plain'] if r['name'].startswith('sl-par')} == {2}),
 ('job 95 9166 -> 4250', d['snaps'][0]['sprio']['95']['prio'] == 9166 and d['snaps'][1]['sprio']['95']['prio'] == 4250 and '9,166' in text and '4,250' in text),
 ('job 82 6920', d['snaps'][1]['sprio']['82']['prio'] == 6920 and '6,920' in text),
 ('job 90 truncation 8584', d['snaps'][1]['sprio']['90']['prio'] == 8584),
 ('22 rows', sum(len(s['sprio']) for s in d['snaps']) == 22 and 'all 22 rows' in text),
 ('218 reasons, 170 limits', len(d['reasons']) == 218 and sum('QOS_ASSOC' in r[3] for r in d['reasons']) == 170),
 ('recompute all match', all(o['diff'] == 0 for o in json.load(open('recompute.json')))),
 ('sig early 23 s / requeue 121 s', 'came 12 s after the start' in text and '05:44:53, 121 s after' in text and re.search(r'128 +sl-sig +COMPLETED 2026-10-16T05:42:52 2026-10-16T05:44:53', d['ex']['sig_sacct']) is not None),
 ('sdiag 39 / 65 cycles', 'Total cycles: 39' in d['ex']['sdiag_after'] and 'Total cycles: 65' in d['ex']['sdiag_after']),
 ('no em dash', '—' not in page),
]
bad = [c for c, ok in checks if not ok]
print(len(checks) - len(bad), 'of', len(checks), 'checks pass', bad)
assert not bad
