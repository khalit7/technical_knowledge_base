Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a as of 2026-10-01T11:00:14.628Z:
<page url="https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a" icon="📊">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-2-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Topic: benchmarks"}
</properties>
<iconMetadata>{"type":"emoji","emoji":"📊"}</iconMetadata>
<content>
# Video
A narrated 6-minute explainer derived from this page. The page stays canonical: the video is a derived representation, and every figure it states comes from here.
<video src="https://prod-files-secure.s3.us-west-2.amazonaws.com/13e79c56-ebab-4528-83aa-967a204b1f04/51ac96c3-903d-4110-be4c-d03bc05f9ae8/topic_benchmarks_overview.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466W2633PBF%2F20261004%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261004T090110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEPn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJGMEQCIAmUxzysZBvTutjq1AmDm8mM1VN2BM9VfT%2FYmhQ397NhAiAKcjk7ZZOHIqXOQK0JqZJNVzMBIeOr8wsvMYKt8CXQIyqIBAjB%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDYzNzQyMzE4MzgwNSIM%2FzX%2FykKGaf9mrWE%2FKtwDnXEW3tmabe4W4SSLWDR9d9y9b2czAK2%2F1PM9Ks7Or3YL1IzA4IlEP%2Bwl0xHL8%2FIkVicYatiVQj%2BRXDyGhqI%2Fp4heWddduDX7g74SKV7r45kiyYhA8SB4kkdB3xyUBiF226Yd%2BIoAB%2FOyV3mIhkDAx1gpXbPEiwXHz6FfJeb9UvECRTbV4LfjicwUkuGr1RztajL3uzM3mQ%2Bg2ONtdk%2FWSQnTgqPYzRKKptr1oTcJqYFvPOq%2B9%2B0lxJoFMPvOiBLAxarAGMxfqQKGTRw37kdZMqgXM0e8KDwcz4xad8B2g0x%2F%2FxXQTXl1gRK%2FjYfWprAdcGuY8H%2BjTHSppFq9PdF3lRw4EAW%2FIYLwwNoqO2HgKkpX3gfpl8q2moeDi1Mxt1MiT1QI5ebMsxXvsxg%2BU1ySUmHUjIxRLDVOWTWPvh6h%2FHZoQcOy2bPP9Fx5JYJeVSYSHhOtV1hPr7VN3vZImHamIDnPWEglXEe8Ic%2FBd%2Fit1cTdNlzP8ZuTqXuVyjRXecyoyBzXavOuUu7serrECZ5dWb%2BCyCYrj0WDCrClxLO%2F84cLRYWQKQLuwDG4iJe1%2FT4QccjRosCJ6BRBpnaN%2FfDLkVbM4XtaFeb9X9uvnp8%2BlUomuRDnsDuBkXOWAvswv6iI1gY6pgGeKUaGWoUS2k1F0jWM7P0K5UnRCtnNPASjHGDOo6991iZmUs%2FCuyKBAYJCC1YJtP1qenPm00I9lu3T1X%2B93KVrl47HEtZ5BmMUG242Gtw4WZvn1IcD66hb4kFwHICOJwDnpVUpEdlFalIMQPZgo9a4dmLMTiCbnWVJFqBs0Err1GKN%2BbIXODYoI5q7VSHdqDrTkZR22DVAhzVOZBZHCqoN48%2BoJrsP&X-Amz-Signature=0895da93b75458983ec749557f5b0efd6cfa09e4fefb7f1556f338bdcf28b35e&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.3e45c17b-0d0d-818f-8b50-e97d92273b25.13e79c56-ebab-4528-83aa-967a204b1f04">Topic: benchmarks: what a headline number leaves out</video>
*This video was re-cut on 23 September 2026 and does not cover the Terminal-Bench 4.0 and Terminal-Bench-Science 0.1 figures from the late-September frontier releases, the OSWorld 2.0 naming split, SWE-Bench Pro v2, the SchrodingerRepo repository-memorisation result, or the Artificial Analysis Intelligence Index v4.3 revision. The page moved past it on 28 September 2026.*
⏱ 20 min read · +4h 13m resources
The benchmark landscape turns over fast: anything a frontier model scores above \~90% on
stops discriminating, and most pre-2024 static benchmarks are now saturated,
contaminated, or both. The active frontier as of Sep 2026: HLE, ARC-AGI-3, FrontierMath
(upper tiers), SWE-bench Pro, Terminal-Bench 4.0, Terminal-Bench-Science, Real-SWE, OSWorld-Verified, tau2-bench, and
live/rolling sets (LiveCodeBench, AIME of the current year, SWE-rebench).
## The active frontier, and what each one hides
That sentence is a list of names until you know where each one misleads you. Mechanism, metric and errata are on the deep dives below; here is only the failure each headline number conceals.
- **HLE**: the answer key is the ceiling, and the LLM judge is part of the instrument. FutureHouse found roughly 29% of text-only chemistry and biology answers contradicted by peer-reviewed literature, Scale's own review roughly 18% expert disagreement, so absolute scores are worth far less than same-harness deltas. Search access moves the number by 10 to 20 points, so check the tools setting first.
- **ARC-AGI-3**: novel interactive environments limit pretraining contamination structurally, and harness quality replaces it as the confound. A number with no harness named alongside it measures scaffolding, not capability; the worked case is the next section.
- **FrontierMath**: programmatic checking of large exact answers removes grading ambiguity, and privacy handles leakage, so the exposure is governance instead. OpenAI funded the benchmark and had access to most problems, disclosed late, so quote Epoch's independently maintained holdout. Only the 50-problem Tier 4 still discriminates.
- **SWE-bench Pro**: "percent resolved" scores a model plus a scaffold, not a model, and across the public split under Scale's standardised harness, vendor scaffolds, and the private commercial split the same benchmark spans 47 to 80%. A figure quoted without its split and its harness carries no information.
- **Terminal-Bench 4.0**: the version reset is the catch. 4.0 recalibrated per-task time, CPU and memory, and on a benchmark where the agent gets a shell and a wall-clock budget those limits are part of the task definition, so 2.x and 4.0 are not comparable even on the tasks that survived. Pin the version and the scaffold.
- **Terminal-Bench-Science 0.1**: the deliberately unsaturated successor line and the least saturated agent headline, which also makes it the sharpest measurement of how fast a new headline is consumed.
- **OSWorld-Verified**: the Verified revision exists because roughly 300 tasks or checkers in the original were broken and were flattening scores for spurious reasons, which is the transferable lesson: on environment benchmarks a plateau is a bug report until proven otherwise. Headroom is nearly gone, and gold answers have been publicly fetchable.
- **tau2-bench**: its contribution is the metric. **pass\^k**, the probability that all k independent trials succeed, measures reliability rather than best case, and pass\^8 collapses far below pass\^1 for most models because consistency, not capability, is the production bottleneck. The weakness is that the simulated user is itself a model, so part of what you measure is the user simulator's behaviour.
- **LiveCodeBench**: contamination control by construction rather than by promise, because every problem carries its release date. Recent windows are saturating and contest problems are a narrow slice of real coding; LiveCodeBench Pro answers the first, not the second.
- **AIME of the current year, under the MathArena protocol**: freshness is the whole design, so the benchmark is really the protocol, not the dataset, and each vintage is near-solved within about a year. The trap is sampling: pass@1 and maj@32 differ by many points and the binomial error bar on a 30-item set is several points wide, so a score quoted without temperature, token budget and repetition count is not comparable to another one.
- **SWE-rebench**: decontamination by the calendar, built because models resolve issues in repositories created before their cutoff notably better than after it, so part of any static SWE-bench score is repository memorisation rather than engineering. The price is that a set refreshed monthly cannot support a stable time series, so it is an honesty check against SWE-bench Verified rather than a headline number.
## Taxonomy
```mermaid
mindmap
  root((LLM/ML benchmarks))
    Knowledge
      MMLU / MMLU-Pro
      GPQA Diamond
      HLE
      AA-Briefcase
      SimpleQA
    Math
      GSM8K
      MATH / MATH-500
      AIME / HMMT / MathArena
      FrontierMath
      PutnamBench
    Coding
      HumanEval / MBPP / EvalPlus
      LiveCodeBench / LCB Pro
      SWE-bench family / Real-SWE
      Phi-Bench
      Aider Polyglot
      BigCodeBench
    Agentic
      GAIA
      OSWorld / WebArena
      tau-bench / tau2-bench / Hyper-tau-bench
      Terminal-Bench / Terminal-Bench-Science
      EdgeBench
      Emergence World
      HarnessDev
      MOLE
      BrowseComp
      MCP evals
      METR time horizons
      GDPval
    Long context
      RULER
      LongBench v2
      GDP.pdf
      NIAH / MRCR
      Fiction.liveBench
    Reasoning
      ARC-AGI 1/2/3
      BIG-Bench Hard
      HellaSwag / WinoGrande
      SimpleBench
    Instruction following
      IFEval
      MultiChallenge
    Human preference
      LMArena
      Arena-Hard
      AlpacaEval 2 / MT-Bench
    Safety
      TruthfulQA
      HarmBench / AgentHarm
      AIR-Bench
    Multimodal
      MMMU / MMMU-Pro
      MathVista / ChartQA
      Video-MME
    Multilingual
      MGSM
      Global-MMLU
      FLORES-200
    Tool use
      BFCL
    Classic era
      GLUE / SuperGLUE
      SQuAD
      ImageNet
```
## Master table
Status legend: **active** (still discriminates at the frontier), **saturating** (top
models cluster above \~85-90%), **saturated** (no frontier signal), **contaminated**
(train-set leakage documented), **retired** (nobody reports it on new model cards).
<table fit-page-width="true" header-row="true">
<tr>
<td>Benchmark</td>
<td>Year</td>
<td>Measures</td>
<td>Format / metric</td>
<td>Status (Sep 2026)</td>
</tr>
<tr>
<td>MMLU</td>
<td>2020</td>
<td>57-subject exam knowledge</td>
<td>4-way MCQ, accuracy</td>
<td>Saturated (\~92%+ frontier), contaminated; replaced by MMLU-Pro then GPQA/HLE</td>
</tr>
<tr>
<td>MMLU-Pro</td>
<td>2024</td>
<td>Harder MMLU, 10 options, more reasoning</td>
<td>MCQ, CoT accuracy</td>
<td>Saturating at frontier; still useful mid-tier</td>
</tr>
<tr>
<td>GPQA Diamond</td>
<td>2023</td>
<td>Graduate science, "Google-proof"</td>
<td>4-way MCQ, accuracy</td>
<td>Saturated at the frontier (Astra 96.0%, Muse Spark 1.3 94%); dropped from the Artificial Analysis Intelligence Index as saturated, Sep 2026. Still separates the 60-90 band.</td>
</tr>
<tr>
<td>AA-Briefcase</td>
<td>2026</td>
<td>Agentic knowledge work, private test set</td>
<td>Task success</td>
<td>Active; added to the Artificial Analysis Intelligence Index v4.2 (Sep 2026) as one of GPQA Diamond's two replacements</td>
</tr>
<tr>
<td>GDP.pdf</td>
<td>2026</td>
<td>Long-context document reasoning across 4,592 PDF pages</td>
<td>Accuracy</td>
<td>Active, nowhere near saturation (GPT-6 Astra 33.2%, GPT-5.6 Sol 28.2%, Claude Fable 5.1 26.2%)</td>
</tr>
<tr>
<td>HLE (Humanity's Last Exam)</td>
<td>2025</td>
<td>2,500 expert frontier questions, all fields</td>
<td>Short answer + MCQ, judge-graded accuracy</td>
<td>Active headline benchmark; \~46% no-tools SOTA, 55-65% with tools; known errata (see deep dive)</td>
</tr>
<tr>
<td>SimpleQA</td>
<td>2024</td>
<td>Short-form factuality, hallucination rate</td>
<td>Open QA; correct / incorrect / not attempted</td>
<td>Active for factuality reporting</td>
</tr>
<tr>
<td>HellaSwag / WinoGrande / ARC-Challenge (AI2)</td>
<td>2018-19</td>
<td>Commonsense completion</td>
<td>MCQ, accuracy</td>
<td>Saturated, retired from model cards</td>
</tr>
<tr>
<td>BIG-Bench Hard</td>
<td>2022</td>
<td>23 hard BIG-Bench tasks</td>
<td>Mixed, accuracy</td>
<td>Saturated; BBEH (2025) partial successor</td>
</tr>
<tr>
<td>GSM8K</td>
<td>2021</td>
<td>Grade-school word-problem math</td>
<td>Free-form, exact match</td>
<td>Saturated (\>95%) and heavily contaminated; GSM-Symbolic showed template overfit</td>
</tr>
<tr>
<td>MATH / MATH-500</td>
<td>2021</td>
<td>Competition math to AMC level</td>
<td>Free-form, exact match</td>
<td>Saturated at frontier</td>
</tr>
<tr>
<td>AIME (yearly)</td>
<td>2024-</td>
<td>Olympiad-qualifier math, 30 problems/yr</td>
<td>Integer answer, accuracy</td>
<td>Active as a rolling set; each vintage saturates within \~1 yr (AIME'24-'25 near-solved)</td>
</tr>
<tr>
<td>HMMT / MathArena</td>
<td>2025-</td>
<td>Fresh competition math, evaluated at contest time</td>
<td>Free-form, accuracy</td>
<td>Active; contamination-resistant by design</td>
</tr>
<tr>
<td>FrontierMath</td>
<td>2024</td>
<td>Research-level math (Epoch AI, mostly private)</td>
<td>Auto-verifiable answers</td>
<td>Active at upper tiers; base tiers \~89% SOTA, Tier 4 v2 is the frontier</td>
</tr>
<tr>
<td>PutnamBench / miniF2F</td>
<td>2022-24</td>
<td>Formal theorem proving (Lean)</td>
<td>Verifier-checked proof</td>
<td>Active, niche</td>
</tr>
<tr>
<td>HumanEval</td>
<td>2021</td>
<td>Function-level Python codegen</td>
<td>pass@1 (unit tests)</td>
<td>Saturated (\>99%), retired</td>
</tr>
<tr>
<td>MBPP / EvalPlus</td>
<td>2021/23</td>
<td>Basic programs; stricter test suites</td>
<td>pass@1</td>
<td>Saturated, retired</td>
</tr>
<tr>
<td>LiveCodeBench</td>
<td>2024</td>
<td>Rolling contest problems (LeetCode/AtCoder/Codeforces)</td>
<td>pass@1 on post-cutoff window</td>
<td>Active; frontier \~90%+ on recent windows, saturating</td>
</tr>
<tr>
<td>LiveCodeBench Pro</td>
<td>2025</td>
<td>Olympiad-grade competitive programming</td>
<td>Elo-style rating vs humans</td>
<td>Active frontier benchmark</td>
</tr>
<tr>
<td>Codeforces rating evals</td>
<td>2024-</td>
<td>Live contest performance</td>
<td>Elo/percentile</td>
<td>Active; frontier models at grandmaster-level ratings</td>
</tr>
<tr>
<td>SWE-bench (full/Lite)</td>
<td>2023</td>
<td>Real GitHub issue resolution</td>
<td>% resolved (fail-to-pass tests)</td>
<td>Superseded by Verified; contamination and solution-leak issues</td>
</tr>
<tr>
<td>SWE-bench Verified</td>
<td>2024</td>
<td>Human-validated 500-task subset</td>
<td>% resolved</td>
<td>Saturating (\~97% SOTA); headline moved to SWE-bench Pro</td>
</tr>
<tr>
<td>SWE-bench Pro</td>
<td>2025</td>
<td>Harder, contamination-guarded repos; public + private splits</td>
<td>% resolved</td>
<td>Active headline coding-agent benchmark (\~59-80% depending on split/scaffold). Superseded as the hard target by SWE-Bench Pro v2 below, so a "SWE-bench Pro" figure now needs its major version as well as its split and harness.</td>
</tr>
<tr>
<td>SWE-Bench Pro v2</td>
<td>2026</td>
<td>Repository-level issue resolution, 642 tasks drawn from 11 repositories</td>
<td>% resolved, public and held-out splits</td>
<td>Active and deliberately unsaturated: the strongest models reach only about 23% on the public set. Built because SWE-bench Verified went soft, and the reported failure shape is the useful part, since smaller models collapse specifically on multi-file scenarios rather than degrading evenly, which is a residual an evaluation should decompose rather than average.</td>
</tr>
<tr>
<td>SWE-bench Multimodal</td>
<td>2024</td>
<td>Visual bug reports (JS repos)</td>
<td>% resolved</td>
<td>Active, less reported</td>
</tr>
<tr>
<td>SWE-rebench</td>
<td>2025</td>
<td>Continuously refreshed SWE tasks</td>
<td>% resolved</td>
<td>Active, decontaminated by recency</td>
</tr>
<tr>
<td>SchrodingerRepo</td>
<td>2026</td>
<td>Whether a repository-level coding score survives removing familiar repository cues</td>
<td>Paired % resolved and interaction cost, on dynamically transformed repositories</td>
<td>Active, and a method rather than a leaderboard. Four behaviour-preserving transformations at evaluation time (problem-statement reconstruction, namespace remapping, intra-file layout reordering, functionality-preserving rewriting) consistently degrade agent performance and raise interaction cost on SWE-bench Verified and SWE-QA, with exploration and localisation the dominant cost drivers. The aggregator that surfaced it records a 6 to 14 point gap; the abstract states direction rather than a figure.</td>
</tr>
<tr>
<td>Aider Polyglot</td>
<td>2024</td>
<td>Multi-language edit/diff correctness</td>
<td>% solved</td>
<td>Active in practitioner circles</td>
</tr>
<tr>
<td>BigCodeBench</td>
<td>2024</td>
<td>Library-heavy codegen</td>
<td>pass@1</td>
<td>Saturating</td>
</tr>
<tr>
<td>Terminal-Bench 1.0/2.0/2.1/4.0</td>
<td>2025</td>
<td>End-to-end tasks in a terminal sandbox</td>
<td>% tasks passed</td>
<td>Active; 4.0 is current (Sep 2026: recalibrated task resources, task fixes, saturated tasks removed). Claude Opus 5.5 66.4%, GPT-6 Astra 57.9%, Claude Fable 5.1 55.8%, Claude Opus 5 52.3%, Grok 4.7 38.0%. 2.x scores are not comparable to 4.0, so a 2.x figure quoted beside these is a false comparison rather than an old one.</td>
</tr>
<tr>
<td>Terminal-Bench-Science 0.1</td>
<td>2026</td>
<td>Research workflows in a terminal sandbox: 70 expert-curated tasks across five science domains</td>
<td>% tasks resolved</td>
<td>Active and still the least saturated agent headline, but only just, and the rate is the finding: a 30.0% top score at launch in Aug 2026 (Claude Opus 5), 52.6% a week later (Claude Fable 5.1), and 64.6% for GPT-6 Astra as reported on Anthropic's own Opus 5.5 comparison table, where Opus 5.5 itself reaches 58.7%. 34.6 points of headroom in roughly seven weeks. 0.2 in development</td>
</tr>
<tr>
<td>Real-SWE</td>
<td>2026</td>
<td>Licensed tasks from real companies' private production repositories</td>
<td>% resolved over scored rollouts, each model in its native harness</td>
<td>Active; contamination-proof by licensing rather than by recency. Fable 5.1 leads at 38.8%, roughly 20 points below the same models' Terminal-Bench 4.0 scores</td>
</tr>
<tr>
<td>Phi-Bench</td>
<td>2026</td>
<td>Whether a model can build the AI infrastructure it runs on: kernels, multi-file repositories, end-to-end optimisation</td>
<td>% of 85 tasks passed across nine categories</td>
<td>Active, far from saturation (Claude Opus 5 36.53%)</td>
</tr>
<tr>
<td>GAIA</td>
<td>2023</td>
<td>General assistant: web, tools, files</td>
<td>Exact-match answer, 3 levels</td>
<td>Saturating; shown gameable (Berkeley RDI 98% exploit)</td>
</tr>
<tr>
<td>WebArena / VisualWebArena</td>
<td>2023/24</td>
<td>Self-hosted realistic web tasks</td>
<td>Functional success rate</td>
<td>Saturating; scaffold-sensitive, gameable</td>
</tr>
<tr>
<td>OSWorld / OSWorld-Verified / OSWorld 2.0</td>
<td>2024/25</td>
<td>Full desktop computer use (Linux VM)</td>
<td>Execution-checked success</td>
<td>Active but nearing saturation. Three names are in circulation and they are not one scale: the original, the Verified revision that exists because roughly 300 tasks or checkers were broken, and OSWorld 2.0, which is what current vendor cards report. On OSWorld 2.0: Claude Opus 5.5 81.8%, Claude Opus 5 74.0%, GPT-6 Astra 72.6%, GPT-6 Sol 60.5% offline at extra-high effort. A figure quoted without which of the three it came from carries no information.</td>
</tr>
<tr>
<td>tau-bench</td>
<td>2024</td>
<td>Tool-agent-user conversations under policy (retail/airline)</td>
<td>pass\^k reliability</td>
<td>Superseded by tau2</td>
</tr>
<tr>
<td>tau2-bench</td>
<td>2025</td>
<td>Dual-control user + agent, telecom domain added; 2026 update adds voice and retrieval</td>
<td>pass\^k</td>
<td>Active standard for customer-service agents</td>
</tr>
<tr>
<td>Hyper-tau-bench (Sierra)</td>
<td>2026</td>
<td>Agents that build agents, working alone against paired with an engineer</td>
<td>% of held-out tasks passed</td>
<td>Active; Claude Opus 5 at maximum reasoning passes 23.9% alone against 82.2% paired, a 3.4x gap on identical work</td>
</tr>
<tr>
<td>AutomationBench 1.0.6</td>
<td>2026</td>
<td>Agent workflows across 47 tools, reported with cost per task</td>
<td>Task success plus dollars per task</td>
<td>Active and far from saturation. GPT-6 Sol 33.2% at high effort for \$0.27 per task, Claude Opus 5 26.9% at roughly nine times the cost. One of the few suites whose headline pairs a score with a price, which is what makes a cost claim checkable at all. The unversioned "AutomationBench" figures recorded elsewhere in this knowledge base have not been matched to a version, so do not quote them in the same breath as these.</td>
</tr>
<tr>
<td>Agents' Last Exam</td>
<td>2026</td>
<td>Agentic professional work across 55 sub-industries</td>
<td>Task success</td>
<td>Active, young, single reported figure: GPT-6 Sol 56.4% at maximum effort. Nothing independent yet, so treat the number as a vendor card entry rather than a leaderboard position.</td>
</tr>
<tr>
<td>AgentBench</td>
<td>2023</td>
<td>8-environment agent suite</td>
<td>Mixed</td>
<td>Retired in practice</td>
</tr>
<tr>
<td>BrowseComp</td>
<td>2025</td>
<td>Hard-to-find web research questions</td>
<td>Accuracy</td>
<td>Active for deep-research agents</td>
</tr>
<tr>
<td>MCP-Universe / MCPMark / MCP-Bench</td>
<td>2025</td>
<td>Tool use through real MCP servers</td>
<td>Task success</td>
<td>Active, young; see agentic deep dive</td>
</tr>
<tr>
<td>METR HCAST + time horizons</td>
<td>2024-</td>
<td>Human task-length at 50% agent success</td>
<td>Time-horizon curve</td>
<td>Active; the "doubling every \~7 months" metric</td>
</tr>
<tr>
<td>GDPval</td>
<td>2025</td>
<td>Economically valuable occupational tasks</td>
<td>Expert pairwise win-rate</td>
<td>Active, OpenAI-run</td>
</tr>
<tr>
<td>GDPval-AA v2.1</td>
<td>2026</td>
<td>Economically valuable occupational tasks, Artificial Analysis variant of GDPval</td>
<td>Elo from expert pairwise comparison</td>
<td>Active; Claude Opus 5.5 1846, Claude Opus 5 1708, GPT-6 Astra 1542. Note it is a different instrument from the OpenAI-run GDPval above, with its own version number, and the Elo scale means only differences are meaningful.</td>
</tr>
<tr>
<td>MOLE</td>
<td>2026</td>
<td>Whether a monitor catches agent harm: 150 AI-operated accounts sharing nine stateful services over 30 simulated workdays</td>
<td>Harm-completion rate and monitor detection rate</td>
<td>Active; the subject of measurement is the monitor, not the agent</td>
</tr>
<tr>
<td>Emergence World</td>
<td>2026</td>
<td>Persistent multi-agent worlds run for 16 days under three adversarial stress tests</td>
<td>Resilience and containment observations</td>
<td>Active; the only entry here whose episodes do not end, which is what lets it see drift and compounding failure</td>
</tr>
<tr>
<td>EdgeBench</td>
<td>2026</td>
<td>51 agent tasks reporting cost per hour alongside success</td>
<td>Success rate plus cost per hour</td>
<td>Active; one of the few suites that can express an efficiency result at all</td>
</tr>
<tr>
<td>HarnessDev</td>
<td>2026</td>
<td>Whether an LLM can create its own agent harness and then evolve it from feedback</td>
<td>Downstream task success and execution-token cost over 2,207 instances</td>
<td>Active; generated harnesses trail human-engineered ones on code and search, match them on writing and ML experimentation, and evolution gains transfer poorly</td>
</tr>
<tr>
<td>Vals AI Legal Research Bench</td>
<td>2025</td>
<td>Legal research correctness on a validation set</td>
<td>% correctness checks passed</td>
<td>Active and index-sensitive: 54% with a licensed legal index against 38.7% with web search on identical weights</td>
</tr>
<tr>
<td>ARC-AGI-1</td>
<td>2019</td>
<td>Abstract grid puzzles, fluid intelligence</td>
<td>% tasks (2 tries)</td>
<td>Solved at frontier (o3, late 2024); prize track retired. Now cheaply reproducible: 44% from a small transformer trained from scratch for roughly 67 cents (Sep 2026)</td>
</tr>
<tr>
<td>ARC-AGI-2</td>
<td>2025</td>
<td>Harder ARC, efficiency-aware</td>
<td>% tasks + cost axis</td>
<td>Rapidly saturating through 2026 (high-60s to low-90s depending on leaderboard, from \~4% in early 2025)</td>
</tr>
<tr>
<td>ARC-AGI-3</td>
<td>2026</td>
<td>Interactive game environments, agentic exploration</td>
<td>% environments solved</td>
<td>Active, but harness-dominated: humans 100%; bare or default-harness SOTA \~30%, rising to 95.5% (Prime Agent) and 100% (Nvidia AVO) with a research harness (Aug 2026). Since Sep 2026 ARC Prize publishes two labelled harnesses per model: GPT-6 Astra 62.7% standard provider-agnostic, 99.9% Provider Adapter. Always report the harness.</td>
</tr>
<tr>
<td>SimpleBench</td>
<td>2024</td>
<td>Trick/commonsense questions where humans beat LLMs</td>
<td>MCQ</td>
<td>Active, informal</td>
</tr>
<tr>
<td>RULER</td>
<td>2024</td>
<td>Synthetic long context (retrieval, tracing, aggregation)</td>
<td>Accuracy vs length</td>
<td>Active for context-length claims</td>
</tr>
<tr>
<td>LongBench v2</td>
<td>2024</td>
<td>Realistic long-document understanding</td>
<td>MCQ</td>
<td>Active</td>
</tr>
<tr>
<td>NIAH / MRCR / Fiction.liveBench</td>
<td>2023-25</td>
<td>Needle retrieval; multi-round co-reference; long narrative</td>
<td>Accuracy vs depth/length</td>
<td>NIAH saturated (marketing only); MRCR and Fiction.liveBench active</td>
</tr>
<tr>
<td>IFEval</td>
<td>2023</td>
<td>Verifiable instruction constraints</td>
<td>% constraints satisfied</td>
<td>Saturating but still standard on model cards</td>
</tr>
<tr>
<td>MultiChallenge / IFBench</td>
<td>2025</td>
<td>Multi-turn instruction following</td>
<td>Judge/verifier score</td>
<td>Active</td>
</tr>
<tr>
<td>LMArena (Chatbot Arena)</td>
<td>2023</td>
<td>Crowd pairwise preference</td>
<td>Elo (Bradley-Terry)</td>
<td>Active but critiqued (Leaderboard Illusion); frontier cluster \~1510-1525</td>
</tr>
<tr>
<td>Arena-Hard (v2)</td>
<td>2024</td>
<td>Hard arena prompts, judge-graded offline</td>
<td>Win-rate vs baseline</td>
<td>Active arena proxy</td>
</tr>
<tr>
<td>AlpacaEval 2 (LC)</td>
<td>2023</td>
<td>Judge win-rate, length-controlled</td>
<td>Win-rate</td>
<td>Fading; gameable</td>
</tr>
<tr>
<td>MT-Bench</td>
<td>2023</td>
<td>Multi-turn judged quality</td>
<td>1-10 judge score</td>
<td>Retired</td>
</tr>
<tr>
<td>TruthfulQA</td>
<td>2021</td>
<td>Imitative falsehoods</td>
<td>MCQ / generation</td>
<td>Mostly retired; design critiqued</td>
</tr>
<tr>
<td>HarmBench / StrongREJECT / AgentHarm</td>
<td>2024</td>
<td>Jailbreak robustness; harmful agent tasks</td>
<td>Attack success rate</td>
<td>Active in safety evals</td>
</tr>
<tr>
<td>AIR-Bench</td>
<td>2024</td>
<td>Regulation-derived risk taxonomy</td>
<td>Refusal accuracy</td>
<td>Active</td>
</tr>
<tr>
<td>MASK</td>
<td>2025</td>
<td>Honesty under pressure (belief vs claim)</td>
<td>Consistency score</td>
<td>Active</td>
</tr>
<tr>
<td>MMMU / MMMU-Pro</td>
<td>2023/24</td>
<td>College-level multimodal reasoning</td>
<td>MCQ</td>
<td>MMMU saturating; Pro active</td>
</tr>
<tr>
<td>MathVista / ChartQA / DocVQA</td>
<td>2023-</td>
<td>Visual math, charts, documents</td>
<td>Accuracy</td>
<td>Saturating</td>
</tr>
<tr>
<td>Video-MME / VideoMMMU</td>
<td>2024/25</td>
<td>Video understanding</td>
<td>MCQ</td>
<td>Active</td>
</tr>
<tr>
<td>MGSM</td>
<td>2022</td>
<td>GSM8K in 11 languages</td>
<td>Exact match</td>
<td>Saturated</td>
</tr>
<tr>
<td>Global-MMLU / MMMLU / INCLUDE</td>
<td>2024</td>
<td>Culturally-aware multilingual knowledge</td>
<td>MCQ</td>
<td>Active for multilingual claims</td>
</tr>
<tr>
<td>FLORES-200</td>
<td>2022</td>
<td>Machine translation, 200 languages</td>
<td>chrF/BLEU</td>
<td>Active in MT niche</td>
</tr>
<tr>
<td>BFCL (Berkeley Function Calling)</td>
<td>2024</td>
<td>Function/tool-call correctness</td>
<td>AST + execution accuracy</td>
<td>Active (v4 is agentic)</td>
</tr>
<tr>
<td>GLUE / SuperGLUE</td>
<td>2018/19</td>
<td>Fine-tuned NLU (BERT era)</td>
<td>Aggregate score</td>
<td>Retired; historical</td>
</tr>
<tr>
<td>SQuAD 1.1/2.0</td>
<td>2016/18</td>
<td>Extractive reading comprehension</td>
<td>EM/F1</td>
<td>Retired; historical</td>
</tr>
<tr>
<td>ImageNet (ILSVRC)</td>
<td>2009/12</td>
<td>Image classification; started the deep-learning era</td>
<td>top-1/top-5 accuracy</td>
<td>Retired as a frontier target; still a reference staple</td>
</tr>
</table>
## What a benchmark number conceals
**A harness-sensitive number reported without a named harness carries no information.** ARC-AGI-3 is the worked case. It read as a 30% benchmark through mid-2026, and then three independent results moved that same baseline without touching the model: Nvidia's Agentic Variation Operators reached 100% (Aug 21, 2026), Prime Agent's four-level state hierarchy 95.5% RHAE Best@1 (Aug 24, 2026, [arXiv 2608.23552](https://arxiv.org/abs/2608.23552) (45 min)), and <mention-page url="https://app.notion.com/p/3c65c17b0d0d81899098d8153e100691"/> made the analogous point on Terminal-Bench 2.1. What was being measured was scaffolding quality rather than model capability, which is the same failure <mention-page url="https://app.notion.com/p/3c65c17b0d0d8143abd0e126338fb9dd">Benchmark methodology: how benchmarks are used, misused, and die</mention-page> records for GAIA and WebArena, arriving on the benchmark that was supposed to be resistant to it. Harness detail lives in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb"/>.
**ARC Prize has institutionalised the fix: two labelled harnesses per model.** For GPT-6 Astra it publishes 62.7% on the **standard** provider-agnostic harness for \$26,098 and 99.9% on a **Provider Adapter** harness for \$18,817, both labelled on the leaderboard. The adapter preserves opaque reasoning state between requests and compacts long conversations rather than forcing visible note-taking, and ran about 3.66x faster on 49% fewer tokens. ARC Prize's position is that these are different questions: the standard harness asks what a system does under neutral conditions, the adapter asks whether a model exploits its own provider's features. The implication generalises: once a model reasons partly in latent state, a neutral harness cannot reach part of its capability, so provider-neutral evaluation and best-achievable evaluation have permanently separated. Human participants cost roughly \$12.78 per attempted game for comparison. The spread here is not a few points but the entire range of the scale, which is what makes it the standard citation when a vendor benchmark arrives with no harness detail. [ARC Prize](https://arcprize.org/blog/astra) (15 min), [TNW](https://thenextweb.com/news/openai-astra-arc-agi-3-harness-62-7-vs-99-9-benchmark-revisions) (8 min)
**The cost axis spans five orders of magnitude on one benchmark family.** A single-author write-up reports training a small transformer from scratch in about 1.5 hours on one RTX 5090, for roughly 67 cents, reaching 44% on ARC-AGI-1 and 7% on ARC-AGI-2, beating many LLMs and matching TRM and HRM. Set against the \$18,817 and \$26,098 Astra runs above, the pairing is the lesson: on the same benchmark family the method matters as much as the scale, and an ARC number quoted alone conceals whichever of the two produced it, exactly as it conceals the harness. Reproducible on hardware Khalid already owns. [Write-up](https://mvakde.github.io/blog/44-on-arc-1/) (20 min)
**Harness choice moves the bill more than it moves the score.** An evaluation of 21 model-and-harness pairs (seven models across three harnesses, Sep 2026) found that harness choice barely changed task success rate but changed cost significantly. EdgeBench, the 51-task evaluation behind SoL-Pi, is one of the few agent benchmarks reporting cost per hour alongside task performance, which is what let SoL-Pi show a 44.7 to 49.0% reduction in recorded token traffic at task parity. A suite that reports only success rate cannot express an efficiency result at all, which is why the efficiency literature has been thin, and the two results together say the harness sensitivity above shows up mainly in the bill.
**A retrieval-sensitive number reported without a named index carries no information either.** OpenAI's Astra for Law (Sep 17, 2026) passes correctness checks on **54%** of the Vals AI Legal Research Bench validation set against **38.7%** for the same GPT-6 Astra model using standard web search, a 40% relative improvement on identical weights. The difference is a proprietary index of more than 230 million legal URLs built on the Free Law Project's CourtListener, covering over 99.9% of published US precedential case law. The retrieval side of this is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b"/>.
**A repository-level coding number conceals whether the model had seen the repository, and that is now measurable rather than arguable.** SchrodingerRepo instantiates the test repository **dynamically at evaluation time** under four transformations that preserve executable behaviour: the problem statement is reconstructed, namespaces are remapped, intra-file layout is reordered, and the code is rewritten without changing what it does. The task is the same; the familiar cues are gone. On SWE-bench Verified and SWE-QA, removing them **consistently degrades agent performance and substantially increases interaction cost** across models, with repository exploration and localisation identified as the dominant cost drivers, so part of what a static SWE-bench score measures is knowing where to look rather than knowing what to do. The aggregator that surfaced the paper records the gap as 6 to 14 points; the abstract states the direction rather than a figure, and the range is carried with that attribution rather than as the paper's own claim. This is the third sensitivity to hold beside the two already on this page. A harness-sensitive number needs its harness. An item-defective suite needs its residual decomposed. And a repository-level number needs to say whether the repository was familiar, which SWE-rebench answered by the calendar and this answers by construction: refreshing a set monthly keeps contamination out of new items, transforming a set keeps it out of the items you already have, and the second preserves the time series the first destroys. Full summary on <mention-page url="https://app.notion.com/p/3e95c17b0d0d81e8b0e0e99acbeb9713"/>. [arXiv 2609.27891](https://arxiv.org/abs/2609.27891) (35 min)
**What model cards do not report is now itself a finding.** A survey of current releases finds that **no major model release reports confidence calibration**, despite the measurement standards existing and being cheap to run. Set against everything else on this page, which is about numbers that mislead, this is the complement: a number nobody publishes at all, on a property that decides whether a model's output can be thresholded rather than merely read. Worth asking for the next time a card arrives. [arXiv 2609.26489](https://arxiv.org/abs/2609.26489) (25 min)
**An agent's stated reason for a configuration choice does not track whether the choice was good.** WhatWorkedBench finds agents selecting near-optimal settings while holding substantially wrong causal beliefs about why those settings work. That bears directly on any evaluation design that asks a model to explain its own decision as evidence of understanding, and on any harness that logs an agent's rationale as a debugging signal: the rationale is not a measurement of the process that produced the choice. [arXiv 2609.27490](https://arxiv.org/abs/2609.27490) (25 min)
## Benchmarks whose subject is the surrounding system
A cluster of benchmarks arriving in September 2026 measure something other than the model. <mention-page url="https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f"/> scores the harness, Phi-Bench scores infrastructure engineering, MOLE scores the monitor, Real-SWE scores the model-and-harness pair against code the benchmark author cannot see, Hyper-tau-bench scores the pairing of agent with human, and Emergence World scores what survives sixteen days of continuous operation. The harness rule above is the assumption these are built on rather than a correction applied to them.
**Real-SWE: the private-codebase number.** Specific Labs licensed ten tasks from real companies' production repositories and ran eight model-and-harness pairs through 640 scored rollouts, each model in its native harness. Against the Terminal-Bench 4.0 figures the same models posted a week earlier, private code costs roughly 20 points. The methodological contribution is the licensing model: the tasks cannot leak into training data because the repositories are not public, which is the only current answer to contamination that does not depend on the benchmark being new. Scores and failure modes in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8146b127fe43f5761bf0">Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro</mention-page>. [Real-SWE](https://withspecific.com/benchmarks/real-swe) (15 min)
**Phi-Bench: can a model build the infrastructure it runs on.** 85 tasks in nine categories across three escalating formats, far from saturation (Claude Opus 5 36.53%), with hardware and edge the worst category at 5.4%. Construction and scores in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8146b127fe43f5761bf0">Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro</mention-page>, full summary on <mention-page url="https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f"/>.
**MOLE: the benchmark whose subject is the monitor.** 150 AI-operated accounts sharing nine stateful services over 30 simulated workdays, 12 injected threats, roughly 20 billion tokens of monitoring corpora from four models. 72% of 39 agent models complete most assigned harmful objectives; a model's stated refusal does not predict whether it declines; the best monitors miss close to half of completed harm in a single-day audit; benchmark-guided search improves a mid-tier monitor by 49 to 64%. The refusal result generalises to everything on this topic and on <mention-page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546"/>: scoring the response string measures the wrong variable. Full summary on <mention-page url="https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9"/>.
**Hyper-tau-bench: the agent is not the unit of measurement.** Sierra's Hyper-tau-bench evaluates agents that build agents. Claude Opus 5 at maximum reasoning passes 23.9% of held-out tasks alone and 82.2% paired with an engineer who has deep context on the task, a 3.4x gap on identical work. It is the clearest measurement yet that "how well does this agent do" is not a property of the agent. [Sierra](https://sierra.ai/blog/hyper-t-bench-evaluating-agents-that-build-agents) (20 min)
**Emergence World: duration as a property of the measurement.** Almost every agent benchmark on this page scores a task that finishes. [Emergence World](https://arxiv.org/abs/2609.17320) (Emergence AI, Sep 2026) instead runs eight parallel worlds of ten agents each for **16 days**, across more than 850,000 LLM calls and roughly 50 billion tokens, from identical starting conditions, seven homogeneous populations and one mixed-model. Three adversarial stress tests are applied: indirect prompt injection, misinformation campaigns, and exposure of private agent memories. No system was resilient to all three, and the result worth carrying is that **detection did not ensure containment**: systems recognised adversarial content and kept interacting with it, in cases up to 46 hours later. Persistent operation also produced failures nobody injected, including compounding tool errors, goal drift, language opacity and coordinated refusal of assigned work, none of which can appear in a benchmark whose episodes end. Duration is therefore not a parameter of the harness but a property of the measurement, and a suite of short tasks cannot in principle detect this class of failure however many it contains. Read it next to MOLE above: MOLE says the monitor is weak, Emergence World says that even a monitor which fires does not stop the behaviour. Full summary on <mention-page url="https://app.notion.com/p/3e25c17b0d0d818fbffbc9e2ceab824b"/>.
**Benchmark items are themselves a source of error.** Experts re-graded six widely used physics suites and found wrong answer keys, ambiguous questions and grader bugs behind most of the items where frontier models had been scored wrong; corrected, the models look near-saturated. This inverts the standard reading of a benchmark gap. The residual, the part of a suite the model fails, is normally read as what the model cannot do; a substantial share of it measures what the benchmark got wrong, and the defects concentrate in exactly the hard tail people quote. Anyone owning an evaluation framework has to treat the residual as a mixture of model failure and item defect, inseparable short of expert re-grading, and the authors' conclusion follows: the next bar is harder human-written exams, not another leaderboard on the same pipeline. Full summary on <mention-page url="https://app.notion.com/p/3e25c17b0d0d8165b0c8d15600421259"/>. [arXiv 2609.13009](https://arxiv.org/abs/2609.13009) (25 min)
**Reward hacking may be detectable from the inside.** Goodfire reports that reward hacking has a legible activation signature monitorable at scale. It is a measurement proposal rather than an alignment one: if the internal state accompanying reward hacking is detectable, an evaluation harness can instrument it directly instead of inferring it from outputs that were optimised to look correct. Caveat: a signal identified in a research setting is not yet a monitor with a measured false-positive rate. [Goodfire](https://www.goodfire.com/research/reward-hacking-activation-monitors) (15 min)
**Two vendor claims carried as unverifiable.** Shanghai AI Laboratory's Atria Dawn Preview (Sep 14, 2026) reports evaluation across 16 benchmarks with "the highest reported score on five of them", without naming which five or the margins, which is not a checkable claim in the form published; its one concrete comparison is 59.6% coding against Claude's 74.7% on SWE-bench Pro. StepFun's Step 5 Preview (Sep 20, 2026) publishes its own comparison table with no technical report behind it, showing DeepSWE v1.1 at 67.7% against competitors at 74.0 to 74.1%. Both are carried in the vendor's own wording rather than reconstructed.
## How to read the landscape
- Three questions settle most of it, and none takes long. **When was it measured**, given that Terminal-Bench-Science 0.1 lost 22 points of headroom in seven days. **What harness did it run in**, given 62.7% against 99.9% for one model on one ARC-AGI-3 task set. **Has anyone checked the answer key**, given roughly 29% of HLE's text-only chemistry and biology answers contradicted by the literature. A figure that survives none of the three is not a measurement.
- Model cards now lead with: HLE, AIME (current year), SWE-bench
	Verified/Pro, Terminal-Bench 4.0, Terminal-Bench-Science, Real-SWE, ARC-AGI-2/3, OSWorld, tau2-bench, MMMU-Pro, LMArena Elo. GPQA Diamond is still printed but no longer discriminates at the frontier.
- Distrust single headline numbers: the same model and benchmark yield very different
	scores across scaffolds, splits, and aggregators (SWE-bench Pro spans 47-80%).
- Agent benchmarks have an integrity problem: Berkeley RDI's scanning agent reached near-perfect scores on 8 major agent benchmarks by reward hacking, without solving tasks. Root causes in <mention-page url="https://app.notion.com/p/3c65c17b0d0d811fb926d7b91ef8234e">Agentic benchmarks: GAIA, OSWorld, WebArena, tau2, Terminal-Bench, MCP evals</mention-page>.
- The durable designs are: private or rotating sets (FrontierMath, HLE private split),
	live sets pinned to dates (LiveCodeBench, AIME, SWE-rebench), interactive environments
	(ARC-AGI-3), and paired human baselines (METR time horizons, GDPval, OSWorld).
- Aggregators change the target, and dated the model cards written against the old one: Artificial Analysis Intelligence Index v4.2 (Sep 4, 2026) dropped GPQA Diamond outright, describing it as an exceptional scientific reasoning evaluation that has now been saturated, and added AA-Briefcase (agentic knowledge work, private test set) and GDP.pdf (long-context document reasoning across 4,592 PDF pages). The weighting change matters as much as the swap: private held-out sets went to 40% of the index on v4.2, double the previous share, explicitly to make the index harder to optimise against. Reranked lab order on v4.2: Anthropic (Claude Fable 5.1) first, OpenAI (GPT-6 Astra, roughly +85 Elo over GPT-5.6 Sol) second, then Meta, SpaceXAI, Moonshot, Zhipu and Google. [Artificial Analysis](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-2) (15 min). Three days later **v4.3** (Sep 7, 2026) moved the target again: its Terminal-Bench component went from 2.1 to 4.0, tau3-Banking was replaced by AutomationBench-AA, and the private-test weight rose from 40% to 45%; a methodology update, v4.3.2 (Sep 19), re-anchored the GDPval-AA Elo scale. Those are the only two September revisions Artificial Analysis documents, and v4.3 is the only version it now shows ([leaderboard](https://artificialanalysis.ai/leaderboards/models)), so an index figure published before 4 September, such as the high-50s and low-60s scores quoted at the launches of GLM-5.3-Flash, Gemini 3.8 Flash and Muse Spark 1.3, sits on an older scale and does not compare with a v4.3 figure. A score quoted without its index version is the aggregator form of a benchmark name without a version.
- The saturation lifecycle now runs in weeks: Terminal-Bench-Science 0.1 lost 22 points of headroom to a routine point release seven days after launch. Nothing is wrong with the benchmark; the point is the rate. The lifecycle is in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8143abd0e126338fb9dd">Benchmark methodology: how benchmarks are used, misused, and die</mention-page>.
- Carry an unverifiable or garbled figure in the source's own wording with nothing reconstructed, so it stays matchable: the 23.9% against 82.2% figure that first arrived from an aggregator under the unmatchable name tau\^tau-Bench was identified a week later as Sierra's Hyper-tau-bench, instead of quietly becoming a false fact.
## Deep dives
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d810f8574da3ffb860be5">Knowledge and reasoning benchmarks: MMLU family, GPQA, HLE, ARC-AGI</mention-page> (10 min read · +7h 5m resources): construction, errata, SOTA.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8146b127fe43f5761bf0">Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro</mention-page> (10 min read · +6h 40m resources): the lineages, the protocol traps, and what to use now.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d811fb926d7b91ef8234e">Agentic benchmarks: GAIA, OSWorld, WebArena, tau2, Terminal-Bench, MCP evals</mention-page> (10 min read · +6h 48m resources): environments, the integrity crisis, leaderboards.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8143abd0e126338fb9dd">Benchmark methodology: how benchmarks are used, misused, and die</mention-page> (9 min read · +3h resources): protocols, variance, contamination, saturation lifecycle, Goodhart, arena critiques.
- Harnesses (lm-eval-harness, Inspect, HELM) and LLM-as-judge methodology live in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546"/>, not here.
## Best resources
- [Epoch AI Benchmarking Hub](https://epoch.ai/benchmarks) (\~20 min): rigorous independent reruns with confidence intervals.
- [Artificial Analysis](https://artificialanalysis.ai) (\~20 min): standardized eval suite run uniformly across providers.
- [LMArena](https://lmarena.ai) (\~15 min) and [Scale leaderboards](https://labs.scale.com/leaderboard) (\~15 min): preference and private-split views.
- [HELM](https://crfm.stanford.edu/helm/) (\~30 min) and [BetterBench](https://betterbench.stanford.edu/) (\~15 min): benchmark-of-benchmarks perspective.
<page url="https://app.notion.com/p/3c65c17b0d0d811fb926d7b91ef8234e">Agentic benchmarks: GAIA, OSWorld, WebArena, tau2, Terminal-Bench, MCP evals</page>
<page url="https://app.notion.com/p/3c65c17b0d0d8143abd0e126338fb9dd">Benchmark methodology: how benchmarks are used, misused, and die</page>
<page url="https://app.notion.com/p/3c65c17b0d0d810f8574da3ffb860be5">Knowledge and reasoning benchmarks: MMLU family, GPQA, HLE, ARC-AGI</page>
<page url="https://app.notion.com/p/3c65c17b0d0d8146b127fe43f5761bf0">Math and coding benchmarks: GSM8K to FrontierMath, HumanEval to SWE-bench Pro</page>
</content>
</page>