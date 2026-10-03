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
 ('Reading time line "9 min read, +~2h 30m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: Rafailov, Sharma, Mitchell, Ermon, Manning, Finn (Stanford, CZ Biohub)', R + ', headline card', ['Rafael Rafailov', 'Archit Sharma', 'Eric Mitchell', 'Stefano Ermon', 'Christopher D. Manning', 'Chelsea Finn', 'Stanford University, CZ Biohub']),
 ('Date: May 2023, arXiv 2305.18290; NeurIPS 2023 Outstanding Paper Runner-Up', R + ', headline card (precisely: Outstanding Main Track Runner-Up, from the NeurIPS blog)', ['May 2023', 'arXiv 2305.18290', 'NeurIPS 2023 (Outstanding Main Track Runner-Up)']),
 ('Link arXiv (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/2305.18290', '(45 min)']),
 ('Link reference implementation (~20 min for README and the loss in trainers.py)', 'card and Further reading', ['https://github.com/eric-mitchell/direct-preference-optimization', 'about 20 minutes for the README and the roughly 20-line preference_loss in trainers.py']),
 # resources
 ('Cameron Wolfe: DPO (~40 min): derivation step by step, modern pipeline, TRL code', 'Further reading, Best resources', ['https://cameronrwolfe.substack.com/p/direct-preference-optimization', 'the full derivation walked through step by step', '(40 min)']),
 ('HF TRL DPOTrainer docs (~25 min): implementation, dataset format, implicit-reward metrics, loss variants as loss_type', 'Further reading; The paper (the loss; What it takes)', ['https://huggingface.co/docs/trl/dpo_trainer', 'rewards/chosen', 'rewards/margins', 'loss_type']),
 ('Nathan Lambert: Do we need RL for RLHF? (~20 min): the debate with evidence on both sides', 'Further reading, Best resources', ['https://www.interconnects.ai/p/the-dpo-debate', 'the DPO against PPO debate laid out with the evidence on both sides', '(20 min)']),
 ('Official repo: the ~20-line loss in trainers.py is worth reading once', 'card, Further reading; What it takes', ['roughly 20-line preference_loss', 'about ten lines of PyTorch']),
 # problem
 ('RLHF 2023 (InstructGPT-style) three stages: SFT, reward model by Bradley-Terry MLE, PPO with KL penalty to the reference', R + ', Problem with Eqs. 1 to 3', ['Supervised fine-tuning', 'Reward modelling.', 'Reinforcement learning.', 'Bradley-Terry']),
 ('RL stage: trains and serves multiple models (policy, reference, reward, value); samples in the loop; unstable, hyperparameter-sensitive', R + ', Problem; pipeline animation', ['policy, frozen reference, reward model, a learned value function', 'sampling inside the training loop', 'notoriously unstable and sensitive to hyperparameters']),
 ('Question: is the RL stage necessary? No: same KL-constrained objective with one BCE loss, no reward model, no sampling, no RL', R + ', Problem', ['is the reinforcement learning necessary at all?', 'one binary cross-entropy loss on the preference pairs']),
 # method
 ('Key move: change of variables from rewards to policies', R + ', Idea', ['change variables from rewards to policies']),
 ('1. Closed-form optimal policy pi_r = pi_ref exp(r/beta)/Z, standard KL-regularised control result; Z intractable', R + ', Idea step 1, Eq. 4', ['The best policy for any reward has a closed form', '/ Z ( x )', 'sums over every possible answer']),
 ('2. Reparameterise: r = beta log(pi_r/pi_ref) + beta log Z', R + ', Idea step 2, Eq. 5', ['a reward is a log-ratio of policies', '+ β log Z ( x )']),
 ('Section 5: equivalence classes (differ by f(x)); same preference distribution and same optimal policy; exactly one member beta log pi/pi_ref per class; nothing lost', R + ', Theory: Definition 1, Lemmas 1 and 2, Theorem 1', ['Definition 1.', 'Lemma 1.', 'Lemma 2.', 'Theorem 1.', 'contains exactly one reward of the form', 'loses no reward class']),
 ('3. Substitute into Bradley-Terry: log Z cancels; L_DPO formula', R + ', Idea step 3, Eq. 7', ['so Z cancels', 'ℒ DPO']),
 ('Logistic regression on difference of log-ratios: four forward passes per pair, one backward, no sampling', R + ', Idea Eq. 7 note; headline card', ['logistic regression on a difference of log-ratios', 'four forward passes', 'one backward pass, no sampling']),
 ('4. Implicit reward r_hat = beta log(pi_theta/pi_ref) is a valid reward model; the LM doubles as reward model (title); TRL logs rewards/chosen, rejected, margins', R + ', The loss; Theory implicit-reward plot', ['implicit reward', 'doubles as its own reward model', 'rewards/rejected']),
 ('5. Gradient: -beta E[sigma(r_l - r_w)(grad log pi_w - grad log pi_l)]; push up chosen, down rejected, weighted by misordering', R + ', The loss (gradient formula, with the Appendix A.4 sign slips noted)', ['Push the chosen answer up and the rejected one down', 'how wrongly the implicit reward currently orders it']),
 ('Pairs already right contribute little; confidently wrong pairs dominate', R + ', The loss; pair animation', ['Pairs already ranked correctly contribute little; confidently wrong pairs dominate']),
 ('Weighting essential: naive unweighted probability-ratio objective degenerates', R + ', The loss (quote), animation DPO against Unlikelihood; How much to believe (evidence is two samples)', ['without the weighting coefficient can cause the language model to degenerate', 'Unlikelihood (no weight)']),
 ('Practical: pi_ref = SFT model, or MLE on chosen completions to reduce distribution shift', R + ', The recipe; What it takes', ['otherwise fine-tune on the chosen answers first (Preferred-FT)']),
 ('beta ~ 0.1-0.5', R + ', What it takes (paper: 0.1, 0.5 for TL;DR; README: 0.1 to 0.5)', ['β = 0.1 (0.5 for TL;DR)', 'β between 0.1 and 0.5']),
 ('Preference pairs ideally sampled from pi_ref', R + ', The recipe; What it takes (Data)', ['label pairs sampled from π', 'Pairs sampled from the model being tuned']),
 ('Derivation goes through for Plackett-Luce rankings', R + ', Idea (Appendix A.3, Eq. 20)', ['Plackett-Luce model, where it gives a softmax']),
 # results
 ('Experiments at GPT-2-large / GPT-J / Pythia-2.8B; GPT-4 as judge validated against humans (agree as often as with each other)', R + ', Experiments; Results (GPT-4 as a stand-in for people); Tables tab Table 2', ['GPT-2-large', 'GPT-J', 'Pythia-2.8B', '65% and 87% human-human agreement']),
 ('IMDb: best reward-KL frontier, strictly dominating PPO and PPO-GT', R + ', Results with Figure 2 left rebuilt from its vector data; toy comparison', ['DPO gives by far the best frontier', 'even against PPO-GT', '26 of 27']),
 ('Same objective, better optimiser in practice', R + ', Results (the authors\' reading), How much to believe (the toy\'s counterpoint)', ['the authors read this as DPO being the better optimiser']),
 ('TL;DR: ~61% vs reference at temperature 0, beating PPO best 57% and Best-of-128', R + ', Results (decoded: 158 and 146 of 256; Best of 128 max 57.4%)', ['about 61%', 'PPO 57%', '61.7% and 57.0%']),
 ('TL;DR: far more robust to temperature; PPO collapses at high temperature', R + ', Results; Tables tab Figure 2 right', ['much more robust to temperature', 'DPO 99 and PPO 18']),
 ('Anthropic-HH: only computationally efficient method that beats the chosen completions; roughly matches Best-of-128', R + ', Results (with the temperature caveat: 37.0% against 54.2% at 0.25)', ['the only computationally efficient method that improves over the preferred completions', '62.9% against 60.8%']),
 ('OOD CNN/DailyMail: TL;DR-trained DPO beats PPO 0.36 vs 0.26; generalises without PPO\'s extra unlabeled prompts', R + ', Results; Tables tab Table 1', ['0.36 (DPO) against 0.26 (PPO)', 'PPO also saw extra unlabelled Reddit prompts']),
 ('Essentially no hyperparameter tuning beyond beta', R + ', Results (β not meaningfully tuned)', ['β not meaningfully tuned']),
 # why it matters
 ('Commoditised preference tuning: multi-model RL to a fine-tuning loss on pairs', R + ', Why it matters', ['It commoditised preference tuning', 'a fine-tuning loss anyone can run on preference pairs']),
 ('Zephyr-7B (late 2023) at 7B on UltraFeedback', R + ', Why it matters; Then and now', ['Zephyr-7B (October 2023)', 'UltraFeedback']),
 ('Standard alignment stage: Mixtral-Instruct, Llama 3, Tulu, OLMo 2, Qwen ship DPO', R + ', Why it matters (each sourced)', ['Mixtral Instruct', 'Llama 3', 'Qwen2', 'Tülu 3 and OLMo 2']),
 ('Debate: "Is DPO Superior to PPO" (2024); DeepMind online-vs-offline gap; on-policy RL wins on hard tasks', R + ', Why it matters; Then and now', ['Is DPO Superior to PPO for LLM Alignment?', 'Google DeepMind', 'online-against-offline']),
 ('Offline/off-policy weakness: can hit distributions the data never covered; drives both chosen and rejected likelihoods down', R + ', Why it matters; The loss predict question; Train tab', ['solutions on answers the data never covered', 'likelihood displacement', 'chosen answers lose probability']),
 ('Consensus 2026: DPO cheap and stable for general preference/style; online RL (PPO, GRPO/RLVR per DeepSeek-R1) for reasoning and frontier; iterative/online DPO closes part of the gap', R + ', Why it matters', ['The rough consensus as of 2026', 'DPO is the cheap, stable choice for general preference and style alignment', 'iterative and online DPO close part of the gap']),
 ('Labs run both: DPO then RLVR, as in OLMo 2 and Tulu 3', R + ', Why it matters; Then and now', ['labs commonly run a DPO stage then RLVR']),
 ('Family: IPO, KTO, ORPO, SimPO, CPO, rDPO, TR-DPO, DiscoPOP', R + ', Why it matters; Then and now (several run on the toy)', ['IPO', 'KTO', 'ORPO', 'SimPO', 'CPO', 'rDPO', 'TR-DPO', 'DiscoPOP']),
 ('GRPO group-relative advantage deletes the value model, same motivation', R + ', Why it matters', ['GRPO is a separate line with the same motive of deleting RLHF machinery, there the value model']),
 ('Policy log-ratio = reward as reusable tool: implicit rewards for data filtering and reward-model distillation; derivation pattern recurs', R + ', Why it matters (now sourced: RewardBench, DICE)', ['policy log-ratio = reward', 'RewardBench', 'DICE', 'solve the KL-regularised objective in closed form, substitute back']),
 # connections
 ('InstructGPT (2022-03): the pipeline DPO collapses', 'Connections; Further reading', ['3c65c17b0d0d8180b958d8299996a063', 'the three-stage RLHF pipeline DPO collapses into one loss']),
 ('Constitutional AI (2022-12): RLAIF pairs consumed directly', 'Connections; Further reading', ['3c65c17b0d0d815a9b31e9443961c700', 'DPO consumes such pairs directly']),
 ('DeepSeekMath / GRPO (2024-02): online-RL counterpoint', 'Connections; Further reading', ['3c65c17b0d0d817f9fc5cb9a9fbcbee5', 'the online-RL counterpoint that now dominates reasoning post-training']),
 ('DeepSeek-R1 (2025-01): RLVR at scale, the other pole', 'Connections; Further reading', ['3c65c17b0d0d813faca4f7a51eaa0c65', 'the other pole of the debate']),
 ('Llama 3 (2024-07) and OLMo 2 (2025-01): production pipelines with DPO stages', 'Connections; Further reading', ['3c65c17b0d0d81aca58ccb9d720b474e', '3c65c17b0d0d81fb9857fb956165ae1c', 'production pipelines with DPO stages']),
 ('Topics: llm-training-and-post-training, rl', 'Connections; Further reading, Topics', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d8195a6c6c11ad093c16e']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['reparameterising the reward as the policy/reference log-ratio, matching or beating PPO at 2023 scales']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:38)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
