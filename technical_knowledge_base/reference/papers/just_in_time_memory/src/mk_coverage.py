"""Write coverage.json: every fact, number, caveat and link of live.md (the Notion page before migration,
this paper: Just-in-Time Memory, arXiv 2609.27334) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header lines
 ('Authors Yefan Zhou, Yang Li, Zeyu Leo Liu, Semih Yavuz and Shafiq Joty', R + ', headline card', ['Yefan Zhou', 'Yang Li', 'Zeyu Leo Liu', 'Semih Yavuz', 'Shafiq Joty']),
 ('Date 23 September 2026', R + ', headline card', ['23 September 2026']),
 ('arXiv 2609.27334 link', 'headline card; Further reading', ['https://arxiv.org/abs/2609.27334']),
 ('Paper reading time 45 min', 'Further reading, The paper', ['(45 min)']),
 ('Topics: agentic-harnesses, rag-and-retrieval, llm-training-and-post-training', 'Further reading, Topics', ['3c65c17b0d0d81d881a8fe98b4cff7bb', '3c65c17b0d0d81b89145c37dfe8a3b0b', '3c65c17b0d0d81b6876ee72b7056793b']),
 ('Database property Takeaway', 'stays in the database; also on the headline card, with its correction in the verdict', ['Curating an agent\'s memory at read time, once the task is known, beats distilling trajectories at write time']),
 # problem
 ('Agentic memory systems curate at write time: a finished trajectory is distilled into a fixed artifact such as a reflection or a skill', R + ', Problem; Idea animation', ['write time', 'reflection', 'skill', 'fixed artifact']),
 ('Whatever the distillation discarded is unavailable to every later task', R + ', Problem', ['unavailable to every later task']),
 ('The curation decision is made without knowing what it will be used for', R + ', Problem', ['without knowing what it will be used for']),
 # method
 ('Retain the raw trajectories and defer curation to read time', R + ', Idea; Method', ['raw trajectories', 'read time']),
 ('A memory curator synthesises a compact, task-specific payload for the task in hand', R + ', Method', ['compact', 'task-specific payload']),
 ('The payload is produced in the context of a task with an outcome, so the curator trains directly from task success', R + ', Method, training', ['directly from task success']),
 ('Rather than the delayed, badly attributed signal a write-time distiller has to learn from', R + ', Method; stream replay tab', ['delayed', 'badly attributed']),
 # results
 ('Against the strongest baseline: ALFWorld +16.2 points', R + ', Results; headline card; Tables tab', ['+16.2']),
 ('WebShop +16.3', R + ', Results; headline card', ['+16.3']),
 ('tau2-bench +3.9', R + ', Results; How much to believe', ['+3.9']),
 ('Percentage points (success rate)', R + ', Results', ['percentage points']),
 ('An untrained curator already outperforms write-time methods: read-time curation itself is the major source of gain rather than the learned curator (correction: true like for like in 15 of 17 comparisons, but the headline gains are mostly from training)', R + ', Results; predict questions; verdict', ['15 of 17', 'untrained curator', 'major source of the gain']),
 # connections
 ('Proactive Memory Agent decides when to remind an agent of something it already holds', R + ', Connections; Further reading', ['3e25c17b0d0d81ce85e0c6d82f6beb4c', 'remind an agent of something it already holds']),
 ('SoL-Pi compacts what it carries forward', R + ', Connections; Further reading', ['3e25c17b0d0d81a0bb77f16cbc898bb5', 'compacts what it carries forward']),
 ('Both operate on an artifact whose content was fixed earlier; this says it should not be fixed earlier', R + ', Connections', ['fixed earlier']),
 # design consequence
 ('Design consequence: keep trajectories raw, pay the storage, spend the compute at read time', R + ', Why it matters', ['Keep trajectories raw, pay the storage, and spend the compute at read time']),
 ('The opposite of what a compaction-first harness does', R + ', Why it matters', ['compaction-first harness']),
 ('Integrated on Topic: agentic-harnesses and Topic: rag-and-retrieval', 'Further reading, Topics', ['Topic: agentic-harnesses', 'Topic: rag-and-retrieval']),
 ('Parent: Papers database page', 'crumb and Further reading', ['3c65c17b0d0d81549dbedb27e8f2a26f']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-28)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
