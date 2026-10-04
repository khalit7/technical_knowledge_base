"""Write coverage.json: every fact of the old page (src/live.md) and where the new page carries it, or which sibling owns it."""
import json
S='owned by eval_statistics (3ef5c17b0d0d8187a7b4e5b4ec4a546d)'
G='owned by human_evaluation_and_annotation (3ef5c17b0d0d819485bcc54a45d49420)'
C=[]
def a(sec,fact,where,note=''):
    d={'section':sec,'fact':fact,'where':where}
    if note:d['note']=note
    C.append(d)
a('header','Page furniture: "11 min read, +4h 35m resources"','Replaced by the Reading time line (about 26 minutes) and per-link times in Further reading')
a('header','No child pages, databases or video on the old page','Nothing to keep (checked in the fetch)')
for f,w,n in [('Miller, Adding Error Bars to Evals, arXiv:2411.00640 (45 min), read first','Further reading, Best resources','Statistics depth '+S+'; summary in Reading, Moved; handed off in src/handoff_statistics.md'),
 ('statsforevals.com (~30 min), small 20-100 item evals','Further reading, Best resources','Depth '+S),
 ("Hamel Husain's evals FAQ (~40 min)",'Further reading; quoted in Reading, Golden sets and Monitoring (September 2026 revision numbers)',''),
 ('Braintrust practical guide to LLM evaluation and regression testing (~25 min)','Further reading (vendor)',''),
 ('PlatinumBench, arXiv:2502.03461 (45 min), label-error rates','Further reading, Best resources','Gold-label depth '+G+'; handed off in src/handoff_human_eval.md'),
 ('How to Correctly Report LLM-as-a-Judge Evaluations, arXiv:2511.21140 (45 min)','Further reading; Reading, Offline against online (TPR/FPR correction of online judge scores)','')]:
    a('Best resources',f,w,n)
P='Regression gates and promotion paths'
for f,w in [('Promotion path for any change (prompt edit, model swap, retrieval change, tool change) is a fixed sequence, each stage cheaper than the failure it prevents','Reading, In one screen (lead and table)'),
 ('Stage 1: offline gate on frozen golden sets, minutes, in CI','Reading, In one screen table; One swap, two gates (animation)'),
 ('Pass/fail thresholds per capability slice, not one aggregate','Reading, One swap, two gates (before/after animation on real data); Gates in CI; Gate designer tab'),
 ('Gate on paired deltas vs the current champion, with significance','Reading, animation steps 4 and 5; Gates in CI; significance arithmetic '+S),
 ('Hard floors on safety slices','Reading, In one screen table; Gates in CI (with Vercel keeping safety evals at a 100% pass rate)'),
 ('Any golden-set edit is itself a reviewed change; score history re-baselined when the set changes','Reading, Golden sets, Lifecycle (Versioning); Common mistakes'),
 ('Stage 2: cost/latency budget gate: tokens per request, p95 latency, projected spend','Reading, In one screen table; Cost and latency budgets; animation step 6'),
 ('A model swap that wins quality but 3x cost fails promotion unless explicitly waived','Reading, In one screen table and Cost and latency budgets'),
 ('Stage 3: shadow deployment on mirrored production traffic, responses logged not served','Reading, Shadow deployments'),
 ('Score champion against candidate on the same requests (paired by construction) with the judge battery; diff distributions per intent/segment','Reading, Shadow deployments'),
 ('Shadow catches distribution gaps golden sets cannot; real traffic is uglier than curated sets','Reading, In one screen table and Shadow deployments'),
 ('For agentic systems shadow full trajectories, not single turns','Reading, Shadow deployments (Agents), plus the side-effect caveat'),
 ('Stage 4: canary / A/B with auto-rollback: small live percentage, guardrail metrics (error rates, refusal rates, user feedback, task completion), automated rollback triggers, progressive rollout','Reading, In one screen table; Canary, A/B tests and interleaving'),
 ('Champion/challenger framing: incumbent is champion; nothing ships without beating it through all gates','Reading, In one screen'),
 ('Keep every config pinned and logged (prompt hash, model version, judge version, dataset version) so any score is reproducible','Reading, In one screen (paragraph after the table)')]:
    a(P,f,w)
P='Golden sets'
for f,w in [('Composition: representative slice of real traffic (deduplicated, PII-scrubbed), regression cases (every production incident becomes a test), adversarial/edge cases, safety canaries','Reading, Golden sets, What goes in'),
 ('100-500 items per surface is the practical range; smaller sets gate only large effects; larger sets rot','Reading, Golden sets, How big (with five dated team figures added)'),
 ('Each item: input, expected behaviour (reference answer, rubric, programmatic checks), metadata tags (intent, difficulty, source incident); tags make per-slice gating possible','Reading, Golden sets, What goes in; demonstrated by the animation'),
 ('Lifecycle: decay through product drift, traffic drift and leakage into prompts/finetunes; refresh on a schedule; version like code','Reading, Golden sets, Lifecycle'),
 ('Hold out a never-published split if the vendor might train on your traffic','Reading, Golden sets, Lifecycle'),
 ("Error analysis grows them: read raw failure transcripts (Hamel's core discipline), cluster failure modes, convert clusters into new tagged items and judge rubric criteria",'Reading, Golden sets, Promotion paths; animation step 7 (after mode)')]:
    a(P,f,w)
P='Offline vs online'
for f,w in [('Offline evals catch anticipated regressions; online metrics catch what the golden set could not imagine; both required; they disagree routinely','Reading, Offline against online (lead)'),
 ('Online instruments: sampled async judge scoring of live traces, implicit signals (retry rate, edit distance of corrections, abandonment, escalation to human), explicit feedback, business/task-completion metrics','Reading, Offline against online, first bullet'),
 ('Offline-online divergence is an alarm on the offline set; feed the divergent segment back into the golden set','Reading, Offline against online'),
 ('Online judge scoring inherits every judge failure mode (LLM-as-judge) plus sampling bias and label lag; report with TPR/FPR corrections','Reading, Offline against online, last bullet')]:
    a(P,f,w)
P='Statistical rigour'
for f in ['Central failing: reporting point deltas without noise quantification; the Miller framework, adapted',
 'Question-level variance: SEM = s/sqrt(n); n=100 at p~0.7 gives ~4.6 points; a 2-point regression on 100 items is noise; n=1000 gives 1.4',
 'Rule of thumb: detectable effect at 95%/80% power ~ 2.8*sqrt(2p(1-p)/n); a 2-point drop near p=0.7 needs roughly n=3500 unpaired',
 'Paired tests (paired t / McNemar); pairing removes most variance; typical correlations cut required n by 3-10x; highest-value practice for gates',
 'Sampling variance of generation: K resamples per item, variance decomposition; K=3-5 tightens CIs',
 'Clustered errors for items from shared sources/templates',
 'Multiple comparisons: gating 20 slices at p<0.05 fires falsely; stricter per-slice alpha or hierarchical gating',
 "Small-set reality: a 50-item gate detects only large regressions; state each gate's minimum detectable effect; escalate borderline results rather than re-running until green",
 'Worked example: 78% on 300 items, 5-point regressions; unpaired SE 3.4 points (1.5 SE), n ~1100 needed; paired with ~15% discordance detects it at n=300; K=3; paired bootstrap CI',
 "General lesson: state each gate's MDE next to its threshold; get sensitivity from pairing and resampling before buying labels"]:
    note='Handed off verbatim in src/handoff_statistics.md'
    if '3500' in f: note+='; correction: the rule of thumb gives about 8,200, not 3,500'
    if 'Worked example' in f: note+='; correction: about 61% power at n=300, about 470 items for 80%'
    if '3-10x' in f: note+='; unsourced, flagged unconfirmed in the handoff'
    w=S+'. One-line summary here: Reading, Moved'
    if 'Multiple comparisons' in f: w+='; the gate consequence also in Gates in CI'
    if 'Small-set' in f or 'General lesson' in f: w+='; the engineering rules (MDE next to threshold; three outcomes, never re-run until green) kept in Golden sets, How big and Gates in CI'
    if f.startswith('Paired'): w+='; pairing shown on real data in the animation (step 4)'
    if 'K resamples' in f: w+='; K samples as the flaky-eval practice in Gates in CI'
    a(P,f,w,note)
P='Cost-performance frontiers'
for f,w in [('Model selection is a Pareto problem: quality vs cost per request and latency; only frontier points are candidates','Reading, Cost and latency budgets, with a live frontier chart (four MT-Bench models, 2023 list prices)'),
 ('Cascades/routing: a cheap model with escalation often dominates','Reading, Cost and latency budgets'),
 ('Quality-per-dollar as the gate metric for cost-sensitive surfaces','Reading, Cost and latency budgets'),
 ('Re-run the frontier on every pricing or model-version change; frontiers shift monthly','Reading, Cost and latency budgets'),
 ('Judge cost is part of the frontier; jury-of-minis batteries exist because frontier judges at production scale invert the economics','Reading, Cost and latency budgets, The evals\' own budget (real judge cost of the animation run; RocketEval figure)')]:
    a(P,f,w)
P='Gold-label auditing'
for f in ['Gold labels are wrong at rates that dominate small deltas; Northcutt et al. pervasive test-set label errors',
 'MMLU-Redux: 5,700 questions, 57 subjects, ~6.5% with an error of some kind; wrong-gold rate alone lower; arXiv:2406.04127 (45 min); virology 57%',
 'About 5% of GSM8K items are wrong; PlatinumBench: after cleaning, a majority of residual model failures were label noise',
 'Consequences: artificial ceilings, rankings can flip 10-15 points on cleaned sets, a gate can fail a better model for disagreeing with wrong gold',
 'Per-benchmark rates and the six-physics re-grading are on the Knowledge and reasoning benchmarks page',
 'Gold-error-aware consensus scoring, five steps: provenance field; consensus battery; human adjudication with "ambiguous, exclude from gating"; gate on the verified subset; every gate failure triggers a label audit',
 'Same machinery as judge calibration pointed at the dataset; three fallible components (model, judge, gold); attribute every delta before acting']:
    w=G+'. One-paragraph summary here: Reading, Moved (MMLU-Redux 6.5% and virology 57%, audit before believing, the ambiguous label state, three fallible parts with a link to the root attribution animation)'
    a(P,f,w,'Handed off verbatim in src/handoff_human_eval.md'+('; not re-verified here, flagged there' if ('GSM8K' in f or 'Consequences' in f) else ''))
out={'page':'Production eval engineering','old_page':'src/live.md (fetched 2026-10-04, last edited 2026-09-22)','facts':C}
out['counts']={'total':len(C),'carried_here':sum('owned by' not in c['where'] for c in C),'owned_by_sibling':sum('owned by' in c['where'] for c in C),'dropped':0}
json.dump(out,open('coverage.json','w'),indent=1,ensure_ascii=False)
print(out['counts'])
