#!/usr/bin/env python3
"""Build the data for the "Same model, many numbers" tab (t-same).

Writes ../data/same.json and ../parts/34_js_same_a.js (the same data as window.SM_DATA).
Every reading carries who ran it, the conditions and a source. Values read from
machine-readable leaderboards come from the files in inputs/ (fetched 2026-10-04);
values from papers, cards and posts are typed in here with the source beside them,
and the matching excerpt is in inputs/ where the page could be saved as text.

Run: python3 mk_same.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')
READ = '2026-10-04'

def load(name):
    with open(os.path.join(INP, name)) as f:
        return json.load(f)

# ---------- sources ----------
S = {
 'arc_lb': ['ARC Prize leaderboard data (v3.json, generated 2026-09-30)', 'https://arcprize.org/media/data/leaderboard/v3.json'],
 'arc_blog': ['ARC Prize, "GPT-6 Astra on ARC-AGI-3", 3 Sep 2026', 'https://arcprize.org/blog/astra'],
 'pa_paper': ['Prime Agent paper, arXiv 2608.23552v1, section 3.1 and Figure 5', 'https://arxiv.org/html/2608.23552v1#S3.SS1'],
 'pa_blog': ['Prime Intellect blog, 5 Aug 2026 (the three runs and Best@3)', 'https://www.primeintellect.ai/blog/prime-agent'],
 'pa_card': ['ARC Prize scorecard 2af780b4 (the median run)', 'https://arcprize.org/scorecards/2af780b4-f2a1-43e9-a794-b23da3cd3f9f'],
 'pa_kb': ['Prime Agent paper page in this knowledge base', 'n:3cd5c17b0d0d81579a02f0431f24c6cb'],
 'avo': ['TechCrunch, 21 Aug 2026', 'https://techcrunch.com/2026/08/21/nvidia-just-showed-that-the-harness-not-the-ai-model-is-now-the-real-hero/'],
 'aa_tb21': ['Artificial Analysis, Terminal-Bench 2.1 evaluation page (page data)', 'https://artificialanalysis.ai/evaluations/terminalbench-2-1'],
 'aa_tb40': ['Artificial Analysis, Terminal-Bench 4.0 evaluation page', 'https://artificialanalysis.ai/evaluations/terminalbench-4-0'],
 'tb_lb': ['Terminal-Bench 4.0 official leaderboard (tbench.ai, page data)', 'https://www.tbench.ai/leaderboard'],
 'tb21_news': ['Terminal-Bench team, "Terminal-Bench 2.1"', 'https://www.tbench.ai/news/terminal-bench-2-1'],
 'o55': ['Anthropic, Claude Opus 5.5 System Card (Table 8.1.A; sections 8.5, 8.11.1, 8.13.3)', 'https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf'],
 'astra': ['OpenAI, GPT-6 Astra launch page, 3 Sep 2026', 'https://openai.com/index/gpt-6-astra/'],
 'argon': ['Google, Gemini 4 Argon announcement table (image)', 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/'],
 'statem_kb': ['StateM paper page in this knowledge base', 'n:3c65c17b0d0d81899098d8153e100691'],
 'sbp_v2': ['Scale Labs, SWE-Bench Pro V2 leaderboard (updated 22 Sep 2026)', 'https://labs.scale.com/leaderboard/swe_bench_pro_public_v2'],
 'sbp_v2_blog': ['Scale Labs blog, "SWE-Bench Pro V2"', 'https://labs.scale.com/blog/swe-bench-pro-v2'],
 'sbp_v1': ['Scale Labs, SWE-Bench Pro (v1) public and commercial leaderboards', 'https://labs.scale.com/leaderboard/swe_bench_pro_public'],
 'sbp_paper': ['SWE-Bench Pro paper, arXiv 2509.16941v1, section 4', 'https://arxiv.org/pdf/2509.16941v1'],
 'osw2_lb': ['OSWorld 2.0 leaderboard (maintainers), as imported by Epoch AI', 'https://osworld-v2.xlang.ai/'],
 'osw_lb': ['OSWorld-Verified results (maintainers, unified settings), as imported by Epoch AI', 'https://os-world.github.io/'],
 'epoch_zip': ['Epoch AI benchmark data (benchmark_data.zip, read 2026-10-04)', 'https://epoch.ai/data/benchmark_data.zip'],
 'fable51': ['Anthropic, Claude Fable and Mythos 5.1, table and footnote 2', 'https://www.anthropic.com/claude-fable-and-mythos-5-1'],
 'datacamp': ['DataCamp, "GPT-6 Astra: Features, Benchmarks, and Pricing" (quoting OpenAI\'s table)', 'https://www.datacamp.com/blog/gpt-6-astra'],
 'aa_o55': ['Artificial Analysis, Claude Opus 5.5 model page', 'https://artificialanalysis.ai/models/claude-opus-5-5'],
 'aa_o55x': ['Artificial Analysis, Claude Opus 5.5 (xhigh) model page', 'https://artificialanalysis.ai/models/claude-opus-5-5-xhigh'],
 'aa_o55m': ['Artificial Analysis, Claude Opus 5.5 (medium) model page', 'https://artificialanalysis.ai/models/claude-opus-5-5-medium'],
 'l2r': ['OpenAI, "Learning to Reason with LLMs", 12 Sep 2024, text and Appendix A', 'https://openai.com/index/learning-to-reason-with-llms/'],
 'c37': ['Anthropic, Claude 3.7 Sonnet announcement table, 24 Feb 2025', 'https://www.anthropic.com/news/claude-3-7-sonnet'],
 'c37_vet': ['Anthropic, "Claude\'s extended thinking" (parallel test-time compute)', 'https://www.anthropic.com/research/visible-extended-thinking'],
 'epoch_gpqa': ['Epoch AI Benchmarking Hub, GPQA Diamond runs', 'https://epoch.ai/benchmarks'],
 'gem': ['Gemini Team, "Gemini: A Family of Highly Capable Multimodal Models", arXiv 2312.11805v1, section 5.1.1, Table 2', 'https://arxiv.org/pdf/2312.11805v1'],
 'gem_app': ['Gemini report v1, Appendix 9.1, Figure 7', 'https://arxiv.org/pdf/2312.11805v1'],
 'tnw_law': ['The Next Web, "OpenAI launches Astra for Law", 18 Sep 2026 (reporting OpenAI\'s 17 Sep figures)', 'https://thenextweb.com/news/openai-astra-for-law-gpt-6-legal-search-index'],
 'oai_law': ['OpenAI, Astra for Law announcement, 17 Sep 2026', 'https://openai.com/index/astra-for-law/'],
 'vals_lrb': ['Vals AI, Legal Research Bench leaderboard (updated 1 Oct 2026)', 'https://www.vals.ai/benchmarks/legal_research'],
 'schro': ['SchrodingerRepo paper, arXiv 2609.27891v1, Table I', 'https://arxiv.org/html/2609.27891v1#S4.T1'],
 'schro_setup': ['SchrodingerRepo paper, section IV setup', 'https://arxiv.org/html/2609.27891v1#S4.SS1'],
 'schro_kb': ['SchrodingerRepo paper page in this knowledge base', 'n:3e95c17b0d0d81e8b0e0e99acbeb9713'],
}
def src(*keys):
    for k in keys: assert k in S, k
    return list(keys)

def R(v, lab, who, **kw):
    """One reading. who = (kind, name); kind in vendor, rival, maint, indep, paper."""
    d = dict(v=v, lab=lab, who=list(who))
    d.update(kw)
    return d

cases = []

# ===== 1. ARC-AGI-3, GPT-6 Astra: two harnesses x six efforts =====
arc = load('arcprize_leaderboard_v3_2026-09-30.json')
rows = []
order = ['Max', 'XHigh', 'High', 'Medium', 'Low', 'None']
for adapter in (False, True):
    for eff in order:
        name = 'GPT-6 Astra' + (' - Provider Adapter' if adapter else '') + ' (' + eff + ')'
        e = [x for x in arc['evaluations'] if x['modelDisplayName'] == name][0]
        rows.append(R(round(e['score'] * 100, 1),
            ('Provider Adapter' if adapter else 'Standard') + ', ' + eff.lower() + ' effort',
            ('maint', 'ARC Prize Foundation'),
            grp='Provider Adapter harness' if adapter else 'Standard harness (provider-agnostic)',
            harness='Provider Adapter (keeps the provider\'s opaque reasoning state between requests, compacts long conversations)' if adapter else 'ARC Prize standard harness: fixed prompt, provider-agnostic',
            split='Semi-private set', version='ARC-AGI-3', sampling='One run per game, RHAE', effort=eff.lower(),
            tools='None beyond the game interface', date='2026-09-03',
            cost='$' + format(round(e['cost']), ','), exact=e['score'] * 100,
            src=src('arc_lb', 'arc_blog')))
cases.append(dict(
    id='arc_astra', model='GPT-6 Astra', bench='ARC-AGI-3', metric='RHAE (%)',
    short='ARC-AGI-3: GPT-6 Astra, two harnesses',
    takeaway='Same model, same semi-private games, same maintainer, same week: 17.5% to 99.9%. Only the harness and the effort setting change.',
    n=None, nnote='RHAE squares action efficiency per level and averages over games, so it is not a binomial proportion; no binomial interval is drawn.',
    readings=rows,
    notes=[
      'The adapter runs were about 3.66 times faster by recorded elapsed time and used 49% fewer tokens across the 167 game-reasoning pairs; human participants cost about $12.78 per attempted game ([[ARC Prize|https://arcprize.org/blog/astra]]).',
      'ARC Prize\'s reading: the standard harness asks what a system does under neutral conditions; the adapter asks whether a model can exploit its own provider\'s features. Both are labelled on the leaderboard, never merged.',
      'The same two-harness pattern holds for GPT-6.1 Sol on the same leaderboard: 52.7% standard against 96.2% adapter at max effort ([[v3.json|https://arcprize.org/media/data/leaderboard/v3.json]]).'],
    corrections=['The old page set 62.7% against 99.9%. Those are different effort settings: 62.7% is the standard harness at max effort, 99.9% the adapter at high effort. At equal effort the pairs are 62.7% against 98.6% (max) and 54.8% against 99.9% (high); the costs quoted ($26,098 and $18,817) belong to the max-standard and high-adapter runs respectively.']))

# ===== 2. ARC-AGI-3, Claude Opus 5: official harness against a research harness =====
o5 = [x for x in arc['evaluations'] if x['modelDisplayName'] == 'Claude Opus 5 (High)'][0]
cases.append(dict(
    id='arc_opus5', model='Claude Opus 5', bench='ARC-AGI-3', metric='RHAE (%)',
    short='ARC-AGI-3: Claude Opus 5, 30% or 100%',
    takeaway='30% in ARC Prize\'s harness on the semi-private games; 95% to 100% in research harnesses on the easier public games, reported as best of three or best per game. Harness, split and sampling all change at once.',
    n=None, nnote='RHAE is not a binomial proportion (25 public games, levels scored by squared action efficiency).',
    readings=[
      R(round(o5['score'] * 100, 1), 'ARC harness, semi-private', ('maint', 'ARC Prize Foundation'), grp='Official leaderboard',
        harness='ARC Prize standard harness', split='Semi-private set', version='ARC-AGI-3', sampling='One run', effort='high',
        tools='None beyond the game interface', date='2026-09-30', cost='$' + format(round(o5['cost']), ','), exact=o5['score'] * 100,
        src=src('arc_lb', 'pa_paper'), note='The Prime Agent paper uses this as its external reference line (30.2%) because its own native-harness reruns scored lower.'),
      R(95.24, 'Prime Agent, median of 3 runs', ('paper', 'Prime Intellect (harness authors)'), grp='Prime Agent harness, public set',
        harness='Prime Agent (persistent REPL, subagents, Continual Harness)', split='Public demonstration set (25 games)', version='ARC-AGI-3',
        sampling='Median of three runs', effort='not stated', tools='REPL and subagents', date='2026-08-03',
        src=src('pa_card', 'pa_blog', 'pa_kb'), note='The one released scorecard; it rescores to 95.24% from its per-level data (the blog prints 95.2%).'),
      R(95.5, 'Prime Agent, best of 3 runs', ('paper', 'Prime Intellect (harness authors)'), grp='Prime Agent harness, public set',
        harness='Prime Agent', split='Public demonstration set (25 games)', version='ARC-AGI-3', sampling='Best of three runs (95.0, 95.2, 95.5)',
        effort='not stated', tools='REPL and subagents', date='2026-08-24', src=src('pa_paper', 'pa_blog'),
        note='The paper\'s headline ("30% to 95.5%"). The paper itself says the comparison "does not isolate a causal harness effect".'),
      R(95.0, 'Prime Agent, worst of 3 runs', ('paper', 'Prime Intellect (harness authors)'), grp='Prime Agent harness, public set',
        harness='Prime Agent', split='Public demonstration set (25 games)', version='ARC-AGI-3', sampling='Lowest of the three runs',
        effort='not stated', tools='REPL and subagents', date='2026-08-05', src=src('pa_blog')),
      R(99.97, 'Prime Agent, best run per game', ('paper', 'Prime Intellect (harness authors)'), grp='Prime Agent harness, public set',
        harness='Prime Agent', split='Public demonstration set (25 games)', version='ARC-AGI-3', sampling='Best@3: best of three runs chosen game by game (183 of 183 levels)',
        effort='not stated', tools='REPL and subagents', date='2026-08-05', src=src('pa_blog')),
      R(100.0, 'Nvidia AVO harness', ('paper', 'Nvidia (harness authors)'), grp='Other research harness',
        harness='Nvidia Agentic Variation Operators', split='not stated in the report', version='ARC-AGI-3', sampling='not stated',
        effort='not stated', tools='not stated', date='2026-08-21', src=src('avo'), flag='secondary',
        note='Reported by TechCrunch; the set and the number of runs are not given there.')],
    notes=[
      'The ARC-AGI-3 paper calls the public set "intentionally easier" and not representative of the private set; community harnesses had posted 98.97% to 100% on the same 25 public games in July (details on the [[Prime Agent page|n:3cd5c17b0d0d81579a02f0431f24c6cb]]).',
      'Figure 5 of the Prime Agent paper puts the run at about $944 of estimated API cost on its own axis, against about $20,651 for the ARC harness reference; the two costs are estimated differently and the figure is read from its vector paths.'],
    corrections=['"30% to 95.5% on the same underlying model" (old page) is two different harnesses on two different game sets, and 95.5% is the best of three runs. The released median run is 95.24%.']))

# ===== 3. Terminal-Bench, GPT-6 Astra: version, harness, tester, effort, pass@k =====
aa = {r['name']: r for r in load('aa_terminalbench_2026-10-04.json')['rows']}
tb = [r for r in load('tbench_4_0_leaderboard_2026-10-04.json') if r['model'] == 'GPT-6 Astra']
tbr = []
for eff in ('Max', 'High', 'Medium'):
    r = aa['GPT-6 Astra (' + eff + ')']
    tbr.append(R(round(r['terminalBench21'] * 100, 1), 'AA, TB 2.1, ' + eff.lower(), ('indep', 'Artificial Analysis'), grp='Terminal-Bench 2.1 (89 tasks)',
        harness='Terminus 2', split='All 89 tasks', version='2.1', sampling='pass@1 averaged over 3 repeats per task', effort=eff.lower(),
        tools='Shell in the task container', date=READ, n=89, exact=r['terminalBench21'] * 100, src=src('aa_tb21')))
for eff in ('Max', 'High', 'Medium'):
    r = aa['GPT-6 Astra (' + eff + ')']
    tbr.append(R(round(r['terminalBench40'] * 100, 1), 'AA, TB 4.0, ' + eff.lower(), ('indep', 'Artificial Analysis'), grp='Terminal-Bench 4.0 (66 tasks)',
        harness='mini-swe-agent', split='All 66 tasks', version='4.0', sampling='pass@1 averaged over 3 repeats per task', effort=eff.lower(),
        tools='Shell in the task container', date=READ, n=66, exact=r['terminalBench40'] * 100, src=src('aa_tb40', 'aa_tb21')))
for eff in ('max', 'xhigh', 'high', 'medium', 'low'):
    r = [x for x in tb if x['effort'] == eff][0]
    tbr.append(R(r['acc'], 'Leaderboard, Codex, ' + eff, ('maint', 'Terminal-Bench leaderboard (OpenAI\'s Codex agent)'), grp='Terminal-Bench 4.0 (66 tasks)',
        harness='Codex (OpenAI\'s agent)', split='All 66 tasks', version='4.0', sampling='pass@1 averaged over 5 trials per task (330 trials)', effort=eff,
        tools='Shell in the task container', date=r['date'], n=66, ci95=r['ci'], cost='$' + format(round(r['cost']), ','),
        src=src('tb_lb'), note='The leaderboard prints a 95% interval of plus or minus ' + str(r['ci']) + ' points.'))
for eff in ('max', 'high'):
    r = [x for x in tb if x['effort'] == eff][0]
    tbr.append(R(round(r['p5'] * 100, 1), 'Leaderboard, Codex, ' + eff + ', pass@5', ('maint', 'Terminal-Bench leaderboard (OpenAI\'s Codex agent)'), grp='Terminal-Bench 4.0 (66 tasks)',
        harness='Codex (OpenAI\'s agent)', split='All 66 tasks', version='4.0', sampling='pass@5: a task counts if any of 5 trials passes', effort=eff,
        tools='Shell in the task container', date=r['date'], n=66, metric='pass@5 (%)', src=src('tb_lb'),
        note='Same 330 trials as the pass@1 row; a different metric, so not comparable with pass@1 rows.'))
tbr.append(R(57.9, 'OpenAI\'s own figure', ('vendor', 'OpenAI'), grp='Terminal-Bench 4.0 (66 tasks)', harness='not stated (Codex per the matching leaderboard row)',
    split='All 66 tasks', version='4.0', sampling='not stated', effort='high', tools='Shell', date='2026-09-03', n=66,
    src=src('astra', 'o55'), note='Anthropic\'s card (section 8.5) explains that OpenAI reported its highest number, at high effort, because max scored slightly lower; it matches the leaderboard\'s high-effort row (191 of 330 trials).'))
tbr.append(R(58.2, 'Google\'s table', ('rival', 'Google (Gemini 4 Argon table)'), grp='Terminal-Bench 4.0 (66 tasks)', harness='not stated', split='All 66 tasks',
    version='4.0', sampling='not stated', effort='not stated', tools='Shell', date='2026-10-01', src=src('argon'), flag='secondary',
    note='A rival\'s table, transcribed from an image; it matches the leaderboard\'s max-effort row (58.18%).'))
cases.append(dict(
    id='tb_astra', model='GPT-6 Astra', bench='Terminal-Bench', metric='% tasks passed',
    short='Terminal-Bench: GPT-6 Astra, 2.1 against 4.0',
    takeaway='88% on Terminal-Bench 2.1 and 59% on 4.0 in the same tracker\'s runs; on 4.0 alone, 49% to 71% depending on effort, harness and pass@k.',
    n=66, nnote='66 tasks in 4.0 (89 in 2.1). Repeated trials sharpen each task\'s estimate but do not add tasks: the interval that matters for "would it hold on new tasks" is set by the 66.',
    readings=tbr,
    notes=[
      'A clean version step, same agent and model on both: Claude Code with Claude Opus 4.6 scored 58.0% on 2.0 and 70.1% on 2.1, after 28 of the 89 tasks were fixed (external dependencies, resource budgets, misspecified tasks) ([[Terminal-Bench 2.1 notes|https://www.tbench.ai/news/terminal-bench-2-1]]).',
      'Terminal-Bench 3.0 sits between the two: 74 tasks, tagged v3.0.0 on 23 Jul 2026 ([[release|https://github.com/harbor-framework/terminal-bench/releases/tag/v3.0.0]], [[notes|https://www.tbench.ai/news/terminal-bench-3-0]]); 4.0 (tagged 26 Aug 2026) cut those 74 to 66 and revised twenty. No GPT-6 Astra reading on 3.0 was found, so it has no row here.',
      'Tester alone, same version: Claude Fable 5.1 on Terminal-Bench-Science 0.1 is 52.6% in Anthropic\'s runs (10 trials per task) and 43.3% in Artificial Analysis\'s ([[Opus 5.5 card, section 8.6|https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf]]; [[Artificial Analysis|https://artificialanalysis.ai/evaluations/terminal-bench-science]]). On 70 tasks a 9.3-point gap between two independent runs is not, by itself, beyond noise (Fisher\'s exact test on 37 against 30 of 70 tasks: p = 0.31; try it in the calculator below), which is exactly why the tester has to be named.',
      'Artificial Analysis changed harness with the version (Terminus 2 for 2.1, mini-swe-agent for 4.0), so its 88.4% to 59.1% drop mixes the two.',
      'A harness-only step on 2.1: GPT-5.5 at xhigh, 83.15% in Codex on the leaderboard against 92.1% inside the StateM runbook ([[StateM page|n:3c65c17b0d0d81899098d8153e100691]]).',
      'Anthropic\'s card reports a standard error of plus or minus 2.6 points for 330 trials "treating trials as independent" (section 8.5) and plus or minus 3.5 to 4.8 points "clustered by task" for Terminal-Bench-Science (section 8.6): clustering by task is the honest one.'],
    corrections=[]))

# ===== 4. SWE-bench Pro, Claude Opus 5: version and split =====
cases.append(dict(
    id='sbp_opus5', model='Claude Opus 5', bench='SWE-bench Pro', metric='% resolved',
    short='SWE-bench Pro: Claude Opus 5, v1 card against V2 splits',
    takeaway='79.2% on Anthropic\'s card; 99.4% on Scale\'s V2 public set, 98.0% on its 51 hardest tasks, 81.6% on the private set, all for one model.',
    n=642, nnote='642 public V2 tasks, 272 private, 51 in the HARD subset.',
    readings=[
      R(79.2, 'Anthropic\'s card', ('vendor', 'Anthropic'), grp='Developer\'s figure', harness='Anthropic\'s internal harness (not named in the table)',
        split='not stated (the public set, by the card\'s description)', version='not stated; predates V2 (22 Sep 2026)', sampling='not stated in Table 8.1.A for Opus 5 (Opus 5.5\'s rows average five trials)',
        effort='not stated for Opus 5', tools='Agentic coding tools', date='2026-09-22', src=src('o55'),
        note='Carried from the Claude Opus 5 System Card into Table 8.1.A of the Opus 5.5 card.'),
      R(99.4, 'Scale V2, public', ('maint', 'Scale Labs'), grp='Scale Labs, SWE-Bench Pro V2', harness='Claude Code', split='Public (642 tasks, 11 repositories)', version='V2',
        sampling='Pass@1, one run', effort='xhigh', tools='Model endpoint only; web tools disabled', date='2026-09-22', n=642, k=638, exact=638 / 642 * 100,
        src=src('sbp_v2', 'sbp_v2_blog'), note='638 of 642. V2 re-grades every diff on a pristine image; it caught Opus 5 forging a Go module checksum into go.sum.'),
      R(98.0, 'Scale V2, HARD subset', ('maint', 'Scale Labs'), grp='Scale Labs, SWE-Bench Pro V2', harness='Claude Code', split='HARD subset (51 tasks)', version='V2',
        sampling='Pass@1, one run', effort='xhigh', tools='Model endpoint only', date='2026-09-22', n=51, src=src('sbp_v2')),
      R(81.6, 'Scale V2, private', ('maint', 'Scale Labs'), grp='Scale Labs, SWE-Bench Pro V2', harness='Claude Code', split='Private (272 tasks from startup codebases)', version='V2',
        sampling='Pass@1, one run', effort='xhigh', tools='Model endpoint only', date='2026-09-22', n=272, k=222, exact=222 / 272 * 100,
        src=src('sbp_v2_blog'), note='222 of 272. Scale notes the public runs were network-locked and audited, so evaluation-time leakage is an unlikely explanation for the 17.8-point gap.')],
    notes=['Claude Opus 5.5\'s own card gives 89.9% on SWE-bench Pro (a different model).'],
    corrections=[
      'The old page said the strongest models reach "only about 23%" on SWE-Bench Pro V2. That sentence is the 2025 description of the original Pro, still printed on Scale\'s page; V2 top scores are 89.9% to 99.4% (Opus 5 99.4%, 638 of 642).',
      'The old page\'s "47 to 80%" for one benchmark mixed models and versions (47.1% is Claude Opus 4.6 on the v1 commercial set). For one model, Opus 5, the readings span 79.2% to 99.4%.']))

# ===== 5. SWE-bench Pro v1, GPT-5: turn budget and split =====
cases.append(dict(
    id='sbp_gpt5', model='GPT-5 (2025-08-07)', bench='SWE-bench Pro (v1)', metric='% resolved',
    short='SWE-bench Pro v1: GPT-5, paper run against re-run',
    takeaway='23.3% in the launch paper and 41.8% on the same public set after Scale re-ran it under its current protocol; 14.9% on the commercial set.',
    n=731, nnote='731 public tasks, 276 commercial.',
    readings=[
      R(23.3, 'Paper, public set', ('maint', 'Scale AI (benchmark authors)'), grp='Launch paper, 21 Sep 2025', harness='SWE-Agent, same basic prompt for all models',
        split='Public (731 tasks)', version='v1', sampling='Pass@1, one run', effort='not stated', tools='SWE-Agent tools; maximum 200 turns', date='2025-09-21', n=731,
        src=src('sbp_paper')),
      R(14.9, 'Paper, commercial set', ('maint', 'Scale AI (benchmark authors)'), grp='Launch paper, 21 Sep 2025', harness='SWE-Agent', split='Commercial (276 tasks, private startup codebases)',
        version='v1', sampling='Pass@1, one run', effort='not stated', tools='maximum 200 turns', date='2025-09-21', n=276, src=src('sbp_paper')),
      R(41.78, 'Leaderboard re-run, public', ('maint', 'Scale Labs'), grp='Scale leaderboard', harness='SWE-Agent (Scale\'s standard scaffold)', split='Public (731 tasks)', version='v1',
        sampling='Pass@1; printed interval plus or minus 3.49', effort='high', tools='uncapped cost, turn limit 250 (the page\'s current protocol)', date='2025-11-26', n=731, ci95=3.49,
        src=src('sbp_v1'), note='Row "gpt-5-2025-08-07 (High)", added 26 Nov 2025. The page says grayed-out rows ran with a capped cost and a 50-turn limit; which rows are grayed is not in the page data.'),
      R(14.86, 'Leaderboard, commercial', ('maint', 'Scale Labs'), grp='Scale leaderboard', harness='SWE-Agent', split='Commercial (276 tasks)', version='v1',
        sampling='Pass@1; printed interval plus or minus 4.2', effort='not stated', tools='not stated on the row', date='2025-09-19', n=276, ci95=4.2,
        src=src('sbp_v1'), note='Added 19 Sep 2025, the paper\'s run.')],
    notes=['The deprecated leaderboard (capped cost, 50 turns) is linked from Scale\'s page; a GPT-5 figure quoted without its turn budget can be either.'],
    corrections=[]))

# ===== 6. OSWorld family, Claude: Verified against 2.0, partial against strict =====
o2 = {}
import csv
cases.append(None)  # placeholder, filled below
osw = dict(
    id='osw_claude', model='Claude Sonnet 4.6 and Claude Opus 5', bench='OSWorld (Verified, 2.0)', metric='% (partial credit or strict pass)',
    short='OSWorld: Claude, Verified against 2.0',
    takeaway='Sonnet 4.6: 72.1% on OSWorld-Verified, 8.3% strict on OSWorld 2.0. Opus 5 on 2.0: 31% to 75% depending on who ran it, which task release and partial or strict scoring.',
    n=108, nnote='OSWorld 2.0 has 108 tasks. Only strict pass rates are proportions of tasks; partial scores average checkpoint credit and get no binomial interval.',
    readings=[
      R(72.1, 'Sonnet 4.6, Verified, 100 steps', ('maint', 'OSWorld team'), grp='Claude Sonnet 4.6', model='Claude Sonnet 4.6', harness='Maintainers\' unified settings',
        split='All tasks', version='OSWorld-Verified (in-place upgrade of OSWorld, July 2025)', sampling='One run', effort='not stated', tools='Screenshot computer use, 100 steps',
        date=READ, src=src('osw_lb', 'epoch_zip'), metric='success rate (%)'),
      R(41.5, 'Sonnet 4.6, 2.0, max, partial', ('maint', 'OSWorld 2.0 team'), grp='Claude Sonnet 4.6', model='Claude Sonnet 4.6', harness='Standard tool setting',
        split='108 tasks', version='OSWorld 2.0', sampling='One run', effort='max', tools='Standard tools, 500 steps', date=READ, metric='partial score (%)', src=src('osw2_lb', 'epoch_zip')),
      R(8.3, 'Sonnet 4.6, 2.0, max, strict', ('maint', 'OSWorld 2.0 team'), grp='Claude Sonnet 4.6', model='Claude Sonnet 4.6', harness='Standard tool setting',
        split='108 tasks', version='OSWorld 2.0', sampling='One run', effort='max', tools='Standard tools, 500 steps', date=READ, metric='strict pass rate (%)', n=108, src=src('osw2_lb', 'epoch_zip')),
      R(9.3, 'Sonnet 4.6, 2.0, medium, strict', ('maint', 'OSWorld 2.0 team'), grp='Claude Sonnet 4.6', model='Claude Sonnet 4.6', harness='Standard tool setting',
        split='108 tasks', version='OSWorld 2.0', sampling='One run', effort='medium', tools='Standard tools, 500 steps', date=READ, metric='strict pass rate (%)', n=108, src=src('osw2_lb', 'epoch_zip'),
        note='Medium effort scores above max on strict pass; the partial score is 33.9%.'),
      R(68.3, 'Opus 5, 2.0, maintainers, partial', ('maint', 'OSWorld 2.0 team'), grp='Claude Opus 5', model='Claude Opus 5', harness='Batch tool setting',
        split='108 tasks', version='OSWorld 2.0', sampling='One run', effort='max', tools='Batch tool, 500 steps', date=READ, metric='partial score (%)', src=src('osw2_lb', 'epoch_zip')),
      R(31.4, 'Opus 5, 2.0, maintainers, strict', ('maint', 'OSWorld 2.0 team'), grp='Claude Opus 5', model='Claude Opus 5', harness='Batch tool setting',
        split='108 tasks', version='OSWorld 2.0', sampling='One run', effort='max', tools='Batch tool, 500 steps', date=READ, metric='strict pass rate (%)', n=108, src=src('osw2_lb', 'epoch_zip')),
      R(75.4, 'Opus 5, Anthropic, Aug release, partial', ('vendor', 'Anthropic'), grp='Claude Opus 5', model='Claude Opus 5', harness='Anthropic\'s computer-use harness',
        split='108 tasks', version='OSWorld 2.0, August 2026 task release', sampling='not stated on the page', effort='not stated', tools='Computer use', date='2026-09-01', metric='partial score (%)',
        src=src('fable51')),
      R(39.6, 'Opus 5, Anthropic, Aug release, strict', ('vendor', 'Anthropic'), grp='Claude Opus 5', model='Claude Opus 5', harness='Anthropic\'s computer-use harness',
        split='108 tasks', version='OSWorld 2.0, August 2026 task release', sampling='not stated on the page', effort='not stated', tools='Computer use', date='2026-09-01', metric='strict pass rate (%)', n=108,
        src=src('fable51')),
      R(74.0, 'Opus 5, Anthropic, Sep release, partial', ('vendor', 'Anthropic'), grp='Claude Opus 5', model='Claude Opus 5', harness='Anthropic\'s harness, now keeping every screenshot with server-side compaction above 100k tokens',
        split='108 tasks', version='OSWorld 2.0, 10 Sep 2026 task files', sampling='pass@1 averaged over 5 runs', effort='max', tools='Computer use, 1080p, 500 steps', date='2026-09-22', metric='partial score (%)',
        src=src('o55'), note='Anthropic: these "supersede" the figures in the Fable 5.1 card and are not comparable with other releases or harness configurations.'),
      R(37.2, 'Opus 5, Anthropic, Sep release, strict', ('vendor', 'Anthropic'), grp='Claude Opus 5', model='Claude Opus 5', harness='Anthropic\'s updated harness',
        split='108 tasks', version='OSWorld 2.0, 10 Sep 2026 task files', sampling='pass@1 averaged over 5 runs', effort='max', tools='Computer use, 500 steps', date='2026-09-22', metric='strict pass rate (%)', n=108,
        src=src('o55')),
      R(70.2, 'Opus 5, OpenAI\'s table', ('rival', 'OpenAI (GPT-6 Astra launch table)'), grp='Claude Opus 5', model='Claude Opus 5', harness='not stated',
        split='"Offline set"', version='OSWorld 2.0', sampling='not stated', effort='not stated', tools='not stated', date='2026-09-03', metric='not stated',
        src=src('datacamp', 'astra'), flag='secondary', note='Carried by DataCamp from OpenAI\'s launch table; OpenAI\'s page could not be read directly. Whether OpenAI ran Opus 5 itself is not stated.')],
    notes=[
      'A step budget alone moves OSWorld-Verified: Claude Sonnet 4.5 scored 42.9% at 15 steps, 58.1% at 50 and 62.9% at 100 in the maintainers\' runs ([[OSWorld|https://os-world.github.io/]], via Epoch).',
      'The maintainers also list Claude Opus 4.8 at max effort under two tool settings on 2.0: 18.5% strict with standard tools against 20.6% with batched tools ([[OSWorld 2.0|https://osworld-v2.xlang.ai/]], via Epoch).'],
    corrections=['The old page gave Claude Opus 5 74.0% on OSWorld 2.0 without saying that it is a partial-credit score on the 10 September task files with a changed harness; the strict pass rate in the same run is 37.2%, and the maintainers\' own max-effort run is 68.3% partial, 31.4% strict.'])
cases[-1] = osw

# ===== 7. HLE, Claude Opus 5.5: tools and tester =====
cases.append(dict(
    id='hle_o55', model='Claude Opus 5.5', bench='Humanity\'s Last Exam', metric='% correct (model-graded)',
    short='HLE: Claude Opus 5.5, tools on and off',
    takeaway='67.7% with search and code, 64.4% without, in Anthropic\'s runs; 54.7% to 61.4% without tools in Artificial Analysis\'s runs, depending on effort.',
    n=2500, nnote='2,500 questions (Anthropic card, section 8.11.1).',
    readings=[
      R(67.7, 'Anthropic, with tools', ('vendor', 'Anthropic'), grp='Anthropic', harness='Anthropic\'s harness; grader Claude Opus 4.6', split='Full set (2,500)', version='HLE',
        sampling='Averaged over five trials (card\'s standard configuration)', effort='max (thinking auto)', tools='Web search, web fetch, programmatic tool calling, code execution; HLE sources blocklisted; 1M-token cap',
        date='2026-09-22', n=2500, src=src('o55')),
      R(64.4, 'Anthropic, no tools', ('vendor', 'Anthropic'), grp='Anthropic', harness='Anthropic\'s harness; grader Claude Opus 4.6', split='Full set (2,500)', version='HLE',
        sampling='Averaged over five trials', effort='max (thinking auto)', tools='None', date='2026-09-22', n=2500, src=src('o55')),
      R(61.4, 'AA, no tools, max', ('indep', 'Artificial Analysis'), grp='Artificial Analysis', harness='Artificial Analysis\'s own harness', split='AA\'s HLE run', version='HLE (AA run, index v4.3)',
        sampling='not stated here', effort='max', tools='None', date='2026-10-01', src=src('aa_o55')),
      R(57.5, 'AA, no tools, xhigh', ('indep', 'Artificial Analysis'), grp='Artificial Analysis', harness='Artificial Analysis\'s own harness', split='AA\'s HLE run', version='HLE (AA run, index v4.3)',
        sampling='not stated here', effort='xhigh', tools='None', date='2026-10-01', src=src('aa_o55x')),
      R(54.7, 'AA, no tools, medium', ('indep', 'Artificial Analysis'), grp='Artificial Analysis', harness='Artificial Analysis\'s own harness', split='AA\'s HLE run', version='HLE (AA run, index v4.3)',
        sampling='not stated here', effort='medium', tools='None', date='2026-10-01', src=src('aa_o55m'))],
    notes=[
      'Claude Opus 5 shows the same pattern: 56.6% without tools and 63.6% with tools in Anthropic\'s runs, 54.9% without tools in Artificial Analysis\'s ([[Opus 5.5 card|https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf]]).',
      'The grader is part of the instrument: Anthropic grades with Claude Opus 4.6, and Artificial Analysis with its own setup, so even the two no-tools figures are not one measurement.'],
    corrections=['The old page put the with-tools effect at "10 to 20 points". For Claude Opus 5.5 it is 3.3 points (64.4% to 67.7%), and 7.0 points for Opus 5 (56.6% to 63.6%), in Anthropic\'s own runs.']))

# ===== 8. AIME 2024, OpenAI o1: sampling protocol =====
cases.append(dict(
    id='aime_o1', model='OpenAI o1', bench='AIME 2024', metric='% of problems',
    short='AIME 2024: o1, one sample to 1,000',
    takeaway='One model, one exam: 74% with one sample, 83% by majority vote over 64, 93% re-ranking 1,000 samples with a learned scorer.',
    n=30, nnote='30 problems (AIME 2024 I and II); OpenAI reports per exam of 15 ("11.1/15").',
    readings=[
      R(74.4, 'pass@1', ('vendor', 'OpenAI'), grp='OpenAI, 12 Sep 2024', harness='OpenAI internal', split='AIME 2024 I and II', version='2024',
        sampling='One sample per problem, averaged (pass@1)', effort='"maximal test-time compute setting"', tools='None', date='2024-09-12', n=30, src=src('l2r')),
      R(83.3, 'cons@64', ('vendor', 'OpenAI'), grp='OpenAI, 12 Sep 2024', harness='OpenAI internal', split='AIME 2024 I and II', version='2024',
        sampling='Majority vote over 64 samples', effort='maximal', tools='None', date='2024-09-12', n=30, metric='cons@64 (%)', src=src('l2r')),
      R(93.0, 'Re-rank 1,000 samples', ('vendor', 'OpenAI'), grp='OpenAI, 12 Sep 2024', harness='OpenAI internal', split='AIME 2024 I and II', version='2024',
        sampling='1,000 samples re-ranked with a learned scoring function', effort='maximal', tools='None', date='2024-09-12', n=30, metric='best-of-1000 by scorer (%)', src=src('l2r'),
        note='Printed as 93% (13.9/15).'),
      R(79.2, 'pass@1, o1 (December release)', ('rival', 'Anthropic (Claude 3.7 Sonnet table, quoting OpenAI)'), grp='Later checkpoint', harness='not stated', split='AIME 2024', version='2024',
        sampling='pass@1', effort='not stated', tools='None', date='2025-02-24', n=30, src=src('c37'), flag='secondary',
        note='Anthropic\'s table lists "OpenAI o1" at 79.2% / 83.3%; 79.2% is the figure for the released o1 (2024-12-17), a different checkpoint from the September post\'s 74.4%.')],
    notes=['GPT-4o in the same post: 9.3% pass@1 and 13.4% cons@64. Anthropic\'s table footnote marks that its own "high" AIME and GPQA figures use a learned scorer while o1\'s and Grok 3\'s use majority vote over 64: two sampling protocols side by side in one column.'],
    corrections=[]))

# ===== 9. GPQA Diamond, Claude 3.7 Sonnet: vendor against Epoch =====
ep = {}
with open(os.path.join(INP, 'epoch_gpqa_diamond_subset_2026-10-04.csv')) as f:
    for row in csv.DictReader(f):
        ep[row['Model version']] = row
def epr(key, lab, budget):
    r = ep[key]
    return R(round(float(r['mean_score']) * 100, 1), lab, ('indep', 'Epoch AI'), grp='Epoch AI reruns', harness='Epoch\'s Inspect harness',
        split='Diamond (198)', version='GPQA Diamond', sampling='mean over runs; printed standard error ' + str(round(float(r['stderr']) * 100, 1)) + ' points',
        effort=budget, tools='None', date=READ, n=198, exact=float(r['mean_score']) * 100, se=round(float(r['stderr']) * 100, 2), src=src('epoch_gpqa', 'epoch_zip'))
cases.append(dict(
    id='gpqa_c37', model='Claude 3.7 Sonnet', bench='GPQA Diamond', metric='% correct',
    short='GPQA Diamond: Claude 3.7 Sonnet, vendor and Epoch',
    takeaway='68.0% to 84.8% on Anthropic\'s card depending on thinking and parallel sampling; Epoch\'s reruns land within 2 points of Anthropic\'s single-sample figures.',
    n=198, nnote='198 questions.',
    readings=[
      R(68.0, 'Anthropic, no extended thinking', ('vendor', 'Anthropic'), grp='Anthropic, 24 Feb 2025', harness='Anthropic internal', split='Diamond (198)', version='GPQA Diamond',
        sampling='pass@1 averaged over several trials', effort='no extended thinking', tools='None', date='2025-02-24', n=198, src=src('c37')),
      R(78.2, 'Anthropic, 64K thinking', ('vendor', 'Anthropic'), grp='Anthropic, 24 Feb 2025', harness='Anthropic internal', split='Diamond (198)', version='GPQA Diamond',
        sampling='pass@1 averaged over several trials', effort='64K-token thinking budget', tools='None', date='2025-02-24', n=198, src=src('c37')),
      R(84.8, 'Anthropic, 256 samples + scorer', ('vendor', 'Anthropic'), grp='Anthropic, 24 Feb 2025', harness='Anthropic internal', split='Diamond (198)', version='GPQA Diamond',
        sampling='Compute of 256 independent samples, a learned scoring model picks one', effort='64K-token thinking budget', tools='None', date='2025-02-24', n=198,
        metric='best-of-256 by scorer (%)', src=src('c37', 'c37_vet')),
      epr('claude-3-7-sonnet-20250219', 'Epoch, no thinking', 'no extended thinking'),
      epr('claude-3-7-sonnet-20250219_16K', 'Epoch, 16K thinking', '16K-token thinking budget'),
      epr('claude-3-7-sonnet-20250219_32K', 'Epoch, 32K thinking', '32K-token thinking budget'),
      epr('claude-3-7-sonnet-20250219_64K', 'Epoch, 64K thinking', '64K-token thinking budget')],
    notes=[
      'Epoch\'s 64K row prints a best score across scorers of 79.7% beside the 78.5% mean: the scorer is a condition too.',
      'The same pattern for DeepSeek-R1: 71.5% in DeepSeek\'s paper (pass@1 over 64 samples) and 69.2% in Epoch\'s rerun ([[Epoch|https://epoch.ai/benchmarks]]).'],
    corrections=[]))

# ===== 10. MMLU, Gemini Ultra: prompting protocol =====
cases.append(dict(
    id='mmlu_gem', model='Gemini Ultra (Gemini 1.0)', bench='MMLU', metric='% correct',
    short='MMLU: Gemini Ultra, 5-shot against CoT@32',
    takeaway='83.7% 5-shot and 90.04% with 32 chain-of-thought samples routed by a confidence threshold: the headline that "exceeded human experts" used the second.',
    n=14042, nnote='14,042 test questions.',
    readings=[
      R(83.7, '5-shot', ('vendor', 'Google DeepMind'), grp='Gemini report v1, Dec 2023', harness='Google internal', split='Test', version='MMLU', sampling='5-shot, one answer',
        effort='n/a', tools='None', date='2023-12-19', n=14042, src=src('gem')),
      R(83.96, 'Greedy ("score eval")', ('vendor', 'Google DeepMind'), grp='Gemini report v1, Dec 2023', harness='Google internal', split='Test', version='MMLU', sampling='Greedy, maximum-likelihood choice without chain of thought',
        effort='n/a', tools='None', date='2023-12-19', n=14042, src=src('gem_app')),
      R(84.99, 'CoT@32 (majority)', ('vendor', 'Google DeepMind'), grp='Gemini report v1, Dec 2023', harness='Google internal', split='Test', version='MMLU', sampling='32 chain-of-thought samples, majority',
        effort='n/a', tools='None', date='2023-12-19', n=14042, src=src('gem_app')),
      R(90.04, 'CoT@32, uncertainty-routed', ('vendor', 'Google DeepMind'), grp='Gemini report v1, Dec 2023', harness='Google internal', split='Test', version='MMLU',
        sampling='32 chain-of-thought samples; majority if consensus clears a threshold tuned on the validation split, else greedy', effort='n/a', tools='None', date='2023-12-19', n=14042,
        src=src('gem', 'gem_app'), note='The headline: "the first model to exceed" the 89.8% human-expert estimate.')],
    notes=['In the same table GPT-4 appears twice: 86.4% 5-shot as reported by OpenAI, and 87.29% with uncertainty-routed CoT@32 run by Google through the API (84.21% greedy). Comparing Gemini Ultra\'s 90.04% with GPT-4\'s 86.4% would compare two protocols.'],
    corrections=[]))

# ===== 11. Legal Research Bench, GPT-6 Astra: retrieval index =====
cases.append(dict(
    id='legal_astra', model='GPT-6 Astra', bench='Vals AI Legal Research Bench', metric='% all-pass (every rubric item)',
    short='Legal Research Bench: GPT-6 Astra, index and set',
    takeaway='38.7% with web search and 54.0% with OpenAI\'s legal index on a private validation set, both OpenAI\'s runs; 39.4% on Vals AI\'s own leaderboard.',
    n=200, nnote='200 private validation questions in OpenAI\'s runs; Vals AI does not print its test-set size on the leaderboard page.',
    readings=[
      R(38.7, 'OpenAI, web search', ('vendor', 'OpenAI'), grp='OpenAI, 17 Sep 2026', harness='OpenAI internal', split='Private validation set (200 questions)', version='Legal Research Bench',
        sampling='not stated', effort='highest reasoning setting', tools='Standard web search', date='2026-09-17', n=200, src=src('tnw_law', 'oai_law')),
      R(54.0, 'Astra for Law (legal index)', ('vendor', 'OpenAI'), grp='OpenAI, 17 Sep 2026', harness='Astra for Law: GPT-6 Astra plus legal-analysis instructions', split='Private validation set (200 questions)',
        version='Legal Research Bench', sampling='not stated', effort='highest reasoning setting', tools='Index of more than 230 million US legal URLs (built on CourtListener)', date='2026-09-17', n=200,
        src=src('tnw_law', 'oai_law'), note='OpenAI calls it a 40% relative improvement; no independent party has audited either figure.'),
      R(39.42, 'Vals AI leaderboard', ('maint', 'Vals AI'), grp='Vals AI', harness='Vals AI\'s harness', split='Leaderboard test set', version='Legal Research Bench (1 Oct 2026 update)',
        sampling='not stated', effort='not stated', tools='not stated', date='2026-10-01', cost='$10.58 per test', src=src('vals_lrb'),
        note='Astra for Law is not on the leaderboard; the top entries tie at 55.29%.')],
    notes=['OpenAI\'s pair holds the set and the model fixed, so it is a fair index comparison, but the 54.0% also adds legal instructions and is not on the same set as Vals AI\'s leaderboard.'],
    corrections=['The old page called 54% against 38.7% "identical weights with a different index". The weights are the same, but Astra for Law also adds legal-analysis instructions, and the set is OpenAI\'s private validation set, not Vals AI\'s leaderboard (where GPT-6 Astra is at 39.42%).']))

# ===== 12. SchrodingerRepo, GPT-5.4-mini: transformed against original repositories =====
sch = [('Baseline', 46.8, 0, 11.25), ('Level 1 (problem statement reconstructed)', 46.8, 0, 11.56), ('Level 2 (namespaces remapped)', 40.4, 2, 14.92),
       ('Level 3 (intra-file layout reordered)', 43.4, 1, 13.27), ('Level 4 (code rewritten, behaviour kept)', 44.6, 1, 12.66), ('All four (SchrodingerRepo)', 35.6, 2, 19.83)]
stars = {0: 'not significant', 1: 'p < 0.05', 2: 'p < 0.01'}
cases.append(dict(
    id='schro_mini', model='GPT-5.4-mini', bench='SWE-bench Verified', metric='Pass@1 (%)',
    short='SWE-bench Verified: GPT-5.4-mini, original against transformed repositories',
    takeaway='The same 500 tasks with the repository renamed and rearranged but behaviour unchanged: 46.8% falls to 35.6%, and actions per task rise from 11.3 to 19.8.',
    n=500, paired=True, nnote='500 tasks, the same in every row: a paired comparison. The paper\'s significance marks are per row.',
    readings=[R(v, lab, ('paper', 'Chen et al. (SJTU and others)'), grp='Paper, Table I',
        harness='mini-swe-agent, default configuration, temperature 0, at most 250 actions', split='SWE-bench Verified (500)', version='Original repository' if lab == 'Baseline' else 'Transformed: ' + lab,
        sampling='Pass@1; each level averaged over three seeded views', effort='default', tools='Shell', date='2026-08-21', n=500,
        src=src('schro', 'schro_setup', 'schro_kb'), note='Average actions per task ' + str(a) + '; paper\'s test against baseline: ' + stars[s] + '.')
        for lab, v, s, a in sch],
    notes=['Across the paper\'s models the full transformation costs 6.0 to 11.2 points on all 500 tasks (GPT 5.1 44.6% to 36.2%, DeepSeek-v4-Flash 72.8% to 66.8%) and 14.4 points for Gemini-3.1-Flash-Lite on the 300 most-leaked tasks only ([[Table I|https://arxiv.org/html/2609.27891v1#S4.T1]]).',
           'The knowledge base\'s paper page argues the drop shows unfamiliar names cost exploration, not that the familiar ones were memorised ([[SchrodingerRepo page|n:3e95c17b0d0d81e8b0e0e99acbeb9713]]).'],
    corrections=['The old page carried "6 to 14 points" as an aggregator\'s number. It is the paper\'s own (section I and section VIII), and its 14.4 end comes from a different, leakage-selected subset.']))

# ---------- the animation tracks: one model, one benchmark, one condition at a time ----------
def tbrow(eff):
    return [x for x in tb if x['effort'] == eff][0]
tracks = [
  dict(id='tb', title='GPT-6 Astra on Terminal-Bench', unit='%', steps=[
    dict(v=round(aa['GPT-6 Astra (Max)']['terminalBench21'] * 100, 1), what='Headline', changed=[],
         c=dict(who='Artificial Analysis', version='2.1 (89 tasks)', harness='Terminus 2', effort='max', sampling='pass@1, mean of 3 repeats'),
         cap='The number in a tracker\'s Terminal-Bench 2.1 table: GPT-6 Astra at max effort.', src=src('aa_tb21')),
    dict(v=round(aa['GPT-6 Astra (Max)']['terminalBench40'] * 100, 1), what='Version 2.1 to 4.0', changed=['version', 'harness'],
         c=dict(who='Artificial Analysis', version='4.0 (66 tasks)', harness='mini-swe-agent', effort='max', sampling='pass@1, mean of 3 repeats'),
         cap='Same tracker, same effort, the new version. Artificial Analysis also switched harness with the version, so this one step changes two conditions; no published run separates them.', src=src('aa_tb40')),
    dict(v=tbrow('max')['acc'], what='Harness and tester', changed=['who', 'harness', 'sampling'],
         c=dict(who='Official leaderboard', version='4.0 (66 tasks)', harness='Codex', effort='max', sampling='pass@1, mean of 5 trials'),
         cap='The official leaderboard\'s run with OpenAI\'s Codex agent at the same effort: within a point of the tracker, consistent with Anthropic\'s note that 4.0 "reduced the confounding role of various harnesses".', src=src('tb_lb', 'o55')),
    dict(v=tbrow('high')['acc'], what='Effort max to high', changed=['effort'],
         c=dict(who='Official leaderboard', version='4.0 (66 tasks)', harness='Codex', effort='high', sampling='pass@1, mean of 5 trials'),
         cap='High effort scores 191 of 330 trials, the same as xhigh: 57.9%, the figure OpenAI chose to publish.', src=src('tb_lb', 'o55')),
    dict(v=tbrow('low')['acc'], what='Effort high to low', changed=['effort'],
         c=dict(who='Official leaderboard', version='4.0 (66 tasks)', harness='Codex', effort='low', sampling='pass@1, mean of 5 trials'),
         cap='Low effort: 50.6%, the lowest reading. From 88.4% to 50.6% without changing the model.', src=src('tb_lb')),
    dict(v=round(tbrow('low')['p5'] * 100, 1), what='pass@1 to pass@5', changed=['sampling'],
         c=dict(who='Official leaderboard', version='4.0 (66 tasks)', harness='Codex', effort='low', sampling='pass@5: any of 5 trials'),
         cap='The same low-effort trials counted as "solved if any of five passes": 42 of 66 tasks, 63.6%. A different metric on identical runs.', src=src('tb_lb'))]),
  dict(id='arc', title='GPT-6 Astra on ARC-AGI-3', unit='%', steps=[]),
  dict(id='sbp', title='Claude Opus 5 on SWE-bench Pro', unit='%', steps=[
    dict(v=79.2, what='Headline', changed=[], c=dict(who='Anthropic', version='not stated (pre-V2)', harness='Anthropic internal', split='not stated', sampling='not stated'),
         cap='The developer\'s card: 79.2%.', src=src('o55')),
    dict(v=99.4, what='Version and tester', changed=['who', 'version', 'harness', 'split', 'sampling'], c=dict(who='Scale Labs', version='V2', harness='Claude Code, xhigh', split='Public (642)', sampling='Pass@1, one run'),
         cap='Scale\'s V2 public set, network-locked, re-graded on a pristine image: 638 of 642. Several conditions change at once here; no published run isolates them.', src=src('sbp_v2', 'sbp_v2_blog')),
    dict(v=98.0, what='Public to HARD subset', changed=['split'], c=dict(who='Scale Labs', version='V2', harness='Claude Code, xhigh', split='HARD (51)', sampling='Pass@1, one run'),
         cap='The 51 hardest public tasks: 98.0%, one task missed.', src=src('sbp_v2')),
    dict(v=81.6, what='Public to private', changed=['split'], c=dict(who='Scale Labs', version='V2', harness='Claude Code, xhigh', split='Private (272)', sampling='Pass@1, one run'),
         cap='Startup codebases nobody outside Scale has seen: 222 of 272. The split alone moves the number 17.8 points.', src=src('sbp_v2_blog'))])]
arcm = {r['lab']: r for r in cases[0]['readings']}
tracks[1]['steps'] = [
  dict(v=arcm['Standard, max effort']['v'], what='Headline', changed=[], c=dict(who='ARC Prize', harness='Standard', effort='max', split='Semi-private', cost=arcm['Standard, max effort']['cost']),
       cap='ARC Prize\'s standard, provider-agnostic harness at max effort: 62.7%.', src=src('arc_lb', 'arc_blog')),
  dict(v=arcm['Standard, high effort']['v'], what='Effort max to high', changed=['effort', 'cost'], c=dict(who='ARC Prize', harness='Standard', effort='high', split='Semi-private', cost=arcm['Standard, high effort']['cost']),
       cap='One notch down in effort: 54.8%, at a higher cost.', src=src('arc_lb')),
  dict(v=arcm['Provider Adapter, high effort']['v'], what='Harness: Provider Adapter', changed=['harness', 'cost'], c=dict(who='ARC Prize', harness='Provider Adapter', effort='high', split='Semi-private', cost=arcm['Provider Adapter, high effort']['cost']),
       cap='Same effort, the harness that keeps the provider\'s opaque reasoning state: 99.9%, cheaper.', src=src('arc_lb', 'arc_blog')),
  dict(v=arcm['Provider Adapter, none effort']['v'], what='Effort high to none', changed=['effort', 'cost'], c=dict(who='ARC Prize', harness='Provider Adapter', effort='none', split='Semi-private', cost=arcm['Provider Adapter, none effort']['cost']),
       cap='With no reasoning effort the adapter still scores 96.7%, above every standard-harness setting.', src=src('arc_lb')),
  dict(v=arcm['Standard, none effort']['v'], what='Harness: back to standard', changed=['harness', 'cost'], c=dict(who='ARC Prize', harness='Standard', effort='none', split='Semi-private', cost=arcm['Standard, none effort']['cost']),
       cap='The same no-effort setting in the standard harness: 35.2%. The harness alone is worth 61.5 points here.', src=src('arc_lb')),
  dict(v=arcm['Standard, low effort']['v'], what='Effort none to low', changed=['effort', 'cost'], c=dict(who='ARC Prize', harness='Standard', effort='low', split='Semi-private', cost=arcm['Standard, low effort']['cost']),
       cap='Low effort scores below no effort in the standard harness: 17.5%, the lowest reading. Same model, same games: 17.5% to 99.9%.', src=src('arc_lb'))]

presets = [
  dict(name='Real-SWE (10 tasks)', n=10, src=['Specific Labs, Real-SWE', 'https://withspecific.com/benchmarks/real-swe'], note='10 licensed tasks, 8 rollouts each per model'),
  dict(name='AIME, one year (30)', n=30, src=S['l2r'], note='AIME I and II, 15 problems each'),
  dict(name='SWE-Bench Pro V2 HARD (51)', n=51, src=S['sbp_v2'], note=''),
  dict(name='Terminal-Bench 4.0 (66)', n=66, src=S['o55'], note='section 8.5'),
  dict(name='Terminal-Bench-Science 0.1 (70)', n=70, src=S['o55'], note='section 8.6'),
  dict(name='Terminal-Bench 2.1 (89)', n=89, src=S['aa_tb21'], note=''),
  dict(name='OSWorld 2.0 (108)', n=108, src=S['o55'], note='section 8.13.3'),
  dict(name='GPQA Diamond (198)', n=198, src=['GPQA paper, Rein et al. 2023', 'https://arxiv.org/abs/2311.12022'], note=''),
  dict(name='Legal Research Bench validation (200)', n=200, src=S['tnw_law'], note='OpenAI\'s set'),
  dict(name='SWE-Bench Pro V2 private (272)', n=272, src=S['sbp_v2_blog'], note=''),
  dict(name='SWE-bench Verified (500)', n=500, src=['OpenAI, Introducing SWE-bench Verified', 'https://openai.com/index/introducing-swe-bench-verified/'], note=''),
  dict(name='SWE-Bench Pro V2 public (642)', n=642, src=S['sbp_v2'], note=''),
  dict(name='Humanity\'s Last Exam (2,500)', n=2500, src=S['o55'], note='section 8.11.1'),
  dict(name='MMLU test (14,042)', n=14042, src=['MMLU dataset card (test split)', 'https://huggingface.co/datasets/cais/mmlu'], note=''),
]

kinds = {'vendor': 'Model developer', 'rival': 'Another lab\'s table', 'maint': 'Benchmark maintainer', 'indep': 'Independent tracker', 'paper': 'Paper or harness authors'}

data = dict(read_date=READ, kinds=kinds, sources=S, cases=cases, tracks=tracks, presets=presets)

# sanity: every reading has a source and a value in range; no em-dash anywhere
for c in cases:
    for r in c['readings']:
        assert r.get('src'), (c['id'], r['lab'])
        assert 0 <= r['v'] <= 100, (c['id'], r['lab'], r['v'])
blob = json.dumps(data, ensure_ascii=False, indent=1)
assert chr(0x2014) not in blob
os.makedirs(os.path.join(HERE, '..', 'data'), exist_ok=True)
with open(os.path.join(HERE, '..', 'data', 'same.json'), 'w') as f:
    f.write(blob)
with open(os.path.join(HERE, '..', 'parts', '34_js_same_a.js'), 'w') as f:
    f.write('// ---- Same model, many numbers: data (generated by src/same/mk_same.py from data/same.json; do not edit) ----\n')
    f.write('window.SM_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('cases', len(cases), 'readings', sum(len(c['readings']) for c in cases), 'tracks', [len(t['steps']) for t in tracks])
