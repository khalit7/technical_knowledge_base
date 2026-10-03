"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration, last edited 2026-09-20) with where the HTML carries it, and verify each item's check strings
against the built index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (Phi-Bench), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, P, S, T, F = 'The paper tab', 'Replay tab', 'Score a submission tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (they stay in Notion; the card repeats the takeaway)
 ('Takeaway property (verbatim on the card)', R + ', headline card "In one line"', ['85 open-ended infrastructure tasks in nine categories and three escalating formats', 'the behaviours that separate the top of the table being cheap pre-submission validation plus deliberate variable isolation']),
 ('Topics property: benchmarks, inference-and-serving, cuda-and-gpu-programming, ml-infra-and-orchestration', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'https://app.notion.com/p/3c65c17b0d0d81c08b3bc95ff45c7b13', 'https://app.notion.com/p/3c65c17b0d0d81c39f34d5e070d783c1', 'https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time line "5 min read, +1h resources"', 'replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('September 2026; authors and exact submission date not recovered; check the arXiv listing', 'corrected: ' + R + ', card (13 authors, 9 September 2026) and the note under the nav', ['Leilei Ding', 'Yanyong Zhang', '9 September 2026', 'could not find the authors or the submission date']),
 ('arXiv 2609.10226 (1h, 30+ pages)', 'card and Further reading; page count corrected to 10', ['https://arxiv.org/abs/2609.10226', 'Preprint, 10 pages', '(1h)', 'said the paper ran to 30+ pages']),
 ('Best resources: the paper (1h)', F, ['https://arxiv.org/html/2609.10226v1']),
 # problem
 ('Every existing code benchmark for infrastructure measures isolated kernels (write this CUDA kernel, optimise this loop)', R + ', Problem', ['Existing code benchmarks for this work measure isolated pieces', 'KernelBench, TritonBench and FlashInfer-Bench give one GPU operator']),
 ('Real infra engineering is long-horizon and open-ended: find the bottleneck across a repository, change several files, verify faster without getting wrong', R + ', Problem', ['Real infrastructure engineering is long-horizon and open-ended', 'find where the time goes, change several files, and check that the system got faster without getting wrong']),
 ('Nobody had measured that; it is the capability that would let models accelerate their own serving and training stacks', R + ', Problem', ['Nobody had measured the open-ended version', 'precisely the capability that would let models accelerate their own serving and training stacks']),
 # method
 ('85 tasks across nine categories: training systems, inference and serving, compression, kernel optimisation, I/O efficiency, hardware adaptation, data infrastructure, system optimisation, system assurance', R + ' (Results, heatmap) and ' + T + ' (Table 2 headings)', ['Training', 'Inference', 'Compression', 'Kernel', 'I/O', 'Hardware and Edge', 'Data Infrastructure', 'System Optimization', 'System Assurance']),
 ('KFC, 55 tasks: an optimised implementation inside a single file', R + ', Three formats', ['Kernel Function Completion (KFC), 55 tasks.', 'within one file without changing the interface']),
 ('LHI, 20 tasks: multi-file, repository-scale development', R + ', Three formats', ['Long-Horizon Implementation (LHI), 20 tasks.', 'changing several files']),
 ('E2EO, 10 tasks: the model must identify the system-level bottleneck itself before optimising', R + ', Three formats', ['End-to-End Optimization (E2EO), 10 tasks.', 'The agent must profile, find the bottleneck, plan']),
 ('Three construction routes, worth noting as benchmark methodology: PR and issue reconstruction, agent-assisted mining with automated test generation, expert curation of problems too new to have a PR history', R + ', How the 85 tasks were built (expert curation refined: problems repository history cannot reconstruct, including emerging ones)', ['worth noting as benchmark methodology', 'PR- and issue-grounded.', 'Agent-assisted.', 'writes new tests until uncovered execution paths are covered', 'Expert-curated.', 'emerging problems with no complete reference trajectory']),
 ('Grounded in 2,260 papers and 1,852 engineering artifacts, organised by a hierarchical taxonomy', R + ', How the 85 tasks were built (410 tags, 62 topics, nine categories)', ['2,260 papers and 1,852 engineering artifacts', '410 fine-grained tags', '62 middle-level topics']),
 # results
 ('Eight frontier models tested', R + ', Results', ['Eight models at their highest reasoning setting']),
 ('Claude Opus 5 leads at 36.53%, Kimi K3 28.12%, Qwen3.8-Max 27.73%', R + ', card and Results; ' + T, ['Claude Opus 5 leads at 36.53%', 'Kimi K3 at 28.12% and Qwen3.8 Max at 27.73%']),
 ('Performance varies enormously by domain', R + ', Results', ['No model is strong everywhere.']),
 ('Hardware and Edge the hardest, at 5.4% for the best model', 'corrected: ' + R + ', Results (5.4% is Qwen3.7 Max, seventh overall; Opus 3.9; 3 tasks)', ['The 5.4% belongs to', 'Claude Opus 5 scores 3.9 there', 'the category is 3 tasks']),
 ('Repository-level implementation substantially harder than kernel completion; expected direction, the size of the drop is the useful number', R + ', Results (Opus 37.16 to 21.60; 22% to 45% across models)', ['LHI is below KFC for every model', 'the size of the drop is the useful number', 'LHI is 22% to 45% below KFC']),
 ('Strong models establish cheap validation mechanisms before submitting', R + ', Case study 1; ' + P, ['Cheap experimental foundations', 'good models build low-cost mechanisms for screening hypotheses']),
 ('Strong models isolate variables and control noise when measuring; separates the top of the table from the middle', R + ', Case study 2 (with the caveat: one task, three models)', ['Variable and noise control', 'good models run experiments that maximise the information gained per iteration', 'they are good hypotheses about what separates agents, not measured effects']),
 ('Extended reasoning budgets do not reliably improve scores', R + ', Iterations and effort (Figure 5 rebuilt; 30 tasks, not 20)', ['scores do not rise steadily with budget', 'Kimi K3 loses about 45% of its score at low effort']),
 # why it matters
 ('OpenAI reported 3.1 agent-workdays of research effort per human workday in August 2026', R + ', Why it matters (sourced: The Neuron via the 2026-09-07 issue)', ['3.1 agent-workdays of research effort per human workday', 'https://www.theneuron.ai/news/openai-ai-research-acceleration-alignment-slowdown/']),
 ('AMD now ships ROCm optimisation knowledge as agent skills', R + ', Why it matters (sourced: Phoronix via the 2026-09-14 issue)', ['AMD Skills, validated ROCm optimisation knowledge packaged as agent skills', 'https://www.phoronix.com/news/AMD-ROCm-10.0']),
 ('Best model resolves roughly a third of tasks; hardware adaptation roughly one in twenty', 'corrected: ' + R + ', Why it matters (a third of the available reward measured against expert solutions; hardware close to nothing)', ['earns roughly a third of the available reward', 'on hardware adaptation close to nothing']),
 ('First benchmark whose categories map almost exactly onto the KB systems topics; a direct measure of how much of inference-and-serving, cuda-and-gpu-programming, ml-infra-and-orchestration a model can do', R + ', Why it matters', ['first benchmark whose task categories map almost exactly onto this knowledge base', 'a direct measure of how much of']),
 # connections
 ('Topic: benchmarks: sits with HarnessDev and MOLE as the third benchmark this month whose subject is the system', R + ', Connections; ' + F, ['as the third benchmark this month whose subject is the system rather than the task', 'https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f', 'https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9']),
 ('inference-and-serving and cuda pages: the category breakdown is a usable capability map', R + ', Connections (read with the task counts)', ['the category breakdown is a usable capability map for exactly the work these pages describe']),
 ("Cohere's megakernel serving write-up, added to the serving page this week: worked example of an E2EO-shaped task done by humans; reference point for what 36.53% is a third of", R + ', Connections; ' + F, ['https://cohere.com/blog/megakernels', 'a worked example of an E2EO-shaped task done by humans', 'what a 36.53% score is a third of']),
 ('Repo-To-Skill: operational-knowledge thesis predicts failures where knowledge lives in configs and issue threads; Hardware and Edge consistent', R + ', Connections (on three tasks)', ['https://app.notion.com/p/3d45c17b0d0d818bacfeda8a40caddb2', 'knowledge lives in configs and issue threads rather than in papers']),
 ('NeoHorse-1: the loop it runs is the loop Phi-Bench says models cannot yet close on real infrastructure', R + ', Connections', ['https://app.notion.com/p/3db5c17b0d0d81e3b105e033a359ad24', 'the loop NeoHorse-1 runs is the loop Φ-Bench says models cannot yet close on real infrastructure']),
 ('Covered in the 2026-09-14 tech news issue', R + ' note under the nav; ' + F, ['https://app.notion.com/p/3db5c17b0d0d8135a34af60966c5ecc1']),
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
           'corrected': ['"Authors and exact submission date not recovered", "30+ pages": 13 authors (USTC, StepFun, PKU, HKUST, Yale, UPenn), submitted 9 September 2026, 10 pages',
                         '"resolves 36.53%": a mean reward over 85 tasks in which matching the expert reference earns zero, not a share of tasks resolved',
                         '"Hardware and Edge ... 5.4% for the best model": 5.4% is Qwen3.7 Max (seventh overall); Claude Opus 5 scores 3.9; the category is 3 tasks',
                         '"extended reasoning budgets do not reliably improve scores": the effort figure covers the 30 LHI and E2EO tasks, not 20 LHI; all three models are best at max effort, and Kimi K3 drops 45% at low',
                         '"hardware adaptation roughly one in twenty": close to nothing, on three tasks',
                         'Expert curation is for problems repository history cannot reconstruct reliably (including emerging ones), not only problems too new for a PR history'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
