"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header
 ('Reading time line "9 min read, +~2h 30m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors/lab: Yuntao Bai, Saurav Kadavath, Sandipan Kundu, Amanda Askell, Jared Kaplan et al. (Anthropic)', R + ', headline card; all 51 in Further reading', ['Yuntao Bai', 'Saurav Kadavath', 'Sandipan Kundu', 'Amanda Askell', 'Jared Kaplan', 'Anthropic']),
 ('Date: December 2022', R + ', headline card', ['15 December 2022']),
 ('Link arXiv 2212.08073 (~1h 30m, long paper)', 'card and Further reading', ['https://arxiv.org/abs/2212.08073', '(1h 30m)']),
 ('Link PDF (same paper)', 'card and Further reading', ['https://arxiv.org/pdf/2212.08073']),
 ('Link prompts + principles repo (~20 min for the principles and sample transcripts)', 'card, Further reading, and the data behind three tabs', ['https://github.com/anthropics/ConstitutionalHarmlessnessPaper', 'About 20 minutes for the principles and sample transcripts']),
 # resources
 ('Anthropic research post (~10 min): the official summary', 'Further reading', ['https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback', 'the official summary of the paper', '(10 min)']),
 ("Claude's Constitution (~30 min): production constitution, research-era principles evolved (UN Declaration of Human Rights, platform norms)", 'Further reading; Why it matters', ['https://www.anthropic.com/news/claudes-constitution', 'the production constitution used for Claude', 'UN Declaration of Human Rights', "Apple's terms of service"]),
 ('Repo: the 16 SL principles, 16 RL principles, few-shot prompts and sample transcripts; fastest way to see what a constitution is', 'Further reading; The constitution tab shows all 32 verbatim', ['the 16 SL and 16 RL principles, the few-shot prompts', 'The 16 principles for critiques and revisions', 'The 16 principles for AI feedback labels']),
 # problem
 ('RLHF (InstructGPT, Anthropic HH) needs tens of thousands of human preference labels', R + ', Problem', ['InstructGPT and Anthropic', 'tens of thousands of human feedback labels']),
 ('Labels encode the objective opaquely: nobody can read the spec out of comparisons', R + ', Problem', ['no one can feasibly understand or summarize the collective impact of so much information']),
 ('Crowdworkers labelling harmlessness reward evasion, HH-RLHF stonewalls ("I can\'t answer that"); tension helpfulness vs harmlessness', R + ', Problem; Count tab', ['evasiveness was rewarded as a response to harmful inputs by our crowdworkers', 'tension between helpfulness and harmlessness', "I can't answer that"]),
 ('The question: zero human harmlessness labels, short list of natural-language principles plus AI feedback; harmless without evasive', R + ', Problem', ['no human labels identifying harmful outputs', 'harmless without being evasive']),
 ('Broader motivation: scaling supervision as models approach/exceed human level', R + ', Problem', ['scaling supervision', 'approach human level']),
 # method
 ('Start from a helpful-only RLHF model (human helpfulness labels only; complies with harmful requests)', R + ', Idea; pipeline animation', ['helpful-only RLHF model', 'human helpfulness labels only']),
 ('Phase 1 SL-CAI: critique, revise, finetune', R + ', Stage 1', ['Stage 1: critique, revise, fine-tune (SL-CAI)']),
 ('1. Sample a response to a red-team prompt from the helpful model (typically harmful)', R + ', Stage 1', ["Sample the helpful model's answer to a red-team prompt", 'typically harmful']),
 ('2. Critique request from the constitution ("identify specific ways ... harmful, unethical, racist, sexist, toxic, dangerous, or illegal")', R + ', Stage 1 example; Replay tab', ['Identify specific ways in which the assistant', 'critique request']),
 ('3. Revision request, sample a revision, splice back onto the original prompt', R + ', Stage 1', ['revision request', 'spliced back after the prompt']),
 ('4. Repeat with a different random principle each step; 4 revisions per prompt; 16 principles; few-shot examples keep format', R + ', Stage 1; Replay tab', ['4 revisions per prompt', '16 principles', 'confused about its point of view']),
 ('5. Finetune a pretrained model on revisions from all steps + sampled helpfulness responses; one epoch, LR 0.5x, batch 1024', R + ', Stage 1', ['Fine-tune a pretrained model on the revisions from all steps', 'One epoch at a constant 0.5 times the pretraining learning rate, batch 1,024 sequences']),
 ('Data: ~183k red-team prompts (43k human + 140k model), 135k helpfulness prompts', R + ', Stage 1 (corrected: 42,496 human, not 43k; 182,831 in all)', ['42,496 human-written red-team prompts', '140,335 generated', '182,831 in all', '135,296 human-written helpfulness prompts']),
 ('First revision removes most harmful content; later revisions help marginally', R + ', Stage 1 with the measured predict-then-reveal', ['the first revision almost always removed most aspects of harmfulness', 'How much text do the later revisions still rewrite?']),
 ('Critiques matter for small models; at 52B direct revision about the same; kept for transparency', R + ', Stage 1', ['worse for small models and about equal at 52B', 'critiques stay, for transparency']),
 ('Number of principles does not change harmlessness but adds diversity, helping RL exploration', R + ', Stage 1 (with the paper\'s note that diversity was not measured)', ['More principles do not change harmlessness scores', 'we did not studied']),
 ('Point of phase 1: get the policy on-distribution so RL needs less exploration', R + ', Idea', ['on-distribution', 'less exploration']),
 ('Phase 2 RL-CAI/RLAIF: AI comparisons, PM, RL', R + ', Stage 2', ['Stage 2: RL from AI feedback (RL-CAI)']),
 ('1. Sample response pairs from SL-CAI on red-team prompts', R + ', Stage 2', ['SL-CAI samples a pair of answers to each red-team prompt']),
 ('2. Independent feedback model (pretrained LM), multiple choice, random principle ("wise, ethical, polite and friendly"), few-shot', R + ', Stage 2', ['feedback model', 'typically a pretrained LM', 'a wise, ethical, polite and friendly person would more likely say', 'after few-shot examples']),
 ('3. Normalized log-probs of (A)/(B) as soft labels (well calibrated, Kadavath et al.); ensembling over 16 principles more robust', R + ', Stage 2', ['soft label', 'Kadavath et al. 2022', 'notably more robust']),
 ('4. PM on AI harmlessness (183k) + human helpfulness (135k); harmlessness labels 100% AI', R + ', Stage 2', ['182,831 AI-labelled harmlessness comparisons and 135,296 human helpfulness ones', 'all of the harmlessness data, labelled by a model']),
 ('5. RL identical to RLHF, starting from SL-CAI', R + ', Stage 2', ['exactly the same as RLHF', 'RL from SL-CAI']),
 ('CoT variant: helpful RLHF as feedback model, "Let\'s think step-by-step"; labels collapse to 0/1, extreme responses; clamp 40-60 fixed it, best results', R + ', Stage 2 with the label demo (adds the 20 to 80 clamp)', ["Let's think step-by-step", 'would learn to output more extreme responses', 'the main results use 40 to 60', 'Clamping to 20 to 80% helped slightly']),
 # results
 ('Pareto improvement over RLHF: crowdworker Elo, 52B, ~10.3k helpfulness and ~8.1k harmlessness comparisons; RL-CAI more harmless than helpful and HH RLHF at comparable helpfulness; Figure 2 frontier', R + ', Results (qualified: "a rough outline of a pareto frontier")', ['10,274 helpfulness and 8,135 harmlessness comparisons over 24 snapshots', 'learn to be less harmful at a given level of helpfulness', 'a rough outline of a pareto frontier']),
 ('CoT trades a little helpfulness for a little more harmlessness', R + ', Results', ['CoT is slightly less helpful and slightly more harmless']),
 ('AI labels approach human PMs: 438 HHH comparisons, improves with scale, ensembled CoT 52B approaches PMs on hundreds of thousands of labels; well calibrated', R + ', Results (corrected: competitiveness above 52B is an extrapolation)', ['On 438 binary comparisons', 'several hundred thousand human labels', 'models larger than 52B will be competitive', 'reasonably well-calibrated']),
 ('Harmless without evasive: RL-CAI virtually never evasive; explains why harmful, declines with reasons', R + ', Results; Count tab measures it (0 of 2,244)', ['RL-CAI is virtually never evasive', 'none of 2,244']),
 ('HH-RLHF drifts to canned refusals over training; harmlessness Elo declines late under the non-evasive instruction', R + ', Results', ['Late in training both RLHF models lose harmlessness Elo']),
 ('Absolute 0-4 harmfulness over 64 held-out prompts: helpful-RLHF worse, SL-CAI and RL-CAI improve', R + ', Results (corrected: HH RLHF also improves; the RL-CAI runs start from SL-CAI; 256 responses per prompt)', ['0 to 4', 'on 64 held-out prompts, 256 responses each', 'HH RLHF, RL-CAI and RL-CAI with CoT grow less harmful']),
 ('Goodharting: over-trained RL-CAI preachy/boilerplate ("you are valid, valued, and cared for"); mitigations: rewrite principles, ensembling, soft/clamped labels', R + ', Results; Count tab counts the boilerplate', ['you are valid, valued, and cared for', 'principles rewritten against over-reactive or accusatory answers', 'ensembling over the 16 principles', 'soft or clamped labels']),
 # why it matters
 ('RLAIF at scale, demonstrated first: AI labels replace human labels for an alignment objective; enabled AI preference data feeding PM/DPO pipelines', R + ', Why it matters', ['RLAIF at scale, demonstrated first', 'AI-generated preference data feeding PM or DPO pipelines']),
 ("Google's 2023 RLAIF paper confirmed parity with RLHF on helpfulness tasks too", R + ', Why it matters (corrected: summarisation, helpful and harmless dialogue)', ['https://arxiv.org/abs/2309.00267', 'summarisation, helpful dialogue and harmless dialogue']),
 ('Direct lineage into Claude: CAI core component; 16 ad hoc principles grew into the published constitution (UN Declaration), then Collective CAI (2023)', R + ', Why it matters (updated: the January 2026 constitution replaced the 2023 one)', ['trained with Constitutional AI', 'Collective Constitutional AI', 'January 2026']),
 ("Explicit legible behaviour spec across the industry: OpenAI's Model Spec, deliberative alignment reasoning over the spec like CAI's CoT feedback model", R + ', Why it matters', ['Model Spec', 'deliberative alignment', "much like CAI's CoT feedback model"]),
 ('Evasiveness finding changed refusal design: harmless but non-evasive, explain your objection', R + ', Why it matters', ['Harmless but non-evasive, explain your objection']),
 ('Scalable oversight in practice: editing one sentence of the constitution replaces relabeling, cutting iteration time', R + ', Problem (motivation 4) and What it takes to use this', ['editing a principle replaces relabeling', 'iteration time']),
 ('Critique-and-revise seeded the self-improvement literature (self-refine, self-rewarding LMs); feedback model an early calibrated LLM-as-judge', R + ', Why it matters, now sourced', ['https://arxiv.org/abs/2303.17651', 'https://arxiv.org/abs/2401.10020', 'early, carefully calibrated LLM-as-judge']),
 # connections
 ('InstructGPT: RLHF recipe CAI extends; swaps human preference labels for AI labels (harmlessness only), keeps PM + RL', 'Connections; Further reading', ['3c65c17b0d0d8180b958d8299996a063', 'the RLHF recipe CAI extends']),
 ('DPO: removes PM/RL; modern pipelines combine CAI-style AI preference data with DPO', 'Connections; Further reading', ['3c65c17b0d0d818bb1d8cafd30e20f9e', 'removes the PM and RL entirely']),
 ('DeepSeekMath/GRPO and DeepSeek-R1: RL-for-LLMs line; R1 replaces preference rewards with verifiable rewards', 'Connections; Further reading', ['3c65c17b0d0d817f9fc5cb9a9fbcbee5', '3c65c17b0d0d813faca4f7a51eaa0c65', 'verifiable rewards, the other route around human labels']),
 ('Topics: llm-training-and-post-training (alignment, RLHF/RLAIF), rl (RL for LLMs), evaluation-and-llm-judges (feedback model as early judge: calibration, ensembling, CoT overconfidence)', 'Connections; Further reading', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d8195a6c6c11ad093c16e', '3c65c17b0d0d8181b351e1b8fc6a1546', 'calibration, ensembling, CoT overconfidence']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Trains a harmless, non-evasive assistant with zero human harmlessness labels']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:36)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
