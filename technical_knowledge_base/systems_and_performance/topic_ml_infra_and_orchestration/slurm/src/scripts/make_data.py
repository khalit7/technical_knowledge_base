"""Build parts/15_js_sl_data.js (window.SL) from the scrubbed runs in src/runs and the source extracts in src/inputs.
usage: python3 scripts/make_data.py   (from src/)"""
import json, re, os
from datetime import datetime
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
R = 'runs/'
def rd(p): return open(R + p).read()
def secs(hms):  # 'HH:MM:SS(.fff)' -> seconds of day
    h, m, s = hms.split(':'); return int(h) * 3600 + int(m) * 60 + float(s)
def clock(t): return '%02d:%02d:%06.3f' % (t // 3600, (t % 3600) // 60, t % 60)
def ctl_lines(path):
    out = []
    for l in rd(path).splitlines():
        m = re.match(r'\[2026-10-16T(\d\d:\d\d:\d\d\.\d+)\] (.*)', l)
        if m: out.append((secs(m.group(1)), m.group(2)))
    return out
def pe_lines(path):
    out = []
    for l in rd(path).splitlines():
        m = re.match(r'(\d\d:\d\d:\d\d\.\d+) (prolog|epilog) (c\d) job=(\d+)', l)
        if m: out.append((secs(m.group(1)), m.group(2), m.group(3), m.group(4)))
    return out

# ---------- 1. the job's life: busy (raw1, job 79 behind blocker 78) and idle (raw2, job 125) ----------
def life(run, job, blk, endfile):
    ev = []
    def add(t, lane, kind, text, raw=''): ev.append({'t': round(t, 3), 'lane': lane, 'k': kind, 'txt': text, 'raw': raw})
    ctl = ctl_lines(run + '/slurmctld_session.log')
    nplan = 0; plans = []; pstart = None
    for t, l in ctl:
        if blk and f'JobId={blk} ' in l + ' ' and 'submit' in l: add(t, 'ctld', 'blk', f'job {blk} (the blocker, 12 GPUs, limit 1 min) submitted', l)
        if blk and f'Started JobId={blk} ' in l: add(t, 'ctld', 'blk', f'backfill starts job {blk} on c[1-3]: every GPU is now busy', l)
        if blk and f'_job_complete: JobId={blk} WEXITSTATUS' in l: add(t, 'ctld', 'blk', f'job {blk} ends, 25 s into its 60 s limit', l)
        if f'_slurm_rpc_submit_batch_job: JobId={job} ' in l:
            p = re.search(r'InitPrio=(\d+)', l).group(1); add(t, 'ctld', 'submit', f'sbatch: job {job} accepted, initial priority {p}', l)
        if f'_dump_job_sched: BACKFILL: JobId={job} to start' in l:
            nplan += 1; plans.append(round(t, 3))
            if nplan == 1:
                st = re.search(r'to start at \S+T(\d\d:\d\d:\d\d)', l).group(1); pstart = secs(st)
                add(t, 'bf', 'plan', f'backfill plans job {job} on c[1-2] at {st}: the blocker\'s time limit, not its real end (re-planned every 2 s)', l)
        if f'Started JobId={job} ' in l: add(t, 'bf', 'alloc', f'backfill starts job {job} on c[1-2] (nothing is ahead of it)', l)
        if 'Running job scheduler for default depth' in l and blk and not any(e['k'] == 'mainrun' for e in ev) and any(e['k'] == 'blk' and 'ends' in e['txt'] for e in ev):
            add(t, 'ctld', 'mainrun', 'the job end is an event: the main scheduler runs at once', l)
        if f'sched: Allocate JobId={job} ' in l: add(t, 'ctld', 'alloc', f'main scheduler allocates c[1-2] (4 CPUs, 4 GPUs) to job {job}', l)
        if f'_job_complete: JobId={job} WEXITSTATUS' in l: add(t, 'ctld', 'done', f'controller records job {job} complete (exit 0); nodes go COMPLETING', l)
    for t, kind, node, j in pe_lines(run + '/pe.log'):
        if j == str(job): add(t, node, kind, f'{kind} runs as root on {node}', f'{clock(t)} {kind} {node} job={j}')
        elif blk and j == str(blk) and kind == 'epilog' and node == 'c1': add(t, 'c1', 'blk', f'epilog of job {blk} on c1, c2, c3', f'{clock(t)} epilog {node} job={j}')
    for node in ('c1', 'c2'):
        for l in rd(f'{run}/slurmd_{node}_session.log').splitlines():
            m = re.match(r'\[2026-10-16T(\S+)\] (.*)', l)
            if not m: continue
            t, x = secs(m.group(1)), m.group(2)
            if f'Launching batch job {job} ' in x: add(t, node, 'batch', f'slurmd starts the batch script on {node} (step {job}.batch)', x)
            if f'launch task StepId={job}.0 ' in x: add(t, node, 'step', f'srun\'s step {job}.0 starts torchrun on {node}', re.sub(r' PORT:\d+', '', x))
            if f'[{job}.0] done with step' in x: add(t, node, 'stepdone', f'step {job}.0 ends on {node}', x)
            if f'[{job}.batch] done with step' in x: add(t, node, 'batchdone', 'the batch script exits', x)
    ends = [json.loads(l) for l in rd(run + '/' + endfile).splitlines() if l.startswith('{') and '"end"' in l]
    ends = {e['rank']: e for e in ends}
    t0 = min(e['ts'] - e['wall_s'] for e in ends.values()); t1 = max(e['ts'] for e in ends.values())
    tod = lambda ts: (ts - 1792108800) % 86400   # 2026-10-16 00:00 UTC = 1792108800
    add(tod(t0), 'rank', 'train', '4 training processes start (2 per node), rendezvous, build the gloo process group', f'rank logs: t = 0 at {clock(tod(t0))}')
    add(tod(t1), 'rank', 'train', f'step 200 done: global loss {ends[0]["gloss"]!r}, checkpoint written', f'"ev": "end", "step": 200, "gloss": {ends[0]["gloss"]!r}')
    ev.sort(key=lambda e: e['t'])
    return {'job': job, 'blk': blk, 'events': ev, 'nplan': nplan, 'plans': plans, 'pstart': pstart, 'gloss': ends[0]['gloss'], 'wall': max(e['wall_s'] for e in ends.values())}
busy = life('raw1', 79, 78, 'life_end.jsonl')
idle = life('raw2', 125, None, 'life_idle_end.jsonl')
poll = []
for l in rd('raw1/life_poll.txt').splitlines():
    m = re.match(r'(\S+) (\w*)\|?([^|]*)\|?([^|]*)\|?(.*)', l)
    if m: poll.append([secs(m.group(1)), m.group(2) or 'GONE', m.group(3)])
busy['poll'] = poll

# ---------- 2. steps: the same four 1-task steps without and with --exact ----------
def sacct_steps(p):
    rows = []
    for l in rd(p).splitlines()[2:]:
        f = l.split()
        if len(f) < 9: continue
        jid, name = f[0], f[1]
        if '.' not in jid: continue
        o = 3 if f[2].isdigit() else 2
        ntasks = int(f[2]) if o == 3 else None
        start = f[o]; end = f[o + 1]; nodes = f[o + 3]; tres = f[o + 4]
        cpu = int(re.search(r'cpu=(\d+)', tres).group(1)); gpu = re.search(r'gres/gpu=(\d+)', tres)
        rows.append({'id': jid, 'name': name, 'n': ntasks, 's': secs(start[11:]), 'e': secs(end[11:]), 'nodes': nodes, 'cpu': cpu, 'gpu': int(gpu.group(1)) if gpu else 0})
    return rows
steps = {'exact': sacct_steps('raw2/sl_steps_sacct.txt'), 'plain': sacct_steps('raw3/sl_steps3_sacct.txt'), 'cdash': sacct_steps('raw3/sl_steps4_sacct.txt')}

# ---------- 3. the pending-reason gallery: two snapshots of squeue and sprio ----------
g = rd('raw1/gallery.txt')
snaps = []
for blk in g.split('## ')[1:]:
    head, _, body = blk.partition('\n')
    if head.endswith(' squeue') and not head.startswith('squeue'):
        snaps.append({'at': head.split()[0], 'q': [], 'sprio': {}, 'norm': {}, 'share': []})
        for l in body.splitlines()[1:]:
            m = re.match(r'\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S\S?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)', l)
            if m: snaps[-1]['q'].append({'id': m.group(1), 'name': m.group(2), 'user': m.group(3), 'part': m.group(4), 'qos': m.group(5), 'st': m.group(6), 'prio': int(m.group(7)), 'nodes': int(m.group(8)), 'cpus': int(m.group(9)), 'reason': m.group(11).strip().strip('()') if m.group(6) == 'PD' else m.group(11).strip()})
    elif head.endswith('sprio -l'):
        for l in body.splitlines()[1:]:
            f = l.split()
            if len(f) >= 15 and f[0].isdigit():
                snaps[-1]['sprio'][f[0]] = {'prio': int(f[4]), 'age': int(f[6]), 'fs': int(f[8]), 'js': int(f[9]), 'part': int(f[10]), 'qosn': f[11], 'qos': int(f[12]), 'nice': int(f[13]), 'tres': int(f[14].split('=')[1])}
    elif head.startswith('sprio -n -l'):
        for l in body.splitlines()[1:]:
            f = l.split()
            if len(f) >= 12 and f[0].isdigit():
                snaps[-1]['norm'][f[0]] = {'age': float(f[5]), 'fs': float(f[7]), 'js': float(f[8]), 'part': float(f[9]), 'qos': float(f[11]), 'tres': float(f[12].split('=')[1])}
    elif head.startswith('sshare -a -l'):
        for l in body.splitlines()[2:]:
            f = l.split()
            if not f: continue
            snaps[-1]['share'].append(l[:118].rstrip())
jobs = {}
for blk in rd('raw1/gallery_jobs.txt').split('## scontrol show job ')[1:]:
    jid = blk.split()[0]; d = {}
    for k in ('JobName', 'Priority', 'Nice', 'QOS', 'Reason', 'Dependency', 'TimeLimit', 'SubmitTime', 'EligibleTime', 'AccrueTime', 'Partition', 'NumNodes', 'NumCPUs', 'ReqTRES'):
        m = re.search(r'\b' + k + r'=(\S+)', blk)
        if m: d[k] = m.group(1)
    jobs[jid] = d
weights = {'age': 1000, 'fs': 10000, 'js': 1000, 'part': 1000, 'qos': 2000, 'gpu': 500, 'maxage': 600}
errors = [l for l in rd('raw1/gallery_submit_errors.txt').splitlines()]

# ---------- 4. arrays and dependencies ----------
def sacct_p(p):
    L = rd(p).splitlines(); h = L[0].split('|')
    return [dict(zip(h, l.split('|'))) for l in L[1:] if l]
deps = []
for r in sacct_p('raw1/deps.sacct'):
    deps.append({'id': r['JobID'], 'name': r['JobName'], 'sub': secs(r['Submit'][11:]), 'el': secs(r['Eligible'][11:]) if 'T' in r['Eligible'] else None,
                 's': secs(r['Start'][11:]) if 'T' in r['Start'] else None, 'e': secs(r['End'][11:]), 'st': r['State'], 'node': r['NodeList'], 'ex': r['ExitCode'], 'why': r['Reason']})
dpoll = []
for blk in rd('raw1/deps_poll.txt').split('## ')[1:]:
    head, _, body = blk.partition('\n'); row = {}
    for l in body.splitlines():
        f = l.split()
        if len(f) >= 4: row[f[0]] = [f[2], f[3]]
    dpoll.append([secs(head.strip()), row])

# ---------- 5. text exhibits shown verbatim ----------
def block(p, a=None, b=None):
    t = rd(p)
    if a: t = t[t.index(a):]
    if b and b in t: t = t[:t.index(b)]
    return t.rstrip()
ex = {
 'resv': block('raw1/resv.txt'), 'sig_out': block('raw2/sig.out'), 'sig_sacct': block('raw2/sig_sacct.txt'), 'sig_ctld': block('raw2/sig_ctld.txt'),
 'het_out': block('raw1/het.out'), 'het_sacct': block('raw1/het_sacct.txt'), 'munge': block('raw3/munge.txt'),
 'acct': '\n'.join(l for l in block('raw1/acct.txt', None, '$ sreport').splitlines()[1:] if re.match(r'\s*(JobID|---|79 |81 |92 |102_[05] |108 |116\+[01] |118 )', l)),
 'gal_q0': g.split('## ')[1].strip(), 'deps_poll1': rd('raw1/deps_poll.txt').split('## ')[1].strip(), 'life_poll1': rd('raw1/life_poll.txt').splitlines()[0],
 'fl_drain': open('../../src/fail/runs/fl-drain/drain.txt').read().strip(),
 'train_sbatch': open('../../src/data/slurm/train.sbatch').read().rstrip(),
 'sig_script': open('scripts/sl_sig.sbatch').read().rstrip(), 'het_script': open('scripts/sl_het.sbatch').read().rstrip(), 'sdiag_after': block('raw1/acct.txt', '$ sdiag (after)', 'Latency for'),
 'never': block('raw1/deps_never.txt'), 'array_out': block('raw1/deps_array_out.txt'),
 'steps_out': block('raw1/steps.out'), 'setup': block('raw1/setup.txt'),
}
reasons = json.load(open('inputs/reasons_24_11_5.json'))
quotes = json.load(open('inputs/source_quotes.json'))
SL = {'busy': busy, 'idle': idle, 'steps': steps, 'snaps': snaps, 'jobs': jobs, 'weights': weights, 'errors': errors,
      'deps': deps, 'dpoll': dpoll, 'ex': ex, 'reasons': [[r['str'], r['enum'], r['line'], [f.replace('JSR_', '') for f in r['flags']]] for r in reasons['reasons']],
      'quotes': quotes['quotes']}
js = '// generated by scripts/make_data.py from src/runs (scrubbed) and src/inputs; do not edit\nwindow.SL=' + json.dumps(SL, separators=(',', ':')) + ';\n'
open('parts/15_js_sl_data.js', 'w').write(js)
json.dump(SL, open('sl_data.json', 'w'), indent=0)
print('bytes', len(js), 'busy events', len(busy['events']), 'idle events', len(idle['events']), 'snaps', len(snaps), [len(s['q']) for s in snaps], 'deps', len(deps))
