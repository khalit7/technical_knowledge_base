"""Fetch what this page measures from the public AREX-Skill release, pinned to one commit, and write
compact extracts into inputs/ (the raw downloads stay in a cache directory outside the repository).

  python3 fetch_release.py [cache_dir]      (default: /tmp/arex_cache)

Writes:
  inputs/release_library.json   per repository graph: skill id, repo id, entry SKILL.md bytes, number of
                                SKILL.md files, total bytes; router page sizes; area and family membership
  inputs/release_session.json   the released Researcher session (vLLM against SGLang): every skill-file read
                                in order with its time and size, plus session totals
  inputs/release_frontiercs.json the FrontierCS skill graph: nodes, SKILL.md sizes, directed SKILL.md links
  inputs/release_meta.json      commit, licence, counts used on the page
Uses only the GitHub REST API (anonymous, about 12 calls) and raw.githubusercontent.com.
"""
import base64, collections, itertools, json, os, posixpath, re, sys, urllib.request

REPO = 'VectorSpaceLab/AREX-Skill'
SHA = 'ac3fe1afa80fb9a09775ecfb2b6cc3ba850a2db6'  # main on 2026-10-03 ("add citation info", 2026-09-03)
CACHE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/arex_cache'
HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(CACHE, exist_ok=True)


def get(url, name):
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'kb-page-builder'})
        body = urllib.request.urlopen(req, timeout=120).read()
        open(p, 'wb').write(body)
    return open(p, 'rb').read()


api = lambda path, name: json.loads(get(('https://api.github.com/repos/%s/%s' % (REPO, path)).rstrip('/'), name))
raw = lambda path: get('https://raw.githubusercontent.com/%s/%s/%s' % (REPO, SHA, path), 'raw/' + path)


def subtree(path):
    """Recursive tree of one directory at the pinned commit."""
    parent, leaf = path.rsplit('/', 1)
    lst = api('contents/%s?ref=%s' % (parent, SHA), 'contents_%s.json' % parent.replace('/', '_'))
    sha = [x['sha'] for x in lst if x['name'] == leaf][0]
    t = api('git/trees/%s?recursive=1' % sha, 'tree_%s.json' % path.replace('/', '_'))
    assert not t.get('truncated'), path
    return [x for x in t['tree'] if x['type'] == 'blob']


meta = api('', 'repo.json')
lib = subtree('skills/repositories/repo-skills')
rtr = subtree('skills/repositories/repo-skills-router')
tsk = subtree('skills/task-oriented')

# ---- library: per repository graph ----
per = collections.defaultdict(lambda: {'entry': 0, 'n': 0, 'bytes': 0, 'files': 0})
for x in lib:
    parts = x['path'].split('/')
    if len(parts) < 2: continue
    g = per[parts[0]]
    g['bytes'] += x['size']; g['files'] += 1
    if parts[-1] == 'SKILL.md':
        g['n'] += 1
        if len(parts) == 2: g['entry'] = x['size']
idx = os.path.join('skills/repositories/repo-skills-router/references/index')
A = [json.loads(l) for l in raw(idx + '/assignments.jsonl').decode().splitlines() if l.strip()]
R = [json.loads(l) for l in raw(idx + '/repositories.jsonl').decode().splitlines() if l.strip()]
T = json.loads(raw(idx + '/taxonomy.json'))
BM = json.loads(raw(idx + '/build-metadata.json'))
root_skill = raw('skills/repositories/repo-skills-router/SKILL.md').decode()
rsize = {x['path']: x['size'] for x in rtr}
repos = []
rid = {}
for r in sorted(R, key=lambda r: r['skill_id']):
    g = per[r['target_skill_root'].split('/', 1)[1]]
    rid[r['repo_id']] = len(repos)
    repos.append([r['skill_id'], r['repo_id'], g['entry'], g['n'], g['bytes'], 1 if r['source_commit'] else 0, len(r['description'])])
areas = []
for a in T['areas']:
    slug = lambda n: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')  # page file names follow the display names
    area_slug = slug(a['name'])
    fams = []
    for f in a['families']:
        fam_slug = slug(f['name'])
        mem = sorted(rid[x['repo_id']] for x in A if x['area'] == a['name'] and x['family'] == f['name'])
        fp = 'references/families/%s/%s.md' % (area_slug, fam_slug)
        fams.append({'n': f['name'], 'slug': fam_slug, 'scope': f['scope'], 'page': rsize.get(fp), 'm': mem})
    areas.append({'n': a['name'], 'slug': area_slug, 'page': rsize.get('references/areas/%s.md' % area_slug), 'f': fams})
desc_total = sum(len(r['description']) for r in R)
assert all(a['page'] for a in areas) and all(f['page'] for a in areas for f in a['f']), 'router page missing'
lib_out = {'commit': SHA, 'cols': ['skill_id', 'repo_id', 'entry_bytes', 'skill_md_count', 'graph_bytes', 'has_commit', 'desc_chars'],
           'repos': repos, 'areas': areas, 'router_skill_bytes': rsize['SKILL.md'],
           'router_bytes': {'skill': rsize['SKILL.md'], 'areas': sum(v for k, v in rsize.items() if k.startswith('references/areas/')),
                            'families': sum(v for k, v in rsize.items() if k.startswith('references/families/')),
                            'index': sum(v for k, v in rsize.items() if k.startswith('references/index/')), 'files': len(rtr)}}
lib_out['detail'] = {g: sorted([[x['path'].split('/', 1)[1], x['size']] for x in lib if x['path'].startswith(g + '/')]) for g in ('vllm', 'sglang')}
lib_out['examples'] = {r['repo_id']: [r['description'], [(x['area'], x['family'], x['confidence']) for x in A if x['repo_id'] == r['repo_id']]]
                       for r in R if r['repo_id'] in ('1bananachicken/MaaNTE', 'ndleah/python-mini-project', 'eosphoros-ai/DB-GPT')}
json.dump(lib_out, open(os.path.join(HERE, 'inputs', 'release_library.json'), 'w'), separators=(',', ':'))

# ---- the released Creator example (huggingface_hub): what "verified" consisted of ----
hb = 'examples/creator/repo-to-skills/artifacts/huggingface_hub/review/'
vr = json.loads(raw(hb + 'verification-report.json')); nv = json.loads(raw(hb + 'native-verification-report.json'))
hub = {'overall': vr['overall'], 'checks': [[c['name'], c['status'], c['evidence']] for c in vr['checks']], 'warnings': vr['warnings'],
       'native': dict(collections.Counter(r['status'] for r in nv['results'])), 'native_env': nv['environment'],
       'native_summaries': [[r['id'], r['status'], r.get('summary', '')] for r in nv['results']]}
json.dump(hub, open(os.path.join(HERE, 'inputs', 'release_creator_hub.json'), 'w'), indent=1, ensure_ascii=False)

# ---- the released Researcher session ----
html = raw('examples/researcher/disco-researcher-vllm_sglang.html').decode()
m = re.search(r'<script id="session-data" type="application/json">(.*?)</script>', html, re.S)
S = json.loads(base64.b64decode(m.group(1).strip()).decode())
E = S['entries']
res = {}
for e in E:
    mm = e.get('message') or {}
    if mm.get('role') == 'toolResult':
        res[mm['toolCallId']] = sum(len(c.get('text', '')) for c in mm['content'] if c.get('type') == 'text')
reads, calls, out_tok, in_new = [], 0, 0, 0
t0 = E[0]['timestamp']
from datetime import datetime
ts = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()
turns = 0
for e in E:
    mm = e.get('message') or {}
    if mm.get('role') != 'assistant': continue
    turns += 1
    u = mm.get('usage', {}); out_tok += u.get('output', 0); in_new += u.get('input', 0)
    for c in mm['content']:
        if c.get('type') != 'toolCall': continue
        calls += 1
        a = c['arguments']
        if c['name'] == 'read' and '/skills/' in a.get('path', ''):
            p = a['path']
            k = p.split('/skills/', 1)[1]
            reads.append({'t': round(ts(e['timestamp']) - ts(t0), 1), 'path': k, 'chars': res.get(c['id'])})
lib_size = {('repositories/repo-skills/' + x['path']): x['size'] for x in lib}
lib_size.update({('repositories/repo-skills-router/' + x['path']): x['size'] for x in rtr})
for r in reads: r['bytes'] = lib_size.get(r['path'])
comp = [e for e in E if e['type'] == 'compaction']
sess = {'id': S['header']['id'], 'start': t0, 'end': E[-1]['timestamp'], 'seconds': round(ts(E[-1]['timestamp']) - ts(t0)),
        'model': sorted(set((e.get('message') or {}).get('model') for e in E if (e.get('message') or {}).get('role') == 'assistant') - {None}),
        'assistant_turns': turns, 'tool_calls': calls, 'output_tokens': out_tok, 'uncached_input_tokens': in_new,
        'compactions': len(comp), 'tokens_before_compaction': comp[0]['tokensBefore'] if comp else None,
        'system_prompt_chars': len(S['systemPrompt']), 'prompt': E[0]['message']['content'][0]['text'][:400], 'reads': reads}
json.dump(sess, open(os.path.join(HERE, 'inputs', 'release_session.json'), 'w'), indent=1)

# ---- FrontierCS graph: count distinct directed SKILL.md -> SKILL.md links ----
base = 'skills/task-oriented/FrontierCS/algorithmic-problem-solving'
nodes = {'algorithmic-problem-solving': 'SKILL.md'}
for x in tsk:
    mm = re.fullmatch(r'FrontierCS/algorithmic-problem-solving/sub-skills/([^/]+)/SKILL\.md', x['path'])
    if mm: nodes[mm.group(1)] = 'sub-skills/%s/SKILL.md' % mm.group(1)
inv = {v: k for k, v in nodes.items()}
edges, sizes, nlinks = set(), {}, 0
for n, f in nodes.items():
    body = raw(base + '/' + f).decode(); sizes[n] = len(body.encode())
    for t in re.findall(r'\]\(([^)#]+\.md)(?:#[^)]*)?\)', body):
        nlinks += 1
        t = posixpath.normpath(posixpath.join(posixpath.dirname(f), t))
        if t in inv and inv[t] != n: edges.add((n, inv[t]))
fcs = {'nodes': list(nodes), 'sizes': sizes, 'edges': sorted(edges), 'markdown_links': nlinks,
       'possible': len(list(itertools.permutations(nodes, 2))),
       'graph_bytes': sum(x['size'] for x in tsk if x['path'].startswith('FrontierCS/algorithmic-problem-solving/'))}
json.dump(fcs, open(os.path.join(HERE, 'inputs', 'release_frontiercs.json'), 'w'), indent=1)

# ---- meta ----
tops = collections.Counter(x['path'].split('/')[0] for x in tsk)
mc = collections.Counter(a['repo_id'] for a in A)
out = {'repo': REPO, 'commit': SHA, 'licence': meta['license']['spdx_id'], 'created': meta['created_at'], 'stars_on_fetch': meta['stargazers_count'],
       'build_metadata': BM, 'library_files': len(lib), 'library_bytes': sum(x['size'] for x in lib),
       'skill_md': sum(1 for x in lib if x['path'].endswith('SKILL.md')), 'graphs': len([k for k in per if per[k]['n']]),
       'assignments': len(A), 'repos_assigned': len(mc), 'repos_multi_family': sum(1 for v in mc.values() if v > 1),
       'max_families_one_repo': mc.most_common(1)[0], 'confidence': dict(collections.Counter(a['confidence'] for a in A)),
       'areas': len(T['areas']), 'families': sum(len(a['families']) for a in T['areas']),
       'repos_without_commit_in_index': sum(1 for r in R if not r['source_commit']), 'description_chars_total': desc_total,
       'task_oriented_released': {k: v for k, v in tops.items()},
       'task_oriented_skill_md': {k: sum(1 for x in tsk if x['path'].startswith(k + '/') and x['path'].endswith('SKILL.md')) for k in tops},
       'router_root_lines': len(root_skill.splitlines())}
json.dump(out, open(os.path.join(HERE, 'inputs', 'release_meta.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != 'build_metadata'}))
print('reads', len(reads), 'fcs edges', len(edges))
