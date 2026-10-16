"""Extract every job state reason of Slurm from src/common/job_state_reason.c (tag slurm-24-11-5-1).
usage: python3 extract_reasons.py <slurm source dir> <out json>"""
import json, re, sys
src = sys.argv[1] + '/src/common/job_state_reason.c'
lines = open(src).read().split('\n')
out, cur = [], None
for i, l in enumerate(lines, 1):
    m = re.match(r'\s*\[(\w+)\] = \{', l)
    if m: cur = {'enum': m.group(1), 'line': i, 'flags': []}; continue
    if cur is None: continue
    m = re.search(r'\.flags = (.*),', l)
    if m: cur['flags'] = [f.strip() for f in m.group(1).split('|')]
    m = re.search(r'\.str = "([^"]*)"', l)
    if m: cur['str'] = m.group(1)
    if re.match(r'\s*\},', l):
        if 'str' in cur: out.append(cur)
        cur = None
json.dump({'source': 'src/common/job_state_reason.c @ slurm-24-11-5-1', 'reasons': out}, open(sys.argv[2], 'w'), indent=0)
print(len(out), 'reasons;', sum(1 for r in out if 'JSR_QOS_ASSOC' in r['flags']), 'QOS/association limits')
