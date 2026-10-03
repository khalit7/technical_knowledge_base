"""Fetch the Terminal-Bench 2.1 leaderboard submission PRs the paper relies on (GitHub API, no token needed)
and keep only the numbers: raw accuracy, standard error, tokens, cost, trial errors, and the accuracy after the
maintainers applied disqualifications. For PR #142 (the StateM submission) also keep the judge's flags and the
review thread's dates and authors.  usage: python3 fetch_leaderboard.py   (writes inputs/tb21_leaderboard.json)"""
import json, os, re, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.github.com/repos/harbor-framework/terminal-bench-2-1/'
get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'kb-page'})))
PRS = {142: 'StateM submission (GPT-5.6 Sol xhigh + statem-Codex)', 45: 'GPT-5.5 xhigh + Codex (the paper\'s 83.1% reference)',
       102: 'GPT-5.6 Sol max + Codex (the paper\'s $574.68 submission)', 112: 'GPT-5.6 Luna max + Codex', 105: 'GPT-5.6 Luna max + Codex (earlier run)',
       115: 'GPT-5.6 Terra max + Codex', 106: 'GPT-5.6 Terra max + Codex (earlier run)', 47: 'GPT-5.5 xhigh + Terminus 2'}
row = re.compile(r'^\| ([^|]+) \| (\w+) \| ([^|]+) \| (\d{4}-\d\d-\d\d) \| ([\d.]+)% \| ([\d.]+)% \| ([\d,]+) \| \$([\d,.]+) \|', re.M)
out = {}
for n, note in PRS.items():
    p = get(API + 'pulls/%d' % n); cs = get(API + 'issues/%d/comments?per_page=100' % n)
    texts = [p['body'] or ''] + [c['body'] for c in cs]
    allrows = [m for t in texts for m in row.finditer(t)]
    first = allrows[-1]  # the latest summary (a submission can be re-uploaded during review)
    e = {'note': note, 'title': p['title'], 'state': p['state'], 'merged': bool(p['merged_at']), 'created': p['created_at'][:10],
         'closed': (p['closed_at'] or '')[:10], 'model': first.group(1).strip(), 'effort': first.group(2), 'agent': first.group(3).strip(),
         'raw_acc': float(first.group(5)), 'raw_se': float(first.group(6)), 'tokens': int(first.group(7).replace(',', '')), 'cost': float(first.group(8).replace(',', '')),
         'errors': {k: int(v) for t in texts[:2] for k, v in re.findall(r'^\| (\w+Error) \| (\d+) \|', t, re.M)}}
    for t in texts:
        m = re.search(r'Applied Disqualifications\*\* on (\d+) trial\(s\)\s+Accuracy ([\d.]+)% \(± ([\d.]+)%\) → ([\d.]+)% \(± ([\d.]+)%\)', t)
        if m: e.update(dq_trials=int(m.group(1)), raw_acc=float(m.group(2)), raw_se=float(m.group(3)), adj_acc=float(m.group(4)), adj_se=float(m.group(5)))
    if n == 142:
        bot = next(t for t in texts if 'Harness cheating' in t)
        part = lambda a, b: bot.split(a, 1)[1].split(b, 1)[0]
        sec = lambda a, b: re.findall(r'tasks/terminal-bench/([\w.-]+)\)', part(a, b))
        e['flags'] = {'harness_cheating': sec('Harness cheating', 'Reward hacking'), 'reward_hacking': sec('Reward hacking', 'Refusals')}
        e['judged'] = re.search(r'(\d+) trajectories judged, (\d+) flagged', bot).groups()
        e['thread'] = [[c['created_at'][:10], c['user']['login'], len(c['body'])] for c in cs]
    out[str(n)] = e
open(os.path.join(HERE, 'inputs', 'tb21_leaderboard.json'), 'w').write(json.dumps(out, indent=1))
print({k: (v['raw_acc'], v.get('adj_acc'), v['cost'], v['state'], v['merged']) for k, v in out.items()})
print(out['142']['flags'], out['142']['judged'])
