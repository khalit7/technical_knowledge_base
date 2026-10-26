"""Coverage of the paper's own claims (this row had no Notion body, so coverage runs against the paper).

Each item: a fact, a verbatim fragment of the saved paper extract (inputs/paper_v1.txt) or blog extract
(inputs/blog.txt) that states it, and fragments the built page must contain. Writes coverage.json and
fails if a source fragment or a page fragment is missing.
  python3 mk_coverage.py
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
norm = lambda s: re.sub(r'\s+', ' ', s)
SRC = {'paper': norm(open(os.path.join(HERE, 'inputs', 'paper_v1.txt')).read()), 'blog': norm(open(os.path.join(HERE, 'inputs', 'blog.txt')).read())}
PAGE = norm(re.sub(r'<[^>]+>', ' ', open(os.path.join(HERE, '..', 'index.html')).read()))
PAGE = re.sub(r'\s+', ' ', PAGE)
ITEMS = [
 ('Penalties or filtering with a systematically wrong monitor fail to prevent reward hacking', 'paper', 'using the monitor for data filtering or to apply a reward penalty fails', ['a penalty teaches the model to hide']),
 ('GRAFT routes flagged samples\' gradients to a sacrificial set of new parameters', 'paper', 'GRAFT constrains gradient updates on those samples to a sacrificial set of new parameters', ['only into a spare', 'forget adapter']),
 ('The monitor is not part of the reward', 'paper', 'because the monitor is not part of the reward function', ['The reward is never changed']),
 ('Ablating the sacrificial parameters reduces or stops the behaviour', 'paper', 'ablating the sacrificial parameters reduces or entirely stops the unintended behavior', ['forget adapter is deleted']),
 ('Models from 135M to 8B in RL; distillation into Qwen3-32B', 'paper', 'training models ranging from 135M to 8B parameters', ['SmolLM2-135M', 'Qwen3-32B']),
 ('Setting: misspecified reward, weak monitor with a conditional blind spot, hacking as default, objective', 'paper', 'Crucially, this classifier has a conditional blind spot', ['blind spot depends on a learnable feature']),
 ('Adapters: parallel SwiGLU branches in every MLP, down-projection zero-initialised', 'paper', 'W_{\\mathrm{down}}$ is initialized to zero', ['starts at zero']),
 ('Adapter size 3dnL: 28.3M per adapter for Qwen3-8B, 0.7%', 'paper', '28.3M per adapter (56.6M total, about 0.7%)', ['28.3M per adapter', '0.7%']),
 ('Baseline over unflagged samples; std over all; lone unflagged sample gets zero advantage', 'paper', 'a lone unflagged sample receives zero advantage', ['lone unflagged sample', 'standard deviation still uses all']),
 ('Flagged updates to the forget adapter amplified by 2', 'paper', 'the gradient update to this adapter is amplified by a factor of 2', ['The ×2 on the forget adapter']),
 ('Split-moment Adam (Eq. 1) because Adam would cancel the coefficients', 'paper', 'This would cancel the change in each adapter', ['Adam would undo the ×2', 'SplitMomentAdamW']),
 ('Anchor environment trains the deployment configuration', 'paper', 'we add concurrent anchor updates that train the model in its deployment configuration', ['The anchor environment']),
 ('LoRA adapters localise worse; equal gradients in the full-rank limit', 'paper', 'we found LoRAs to produce weaker behavioral localization', ['MLP adapters, not LoRA']),
 ('Countdown-Code: three hacks, monitor detects only trivial test', 'paper', 'We define the monitor to detect all trivial-test hacks, and no other hacks', ['trivial test', 'constraint removal', 'problem substitution']),
 ('Base after SFT priming hacks 4.7% (2.0 / 1.6 / 0.8 / 0.4)', 'paper', 'the rate of hacks in this environment is 4.7%', ['4.7%', '2.0 / 1.6 / 0.8']),
 ('No intervention: majority trivial-test hacks; two of three seeds collapse', 'paper', 'two of three seeds collapse', ['two of three seeds collapsed']),
 ('Reward penalty: constraint removal on about 26% of trajectories', 'paper', 'removing the constraint check on about 26% of trajectories', ['25.9%', 'about 26%']),
 ('A practitioner might conclude the penalised policy is hack-free (D.8, 28%)', 'paper', 'a practitioner might incorrectly conclude that this policy is hack-free', ['27.7%', '28%']),
 ('Inoculation prompting and preventative steering reduce but do not eliminate hacks', 'paper', 'Inoculation prompting and preventative steering reduce but do not eliminate learned hacks', ['Inoculation', 'steering']),
 ('GRAFT without routing hacks about 22%', 'paper', 'still hacks on roughly 22% of trajectories', ['21.9%']),
 ('Pre-ablation hacks up to 38%; ablation drops hacking to near zero; +16 points clean solve', 'paper', 'performs trivial-test hacks on up to $38\\%$ of trajectories', ['38.5%', '16.2 points']),
 ('Undetectable hacks do not emerge in Countdown training', 'paper', 'hacks of undetectable types do not emerge in training', ['never took off']),
 ('Forget adapter generalises to HumanEval and LeetCode-Hackable (Table 2)', 'paper', 'GRAFT’s forget adapter generalizes hack behavior to similar environments', ['8.7%', '39.6%', '9.9%']),
 ('No significant difference without anchoring on Countdown (Table 4)', 'paper', 'did not produce significantly better results than GRAFT without anchoring', ['77.8 against 79.2']),
 ('50% hackable variant: inoculation prompting matches GRAFT', 'paper', 'inoculation prompting performs as well as GRAFT', ['inoculation prompting matches GRAFT']),
 ('Six toy environments; penalty and filtering lead to undetectable hacking; deployed GRAFT minimal', 'paper', 'Reward penalization and filtering minimize detectable reward hacking, but still produce high rates of undetectable reward hacking', ['six toy environments', 'undetectable']),
 ('Toy anchor = target environment sampled from pi_R with a penalty', 'paper', 'we use the same environment, but sample from $\\pi_{R}$ and apply a reward penalty to flagged samples', ['sampled from π<sub>R</sub> with a penalty'.replace('<sub>', ' ').replace('</sub>', ' ')]),
 ('Monitor recall sweep: GRAFT lower hacking at every recall but often worse retain', 'paper', 'GRAFT results in lower rates of hacking than reward penalty baselines at every level of monitor recall', ['recall cut to 0.5, 0.25 or 0.1']),
 ('Environments tuned so penalties fail; swapping sets in addition gives about 60% hacking', 'paper', 'swapping the detectable/undetectable set does cause the GRAFT-trained model to reward hack at a rate of', ['about 60%']),
 ('Pathological sort: GRAFT cannot overcome bad dynamics', 'paper', 'GRAFT cannot overcome sufficiently bad environment dynamics', ['pathological sort']),
 ('SFT: 20% of hacks labelled, 10% of data; eval 99 tasks, gpt-5.4-nano judge', 'paper', 'We sample $20\\%$ of reward hacking trajectories uniformly at random', ['20% of the hacks', '99 held-out tasks', 'gpt-5.4-nano']),
 ('SFT with elicitation: GRAFT zero hacks vs about 30%, matching oracle filtering solve rate; w/o routing 80%', 'paper', 'the GRAFT-trained model reward hacks on zero examples', ['none of the 99 tasks', '79.1%']),
 ('SFT without elicitation: less clear; single seed; small eval', 'paper', 'Each point represents only a single training seed', ['one seed per method']),
 ('Three mechanisms: preempting exploration, inoculation, absorption', 'paper', 'We identify three mechanisms by which GRAFT may reduce these quantities', ['Preempting exploration', 'Inoculation', 'Absorption']),
 ('Failure modes: worse task performance, hack-only convergence, task features ablated, no generalisation', 'paper', 'Often, GRAFT has worse performance on the target task compared to baselines like reward penalization', ['Failure modes the paper lists']),
 ('Limitations: heuristic monitors, chosen environments, single-turn up to 8B, one SFT seed, random labels', 'paper', 'The monitors in our RL experiments are heuristics chosen to have simple blind spots', ['heuristic monitors with simple blind spots']),
 ('Compute: H200 hours per run', 'paper', 'Each of our small-scale RL runs requires 1–2.5 hours on an H200 GPU', ['1 to 2.5 H200-hours']),
 ('Largest gradient routing experiments so far (8B RL, 32B SFT vs at most 5B)', 'paper', 'versus at most 5B previously', ['at most at 5B']),
 ('Code released (Appendix A)', 'paper', 'https://github.com/jnward/GRAFT', ['jnward/GRAFT']),
 ('Blog: about 30% and up to 35% (rounded differently)', 'blog', 'hack 2 on about 30% of trajectories', ['about 30%', 'up to 35%']),
 ('Blog: GRAFT can be used with full-parameter fine-tuning', 'blog', 'GRAFT can also be used with full-parameter fine-tuning', ['full-parameter training']),
]
out, bad = [], []
for fact, src, quote, frags in ITEMS:
    sok = norm(quote) in SRC[src]
    miss = [f for f in frags if norm(f) not in PAGE]
    out.append({'fact': fact, 'source': src, 'quote': quote, 'page': frags, 'source_found': sok, 'page_missing': miss})
    if not sok or miss: bad.append((fact, sok, miss))
json.dump({'_doc': 'The paper\'s own claims (no old Notion body). Written by mk_coverage.py.', 'items': out}, open(os.path.join(HERE, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print('coverage: %d of %d items found in the source and on the page' % (len(ITEMS) - len(bad), len(ITEMS)))
for b in bad: print('  MISSING', b)
sys.exit(1 if bad else 0)
