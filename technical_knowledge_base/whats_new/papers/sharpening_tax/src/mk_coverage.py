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
 # live.md: the row as fetched on 2026-10-19 (body "Being built in the technical_knowledge_base repository.")
 ('Body line "Being built in the technical_knowledge_base repository."', 'replaced: the page is the built body', ['Replay the 42 cells']),
 ('Paper property: "Sharpening Tax in Post-Training" (stays in Notion)', 'title and headline card', ['Sharpening Tax in Post-Training']),
 ('Takeaway property (stays in Notion), shown verbatim on the card', R + ', headline card "In one line"', ['the Sharpening Tax is positive in 36 of 42 cells, with tasks polarising toward always-solved or never-solved', 'Scoped on 26 October 2026']),
 ('Takeaway: tax positive in 36 of 42; base beats post-trained at pass@128 in 26', R + ', The tax and How much to believe (with 18 of 26 clear of zero); Replay map', ['Two counts, two questions', 'clearly in 18']),
 ('Takeaway: tasks polarise toward always-solved or never-solved', R + ', Base against post-trained; animation', ['tasks go to the extremes']),
 ('Takeaway: PTGS a promising but not yet demonstrated mitigation (five runs, two grid games, tax reductions within noise)', R + ', PTGS results and How much to believe', ['tax reductions within the noise', 'lowers Tax', 'improves pass@1 and pass@128 for both algorithms in both games']),
 ('Topics rl, llm-training-and-post-training (stay in Notion)', 'Connections and Further reading topics', ['RL for LLMs: RLHF, GRPO, RLVR', 'Topic: llm-training-and-post-training']),
 # the paper's own claims (no old body, so coverage runs against them)
 ('Authors and affiliations', 'headline card', ['Changdae Oh', 'Sharon Li', 'Azalia Mirhoseini', 'Meta Superintelligence Labs']),
 ('arXiv 2610.01509, 1 October 2026', 'headline card', ['1 October 2026', 'arXiv 2610.01509']),
 ('Sharpening hypothesis: RL improves pass@1 at the cost of coverage (math and code)', R + ', Problem', ['sharpening', 'Yue et al., 2025']),
 ('Agentic tasks as a stress test: structured actions, tools, feedback, long horizon', R + ', Problem', ['Agentic tasks are the harder test']),
 ('Metrics pass@1, pass@k, pass^k with the unbiased estimator', R + ', Setup; one-task chart', ['pass^k', 'unbiased estimators']),
 ('Benchmarks BFCL v4 multi-turn base, WebShop, ACEBench; process-checked', R + ', Setup', ['BFCL v4 multi-turn base', 'WebShop', 'ACEBench (770 tasks']),
 ('14 checkpoint pairs from Gemma 4, Ministral 3, Qwen2.5, Qwen3.5, 3B to 35B; thinking off', R + ', Setup', ['14 open checkpoint pairs', 'Thinking mode is switched off']),
 ('Harness design and ablation; harness hurts post-trained models; asymmetric scaffolding', R + ', Setup', ['six of the eight base models tested score zero', 'The same harness hurts']),
 ('Decoding: temperature 0.4 BFCL, 0.7 others, 128 rollouts', R + ', Setup', ['temperature 0.4 on BFCL, 0.7 elsewhere']),
 ('Base models catch up and cross over; 87.6 vs 56.0 on WebShop gemma-4-31B', R + ', §3; Replay tab', ['87.6% pass@128 against 56.0%']),
 ('Larger models pull the crossover earlier (k* > 128 for 4B to about 3 for 31B)', R + ', §3 predict question', ['beyond 128 for E4B to 16 for 12B, 11 for 26B-A4B and 3 for 31B']),
 ('Bimodalisation: gemma-4-31B WebShop middle 87.6 to 30.0, always pass 0 to 26, always fail 12.4 to 44', R + ', animation; Table 6 reproduced', ['from 87.6% to 30.0%', 'from 12.4% to 44.0%']),
 ('Coverage and consistency: post-training trades coverage for consistency; Qwen3.5 softest, Gemma steepest', R + ', §3', ['Qwen3.5 sharpens most softly']),
 ('Small backbones: post-training repairs tool calls, no crossover; E4B 65.2 vs 48.6, 38.5 vs 27.0', R + ', details block', ['65.2% against 48.6%']),
 ('Largest backbones cross at k about 22; smallest never', R + ', §3', ['passes the post-trained one at k = 22']),
 ('Sharpening Tax definitions A(K), S(K), Tax (Eqs. 1 to 3)', R + ', The tax', ['Raw scalability', 'Calibrated scalability']),
 ('Proposition 1: expected failures before first success', R + ', The tax', ['the expected number of failed attempts before a success']),
 ('Corollary 4 ceiling and saturation decomposition', R + ', The tax; tables tab check', ['Corollary 4']),
 ('Tax charged broadly: TaxS(128) > 0 in 36 of 42; small models negative at small budgets', R + ', The tax; Replay map', ['36 of the 42 cells', 'most visibly Ministral-3-3B']),
 ('TaxA grows almost monotonically; TaxS can rise or fall', R + ', The tax', ['grows almost monotonically with the budget']),
 ('Predictability: TaxS(8) predicts TaxS(32), rho 0.85; correlates with consistency gap; best early predictor', R + ', The tax; checked box', ['Spearman ρ = 0.85', 'consistency gap']),
 ('Tax-guided routing (Appendix D.4): up to 13.6 points over post-trained', R + ', The tax', ['up to 13.6 points']),
 ('Theorem 2: collapse to extremes charges a proportional tax; S ratio formula', R + ', Why a tax; predict question and lab', ['Theorem 2', 'whichever extreme they reach']),
 ('Table 8 decomposition: lost, gained, shape', R + ', Why a tax', ['retry value lost on tasks only the base model solves']),
 ('Global temperature cannot resolve the trade-off (Appendix C.4)', R + ', PTGS predict question', ['pass@1 never improves']),
 ('PTGS: discounted Beta posterior, Thompson draw, tempering rule Eq. 4, no change to RL update, dropped at test time', R + ', PTGS', ['Posterior-tempered group sampling', 'switched off at test time']),
 ('Theorem 3: I_n and J_n; Proposition 5 for cooling', R + ', PTGS', ['Proposition 5', 'mixed']),
 ('PTGS setup: Qwen2.5-7B-Instruct, RAGEN, Sokoban, FrozenLake, PPO and GRPO, 200 steps, five runs', R + ', PTGS results', ['Qwen2.5-7B-Instruct', 'five runs per arm']),
 ('Table 2 results (PPO 46.5 to 61.1 pass@1 on Sokoban, tax 0.094 to 0.081, etc.)', R + ', PTGS results table (generated from tables.json)', ['0.094 to 0.081']),
 ('Entropy stays higher under PTGS; same validation success on FrozenLake', R + ', PTGS results', ['token entropy falls steadily toward zero']),
 ('Fixed-temperature and truncation ablations (Tables 9, 10)', R + ', PTGS results; tables tab intervals', ['top-p, top-k and min-p truncation barely move the baseline']),
 ('Inference-time PTGS (Appendix E.4)', R + ', PTGS results', ['At test time, without training']),
 ('Difficulty estimate accuracy: Pearson 0.81 and 0.71, about 0.1 low', R + ', PTGS results', ['Pearson 0.81']),
 ('Limitations: observational, recipes unknown, binary success, text-only', R + ', How much to believe', ['observational, undisclosed recipes, binary success only']),
 ('Conclusion: report the tax beside accuracy; elicitation view', R + ', Why it matters', ['elicitation view of post-training']),
 ('Code release: metrics, harness, PTGS controller, toy, outcomes; CC BY-NC 4.0', 'What it takes; Further reading; Replay tab', ['CC BY-NC 4.0', 'a record, not a launcher']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion row as of 2026-10-19T16:11; no old body, so the items are the paper\'s own claims; the Takeaway checked is the corrected property, set the same day)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
