"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (Repo-To-Skill), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, U, T, F = 'The paper tab', 'Follow the router tab', 'Tables tab', 'Further reading tab'
C = [
 # header
 ('Reading time line "6 min read, +45m resources"', 'replaced by the build-computed reading time and resources total (more resources now)', ['min to read', 'of resources']),
 ('Authors: Jianlyu Chen, Yuyang Hu, Hongjin Qian, Jiawei Liu, Wenqing Wei, Xiaolong Chen, Defu Lian, Zhicheng Dou, Chaozhuo Li, Qiwei Ye, Zheng Liu', R + ', headline card', ['Jianlyu Chen', 'Yuyang Hu', 'Hongjin Qian', 'Jiawei Liu', 'Wenqing Wei', 'Xiaolong Chen', 'Defu Lian', 'Zhicheng Dou', 'Chaozhuo Li', 'Qiwei Ye', 'Zheng Liu']),
 ('Date: 2026-09-02', R + ', headline card', ['2 September 2026']),
 ('Links: arXiv 2609.02749 (45 min)', 'card and Further reading', ['https://arxiv.org/abs/2609.02749', '(45 min)']),
 # best resources
 ('Best resource: the paper itself (45 min)', F, ['Repo-To-Skill: Distilling GitHub Repositories Into AI4AI Skills (arXiv HTML v1)']),
 ('"The AREX-Skill Library is the artifact worth looking at if it is released; check the paper for the link"', 'corrected: it is released (Apache-2.0); card, Use it, Further reading', ['https://github.com/VectorSpaceLab/AREX-Skill', 'Apache-2.0']),
 # problem
 ('Autonomous ML research agents fail in a specific, unglamorous way: they know the method and cannot make it run', R + ', Problem', ['Problem: knowing a method is not making it run', 'the know-how that separates knowing a method from making it work']),
 ('Missing ingredient named operational knowledge: the practical expertise of implementing a technique successfully', R + ', Problem', ['operational knowledge']),
 ('It lives in READMEs, config files, issue threads and codebase folklore rather than in the paper', 'corrected: the paper names source, docs, examples, tests, scripts and configuration (no issue threads or folklore); Problem note', ['The paper never mentions issue threads or folklore', 'source code, documentation, examples, tests, scripts and configuration files']),
 ('Agent skills are the obvious vehicle', R + ', Idea', ['is a set of <b>skills</b>'.replace('<b>', '').replace('</b>', '')]),
 ('Skills have been written by hand, one at a time, which does not scale', R + ', Problem', ['Today an expert turns it into agent skills by hand', 'scales with expert labor and with the domain, stack, and release']),
 # method
 ('DisCo is an agent system that distils operational knowledge out of repositories into reusable skills', R + ', Method', ['DisCo</b> is one agent'.replace('</b>', ''), 'creator mode']),
 ('"in two modes": task-agnostic and task-oriented', 'corrected: these are the two forms; the paper\'s modes are creator and researcher (Method)', ['The old page called these "modes"; the paper\'s modes are creator and researcher']),
 ('Task-agnostic distillation mines an existing repository for whatever it knows how to do, producing skills before any task is known', R + ', Method and its animation', ['the anchor is a source', 'ahead of any task']),
 ('Task-oriented distillation generates skills targeted at the task currently in front of the agent', R + ', Method and its animation', ['the anchor is a problem', 'what solving it demands']),
 ('Distillation converts material written for humans into compact, machine-actionable procedures; distinguishes it from retrieval over documentation', R + ', Problem and Idea (the paper says verification is what separates distillation from summarisation)', ['written for human readers and is far too large to load during a task', 'What makes this distillation rather than summarisation is verification']),
 ('Output: AREX-Skill Library, more than 5,000 verified skills from 1,000 widely used ML repositories', R + ', card, The library', ['5,353 skills', '1,000 repository graphs']),
 ('Organised into 20 areas and 178 capability families', R + ', card, The library', ['20 areas', '178 capability families']),
 # results
 ('GPT-5.5 backbone under a fixed computational budget', R + ', Result 1 setup (corrected: the running budget only)', ['GPT-5.5 at extra-high reasoning effort as the backbone', 'the one-time construction budget is "separate and is not counted in either run-time condition"']),
 ('+134.3% on MLE-bench', R + ', card, Result 1', ['134.3%']),
 ('+34.4% on PaperBench', R + ', Result 2', ['34.4% relative']),
 ('+9.2% on FrontierCS', R + ', Result 3', ['+6.51 points (9.22%)']),
 ('+14.0% on PassNet', R + ', Result 4', ['+0.1883, 14.0%']),
 ('"The fixed budget is the important qualifier: not more compute buying more attempts, the same compute spent less wastefully because the agent stops rediscovering how to run things"', 'corrected: How much to believe (MLE-bench construction is up to 24 GPU-hours of trials on each competition; FrontierCS skill runs used 1.82 times the tokens)', ['The old page\'s "this is not more compute buying more attempts" does not hold for MLE-bench', 'The budget held fixed is the five-hour limit, not the spend']),
 # why it matters
 ('MLE-bench figure is the largest single-intervention gain the KB records on that benchmark', 'kept as the old page\'s claim about the knowledge base, with its caveat (Why it matters)', ['the largest single-intervention gain the KB currently records on that benchmark']),
 ('It comes from supplying procedure rather than capability', R + ', Why it matters', ['procedural anchors (steps, checks, pitfalls) rather than as knowledge injection']),
 ('Same mechanism as Demystifying Agent Skills: procedural anchors, not knowledge injection', R + ', Why it matters, Connections', ['https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92', 'procedural anchors']),
 ('First work to supply those anchors at library scale rather than by hand', R + ', Why it matters', ['this is the first work to supply such anchors at library scale']),
 ('Reframes a repository for an agent: not a thing to read when needed but pre-compiled procedure distilled once and reused', R + ', Why it matters', ['not something to read when needed, but a source of pre-compiled procedure distilled once and reused']),
 ('Caution: skills add a roughly 10% misapplication failure mode', R + ', How much to believe and Why it matters (made precise: 10.0% of the skill arm\'s failure labels)', ['10.0% of the skill arm\'s failure labels', 'skills add a misapplication failure mode']),
 ('Retrieval precision decouples from downstream success', R + ', Why it matters', ['retrieval precision decouples from task success']),
 ('Not addressed here', 'corrected: addressed anecdotally (two PaperBench regressions as a possible retrieval-precision failure; the PassNet conv3d rule), not measured', ['This paper engages with that only anecdotally', 'possible retrieval-precision failure']),
 ('A 5,000-skill library is 5,000 opportunities to apply the wrong procedure confidently', R + ', Why it matters', ['5,353 opportunities to apply the wrong procedure confidently']),
 # connections
 ('Demystifying Agent Skills: mechanistic account of why this works; source of the misapplication caveat', R + ', Connections; Further reading', ['the mechanistic account of why this works, and the source of the misapplication caveat']),
 ('HarnessDev: skills are a component a self-built harness must assemble; this is the supply side, at scale', R + ', Connections; Further reading', ['https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f', 'this is the supply side of that component, at scale']),
 ('Terminal-Universe: same week, same idea applied to environments; both mine existing artefacts (repositories, trajectories)', R + ', Connections; Further reading', ['https://app.notion.com/p/3d45c17b0d0d814abc07fde424e09a31', 'applied to environments instead of skills', '(repositories, trajectories)']),
 ('EnvHarness and Prime Agent: Prime Agent lets the agent version its own skills inline and finds the policy underuses it; Repo-To-Skill removes the authoring burden, a different answer to the same complaint', R + ', Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d81e88ab9c396a160f813', 'https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb', 'finds the policy underuses the affordance', 'a different answer to the same complaint']),
 ('Topic: agentic-harnesses, harness-scaling section', R + ', Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'harness-scaling section']),
 # database properties carried on the card
 ('Takeaway property (verbatim on the card) with corrections', R + ', headline card', ['Names the thing agent skills usually lack', 'none of the four benchmark gains uses the 1,000-repository library']),
 ('Topics property: agentic-harnesses, agentic-frameworks, ml-infra-and-orchestration', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7', 'https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': [o['fact'] + ' -> ' + o['where'] for o in out if o['where'].startswith('corrected')] + [
               'Takeaway and old page attribute the four benchmark gains to the 1,000-repository library; none of the four uses it (card note, How much to believe)',
               '"fixed compute": only the run-time budget is matched (card note, Result 1, How much to believe)'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
