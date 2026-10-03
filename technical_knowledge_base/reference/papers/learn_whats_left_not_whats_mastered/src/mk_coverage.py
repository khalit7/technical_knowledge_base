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
 ('Reading time line "10 min read, +3h resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Yixuan Wang, Yifei Chen, Haichao Zhang, Haozheng Luo, Xander Wu, Jie Ni, Yun Fu, Nuno Vasconcelos, Yijiang Li', R + ', headline card', ['Yixuan Wang', 'Yifei Chen', 'Haichao Zhang', 'Haozheng Luo', 'Xander Wu', 'Jie Ni', 'Yun Fu', 'Nuno Vasconcelos', 'Yijiang Li']),
 ('Lab: University of Florida, UC San Diego, Northeastern, Northwestern, Stanford, Zillion Network, Universitaet Innsbruck', R + ', headline card', ['University of Florida, UC San Diego, Northeastern University, Northwestern University, Stanford University, Zillion Network, Universität Innsbruck']),
 ('Date: August 2026 (arXiv v1, 17 Aug 2026)', R + ', headline card', ['17 August 2026 (arXiv v1, the only version)']),
 ('Link arXiv 2608.16072 (45 min, 14 pages)', 'card; Further reading', ['https://arxiv.org/abs/2608.16072', '(45 min)']),
 ('SA-MRPO: drop-in change to how the advantage is built in GRPO-style RLVR with multiple reward objectives (correctness plus length, format, executability)', R + ', Problem', ['Saturation Aware Advantage Reweighting for Multi-Reward Policy Optimization', 'Nothing else about the GRPO update changes']),
 ('Each objective normalised independently, then down-weighted by how close its batch-mean reward is to its ceiling; budget flows to objectives with headroom', R + ', Problem and Method', ['keep GDPO\'s per-objective standardisation, and multiply each objective\'s weight by (1 − s', 'how much of that objective\'s reward range the current batch already achieves']),
 ('Strictly generalises GRPO and GDPO', R + ', Method, Special cases', ['So SA-MRPO strictly generalises both']),
 ('Best resources skipped: preprint a week old, no external explanations; the paper is the reference', 'superseded: Further reading now lists the baseline (GDPO) and its code, the two concurrent rivals, a reproducibility study and a GRPO explainer; still no external explainer of this paper exists', ['GDPO: Group reward-Decoupled Normalization Policy Optimization', 'A Sober Look at Progress in Language Model Reasoning']),
 # problem
 ('Reasoning RLVR is rarely single-objective: correct, but also length budgets, format constraints, safety, executability', R + ', Problem', ['an answer must be correct, and also respect a length budget, a format, a safety rule']),
 ('Standard recipe scalarises r_sum = sum w_k r_k with fixed weights, then group-standardised GRPO advantage', R + ', Problem', ['add the rewards with fixed weights', 'then standardise the sum within each group as GRPO does']),
 ('Failure 1: scalarisation loses reward resolution; with equal weights (1,0) and (0,1) indistinguishable; perfect format zero correctness reinforced as strongly as the reverse', R + ', Problem; Figure 1 animation', ['Scalarisation loses reward resolution', '(1, 0) and (0, 1) are indistinguishable', 'reinforced as strongly as the reverse']),
 ('Failure 2: fixed weights ignore saturation; easy objectives saturate early yet keep the same share while correctness keeps headroom', R + ', Problem', ['Fixed weights ignore saturation', 'Easy auxiliary objectives (format, length) saturate early yet keep drawing the same share']),
 ('GDPO fixes problem 1 by per-group per-dimension normalisation before summing, not problem 2: fixed weights persist', R + ', Problem', ['it standardises each reward separately within the group, then sums', 'the second survives decoupling']),
 ('Concurrent methods DVAO, GD2PO, SAW, Focal Reward adapt by variance or agreement; none ties allocation to remaining attainable range', R + ', Problem', ['DVAO by reward variance', 'GD2PO by conflicts between reward-specific advantages', 'SAW by reward variability', 'Focal Reward by saturation of rubric criteria']),
 # method
 ('Setup: B queries, G >= 2 rollouts from frozen behaviour policy, n bounded verifiable objectives with bounds and weights', R + ', Method', ['a batch of B questions, G ≥ 2 answers to each from the frozen sampling policy']),
 ('Per-objective group advantage A_k = (r_k - mu_k)/sigma_k (the GDPO part)', R + ', Method step 1', ['Per-objective group advantage (the GDPO part)']),
 ('Saturation ratio s_k = (rbar_k - r_min)/(r_max - r_min) in [0,1], rbar over all B x G rollouts; no estimation needed, bounds prescribed by the reward function', R + ', Method step 2', ['Saturation ratio (the new part)', 'Nothing is estimated: for bounded rule-based rewards the bounds come with the reward function']),
 ('Aggregation wtilde_k = w_k (1 - s_k)^gamma, Atilde = sum wtilde_k A_k', R + ', Method step 3', ['Saturation-aware aggregation']),
 ('Re-standardise Atilde over the whole batch to keep the advantage scale stable; plugs into the standard clipped GRPO surrogate', R + ', Method step 4', ['Re-standardise over the whole batch', 'goes into the standard clipped GRPO surrogate unchanged']),
 ('Wall-clock overhead a few batch means, essentially zero', R + ', Method, Cost (marked as derived: the paper reports no timing)', ['the paper reports no timing, but the extra work is negligible beside sampling']),
 ('gamma = 0 recovers GDPO exactly; single objective reduces to GRPO', R + ', Method, Special cases', ['γ = 0 gives w̃']),
 ('gamma is the single knob: ratio wtilde_a/wtilde_b = (w_a/w_b)((1-s_a)/(1-s_b))^gamma, strictly decreasing in gamma when a more saturated', R + ', Method; Tables tab checks', ['γ is the single knob', 'strictly decreasing in γ when a is the more saturated']),
 ('Sign reversal: in Figure 1 a perfect-format zero-correctness rollout positive under GDPO, negative under SA-MRPO', R + ', Figure 1 animation and predict question (with the flip threshold)', ['reverse the sign', 'answer 3 turns negative']),
 ('Caveat (a): no monotonic-retention guarantee; Eq. 2 local condition; reweighting shrinks the saturated objective\'s self-protection term; adaptive allocation rule, not constrained Pareto', R + ', What it does not promise', ['No retention guarantee', 'deliberately weakens the self-improvement term that protects it', 'an adaptive objective allocation rule rather than a constrained multi objective method']),
 ('Caveat (b): 1 - s is nominal reward headroom, not achievable; capacity may make part unreachable', R + ', What it does not promise', ['Nominal, not achievable, headroom']),
 # results
 ('Setup: verl + vLLM, G = 8, batch 256, 3 epochs, max response 4096; DeepScaleR-Preview ~40K problems; pass@1 over 16 samples at temperature 0.6', R + ', Experimental setup', ['verl with vLLM for sampling', 'global batch 256 questions, 3 epochs, answers capped at 4,096 tokens', '40,315', 'temperature 0.6, top-p 0.95', '16 samples per problem']),
 ('Baseline GDPO with identical data, rewards, hyperparameters; only the advantage construction differs', R + ', Experimental setup', ['The baseline throughout is GDPO with the same data, rewards and hyperparameters; only the advantage differs']),
 ('Math (Qwen2.5-3B/7B-Instruct; correctness + binary length, optionally + format): beats GDPO in 12 of 15, up to +5.0 AIME24 (7B three objectives 11.5 -> 16.5) and +3.5 MATH500', R + ', Results; Table 1 chart', ['12 of 15', '11.5% to 16.5%', '+3.5 on MATH500']),
 ('EXCEED stays essentially unchanged; improving the hard objective did not require abandoning the easy one', R + ', Results (corrected: small, but it rises in 10 of 15 cells)', ['Exceed rises in 10 of 15 cells and falls in 2']),
 ('Adaptive (R1-Distill-Qwen-7B, correctness + graded length saturating below 1024): all five benchmarks, +3.8 average, up to +9.2 AMC23 (28.3 -> 37.5)', R + ', Results; Table 2 chart', ['beats GDPO on all five benchmarks, by 3.8 points on average', '28.3% to 37.5%']),
 ('Responses moderately longer (333 -> 459) but under the saturation threshold, the intended behaviour', R + ', Results (qualified: averages only; AIME24 averages 804)', ['459 against 333 tokens on average', 'both averages sit under B']),
 ('Code (Qwen2.5-7B-Instruct, Eurus-2-RL; pass rate + executability): higher pass rate on 3 of 4, up to +2.3 Codeforces, comparable bug rates; executability preserved', R + ', Results (qualified: bug rate equal or higher on all four)', ['higher on 3 of 4 benchmarks', '2.3 points (Codeforces)', 'Its bug rate is equal or higher on all four']),
 ('Gamma ablation (correctness + length, Qwen2.5-3B/7B): every gamma > 0 beats gamma = 0; 0.5 sweet spot; larger gamma erodes length (EXCEED creeps up); curves monotone in gamma', R + ', The saturation exponent γ (corrected: the downstream table is 3B only; 7B appears only in the training curves)', ['every γ > 0 beats γ = 0 on average accuracy', 'γ = 0.5 is best on average', 'larger γ raises Exceed', 'Downstream, for 3B only']),
 # why it matters
 ('Relevant for any GRPO/RLVR loop with more than one reward term; weighted-sum-then-standardise wastes budget on saturated objectives; fix is about 10 lines', R + ', What it takes; Why it matters', ['about ten lines in the advantage step', 'The silent tax is real, its size is not']),
 ('Practical defaults gamma = 0.5 with rule-based bounded rewards; needs known bounds; ill-defined for unbounded learned RM scores; RLVR not general RLHF', R + ', What it takes', ['γ = 0.5 per Table 4', 'ill-defined for unbounded learned reward-model scores, so this is an RLVR technique, not a general RLHF one']),
 ('Failure modes are diagnostics even without the method: format at 0.99 and correctness flat means correctness is taxed', R + ', What it takes', ['if a format reward sits at 0.99 while correctness is flat']),
 ('2026 trend: multi-reward aggregation a first-class design axis (GDPO, DVAO, GD2PO, SAW, Focal Reward, multi-task GRPO); cleanest formulation: allocation by remaining attainable range', R + ', Why it matters', ['Multi-reward aggregation is now a design axis of reasoning RL', 'multi-task GRPO', 'allocation by remaining attainable reward range rather than by variance or gradient agreement']),
 # connections
 ('Connection: DeepSeekMath GRPO, the underlying update; SA-MRPO changes only the advantage and keeps the clipped surrogate', R + ', Connections; Further reading', ['3c65c17b0d0d817f9fc5cb9a9fbcbee5', 'the group-relative advantage and clipped surrogate that SA-MRPO keeps unchanged']),
 ('Connection: DeepSeek-R1, the RLVR regime; R1-style format + correctness recipes are Figure 1\'s scenario', R + ', Connections', ['3c65c17b0d0d813faca4f7a51eaa0c65', 'exactly Figure 1\'s scenario']),
 ('Connection: GDPO arXiv 2601.05242 (~45 min), the gamma = 0 case', R + ', Connections; Further reading', ['https://arxiv.org/abs/2601.05242', 'its γ = 0 case']),
 ('Connection: DVAO arXiv 2605.25604 and GD2PO arXiv 2606.16771 (~45 min each), variance- and conflict-driven', R + ', Connections; Further reading', ['https://arxiv.org/abs/2605.25604', 'https://arxiv.org/abs/2606.16771', 'driven by reward variance and by advantage conflict rather than saturation']),
 ('KB topics: topics/rl and topics/llm-training-and-post-training', R + ', Connections; Further reading', ['3c65c17b0d0d8195a6c6c11ad093c16e', '3c65c17b0d0d81b6876ee72b7056793b']),
 ('Takeaway property (stays in Notion): gamma = 0.5 the sweet spot', 'headline card in one line; corrected in the Reading tab: the main 3B two-objective result used γ = 0.25', ['used γ = 0.25, not the recommended 0.5']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:34)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
