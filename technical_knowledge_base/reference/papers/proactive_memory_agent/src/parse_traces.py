"""Parse the five released example trajectories of the Proactive Memory Agent repository into inputs/traces.json.

The examples are rendered HTML exports (Terminal-Bench 2.0 tasks; Claude Sonnet 4.5 as the action agent, alone and
with Claude Opus 4.6 as the memory agent). They are not kept here (three are over 1 MB). To fetch them:
  R=https://raw.githubusercontent.com/yifannnwu/proactive-memory-agent/main
  for t in adaptive-rejection-sampler git-multibranch hf-model-inference regex-log sqlite-with-gcov; do
    for f in baseline-sonnet/trajectory_agent.html memory-v3-opus/trajectory_agent.html memory-v3-opus/trajectory_memory.html memory-v3-opus/memory.html; do
      mkdir -p ex/$t/$(dirname $f); curl -sL $R/examples/$t/$f -o ex/$t/$f; done; done
usage: python3 parse_traces.py ex
"""
import html, json, re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ROOT = sys.argv[1]
TASKS = ['regex-log', 'sqlite-with-gcov', 'git-multibranch', 'adaptive-rejection-sampler', 'hf-model-inference']
num = lambda s: int(s.replace(',', '').split()[0])
def text(x): return html.unescape(re.sub(r'<[^>]+>', '', x)).strip()
def stats(s): return {k: v for k, v in re.findall(r'<span class="stat-label">([^<]*)</span>\s*<span class="stat-value"[^>]*>([^<]*)</span>', s)}
def blocks(s):
    idx = [m.start() for m in re.finditer(r'<div class="step"', s)] + [len(s)]
    return [s[idx[i]:idx[i + 1]] for i in range(len(idx) - 1)]
def clip(t, n): return t if len(t) <= n else t[:n].rstrip() + ' [...]'

def agent(path):
    s = open(path).read(); st = stats(s); turns = []
    first_user_chars = None
    for b in blocks(s):
        hd = re.search(r'STEP (\d+): (USER|AGENT)', b)
        if not hd: continue
        msg = re.search(r'<div class="message-box">(.*?)</div>', b, re.S)
        m = text(msg.group(1)) if msg else ''
        if hd.group(2) == 'USER':
            first_user_chars = len(m); continue
        pt = re.search(r'Prompt: ([\d,]+) tokens', b); ct = re.search(r'Completion: ([\d,]+) tokens', b)
        cmds = len(re.findall(r'class="tool-call"', b))
        obs = ' '.join(text(o) for o in re.findall(r'<div class="observation-content">(.*?)</div>', b, re.S))
        done = '"task_complete"' in b or 'mark_task_complete' in b
        # the analysis text, without the leading label
        a = re.sub(r'^Analysis:\s*', '', m)
        turns.append({'p': num(pt.group(1)) if pt else None, 'c': num(ct.group(1)) if ct else None, 'a': clip(re.sub(r'\s+', ' ', a), 260), 'n': cmds, 'o': len(obs)})
    ts = re.findall(r'<span class="timestamp">([^<]*)</span>', s)
    out = {'model': st.get('Model'), 'steps': num(st['Total Steps']), 'prompt': num(st['Prompt Tokens']), 'completion': num(st['Completion Tokens']),
           'turns': turns, 'first_user_chars': first_user_chars, 'date': ts[0][:10] if ts else None}
    if 'Max Context Length' in st: out['max_ctx'] = num(st['Max Context Length']); out['summarizations'] = num(st['Summarizations'])
    return out

def memory(path):
    s = open(path).read(); st = stats(s); trig = []
    for b in blocks(s):
        hd = re.search(r'Memory Trigger #(\d+) \(at Action Step (\d+)\)\s*<span class="badge[^"]*">([^<]*)</span>', b)
        if not hd: continue
        ops = [(text(a), text(c)) for a, c in re.findall(r'<div class="op-action">(.*?)</div>\s*<div class="op-content">(.*?)</div>', b, re.S)]
        ctx = re.search(r'<div class="context-box">(.*?)</div>', b, re.S)
        obs = re.search(r'<div class="observation-box">(.*?)</div>', b, re.S)
        snap = re.search(r'Knowledge: (\d+) \|\s*Procedural: (\d+)', b)
        trig.append({'s': int(hd.group(2)), 'inj': hd.group(3).strip() == 'INJECT',
                     'ops': [[a.split(' ')[0], clip(c, 420)] for a, c in ops],
                     'ctx': text(ctx.group(1)) if ctx else None,
                     'pc': len(text(obs.group(1))) if obs else 0,
                     'k': int(snap.group(1)) if snap else None, 'pr': int(snap.group(2)) if snap else None})
    return {'model': None, 'triggers': num(st['Total Triggers']), 'ops': num(st['Total Operations']), 'inject': num(st['Injections']),
            'noop': num(st['No-ops']), 'final_size': num(st['Final Memory Size']), 'interval': num(st['Trigger Interval']), 'trig': trig,
            'model_name': re.search(r'Model:</span>\s*<span[^>]*>([^<]*)<', s).group(1).strip() if re.search(r'Model:</span>\s*<span[^>]*>([^<]*)<', s) else None}

def bank(path):
    s = open(path).read()
    status = re.search(r'<div class="status-box">(.*?)</div>', s, re.S)
    ents = []
    for sec in ('Knowledge', 'Procedural'):
        i = s.find(sec + ' Memory')
        part = s[i:(s.find('Procedural Memory') if sec == 'Knowledge' else len(s))]
        for eid, body in re.findall(r'ID: ([A-Za-z0-9]+)</[^>]+>\s*<div[^>]*>(.*?)</div>', part, re.S):
            ents.append([sec[0], text(body)])
    return {'status': text(status.group(1)) if status else '', 'entries': ents}

out = {}
for t in TASKS:
    d = os.path.join(ROOT, t)
    out[t] = {'base': agent(os.path.join(d, 'baseline-sonnet/trajectory_agent.html')),
              'mem': agent(os.path.join(d, 'memory-v3-opus/trajectory_agent.html')),
              'ma': memory(os.path.join(d, 'memory-v3-opus/trajectory_memory.html')),
              'bank': bank(os.path.join(d, 'memory-v3-opus/memory.html'))}
json.dump({'_source': 'https://github.com/yifannnwu/proactive-memory-agent/tree/main/examples (parsed by parse_traces.py)', 'tasks': out},
          open('inputs/traces.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for t, v in out.items():
    print(t, 'base', v['base']['steps'], v['base']['prompt'], 'mem', v['mem']['steps'], v['mem']['prompt'], v['mem'].get('max_ctx'),
          'trig', v['ma']['triggers'], len(v['ma']['trig']), 'inj', v['ma']['inject'], sum(x['inj'] for x in v['ma']['trig']), 'bank', len(v['bank']['entries']),
          'turns', len(v['base']['turns']), len(v['mem']['turns']), 'dates', v['base']['date'], v['mem']['date'])
print('bytes', os.path.getsize('inputs/traces.json'))
