"""Stage 1 of Terminal-Universe (deterministic replay, paper section 3.1 and Appendix B.1), re-implemented for
Terminus-2 keystroke trajectories such as LFM2-Terminal-SFT-Processed (the paper's largest source, Table 12).

The paper's replay framework is not released. This is our own reading of its stated rule:
  - process reads, writes and edits in chronological order;
  - the initial workspace E0 keeps every PRE-EXISTING file at its EARLIEST observed content;
  - files the agent created, and all later changes, are left out (kept aside as the agent's changes);
  - contents may be partial (head/tail, truncated screens).
Keystroke traces have no Read/Write/Edit tools, so we map shell commands onto them:
  read  = `cat F` (full), `head`/`tail` (partial), output taken from the terminal screen after the echoed prompt;
  write = heredoc `cat > F << EOF` / `tee F`, or a redirect `> F` / `>> F` (content known only for heredocs);
  edit  = `sed -i ... F`, `mv`, `cp` onto F (content unknown).
A read counts as pre-existing when it happens before the agent's first state-changing command, or when the
path was listed by `ls`/`find` before that point and the agent has not written it since. Anything else first
seen later may be the agent's own output, so it is held back, matching the paper's "workspace starts unsolved".

usage: python3 replay.py <sample dir>      writes inputs/replay_stats.json and parts/21_traces.js
"""
import glob, json, os, re, statistics, sys

PROMPT = re.compile(r'^root@[^:\s]+:([^#\n]*)# ?(.*)$')
MID = re.compile(r'root@[\w.-]+:[^#\n\s]*# ?')
READONLY = re.compile(r'^(ls|cat|head|tail|wc|grep|egrep|find|pwd|cd|echo|printf|which|type|file|stat|du|df|ps|env|whoami|id|uname|python3? --version|python3? -V|pip3? (list|show|freeze)|tree|less|more|od|xxd|hexdump|sort|uniq|cut|awk|diff|cmp|md5sum|sha256sum|date|clear|history|true|jq|column|nl|realpath|dirname|basename|test|\[)\b')


def norm(p, cwd):
    p = p.strip().strip('"\'')
    if not p or p.startswith('-'):
        return None
    if not p.startswith('/'):
        p = os.path.normpath(os.path.join(cwd, p))
    return os.path.normpath(p)


def parse_cmds(content):
    """The assistant turn's JSON commands (Terminus-2 format)."""
    t = re.sub(r'<think>.*?</think>', '', content, flags=re.S)
    try:
        j = json.loads(t[t.index('{'):t.rindex('}') + 1])
        return [c.get('keystrokes', '') for c in j.get('commands', []) if isinstance(c, dict)]
    except Exception:
        return []


def screen_blocks(text):
    """Split a terminal screen into (cwd, command line, output lines)."""
    out, cur = [], None
    lines = []
    for line in text.split('\n'):
        # a file without a final newline leaves the next prompt glued to its last line: split it off
        g = MID.search(line)
        if g and g.start() > 0:
            lines += [line[:g.start()], line[g.start():]]
        else:
            lines.append(line)
    for line in lines:
        m = PROMPT.match(line)
        if m:
            cur = [m.group(1).strip() or '/app', m.group(2), []]
            out.append(cur)
        elif cur is not None:
            cur[2].append(line)
    return out


def is_mutating(cmd):
    c = cmd.strip()
    if not c:
        return False
    if re.search(r'(^|[^0-9&])>{1,2}\s*[^&\s]', c) and not re.search(r'>\s*/dev/null', c):
        return True
    if '<<' in c or re.search(r'\btee\b|\bsed\s+-i|\bmv\b|\bcp\b|\brm\b|\bmkdir\b|\btouch\b|\bchmod\b|\bpip3? install|\bapt|\bgit\b', c):
        return True
    for part in re.split(r'&&|\|\||;|\|', c):
        p = part.strip()
        if p and not READONLY.match(p):
            return True
    return False


READ = re.compile(r'^(cat|head|tail)((?:\s+-[-\w=]+(?:\s+\d+)?)*)\s+([^\s|;&<>]+)\s*(\|\s*(head|tail)\b.*)?$')
HEREDOC = re.compile(r'^\s*cat\s*>{1,2}\s*([^\s<]+)\s*<<-?\s*[\'"]?(\w+)[\'"]?\s*\n(.*?)\n\2\s*$', re.S)
REDIR = re.compile(r'>{1,2}\s*([^\s&|;>]+)')


def condense(row):
    """The trajectory as the replay sees it: the task, and per agent turn the heredoc bodies it typed and the
    terminal blocks (cwd, echoed command, output lines) that came back. The page ships this form."""
    conv = row['conversations']
    first = conv[0]['content']
    i = first.find('Task Description:')
    task = first[i + 17:first.find('Current terminal state')].strip() if i >= 0 else ''
    turns = []
    for turn in range(1, len(conv) - 1, 2):
        if conv[turn]['role'] != 'assistant':
            continue
        docs = {}
        for k in parse_cmds(conv[turn]['content']):
            m = HEREDOC.match(k)
            if m:
                docs[m.group(1)] = m.group(3)
        screen = conv[turn + 1]['content'] if turn + 1 < len(conv) else ''
        blocks = [[cwd, cmd, out, 0] for cwd, cmd, out in screen_blocks(screen) if cmd.strip()]
        turns.append({'docs': docs, 'blocks': blocks})
    return {'task': task, 'turns': turns}


def replay(row):
    return replay_condensed(condense(row))


def replay_condensed(C):
    """E0 = pre-existing files at their earliest observed version; final = every file at its last observed
    version (what the trajectory ended with, solution included), shown on the page for contrast."""
    task = C['task']
    E0, listed, written, created, held, events, final = {}, set(), set(), {}, set(), [], {}
    mutated = False
    for ti, T in enumerate(C['turns']):
        docs = T['docs']
        for cwd, cmd, out, cut in T['blocks']:
            cwd = '/root' if cwd == '~' else cwd
            c = cmd.strip()
            ev = {'t': ti + 1, 'cmd': c[:160]}
            m = READ.match(c)
            if m and not mutated or (m and not REDIR.search(c)):
                p = norm(m.group(3), cwd)
                body = [x for x in out]
                while body and not body[-1].strip():
                    body.pop()
                nb = len(body) + cut
                if p and not any('No such file' in x or 'Is a directory' in x for x in body[:2]):
                    full = m.group(1) == 'cat' and not m.group(4) and not m.group(2).strip()
                    pre = (not mutated) or (p in listed and p not in written)
                    if pre and p not in written:
                        old = E0.get(p)
                        if old is None or (full and not old['full']):
                            E0[p] = {'lines': body, 'cut': cut, 'full': full, 't': ev['t']}
                        ev.update(kind='read-pre' if full else 'read-part', path=p, n=nb)
                    else:
                        held.add(p)
                        ev.update(kind='read-held', path=p, n=nb)
                    if full or p not in final:
                        final[p] = {'lines': body, 'cut': cut, 'full': full, 't': ev['t']}
                    events.append(ev)
                    continue
            if re.match(r'^(ls|find)\b', c) and not is_mutating(c):
                base = cwd
                a = [x for x in c.split()[1:] if not x.startswith('-')]
                if c.startswith('ls') and a:
                    base = norm(a[0], cwd) or cwd
                got = []
                for x in out:
                    x = x.rstrip()
                    if c.startswith('ls') and x.startswith('-') and len(x.split()) >= 9:
                        got.append(norm(x.split(None, 8)[8], base))
                    elif c.startswith('find') and x.startswith('/') and '.' in os.path.basename(x):
                        got.append(os.path.normpath(x))
                got = [g for g in got if g]
                if not mutated:
                    listed.update(got)
                ev.update(kind='list', n=len(got))
                events.append(ev)
                continue
            if is_mutating(c):
                mutated = True
                tgt = None
                if '<<' in c:
                    mm = re.match(r'^\s*cat\s*>{1,2}\s*([^\s<]+)', c)
                    tgt = mm.group(1) if mm else None
                    p = norm(tgt, cwd) if tgt else None
                    if p:
                        body = docs.get(tgt, '')
                        written.add(p)
                        kind = 'write-mod' if p in E0 else 'write-new'
                        if kind == 'write-new':
                            created[p] = body.split('\n') if body else []
                        final[p] = {'lines': body.split('\n') if body else [], 'cut': 0, 'full': True, 't': ev['t']}
                        ev.update(kind=kind, path=p, n=len(body.split('\n')) if body else 0)
                        events.append(ev)
                        continue
                mm = re.search(r'\bsed\s+-i\S*\s+(?:\'[^\']*\'|"[^"]*"|\S+)\s+(\S+)', c)
                if mm:
                    p = norm(mm.group(1), cwd)
                    if p:
                        written.add(p)
                        ev.update(kind='edit', path=p)
                        events.append(ev)
                        continue
                mm = REDIR.search(c)
                if mm and not mm.group(1).startswith('/dev/'):
                    p = norm(mm.group(1), cwd)
                    if p:
                        written.add(p)
                        if p not in E0:
                            created.setdefault(p, None)
                        ev.update(kind='write-mod' if p in E0 else 'write-new', path=p)
                        events.append(ev)
                        continue
                ev.update(kind='run')
                events.append(ev)
                continue
            ev.update(kind='look')
            events.append(ev)
    known_only = sorted(p for p in listed if p not in E0 and not p.endswith('.gitkeep'))
    e0_lines = sum(len(v['lines']) + v['cut'] for v in E0.values())
    end_files = set(E0) | set(created) | set(known_only)
    end_lines = e0_lines + sum(len(v) for v in created.values() if v)
    return dict(task=task, E0=E0, final=final, known_only=known_only, created=created, held=sorted(held), events=events,
                e0_files=len(E0), e0_lines=e0_lines, end_files=len(end_files), end_lines=end_lines,
                turns=len(C["turns"]), seed=len(end_files) >= 5 and end_lines >= 100)


def shrink(C, max_out=30, max_w=140, max_doc=70):
    """Cut long outputs for the page; the number of lines cut is kept so line counts stay exact."""
    D = {'task': C['task'][:1800] + (' [...]' if len(C['task']) > 1800 else ''), 'turns': []}
    for T in C['turns']:
        docs = {}
        for k, v in T['docs'].items():
            L = v.split('\n')
            docs[k] = '\n'.join(x[:max_w] for x in L[:max_doc]) + ('\n# [... %d more lines]' % (len(L) - max_doc) if len(L) > max_doc else '')
        bl = []
        for cwd, cmd, out, cut in T['blocks']:
            o = [x[:max_w] for x in out]
            if '<<' in cmd:
                o = []
            n = max(0, len(o) - max_out)
            bl.append([cwd, cmd[:300], o[:max_out], cut + n])
        D['turns'].append({'docs': docs, 'blocks': bl})
    return D


if __name__ == '__main__':
    import collections
    rows = []
    for f in sorted(glob.glob(os.path.join(sys.argv[1], 'p*.json'))):
        for r in json.load(open(f))['rows']:
            r['row']['_offset'] = r['row_idx']
            rows.append(r['row'])
    CC = [condense(r) for r in rows]
    R = [replay_condensed(c) for c in CC]
    # for check_replay.mjs <sample dir>: the JS port must agree on every sampled trace, not only the shipped ones
    json.dump(CC, open(os.path.join(sys.argv[1], 'allC.json'), 'w'))
    json.dump([{k: x[k] for k in ('events', 'known_only', 'held', 'e0_files', 'e0_lines', 'end_files', 'end_lines', 'seed')} for x in R], open(os.path.join(sys.argv[1], 'allR.json'), 'w'))
    S = [x for x in R if x['seed']]

    def summ(v):
        return {'median': statistics.median(v), 'mean': round(statistics.mean(v), 1), 'max': max(v)}
    hist = lambda v, cap: [sum(1 for x in v if min(x, cap) == k) for k in range(cap + 1)]
    stats = {
        'source': 'gyung/LFM2-Terminal-SFT-Processed, 16 pages of 40 rows at seeded random offsets (fetch_sample.py)',
        'n': len(R), 'models': dict(collections.Counter(r['model'] for r in rows)),
        'agents': dict(collections.Counter(r['agent'] for r in rows)),
        'categories': dict(collections.Counter(r['task'].rsplit('_', 1)[0] for r in rows)),
        'distinct_tasks': len(set(r['task'] for r in rows)),
        'seed_pass': len(S),
        'all': {k: summ([x[k] for x in R]) for k in ('e0_files', 'e0_lines', 'end_files', 'end_lines', 'turns')},
        'seed': {k: summ([x[k] for x in S]) for k in ('e0_files', 'e0_lines', 'end_files', 'end_lines', 'turns')},
        'seed_hist_e0_files': hist([x['e0_files'] for x in S], 6),
        'all_hist_e0_files': hist([x['e0_files'] for x in R], 6),
        'held_any': sum(1 for x in R if x['held']),
        'created_any': sum(1 for x in R if x['created']),
    }
    json.dump(stats, open('inputs/replay_stats.json', 'w'), indent=1)
    print(json.dumps({k: v for k, v in stats.items() if k not in ('categories',)}, indent=None)[:1500])
    # pick page traces: seed-passing, one per category, varied event kinds, modest size
    pick, seen = [], set()
    order = sorted(range(len(R)), key=lambda i: (rows[i]['task']))
    for i in order:
        x, r = R[i], rows[i]
        cat = r['task'].rsplit('_', 1)[0]
        kinds = set(e['kind'] for e in x['events'])
        if cat in seen or not x['seed'] or not (6 <= x['turns'] <= 14) or x['e0_files'] < 1:
            continue
        if not {'read-pre', 'write-new', 'read-held'} <= kinds:
            continue
        D = shrink(condense(r))
        if len(json.dumps(D)) > 11000:
            continue
        D.update(trial=r['trial_name'], task_id=r['task'], model=r['model'], agent=r['agent'], cat=cat,
                 row=r.get('_offset'))
        pick.append(D); seen.add(cat)
        if len(pick) == 5:
            break
    js = 'window.TRACES = ' + json.dumps(pick, ensure_ascii=False, separators=(',', ':')) + ';\n'
    js += 'window.REPLAY_STATS = ' + json.dumps(stats, separators=(',', ':')) + ';\n'
    open('parts/21_traces.js', 'w', encoding='utf-8').write(js)
    json.dump([replay_condensed(D) for D in pick], open('inputs/replay_expected.json', 'w'), default=list)
    print('picked', [(d['task_id'], len(d['turns'])) for d in pick], 'js bytes', len(js.encode()))
