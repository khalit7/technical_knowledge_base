"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the DSec row page
before migration, fetched 2026-10-03, last edited 2026-09-28) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 ('Reading-time line "6 min read, +45m resources"', 'dropped: replaced by the build-computed reading time and resources total of the new page', ['min to read The paper tab', 'of resources']),
 ('Authors: "Wenfeng Liang with more than 99 co-authors from DeepSeek"', 'corrected: headline card lists the first author and 131 authors (16 marked DSec developers); checks table', ['Jialiang Huang (first author)', '131 authors', 'Wenfeng Liang', '131 names']),
 ('Date: 19 September 2026', R + ', headline card', ['19 September 2026 (arXiv v1)']),
 ('Link arXiv 2609.22978 (45 min)', 'headline card and Further reading', ['https://arxiv.org/abs/2609.22978', '(45 min)']),
 ('Takeaway property (shown on the card, kept in the database)', R + ', headline card "In one line"', ['four isolation levels behind one SDK, about 3 million sandboxes a day and 5,000 created per second on roughly 160 nodes']),
 ('One SDK exposing FnCall, container, microVM and full-VM backends', R + ', Idea (with Table 1)', ['libdsec', 'FnCall', 'Firecracker microVMs', 'Full VMs']),
 ('A rollout pays only for the isolation its task needs rather than the strongest available', R + ', Idea: the caller chooses; Why it matters', ['the caller stays responsible for picking the one that matches the task', 'isolation is a per-task cost, not a platform decision']),
 ('Sandbox images loaded on demand from 3FS instead of staged per node', R + ', Mechanisms 2; Results; figures tab Figure 10', ['DSec serves images from 3FS', 'reads are on demand and in bulk']),
 ('Memory sharing, reclamation and CPU scheduling tuned for high-density execution under overcommit', R + ', Mechanisms 3 and 4', ['virtio-pmem with DAX', 'DAMON plus balloon free-page reporting', 'core scheduling']),
 ('Co-design with the RL framework that decouples stateful rollouts from preemptible GPU training', R + ', RL co-design, with the before/after animation', ['The rollout lives outside the GPU job', 'worker container', 'From V4.1: rollout on DSec']),
 ('"A rollout that must survive a preempted trainer is a different system from one that can be restarted with it" (the architectural point)', R + ', RL co-design (old against new pipeline, command-log replay) and the verdict', ['a preempted GPU job reconnects and continues without replay', 'Replay the command log']),
 ('About 160 nodes per production unit', R + ', card, Idea scale paragraph, checks', ['nearly 160 CPU nodes with 30K cores and about 250 TB of DRAM']),
 ('Roughly 3 million sandboxes per day', R + ', card and Idea; predict question on the average rate', ['about 3 M sandboxes on a typical day', '3,000,000 ÷ 86,400 s']),
 ('More than 380,000 concurrent sandboxes', R + ', Idea; How much to believe (abstract against §2.4 wording)', ['peak concurrency about 380K', '"over 380,000"']),
 ('More than 5,000 sandbox creations per second', R + ', Idea; Place a burst tab uses it as the default rate', ['creation above 5,000 a second', 'over 5,000 creations a second']),
 ('Latency maintained under high-density overcommit', 'corrected and quantified: measured on a 10-node test cluster, 45.2% inflation cut to 17.3% at 50% best-effort load (Mechanisms 4 predict reveal, Results, Figure 13)', ['dedicated 10-node CPU test cluster', '17.3%', '45.2%']),
 ('Misbehaviour, reward hacking included, mitigated as a property of the sandbox rather than the reward function: an environment that cannot be escaped removes a class of shortcut', 'corrected in Misbehaviour: the paper frames access controls as a partial mitigation of reward hacking and does not claim an inescapable sandbox; an agent bypassed a control (XFS_IOC_SWAPEXT)', ['mitigation of reward hacking', 'It does not claim an inescapable sandbox', 'XFS_IOC_SWAPEXT']),
 ('Why it matters: every agentic RL recipe here assumes an environment supply executing untrusted code at rollout rates, and none prices it', R + ', Why it matters', ['assumes an environment supply that executes untrusted code at rollout rates a GPU cluster can consume, and none of them prices it']),
 ('First published account of that layer at frontier scale', 'tempered in Why it matters: "one of the first detailed public accounts", with the related work it cites and AgentENV', ['one of the first detailed public accounts of that layer at frontier scale']),
 ('5,000 creations per second over 160 nodes is what makes agentic RL affordable; an infrastructure result, not algorithmic; a lab without it is not running the same experiments', R + ', Why it matters (labelled an interpretation; scale self-reported)', ['infrastructure result rather than an algorithmic one', 'not running the same experiments, whatever recipe it copies']),
 ('The four-backend design is the transferable idea: isolation is a per-task cost, not a platform decision', R + ', Why it matters', ['isolation is a per-task cost, not a platform decision']),
 ('Connection: Terminal-Universe manufactures environments from recorded trajectories; this runs them', R + ', Connections; Further reading', ['https://app.notion.com/p/3d45c17b0d0d814abc07fde424e09a31', 'manufactures environments from recorded agent trajectories; DSec runs them']),
 ('Integrated on Topic: llm-training-and-post-training', R + ', Connections; Further reading topics', ['https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b', 'Integrated on Topic: llm-training-and-post-training']),
 ('Provenance: dated 19 September, two days before the research window opened', R + ', Why it matters, coverage paragraph', ['dated 19 September 2026', 'two days older than the research window']),
 ('Surfaced through TechNode and Bloomberg coverage on 23 September', R + ', Why it matters; Further reading', ['https://technode.com/2026/09/23/deepseek-dsec-agent-training-sandbox-infrastructure/', 'https://www.bloomberg.com/news/articles/2026-09-23/deepseek-tests-efficient-safer-method-for-training-ai-agents', 'on 23 September']),
 ('A 313-point Hacker News thread on 26 September', R + ', Why it matters (checked through the HN API: posted 26 September; 323 points and 116 comments on 3 October)', ['https://news.ycombinator.com/item?id=49859112', '313 points when this page was first written', '323 points and 116 comments']),
 ('Had not been recorded here before', R + ', Why it matters', ['had not been recorded here before']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(html.unescape(c)) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion row page as of 2026-09-28)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': [o['fact'] for o in out if o['where'].startswith(('corrected', 'tempered'))], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
