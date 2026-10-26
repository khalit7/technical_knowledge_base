"""Write coverage.json: every claim of the paper (there is no old Notion body: a brand-new paper, row pending),
taken from the saved extract inputs/paper_v1.txt, with where the page carries it, and verify each item's check
strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # front matter
 ('Title, authors Gai, Block, Risteski; CMU and Columbia', 'headline card', ['Understanding the Benefits of Scaffolds through Computational Separations', 'Jingchu Gai, Adam Block, Andrej Risteski', 'Columbia University (Block)']),
 ('arXiv 2610.27157 v1, 19 October 2026', 'headline card', ['arXiv 2610.27157', '19 October 2026']),
 # abstract and section 1
 ('Harness = external procedure calling a model many times and keeping state; teacher A[M]; student distilled from traces', R + ', New terms', ['calls a model several times and keeps state between calls', 'the <b>teacher</b>']),
 ('Puzzle: why simple loops (candidate sets, expand, prune by verification) help strong math models', R + ', Problem', ['keep candidate solutions, expand them, prune them by verification']),
 ('Can the strategy be internalised (Cundy and Ermon; Gandhi et al.)', R + ', Problem; Why it matters', ['could the model learn the strategy itself', 'Stream of Search']),
 ('Contribution 1: same-size students cannot internalise VGB and A*, across ablations', R + ', Same-size students', ['Neither student reaches the teacher', 'twenty times more traces barely moves the student']),
 ('Contribution 2: gap closes with larger student, easier scaffold, longer CoT', R + ', Closing the gap', ['A bigger student', 'A simpler harness', 'A longer chain of thought']),
 ('Contribution 3: formal obstruction via STCON, AC0 lookups, TC0 students, NL not in TC0', R + ', The theorem', ['Theorem 1.', 'Assume NL ⊄ TC⁰']),
 ('Contribution 4: Branching on Qwen3-1.7B, 43.6% at 85 calls, student near 36%, LoRA rank +2.2, 4B closes', R + ', Branching; card', ['43.6 vs 35.8', '+1.8 / +2.2', '"LoRA rank improves the student by only 2.2 percentage points" is the full fine-tune']),
 ('Inclusions AC0 in TC0 in L in NL in P; logspace uniformity', R + ', ladder figure', ['AC⁰ ⊆ TC⁰ ⊆ L ⊆ NL ⊆ P']),
 # section 2
 ('Dyck: 4 types, length 64, ID probs 0.1..0.4, OOD reversed', R + ', Same-size students', ['64 properly nested brackets of 4 types']),
 ('Sokoban 5x5, one box, up to three walls, ID short OOD long solutions, 3 to 15 moves', R + ', Same-size students', ['up to three walls, solutions of 3 to 15 moves']),
 ('VGB retract rule max(eps, 1 - V(s,a)/V(s)); V = success probability of the base model; MC oracle K=1 traces, K=1000 eval; learned classifier', R + ', Same-size students', ['max(ε, 1 − ', '1,000 at evaluation', 'right on 87.3% of Dyck tokens']),
 ('A* with Manhattan heuristic, top-2 successors by base logits; Lehnert trace format; 36% shorter traces', R + ', Same-size students', ['expands only the two successors', '36% shorter']),
 ('Trace formats: quantised verifier token (10 levels), 27 and 45 token vocabularies', R + ', Same-size students', ['quantised to 10 levels', '27-token vocabulary', '(45 tokens)']),
 ('Models: 2-layer, width 128, 4 heads, about 0.68M; base on 300K ID Dyck, AdamW 3e-4, 3000 iterations; students from scratch or fine-tuned (70% clean, 5K)', R + ', Same-size students', ['about 0.68M parameters', '300K valid ID Dyck strings', '70% clean data, for 5K steps']),
 ('Figure 1 results (scratch below base; fine-tuned near base; teacher above)', R + ', Figure 1 chart; figures tab', ['The student trained from scratch falls below even the base model', 'Figure 1 (']),
 ('Ablations: clean ratio 0-100%, 3K-8K iterations, 1K-20K traces, alpha mixes, seeds, OOD-source', R + ', Same-size students', ['clean-data share from 0 to 100%, 3K to 8K steps, 1K to 20K traces', 'four seeds and OOD-only traces']),
 ('Clean data helps up to about 30% then plateaus near base; A* without clean data fails', R + ', Same-size students', ['up to about 30%, then stops helping']),
 ('Dyck BT: delete last 4 tokens, at most 50 backtracks; oracle verifier; Sokoban oracle runs BFS', R + ', Same-size students; teacher box', ['deletes the last 4 tokens, at most 50 times', 'runs its own breadth-first search']),
 # section 3
 ('Size sweep: 12 scales, 0.10M to 11.5M (Table 1), best per scale', R + ', A bigger student; figures tab Table 1', ['Twelve student sizes from 0.10M to 11.5M', 'Table 1: student scales']),
 ('Figure 2b: gap shrinks with size on Dyck; Figure 9: Sokoban A* 0.65 to 0.13, VGB largest pass teacher', R + ', A bigger student', ['from 0.65 to 0.13', '0.945 against 0.765 ID']),
 ('Simple BT: fixed stride regenerate; same-size student matches ID; OOD depends on trace source; alpha 0.25 helps; Table 2', R + ', A simpler harness; figures tab', ['0.970 against 0.996', '0.677', 'Table 2 (and Figure 2c)']),
 ('Modular arithmetic Z11 (Feng et al.), n_ops = 20, depth-3 transformer 2.5M, first L steps, 1000 held-out problems', R + ', A longer chain of thought', ['Arithmetic modulo 11 with 20 operators', '3-layer transformer (about 2.5M parameters)']),
 ('Scaffold K=16 candidates, oracle verifier, backtrack with blacklist', R + ', A longer chain of thought', ['samples 16 candidate next steps', 'bans the failed step']),
 ('Phase transition between L=18 and L=19; matches at 19 and 20; n_ops=10 curve (Figure 11)', R + ', predict question; figures tab', ['from 26% to 97%', 'Figure 11b']),
 # section 4
 ('STCON definition; vertices as reasoning states, edges as transitions', R + ', The theorem', ['Directed <i>s</i>-<i>t</i> reachability (STCON)', 'vertices as reasoning states']),
 ('E_A(u,v) in AC0: OR of N^2 terms of ANDs, equality of O(log N) literals', R + ', The theorem', ['one big OR over all', 'so in AC⁰']),
 ('STCON NL-complete under AC0 reductions (Immerman)', R + ', The theorem', ['uniform AC⁰ reduction']),
 ('Fixed-depth transformers simulated by TC0 (Merrill et al.)', R + ', The theorem', ['can be simulated by a uniform TC⁰ circuit']),
 ('Definition 1: CoT with TC0 verification, T_c(n) = ceil(c log2(n+1))', R + ', The theorem', ['Definition 1', '⌈<i>c</i> log₂(<i>n</i> + 1)⌉']),
 ('Lemma 1: transcript enumeration, depth +2', R + ', The theorem', ['Lemma 1: a short chain of thought stays in TC⁰', 'adding two layers of depth']),
 ('Theorem 1 (i): BFS, at most N^2 calls, O(N) bits; (ii) STCON not in CoT class', R + ', The theorem; lab', ['at most <i>N</i>² oracle calls and O(<i>N</i>) bits of state', 'No student in the class of Definition 1 decides STCON on all inputs']),
 ('Proof of (ii): composition with AC0 reductions; logspace reductions too strong', R + ', The theorem', ['an ordinary logspace reduction could do work outside TC⁰']),
 ('Longer CoT or depth can change asymptotic power (stated by the authors)', R + ', What the theorem does not say', ['The paper says so']),
 # section 5
 ('Qwen3-1.7B, thinking off, DAPO-Math-17k, math-verify, 1500 trace pool (0.30), 500 eval (0.31)', R + ', Branching', ['Qwen3-1.7B with thinking off', '1,500 problems (pass@1 about 0.30)', '500 other problems (about 0.31']),
 ('Branching tree: leaves at temperature 1.0, internal nodes synthesise; ks=[3,3] 13 calls; ks=[3] 4 calls; calls sum d^i, 3 to 85', R + ', Branching', ['temperature 1.0', '13 for the canonical (3,2) tree', '85 for (4,3)']),
 ('Flatten transcript, LoRA fine-tune same backbone, keep root-correct runs', R + ', Branching', ['LoRA fine-tuned to write the whole flattened tree', 'trained only on runs whose root answer was right']),
 ('Figure 5a: teacher improves with calls, student plateaus and collapses at depth three', R + ', predict question and chart', ['the student peaks at 35.8%', 'The (3,3) student, at 26.8%']),
 ('Ablations: clean mixtures, trace counts, epochs (Figure 12) do not close the gap', R + ', Branching', ['34.2, 35.0, 34.6, 31.4, 29.2']),
 ('Backbone 1.7B to 4B closes and surpasses; LoRA rank and full FT little difference (Figure 13)', R + ', Branching', ['41.6% against the teacher\'s 40.0%', '+1.8 points from rank, +2.2 from training every weight']),
 ('QED-Nano: 4B prover, SFT on DeepSeek-Math-V2 proofs, RL on FineProofs-RL (5,227); RSA 40.0 to 56.9 at 22x tokens; 39 calls, 1.5M token traces', R + ', A strong prover', ['5,227 FineProofs-RL problems', 'from 40.0% to 56.9% at about 22 times the tokens', 'about 1.5M tokens']),
 ('Corpus: 300 medium-difficulty problems (reward 0.10 to 0.60 over 128), gpt-oss-20b judge, >= 6 of 7, paired bootstrap, one run, 65,536 tokens per call', R + ', A strong prover', ['between 0.10 and 0.60 over 128 attempts', 'gpt-oss-20b judge']),
 ('Shapes (r,b), Table 3; only (3,3) 40 calls clear gain; trace 1.4M vs 262k window', R + ', Figure 13c chart; figures tab', ['Only the 40-call tree clearly helps', 'about 1.4M']),
 ('Caveats: no trace-length filtering; single run', R + ', How much to believe', ['one run, no length filtering, no student trained']),
 # conclusion, related work, AI statement
 ('Conclusion: same-size below teachers; larger, longer CoT, simpler scaffolds close; representational obstruction', R + ', Verdict', ['Believe that a same-size student trained by supervised fine-tuning']),
 ('Related work: Merrill and Sabharwal Theorem 4 (log CoT stays in TC0), log-depth transformers decide reachability, Mirtaheri, Tsilivis', 'Further reading; The theorem', ['A Little Depth Goes a Long Way', 'Learning through Internalization']),
 ('Distillation: SFT provably optimal without capacity limits (Foster et al.)', R + ', What the theorem does not say', ['supervised fine-tuning on the teacher\'s outputs is provably optimal']),
 ('No code released', 'card; What it takes; Further reading', ['no code released', 'No code, traces or checkpoints are released']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'the paper itself (inputs/paper_v1.txt, arXiv HTML v1, read 2026-10-26); a brand-new paper with no Notion body yet (row pending), so the items are the paper\'s own claims', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
