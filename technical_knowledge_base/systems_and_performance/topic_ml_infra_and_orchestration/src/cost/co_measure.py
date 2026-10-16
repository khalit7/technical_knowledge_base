"""Cost lab: every measured number on the tab, computed from recorded runs (no cluster is touched here).

Inputs (all in the repo):
  ../data/runs/slurm, ../data/runs/k8s, ../data/runs/ray : the setup's running example on each system
  runs/k8s/co-k200, co-k2000, co-k200b                   : this lab's three JobSets on kind (scripts/co_k8s.sh)
  ../sched/runs/slurm/w1_*.sacct, ../sched/out/sc_data.json : the Scheduling lab's queue runs
  ../fail/runs/fl-*                                       : the Failure lab's Slurm runs
  inputs/*                                                : published prices, read 2026-10-16
Output: out/co_data.json (embedded in ../parts/35_js_co_0data.js by make_data_js.py)
"""
import json, os, re, glob, datetime as dt

H = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(H, *a)


def utc(s):  # '2026-10-16T01:10:21' (Slurm, UTC in the containers) or RFC3339 with Z and fraction
    s = s.strip().rstrip('Z')
    if '.' in s:
        a, b = s.split('.'); s = a + '.' + b[:6]
        return dt.datetime.strptime(s, '%Y-%m-%dT%H:%M:%S.%f').replace(tzinfo=dt.timezone.utc).timestamp()
    return dt.datetime.strptime(s, '%Y-%m-%dT%H:%M:%S').replace(tzinfo=dt.timezone.utc).timestamp()


def rows(path):
    out = []
    for f in sorted(glob.glob(os.path.join(path, 'rank*.jsonl'))) or [os.path.join(path, 'all.jsonl')]:
        for l in open(f):
            l = l.strip()
            if l.startswith('{'):
                try: out.append(json.loads(l))
                except json.JSONDecodeError: pass
    return out


def phases(rs, a0, a1):
    """Split one allocation [a0, a1] (accounting times) into what rank 0's log says happened."""
    r0 = [r for r in rs if r.get('rank') == 0]
    start = [r for r in r0 if r['ev'] == 'start'][0]
    steps = [r for r in r0 if r['ev'] == 'step']
    end = [r for r in r0 if r['ev'] == 'end'][0]
    ck = sum(r.get('secs', 0) for r in r0 if r['ev'] == 'ckpt')
    proc0 = start['ts'] - start['t']           # when rank 0's process started
    first = steps[0]['ts']                     # end of step 1
    # time per step from the logged steps after step 1 (steps are logged every 10)
    s1, sN = steps[0], steps[-1]
    per = (sN['ts'] - s1['ts']) / (sN['step'] - s1['step'])
    train = end['ts'] - first + per            # step 1 counted as one ordinary step
    return dict(alloc_s=a1 - a0, before_proc=proc0 - a0, startup=start['ts'] - proc0,
                to_first=first - per - start['ts'], train=train - ck, ckpt=ck,
                after=a1 - end['ts'], per_step_ms=per * 1000, steps=end['step'], gloss=end['gloss'])


def r3(d):
    return {k: (round(v, 3) if isinstance(v, float) else v) for k, v in d.items()}


out = {'note': 'measured on Apple M1 Pro, Docker Desktop VM, shared machine; CPU only: the GPUs are fake (counted, never used)'}

# ---- 1. one allocation, where the seconds went ----
alloc = []
# Slurm (setup run): sacct Start/End have 1 s resolution
sa = open(P('../data/runs/slurm/sacct.txt')).read().splitlines()
h = sa[0].split('|'); j = dict(zip(h, sa[1].split('|')))
a0, a1 = utc(j['Start']), utc(j['End'])
m = re.search(r'gres/gpu=(\d+)', j['AllocTRES']); g = int(m.group(1))
ncpu = int(re.search(r'cpu=(\d+)', j['AllocTRES']).group(1))
mm, ss = j['TotalCPU'].split(':'); tcpu = int(mm) * 60 + float(ss)
d = phases(rows(P('../data/runs/slurm')), a0, a1)
d.update(system='Slurm', run='setup job 1', gpus=g, accounting='sacct Start to End (1 s resolution)',
         cpu_eff=tcpu / (ncpu * (a1 - a0)), total_cpu_s=tcpu, ncpu=ncpu)
alloc.append(r3(d))


def kueue(path, name):
    ev = open(os.path.join(path, 'events.txt')).read().splitlines()
    t = {}
    for l in ev:
        f = l.split()
        if len(f) < 5: continue
        ts = f[1] if f[1] != '<nil>' else f[0]
        for key in ('Admitted', 'FinishedWorkload', 'AllJobsCompleted'):
            if f[4] == key and f[2] in ('Workload', 'JobSet'):
                t[key] = utc(ts)
    return t


# kind (setup run: events at 1 s resolution)
ev = open(P('../data/runs/k8s/events.txt')).read().splitlines()
tA = [utc(l.split()[0]) for l in ev if ' Admitted ' in l][0]
tF = [utc(l.split()[0]) for l in ev if 'FinishedWorkload' in l][0]
d = phases(rows(P('../data/runs/k8s')), tA, tF)
d.update(system='Kubernetes', run='setup run', gpus=4, accounting='Kueue Workload Admitted to Finished (events, 1 s resolution)')
alloc.append(r3(d))
for n in ('co-k200', 'co-k200b', 'co-k2000'):
    t = kueue(P('runs/k8s', n), n)
    d = phases(rows(P('runs/k8s', n)), t['Admitted'], t['FinishedWorkload'])
    d.update(system='Kubernetes', run=n, gpus=4, accounting='Kueue Workload Admitted to Finished (event times, microseconds)')
    alloc.append(r3(d))
# Ray (setup run): the allocation was not recorded; the log view only
rr = rows(P('../data/runs/ray'))
r0 = [r for r in rr if r.get('rank') == 0]
st = [r for r in r0 if r['ev'] == 'start'][0]; en = [r for r in r0 if r['ev'] == 'end'][0]
drv = open(P('../data/runs/ray/driver.out')).read()
c0 = re.search(r'^(\S+ \S+),(\d+)\s+INFO worker.py:\d+ -- Connected', drv, re.M)
tc = dt.datetime.strptime(c0.group(1), '%Y-%m-%d %H:%M:%S').replace(tzinfo=dt.timezone.utc).timestamp() + int(c0.group(2)) / 1000
d = phases(rr, tc, en['ts'])
d.update(system='Ray', run='setup run', gpus=4, after=None,
         accounting='no allocation record kept: from the driver connecting to rank 0 ending (driver log, ms)')
alloc.append(r3(d))
out['alloc'] = alloc

# ---- 2. scheduling efficiency of a queue ----
def sacct_jobs(f):
    L = open(f).read().splitlines(); h = L[0].split('|')
    js = [dict(zip(h, l.split('|'))) for l in L[1:] if l.strip()]
    res = []
    for j in js:
        g = int(re.search(r'gres/gpu=(\d+)', j['AllocTRES']).group(1))
        res.append(dict(n=j['JobName'][-1], g=g, sub=utc(j['Submit']), st=utc(j['Start']), en=utc(j['End'])))
    return res


q = {}
for pol in ('fifo', 'backfill'):
    js = sacct_jobs(P('../sched/runs/slurm/w1_%s.sacct' % pol))
    t0 = min(j['sub'] for j in js); t1 = max(j['en'] for j in js)
    used = sum(j['g'] * (j['en'] - j['st']) for j in js)
    wait = sum(j['st'] - j['sub'] for j in js) / len(js)
    q[pol] = dict(makespan=t1 - t0, gpu_s=used, cap_gpus=8, util=used / (8 * (t1 - t0)), mean_wait=wait,
                  jobs=[dict(n=j['n'], g=j['g'], st=round(j['st'] - t0), en=round(j['en'] - t0)) for j in js])
sc = json.load(open(P('../sched/out/sc_data.json')))
k1 = sc['k1']['steps']
t_full = [s['t'] for s in k1 if 'worker2' in s['nodes'] and s['nodes']['worker2'] and s['nodes']['worker'] and s['nodes']['worker3']][0]
q['deadlock'] = dict(gpus_held=12, cap_gpus=12, from_s=t_full, to_s=k1[-1]['t'], useful_steps=0,
                     msg=sc['k1']['fail'])
k2 = sc['k2']['steps']
q['kueue'] = dict(quota=12, per_job=8, admits=[s['t'] for s in k2 if 'admits it' in s['cap']], end=k2[-1]['t'],
                  waits=sc['k2']['wait'])
rp = sc['ray']
q['ray_pg'] = [dict(name=p['name'], strategy=p['strategy'], n=p['n'], state=p['state'], nodes=p['nodes'], note=p['note']) for p in rp]
out['queue'] = q

# ---- 3. failures priced (the Failure lab's Slurm runs, 4 fake GPUs each) ----
def fl_sacct(f):
    L = [l for l in open(f).read().splitlines() if re.match(r'^\d+\s', l)]
    res = []
    for l in L:
        x = l.split()
        res.append(dict(id=x[0], state=x[1], st=utc(x[5]), en=utc(x[6]), sub=utc(x[4]), restarts=int(x[3])))
    return res


def fl(run):
    js = []
    for f in sorted(glob.glob(P('../fail/runs', run, 'sacct*.txt'))): js += fl_sacct(f)
    return js


def gpu_s(js): return sum(4 * (j['en'] - j['st']) for j in js)


fails = []
base = fl('fl-base')
rs = rows(P('../fail/runs/fl-base'))
per_base = [r for r in rs if r.get('rank') == 0 and r['ev'] == 'end'][0]['wall_s']
fails.append(dict(key='base', label='No failure', jobs=len(base), held_gpu_s=gpu_s(base), wall=base[-1]['en'] - base[0]['sub'],
                  states=[j['state'] for j in base], note='200 steps, checkpoint every 50'))
for key, run, label in [('crash', 'fl-crash', 'Rank 3 exits after step 120, checkpoints every 50'),
                        ('nockpt', 'fl-nockpt', 'Same crash, no checkpoints'),
                        ('node', 'fl-node', 'Node c2 stopped mid-run, Slurm requeues'),
                        ('hang', 'fl-hang', 'One rank stops answering (hang)')]:
    js = fl(run); rs = rows(P('../fail/runs', run))
    crash = [r for r in rs if r['ev'] == 'crash']
    res = [r for r in rs if r['ev'] == 'resume' and r.get('rank') == 0]
    done = [r for r in rs if r['ev'] == 'end' and r.get('rank') == 0]
    laststep = max([r['step'] for r in rs if r['ev'] == 'step' and r['ts'] < (js[0]['en'] + 0.5)] or [0])
    fails.append(dict(key=key, label=label, jobs=len(js), held_gpu_s=gpu_s(js), wall=js[-1]['en'] - js[0]['sub'],
                      states=[j['state'] for j in js], crash_step=crash[0]['step'] if crash else None,
                      resumed_from=res[0]['step'] if res else None, finished=bool(done),
                      last_step_first_job=laststep,
                      gaps=[round(js[i + 1]['st'] - js[i]['en']) for i in range(len(js) - 1)],
                      fault_to_end=(js[0]['en'] - float(open(P('../fail/runs', run, ft)).read().split()[-1]))
                      if (ft := {'hang': 'stop_time.txt', 'node': 'kill_time.txt'}.get(key)) else None))
for k in ('0', '50', '200'):
    js = fl('fl-strag' + k); rs = rows(P('../fail/runs/fl-strag' + k))
    r0 = [r for r in rs if r.get('rank') == 0 and r['ev'] == 'step']
    per = (r0[-1]['ts'] - r0[0]['ts']) / (r0[-1]['step'] - r0[0]['step'])
    fails.append(dict(key='strag' + k, label='One rank %s ms slower per step' % k, jobs=1, held_gpu_s=gpu_s(js),
                      wall=js[0]['en'] - js[0]['sub'], states=[js[0]['state']], per_step_ms=per * 1000,
                      steps=r0[-1]['step']))
for f, run in zip(fails, ['fl-base', 'fl-crash', 'fl-nockpt', 'fl-node', 'fl-hang', 'fl-strag0', 'fl-strag50', 'fl-strag200']):
    js = fl(run); s0 = js[0]['sub']
    f['segs'] = [[round(j['st'] - s0), round(j['en'] - s0), j['state']] for j in js]
out['fails'] = [r3(f) for f in fails]

# ---- 4. prices (published, read 2026-10-16) ----
az = json.load(open(P('inputs/azure_retail_ND96isr_H100_v5_eastus.json')))
azr = {}
for i in az['Items']:
    if 'Windows' in i['productName'] or i['type'] == 'DevTestConsumption': continue
    if i['type'] == 'Consumption' and 'Spot' in i['skuName']: azr['spot'] = i['unitPrice']
    elif i['type'] == 'Consumption' and 'Low Priority' in i['skuName']: azr['lowpri'] = i['unitPrice']
    elif i['type'] == 'Consumption': azr['od'] = i['unitPrice']
    elif i['type'] == 'Reservation': azr[i['reservationTerm']] = i['unitPrice']
hours = {'1 Year': 8760, '3 Years': 26280, '5 Years': 43800}
aws = json.load(open(P('inputs/aws_ec2_ondemand_us_east_1_gpu.json')))
awsp = {v['Instance Type']: float(v['price']) for v in aws['rows'].values()}
pr = []
def add(prov, gpu, kind, per_gpu, src, note, date='2026-10-16'):
    pr.append(dict(provider=prov, gpu=gpu, kind=kind, usd=round(per_gpu, 4), src=src, note=note, read=date))
AZ = 'https://prices.azure.com/api/retail/prices (ND96isr H100 v5, East US; the API behind azure.microsoft.com/pricing)'
add('Azure', 'H100', 'on-demand list', azr['od'] / 8, AZ, '$%.2f per hour for 8 GPUs' % azr['od'])
for term in ('1 Year', '3 Years'):
    add('Azure', 'H100', 'reserved ' + term.lower(), azr[term] / hours[term] / 8, AZ,
        '$%s for the term, paid whether used or not (term / %d h / 8 GPUs)' % (format(round(azr[term]), ','), hours[term]))
add('Azure', 'H100', 'spot', azr['spot'] / 8, AZ, '$%.2f per hour for 8 GPUs; can be evicted' % azr['spot'])
AW = 'AWS EC2 on-demand price data, publication 2026-10-15 (the data behind aws.amazon.com/ec2/pricing/on-demand)'
add('AWS', 'H100', 'on-demand list', awsp['p5.48xlarge'] / 8, AW, 'p5.48xlarge, $%.2f per hour for 8 GPUs' % awsp['p5.48xlarge'])
add('AWS', 'H100', 'reserved (Capacity Block)', 5.970, 'https://aws.amazon.com/ec2/capacityblocks/pricing/',
    'p5.48xlarge, $47.757 per instance-hour; prices "scheduled to be updated next in January, 2027"')
add('AWS', 'B200', 'on-demand list', awsp['p6-b200.48xlarge'] / 8, AW, 'p6-b200.48xlarge, $%.2f per hour for 8 GPUs' % awsp['p6-b200.48xlarge'])
add('AWS', 'B200', 'reserved (Capacity Block)', 14.208, 'https://aws.amazon.com/ec2/capacityblocks/pricing/',
    'p6-b200.48xlarge, $113.666 per instance-hour')
LM = 'https://lambda.ai/pricing'
add('Lambda', 'H100', 'on-demand list', 3.99, LM, '8x H100 SXM instance, per GPU-hour')
add('Lambda', 'H100', 'reserved (cluster, 2 weeks to 1 year)', 5.54, LM, '1-Click Cluster, 256 GPUs ($6.16 at 16, $5.85 at 64): InfiniBand cluster, not one node')
add('Lambda', 'B200', 'on-demand list', 6.69, LM, '8x B200 SXM6 instance, per GPU-hour')
add('Lambda', 'B200', 'reserved (cluster, 2 weeks to 1 year)', 8.87, LM, '1-Click Cluster, 256+ GPUs ($9.86 at 16, $9.36 at 64)')
out['prices'] = pr
out['azure_raw'] = {k: v for k, v in azr.items()}

os.makedirs(P('out'), exist_ok=True)
json.dump(out, open(P('out/co_data.json'), 'w'), indent=1)
print(json.dumps(out, indent=1)[:6000])
