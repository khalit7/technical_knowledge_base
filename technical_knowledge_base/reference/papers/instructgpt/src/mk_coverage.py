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
 # header and links
 ('Reading time line "11 min read, +~4h 55m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors (20, OpenAI Alignment team)', R + ', headline card', ['Long Ouyang', 'Jeff Wu', 'Xu Jiang', 'Diogo Almeida', 'Carroll L. Wainwright', 'Pamela Mishkin', 'Chong Zhang', 'Sandhini Agarwal', 'Katarina Slama', 'Alex Ray', 'John Schulman', 'Jacob Hilton', 'Fraser Kelton', 'Luke Miller', 'Maddie Simens', 'Amanda Askell', 'Peter Welinder', 'Paul Christiano', 'Jan Leike', 'Ryan Lowe', 'Alignment team']),
 ('Date March 2022, arXiv 2203.02155, NeurIPS 2022', R + ', headline card', ['March 2022', 'arXiv 2203.02155', 'NeurIPS 2022']),
 ('Link arXiv (~1h 30m, long paper with appendices)', 'card and Further reading', ['https://arxiv.org/abs/2203.02155', '(1h 30m)', '43 pages of appendices']),
 ('Link OpenAI blog (~10 min)', 'Further reading (time corrected to 15 min: the post says 16 minutes); Problem; Why it matters', ['https://openai.com/index/instruction-following/', '(15 min)']),
 ('Link model samples repo (~10 min to skim)', 'card, Further reading, Using it', ['https://github.com/openai/following-instructions-human-feedback', 'about 10 minutes to skim']),
 # resources
 ('Chip Huyen RLHF (~40 min): pipeline with math, data economics, failure modes; best walkthrough', 'Further reading', ['https://huyenchip.com/2023/05/02/rlhf.html', 'the data economics and practical failure modes', 'best single walkthrough']),
 ('HF Illustrating RLHF (Lambert, Castricato, von Werra, Havrilla) (~25 min): canonical diagram-first explanation, KL-penalised reward', 'Further reading', ['https://huggingface.co/blog/rlhf', 'Lambert, Castricato, von Werra, Havrilla', 'canonical diagram-first explanation']),
 ('Lambert RLHF Book (~2h for RM and policy-optimisation chapters): context of DPO, GRPO, RLVR', 'Further reading', ['https://rlhfbook.com/', 'reward-modelling and policy-optimisation chapters', '(DPO, GRPO, RLVR)']),
 # problem
 ('LM objective misaligned with "follow my instructions helpfully, honestly, harmlessly"', R + ', Problem', ['the language modeling objective is misaligned', 'helpful', 'honest', 'harmless']),
 ('GPT-3 fabricated facts, toxic or biased text, ignored instructions, needed few-shot scaffolding', R + ', Problem', ['it makes up facts, produces biased or toxic text, ignores the instruction', 'few-shot prompt']),
 ('Prior RLHF (Christiano 2017, Ziegler 2019, Stiennon 2020) only narrow tasks like summarisation', R + ', Problem', ['Christiano et al. (2017)', 'Ziegler et al. (2019)', 'Stiennon et al. (2020)', 'Those were narrow tasks']),
 ('Applies RLHF to the full distribution of real API instructions; asks whether preference fine-tuning makes preferred models without giving up capabilities', R + ', Problem', ['open-ended distribution of instructions that real customers sent', 'without losing what the pretrained model could do']),
 # method
 ('Three-stage pipeline on GPT-3 at 1.3B, 6B, 175B', R + ', The recipe; Figure 2 redrawn', ['1.3B, 6B and 175B parameters', 'Supervised fine-tuning (SFT)', 'Reward model (RM)', 'Reinforcement learning (PPO)']),
 ('SFT: ~13k prompts, mostly API Playground prompts', R + ', Data; Figure 2 with Table 6 counts', ['about 13k training prompts', 'API Playground', 'with demonstrations for SFT']),
 ('Prompts deduplicated, capped at 200 per user, PII-filtered, split by user ID', R + ', Data (with the appendix discrepancy)', ['deduplicated heuristically by long common prefix, capped at 200 per user ID', 'personally identifiable information', 'split into train, validation and test by user ID', 'roughly 200 per organization']),
 ('Labeler-written bootstrap prompts: plain, few-shot, API waitlist use cases', R + ', Data, details', ['<b>plain</b>', '<b>few-shot</b>', '<b>user-based</b>', 'waitlist']),
 ('SFT 16 epochs, cosine decay', R + ', Step 1', ['16 epochs', 'cosine learning-rate decay']),
 ('SFT overfits validation loss after 1 epoch but longer training improves RM score and preference; selection by RM score', R + ', Step 1; Run tab (does not reproduce at toy scale)', ['our SFT models overfit on validation loss after 1 epoch', 'reward-model score on the validation prompts']),
 ('RM: init from SFT, unembedding replaced by scalar head', R + ', Step 2 (with the §C.2 discrepancy)', ['final unembedding layer replaced by a projection to a scalar', 'starts "from the SFT model"']),
 ('Labelers rank K = 4 to 9 completions per prompt (~33k prompts), K choose 2 comparisons', R + ', Step 2; RM widget', ['K</i> = 4 to 9', 'C(<i>K</i>,2) comparisons per prompt', '33k with rankings for the RM']),
 ('RM loss: pairwise cross-entropy, -(1/C(K,2)) E[log sigmoid(r(x,y_w) - r(x,y_l))]', R + ', Step 2 (Eq. 1); RM widget; checked against PyTorch', ['loss(θ) = -(1 / C(<i>K</i>,2))', 'log σ(']),
 ('All comparisons from one prompt in one batch element; shuffling overfits in one epoch (each completion in K-1 updates); batching fixes it', R + ', Step 2', ['one batch element', 'K</i> - 1 gradient updates', 'a single pass over the dataset caused the reward model to overfit']),
 ('Batching by prompt is "K times cheaper in forward passes"', R + ', Step 2 (corrected: K - 1 times against separate pairs, (K - 1)/2 against the paper\'s phrasing); RM widget cost line', ['the old summary of this page said', 'K</i> - 1 times']),
 ('Only 6B RMs; 175B RM training unstable', R + ', Step 2 and details', ['only <b>6B RMs</b>', 'could be unstable']),
 ('Rewards shifted so demonstrations score 0 on average', R + ', Step 2; toy', ['demonstrations score 0 on average']),
 ('PPO: bandit environment, prompt, one response, RM score, episode ends', R + ', Step 3; episode animation', ['<b>bandit</b>', 'one response, a reward from the RM, and the episode ends']),
 ('PPO on ~31k prompts with per-token KL penalty against SFT; value function initialised from RM', R + ', Step 3; animation; toy', ['31k unlabeled API prompts', 'per-token KL penalty from the SFT model', 'value function is initialised from the RM']),
 ('PPO-ptx mixes pretraining gradients; objective with beta KL and gamma pretraining term', R + ', Step 3 (Eq. 2); animation; toy', ['objective(φ) =', 'γ E<sub>x ~ D<sub>pretrain</sub>', 'PPO-ptx']),
 ('"InstructGPT" means the PPO-ptx models', R + ', The recipe; Step 3', ['InstructGPT refers to the PPO-ptx models']),
 ('Stages 2 and 3 can be iterated', R + ', The recipe', ['Steps 2 and 3 can repeat']),
 ('About 40 contractors (Upwork, Scale AI), screening test for sensitivity to harmful content and to demographic groups\' preferences', R + ', Data and labelers', ['About 40 contractors on Upwork and through ScaleAI', 'screening test', 'potentially harmful output']),
 ('Detailed instructions and a shared chat room', R + ', Data and labelers', ['detailed instructions and a shared chat room']),
 ('Training prioritises helpfulness; final evaluation truthfulness and harmlessness', R + ', Data and labelers', ['prioritised helpfulness to the user during training', 'prioritise truthfulness and harmlessness']),
 ('Inter-annotator agreement 72.6% training, 77.3% held-out', R + ', Data and labelers; checks', ['72.6 ± 1.5%', '77.3 ± 1.3%']),
 ('Over 96% English; generation 46%, open QA 12%, brainstorming 11%', R + ', Data (Table 1 bars, printed precision 45.6, 12.4, 11.2)', ['over 96% English', '45.6%', '12.4%', '11.2%']),
 ('Alignment tax: vanilla PPO regresses on SQuAD, DROP, HellaSwag, WMT\'15 Fr-En', R + ', Alignment tax; Table 14 explorer; toy', ['SQuAD, DROP, HellaSwag and WMT 2015 French to English', '<b>alignment tax</b>']),
 ('PPO-ptx reverses most regressions with minimal loss in preference; better than raising the KL coefficient, which craters validation reward and does not fully recover', R + ', Alignment tax (Figures 33, 34 decoded); toy sweep', ['never recovers either benchmark', 'validation reward from about 2.6 down to -2.8', 'mitigates the regressions on all datasets']),
 # results
 ('1.3B InstructGPT beats 175B GPT-3 in preference despite 100x fewer parameters; same architecture, different data', R + ', card; Results (Figure 1 decoded, Bradley-Terry); checks', ['52.7%', '24.0%', 'beats GPT-3 with 135 times its parameters', 'all with the GPT-3 architecture']),
 ('175B InstructGPT preferred to 175B GPT-3 85 +/- 3%, 71 +/- 4% vs few-shot GPT-3', R + ', card; Results; checks (reproduced through Bradley-Terry)', ['85 ± 3%', '71 ± 4%']),
 ('Ordering PPO-ptx ~ PPO > SFT > GPT-3 prompted > GPT-3', R + ', Results; Figure 1; How much to believe', ['GPT-3 worst, then a well-crafted few-shot prompt, then SFT, then PPO', 'PPO above SFT above prompted GPT-3 above GPT-3']),
 ('Truthfulness: about 2x more truthful and informative on TruthfulQA', R + ', Results (corrected: 1.4 to 1.5x by human labels; 2x only on the automatic metric the authors say overstated gains)', ['about 1.4 to 1.5 times', 'overstating the gains of our PPO models']),
 ('Hallucination on closed-domain tasks 41% to 21%', R + ', Results (Figure 4 gives 44.8% against 21.6% and 15.6%; Figure 30 disagrees); checks', ['21% vs. 41%', '44.8%']),
 ('Toxicity ~25% fewer toxic generations when instructed respectful (RealToxicityPrompts)', R + ', Results (corrected: 16 to 20% in every printed comparison); checks', ['about 25%', '16% (Perspective API) to 20% (labelers)']),
 ('No improvement on bias (Winogender, CrowS-Pairs); worse than GPT-3 when told to be toxic', R + ', Results', ['not less biased on Winogender or CrowS-Pairs', 'much more toxic than those from GPT-3']),
 ('Beats FLAN and T0 fine-tuned 175B GPT-3: 78% and 79%', R + ', Results; Figure 5', ['78 ± 4%', '79 ± 4%']),
 ('Public NLP datasets do not cover the open-ended generation that dominates usage', R + ', Results', ['public datasets favour tasks easy to score automatically']),
 ('Held-out labelers prefer InstructGPT at the same rate; not overfitting to 40 people', R + ', Results; Figure 3 in Tables tab', ['Held-out labelers agree', 'simply overfitting to the preferences of our training labelers']),
 ('Follows instructions in non-English languages and code QA despite tiny data share', R + ', Qualitative', ['follows instructions in other languages and can summarise and answer questions about code']),
 ('Cost: SFT 175B 4.9 petaflops/s-days, PPO-ptx 60, GPT-3 3,640; alignment more cost-effective than 100x scale-up', R + ', card; Discussion; checks', ['4.9 petaflop/s-days', '60 for 175B PPO-ptx', '3,640 for GPT-3', 'more cost-effective than training larger models']),
 ('Failure modes: false premises, over-hedging (RM rewarding epistemic humility), multiple explicit constraints', R + ', Qualitative', ['accepts false premises', '<b>hedges</b>', 'reward epistemic humility', 'several explicit constraints']),
 # why it matters
 ('ChatGPT (November 2022) a sibling model trained with the same method on dialogue data', R + ', Why it matters; Then and now', ['a sibling model to InstructGPT', 'using the same methods as InstructGPT', '30 November 2022']),
 ('SFT -> RM -> RL became the default post-training pipeline at every lab (GPT-4, Claude, Gemini, Llama)', R + ', Why it matters (each sourced: GPT-4 report, Gemini report, Anthropic papers, Llama 2)', ['GPT-4 report', 'Gemini report', 'Anthropic\'s assistants', 'Llama 2 uses PPO and rejection sampling']),
 ('Nearly every post-training section descends from Figure 2', 'dropped as stated (unsourced generalisation); replaced by the sourced list of pipelines and the survey quote "the central method"', ['the central method used to finetune state-of-the-art large language models']),
 ('Reframed alignment as engineering with a measurable tax; low-tax procedure PPO-ptx; alignment must be cheap or labs will not adopt', R + ', Discussion; Why it matters', ['any technique with a high tax might not see adoption', 'alignment tax']),
 ('Capability vs alignment economics: tens of PF-days of RLHF beat thousands on a 100x pretrain; shifted investment to data and post-training', R + ', Why it matters', ['tens of petaflop/s-days of post-training beat a 100 times larger pretrain']),
 ('"Who are we aligning to": ~40 mostly US/Southeast-Asian contractors, researcher instructions, API customer prompts, not "human values"', R + ', Discussion', ['Who are we aligning to?', 'United States or Southeast Asia', 'human values']),
 ('Seeded pluralistic alignment and RLAIF (Constitutional AI)', R + ', Discussion (models conditioned on groups); Why it matters (RLAIF); Then and now', ['conditioned on, or easily fine-tuned to, different groups', 'RL from AI feedback is one answer']),
 ('Template later work simplifies: DPO collapses stages 2-3; CAI AI feedback; GRPO drops value model; RLVR verifiable rewards', R + ', Why it matters; Then and now tab', ['DPO removes the RM and RL', 'GRPO removes the value function', 'RLVR and rule-based rewards']),
 ('Pathologies (reward over-optimisation held by KL, sycophantic hedging from the RM) became the reward-hacking literature', R + ', Why it matters; predict reveal; toy', ['reward-hacking and sycophancy literature', 'over-optimisation']),
 # connections
 ('GPT-3 (2020-05): base models and architecture', R + ', Connections; Further reading', ['3c65c17b0d0d8193ac92c7648cfaca12', 'InstructGPT is GPT-3 plus human-feedback fine-tuning']),
 ('Constitutional AI (2022-12): RLAIF on same skeleton', R + ', Connections; Further reading', ['3c65c17b0d0d815a9b31e9443961c700', 'on top of the same RLHF skeleton']),
 ('DPO (2023-05): collapses RM + PPO into one classification loss', R + ', Connections; Further reading', ['3c65c17b0d0d818bb1d8cafd30e20f9e', 'into a single classification loss']),
 ('DeepSeekMath/GRPO (2024-02), DeepSeek-R1 (2025-01): GRPO removes value function; RLVR replaces learned RM', R + ', Connections; Further reading', ['3c65c17b0d0d817f9fc5cb9a9fbcbee5', '3c65c17b0d0d813faca4f7a51eaa0c65', 'RLVR replaces the learned RM with verifiable rewards']),
 ('Llama 3 (2024-07), OLMo 2 (2025-01): open pipelines on SFT + preference tuning + RL', R + ', Connections; Further reading', ['3c65c17b0d0d81aca58ccb9d720b474e', '3c65c17b0d0d81fb9857fb956165ae1c']),
 ('Topics: llm-training-and-post-training, rl', R + ', Connections; Further reading', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d8195a6c6c11ad093c16e']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Defined the 3-stage RLHF recipe']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(html.unescape(c)) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:36)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
