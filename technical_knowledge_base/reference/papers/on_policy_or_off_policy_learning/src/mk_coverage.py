"""Write coverage.json and verify it against the built index.html (tags stripped, whitespace normalised).
The Notion row's old body (live.md) is one line, "Being built in the technical_knowledge_base repository.", so
coverage runs against the paper's own claims instead: the row's Takeaway, the abstract's findings, every
numbered result of §4 to §7 and the appendix results the paper's argument rests on. The item list is this
paper's own (not copied from another page).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', raw)))
R, RUN, TB = 'The paper tab', 'Move the rollout policy tab', 'Figures rebuilt tab'
C = [
 # the Notion row
 ('live.md body: "Being built in the technical_knowledge_base repository."', 'replaced: the page is the built body', []),
 ('Takeaway property: KL direction, not who wrote the rollouts, shapes performance and coverage; forward KL robust, reverse KL favours student rollouts; on-policy generalisation edge does not reliably survive later RLVR', R + ', headline card (verbatim)', ['the token-level KL direction, not who wrote the rollouts, shapes performance and coverage']),
 ('Authors Julianna Piskorz, Antonin Berthon (equal contribution), Mihaela van der Schaar; University of Cambridge; 28 September 2026', R + ', headline card', ['Julianna Piskorz*, Antonin Berthon*, Mihaela van der Schaar', 'University of Cambridge', '28 September 2026']),
 # problem and framing
 ('On-policy learning claimed to reduce forgetting, give sparser updates and generalise better (Shenfeld, Chen, Mukherjee, Chu)', R + ', Problem', ['forgets less of what the model already knew', 'changes fewer parameters', 'generalises better']),
 ('SFT against RL comparisons change objective, reward, supervision density, optimisation and learning rate together', R + ', Problem', ['SFT against RL changes many things at once']),
 ('Strong-to-weak distillation as a controlled testbed: only the rollout policy changes', R + ', Problem', ['if you change <i>only</i> who writes the rollouts'.replace('<i>', '').replace('</i>', '')]),
 ('Eq. 1: loss averages token-level divergence over prefixes visited under rollout policy rho; OffPD rho = teacher, OnPD rho = student; gradients stopped through sampling', R + ', Two knobs', ['ρ = π T is OffPD, ρ = π S is OnPD', 'Gradients are not taken through the sampling']),
 ('Eq. 2 and 3: forward KL mass-covering, reverse KL mode-seeking, computed over the full vocabulary', R + ', Two knobs', ['mass-covering', 'mode-seeking', 'computed exactly over the whole vocabulary']),
 ('Conventional pairings: teacher + forward and student + reverse are the chain-rule decompositions of sequence-level KL (Prop. C.4) and the one-sample estimators; neither holds with full-vocabulary KL, so the pairings are crossed', R + ', Two knobs', ['two chain-rule expansions of sequence-level KL', 'crosses the pairings']),
 # setup
 ('Llama-3.1-8B teachers into Llama-3.2-1B students; Qwen2.5-7B into Qwen2.5-1.5B in Appendix A.5', R + ', Setup', ['Llama-3.1-8B-Instruct teachers distilled into Llama-3.2-1B-Instruct students', 'Qwen2.5-7B into Qwen2.5-1.5B']),
 ('Tasks MedReason, Science, Countdown-3; a teacher trained per task (SFT then GRPO); Table 2 accuracies 85.5, 67.5, 99.0', R + ', Setup; Figures rebuilt tab, Table 2', ['MedReason', 'SciKnowEval', 'Countdown-3', '85.5%, 67.5% and 99.0%']),
 ('150 steps, batch 32, AdamW, clipping 1.0, LR 1e-5 or 5e-5, 3 seeds; teacher temperature 0.5, student 1.0', R + ', Setup', ['150 steps of full fine-tuning, 32 prompts per step', 'gradient norm clipped at 1.0', 'temperature 0.5 and the student', 'three seeds per setting']),
 ('Forgetting = change in mean of 7 OOD benchmarks (3,935 items); sparsity = share of parameters changed by less than 1e-6', R + ', Setup', ['3,935 items', 'moved by less than 10 −6']),
 # section 4
 ('No consistent on-policy advantage in accuracy: best 72% OnPD and 73% OffPD', R + ', Result; Figure 1 rebuilt', ['reach 72% and 73%']),
 ('Forward KL 71 to 73% everywhere; reverse KL 35 to 72%, sensitive to learning rate', R + ', Result', ['Forward KL sits at 71 to 73% everywhere', '72% on-policy and 35% off-policy at the lower learning rate']),
 ('Forgetting: at most 1.3 points at 1e-5, 11.2 to 14.0 at 5e-5; forward KL at low LR reaches top accuracy without forgetting (cliff, Catalan-Tatjer and Geiping)', R + ', Result', ['within 1.3 points', 'loses 11 to 14 points', 'Catalan-Tatjer and Geiping']),
 ('Sparsity 85.3 to 89.6% vs 51.9 to 60.0%; OffPD at least as sparse as OnPD; reverse KL sparser than forward on-policy', R + ', Result; Figures rebuilt tab', ['85.3 to 89.6% of parameters', '51.9 to 60.0% at the high rate', 'off-policy is at least as sparse as on-policy in every matched pair']),
 ('Learning-rate sweep 1e-5 to 6e-5 (Figure 2): sparsity falls roughly linearly, forgetting rises, under both rollout policies', R + ', Result', ['A sweep of six learning rates on Countdown-3']),
 ('Appendix E: the checkpoints behind the sparse-RL claim used learning rates ten times lower (medians 5e-6 SFT vs 5e-7 RL)', R + ', Result; Figures rebuilt tab, Table 6', ['median of 5 × 10 −6', 'median of 5 × 10 −7 , ten times lower']),
 # section 5.1
 ('Eq. 4: forward-KL logit gradient pi_S - pi_T, bounded in [-1, 1]', R + ', Why: gradients; gradient card', ['∂ forward KL / ∂ z v = π S ( v ) − π T ( v )']),
 ('Eq. 5: reverse-KL logit gradient weighted by pi_S times unbounded log-ratio; vanishes on teacher modes the student omits', R + ', Why: gradients; gradient card', ['struggle to recover teacher modes omitted by the student']),
 ('Theorem C.1: forward-KL update difference bounded by 2 sqrt2 B times rollout TV', R + ', Why: gradients; ' + RUN, ['2√2 B times the total-variation distance']),
 ('Theorem C.2: no distribution-free reverse-KL bound (two-token counterexample, eps (sqrt2/8) log((1-delta)/delta))', R + ', Why: gradients; gradient card; claims checked', ['ε (√2/8) log((1 − δ)/δ)']),
 ('Corollary C.3: bound 2BR TV under bounded log-ratio range; diagnostic: extreme log-ratios at visited prefixes', R + ', Why: gradients; Use it', ['2 BR times the distance', 'Monitor the spread of student-teacher log-ratios']),
 # section 5.2
 ('Rollout-policy spectrum pi_lambda (lambda -1 OffPD, +1 OnPD, 0 midpoint, extrapolation beyond ±1) with plausibility mask alpha 0.2 and log-ratio clip c = 2 log 3 (Appendix D.5)', R + ', The spectrum; ' + RUN, ['λ = −1 is the teacher (OffPD), λ = +1 the student (OnPD)', 'at least 20% of the favoured model', 'capped at 2 log 3']),
 ('Figure 3: forward KL above 80% across the spectrum, varying 5.2 points at 1e-5; reverse KL much more sensitive, favours student-favoured rollouts at low LR, unstable at high LR', R + ', The spectrum; Figure 3 rebuilt', ['82.8% and 88.0% at every λ, a 5.2-point range', '49% on average for λ < 0 against 80% for λ > 0', 'collapses to 0% at λ = 1.5']),
 ('Forgetting and sparsity barely vary with lambda; learning rate dominates', R + ', The spectrum', ['Forgetting and sparsity barely move with λ']),
 ('Appendix A.10: OnPD forward KL passes through incoherent high-entropy rollouts (12 nats ~ 163k choices), still reaches 37% Science and 56% MedReason, OOD declines 1.3 and 0.8; temperature sensitivity', R + ', The spectrum, closed details', ['163,000', '37% (Science) and 56% (MedReason)', '1.3 and 0.8 points']),
 ('Qwen2.5 spectrum: same asymmetry; at high LR student-favoured rollouts forgot more', R + ', The spectrum', ['student-favoured rollouts forgot <i>more</i>'.replace('<i>', '').replace('</i>', '')]),
 # section 5.3
 ('Figure 5: forward KL larger pass@10 gains at similar pass@1 for lambda > 0 (Qwen in Figure 16)', R + ', Beyond pass@1; Figure 5 rebuilt', ['its pass@10 is lower (89.2 to 94.2% against 98.2 to 99.0%)']),
 ('Countdown-4E: on-policy rollouts 10 to 15% higher pass@k under both KL directions (checked: pass@10 only)', R + ', Beyond pass@1 (corrected)', ['the 10 to 15 applies to pass@10 only']),
 ('RLVR on Countdown-4 for 300 steps: reverse-KL checkpoints improve quickly then collapse; OffPD forward-KL (and reverse at 5e-5) improve steadily and end highest; on-policy edge does not persist (Zhang et al. 2026a)', R + ', Beyond pass@1; RLVR table', ['finish highest', 'then fall back', 'never learn at all']),
 ('Spanish-style transfer: OnPD with reverse KL keeps English; others transfer (one run, GPT-5 judge)', R + ', Beyond pass@1', ['except on-policy reverse KL, which kept English', 'One run per condition, judged by GPT-5']),
 # section 6 and appendix ablations
 ('Sampled KL (Appendix A.2): same conclusions', R + ', Robustness', ['Sampled instead of full-vocabulary KL']),
 ('No clipping (Appendix A.1): norms exceed 1 at every step; reverse KL deteriorates; forward KL works at larger LR; Adam explanation', R + ', Robustness', ['exceeds 1.0 at every logged step', 'Adam normalises steady changes']),
 ('Longer rollouts (Appendix A.3): Numina-MATH, 622-token answers, 53.1% baseline, 53.3 to 59.0%, OnPD reverse best at low LR, one run, best checkpoint selected on MATH-500; OOD 41.4 to 33.7-35.9; sparsity 92-93 vs 63-70', R + ', Robustness', ['622 tokens', '53.1% on MATH-500', '53.3 to 59.0%', '33.7 to 35.9%', '92 to 93% against 63 to 70%']),
 ('Temperature swap (Appendix A.12) and sparsity threshold 1e-8 (Appendix A.7)', R + ', Robustness; Figures rebuilt tab', ['within 0.3 points', 'swings by up to 23 points', 'stricter sparsity threshold']),
 # discussion and limits
 ('Recommendation: include OffPD as a standard baseline; SFT-vs-RL differences hard to attribute to rollout policy alone', R + ', Why it matters; Use it', ['comparisons of public SFT and RL checkpoints trained at rates ten times apart']),
 ('Limitations stated by the authors: students up to 1.5B, traces up to 2,000 tokens, fixed teacher', R + ', How much to believe', ['students of at most 1.5B, traces of at most 2,000 tokens, one fixed teacher per task']),
 # page additions
 ('Evidence judged: verdict and weaknesses', R + ', How much to believe', ['Verdict.', 'temperature confound', 'text against figures']),
 ('Related work this window: Semi-OPD (2610.11291), OPD collapse (2610.03185), RIDE (2609.36484)', R + ', Why it matters; Further reading', ['https://arxiv.org/abs/2610.11291', 'https://arxiv.org/abs/2610.03185', 'https://arxiv.org/abs/2609.36484']),
 ('Owning page linked, not duplicated: Distillation and Small Language Models', R + ', Two knobs and Connections', ['3c65c17b0d0d81efa2a8c3b3b623eb09']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion row fetched 2026-10-19T16:11; body was a placeholder) and the paper itself (arXiv 2609.35259v1)', 'items': len(out),
           'verified': sum(o['verified'] for o in out), 'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out},
          open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
