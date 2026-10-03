"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the RocketEval Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). The item list is this paper's own.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys
raw = open('../index.html', encoding='utf-8').read()
txt = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', raw)))
R = 'The paper tab'
C = [
 ('Header "14 min read, +~1h 15m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors Tianjun Wei, Wei Wen, Ruizhi Qiao, Xing Sun, Jianghong Ma', R + ', card', ['Tianjun Wei', 'Wei Wen', 'Ruizhi Qiao', 'Xing Sun', 'Jianghong Ma']),
 ('Date 2025-03-07 (arXiv v1); published at ICLR 2025', R + ', card', ['7 March 2025 (arXiv v1', 'ICLR 2025']),
 ('Links: arXiv:2503.05142 (~45 min), HTML full text, OpenReview (~30 min)', 'card and Further reading', ['https://arxiv.org/abs/2503.05142', 'https://arxiv.org/html/2503.05142v1', 'https://openreview.net/forum?id=zJjzNj6QUe', '(45 min)', '(30 min)']),
 ('Topics evaluation-and-llm-judges, llms', 'Further reading, Topics', ['3c65c17b0d0d8181b351e1b8fc6a1546', '3c65c17b0d0d812d9e00f6ec89965286']),
 ('Added to the KB 2026-08-31', R + ', Note to self footer', ['Added to the KB 2026-08-31']),
 ('Best resource: the paper; Section 3 and Table 4 load-bearing; Section 2 diagnostics make the method non-obvious', R + ', Diagnosis intro; Further reading', ['the experiments that make the method non-obvious', 'Table 4']),
 ('Best resource: OpenReview reviews press hardest on instance-level agreement', 'Further reading: kept, marked unconfirmed (reviews could not be loaded)', ['press hardest on instance-level agreement is unconfirmed here']),
 ('Read against the KB LLM-as-judge page (bias catalogue)', 'Connections; Further reading', ['3c65c17b0d0d810ba2a2ecc08c4c233b', 'bias catalogue']),
 ('Problem: LLM-as-judge the method that scales; expensive', R + ', Problem', ['it is the method that scales to open-ended tasks']),
 ('Frontier judge costs thousands per sweep; prices out per-commit gates; leaks private prompts; irreproducible moving endpoint', R + ', Problem', ['sends private prompts to a third party', 'irreproducible when the judge is a moving proprietary endpoint', 'nobody gates every commit']),
 ('Small open-weight judge fails badly; the question is why', R + ', Problem', ['fails badly', 'why do small judges fail']),
 ('Lightweight judges fail for two measurable reasons, not a general reasoning deficit', R + ', Diagnosis', ['Why: uncertainty and position bias', 'not scoring']),
 ('Uncertainty: Qwen2-1.5B disagrees with itself on >50% of items over 3 samples', R + ', Diagnosis (corrected: share of checklist items, Figure 4, 56%)', ['56% of items get a different answer somewhere in three samples']),
 ('Positional/anchoring bias: inconsistency rises monotonically with preceding questions', R + ', Diagnosis; Figure 5 rebuilt from the vector PDF (rising for all five models)', ['The flip rate rises with every earlier item, for every model', 'Earlier answers contaminate later ones']),
 ('Qwen2-1.5B CoT 36.4% below direct 40.1%; with GPT-4o analysis 70.3%', R + ', Diagnosis and predict question (corrected: agreement with GPT-4o, partly circular)', ['36.4% against 40.1% directly', '70.3%', 'Read the 70.3% with care']),
 ('The small model can apply a judgment criterion; it cannot construct one', R + ', Diagnosis', ['the small model can apply a judgment criterion but cannot construct one']),
 ('Design goal: never ask the small model to analyse; ask closed questions', R + ', Diagnosis', ['never ask the small model to analyse']),
 ('Checklist creation: GPT-4o, 5-10 binary questions per query, relevance, discrimination, independence', R + ', Method 1 (corrected: released checklists 3 to 25 items)', ['relevance to the query, the ability to tell responses apart, and independence from each other', 'The paper says 5 to 10 questions per query']),
 ('Checklist conditioned on the query, not on a response; generated once, reused for every model and rerun; amortised', R + ', Method 1 (corrected: it also sees a reference answer)', ['reused for every model and every rerun', 'and on a reference answer']),
 ('Checklist is durable, inspectable, version-controllable; criteria written in advance, making judgment auditable', R + ', Method 1', ['durable, inspectable artifact that can be versioned and reviewed', 'written down in advance']),
 ('Grading: each item independently; prefix caching over shared prefix', R + ', Method 2; animation', ['answers each item independently', 'prefix caching']),
 ('Read the probability: p = P(Yes)/(P(Yes)+P(No)) from logits; 0.55 stays 0.55; recovers calibration', R + ', Method 2, Eq. 1; replay', ['A hedged 0.55 stays 0.55', 'Read P(Yes) / (P(Yes) + P(No))']),
 ('Independence removes the bias channel rather than correcting afterwards', R + ', Method 2', ['removes the bias channel rather than correcting for it afterwards']),
 ('Unsupervised score = mean of item scores', R + ', Method 3 (Eq. 2 printed as a sum; code 9 x mean + 1)', ['arithmetic mean of its item scores', '9 · mean + 1']),
 ('Extremely Randomized Trees fit on item scores against labels; discriminating items weighted', R + ', Method 3', ['Extremely Randomized Trees']),
 ('Blend s = (1 - a) s_unsup + a f_sup(p), a = (eps - KL(P_r||P_ideal))/eps, uniform ideal', R + ', Method 3, Eq. 3 and 4; alpha widget', ['KL(', 'P ideal', 'entropy divided by ln 10']),
 ('Sparse or degenerate labels pull back toward the plain mean', R + ', Method 3; alpha predict question', ['None: α = 0, the plain mean decides', '32 of 1,015 queries']),
 ('Notion said labels are human annotations', R + ', Method 3 (corrected: GPT-4o grades of ten training models per query)', ['the labels are GPT-4o\'s grades']),
 ('Benchmarks: MT-Bench 80 multi-turn queries, human annotations on six models; WildBench 1,024 real queries', R + ', Diagnosis', ['80 two-turn questions', 'six models', '1,024 real user queries']),
 ('Baselines: GPT-4o and GPT-4 CoT, direct scoring, fixed six-question checklist, Claude-3.5-Sonnet, Prometheus-7B-v2.0', R + ', Results', ['helpfulness, relevance, accuracy, depth, creativity, detail', 'Prometheus-7B-v2.0', 'Claude-3.5-Sonnet']),
 ('Gemma-2-2B 0.965 Spearman vs GPT-4o 0.979; Mistral-Nemo 0.986; Llama-3-8B ties 0.979', R + ', Results; card; Re-rank tab', ['0.965', '0.979', '0.986', 'Llama-3-8B ties it at 0.979']),
 ('Cost: $27.70 Gemma, $71.40 Llama-3-8B, $3,400 GPT-4o per 1,000 tests; >50x, closer to 100x at 2B', R + ', Cost (corrected: 123x for Gemma-2-2B, 48x for Llama-3-8B)', ['$27.7', '$71.4', '$3,400', '123 times cheaper']),
 ('Instance-level: Gemma 37.9% CoT to 57.9%; GPT-4o 66.6%; human 64.7%; supervised 57.3%', R + ', Results', ['37.9%', '57.9%', '66.6%', '64.7%', '57.3%']),
 ('The split: rank a leaderboard like a frontier judge while disagreeing on single responses; noise averages out', R + ', Results; Re-rank tab makes it quantitative', ['per-response noise averages out over hundreds of queries and only the systematic part survives']),
 ('Not established 1: cheap end to end; checklist needs a proprietary model; privacy for response side only', R + ', Why it matters', ['the privacy argument holds for the response side only']),
 ('Not established 2: instance-level replacement; per-PR gate or RLAIF label out of scope', R + ', Why it matters; Using it', ['anything acting on a single verdict is out of scope', 'RLAIF preference label']),
 ('Not established 3: outside English or chat-style evaluation', R + ', Why it matters', ['all four benchmarks are English chat benchmarks']),
 ('Not established 4: below roughly 2B; sub-1B judges improve much less', R + ', Why it matters (corrected: model-specific, Qwen2.5-0.5B works, Llama-3.2-1B does not)', ['there is a floor, but it is not a size']),
 ('Not established 5: supervised reweighting needs labels; unsupervised carries the headline', R + ', Why it matters', ['the unsupervised variant carries the headline result anyway']),
 ('Why it matters: $27 a sweep gates every merge; $3,400 quarterly; reproducible; checklist reviewable', R + ', Why it matters', ['At $27 a sweep you can gate every merge', 'same weights, same checklist, same numbers next year']),
 ('Deeper lesson: frontier model decides what good looks like; small model bounded classification; rubric for a junior grader', R + ', Why it matters', ['rubric handed to a junior grader']),
 ('Connection: LLM-as-judge, juries/PoLL', 'Connections', ['juries (PoLL) result']),
 ('Connection: production eval engineering, gate on aggregates', 'Connections', ['Production eval engineering', 'gate on aggregates, not single cases']),
 ('Connection: Constitutional AI', 'Connections; Further reading', ['3c65c17b0d0d815a9b31e9443961c700', 'written rubric standing in for human judgment at training time']),
 ('Connection: Demystifying Agent Skills, procedural anchor', 'Connections; Note to self', ['3c65c17b0d0d81249a3cf5fda4de5d92', 'procedural anchor']),
 ('Connection: StateM and JIT-Agent, expensive artifact cheap execution', 'Connections; Note to self', ['3c65c17b0d0d81899098d8153e100691', '3cd5c17b0d0d81148227fbd67dc4b3ee', 'expensive artifact, cheap execution']),
 ('Connection: speculative decoding (inference-and-serving), economics inverted', 'Connections', ['Speculative decoding', 'the same economics inverted']),
 ("Khalid's note, verbatim quote", R + ', Note to self callout', ['this could be use more generally for using a bigger model to guide the small model on how to do the task exactly', 'using fable as an orchestrator to local ollama models or cheaper api models']),
 ('General pattern: bigger model writes exact spec; smaller model executes; Fable orchestrator over Ollama/cheaper APIs', R + ', Note to self callout', ['a bigger model writes an exact specification of the task, and a smaller model executes that specification', 'Fable as the orchestrator']),
 ('Commentary attribution: callout is Khalid\'s, below is Claude\'s, 2026-08-31', R + ', Note to self', ["Everything above in the callout is Khalid's", '2026-08-31']),
 ('Transfers: decompose in advance into independent verifiable sub-questions', R + ', Note to self', ['decompose in advance into small, independent, verifiable sub-questions']),
 ('Transfers: binary sub-decisions; Ollama exposes logprobs; hosted APIs awkward', R + ', Note to self (updated with sources: Ollama v0.12.11, OpenAI top_logprobs)', ['Ollama exposes log probabilities', 'v0.12.11']),
 ('Transfers: expensive artifact reused across many cheap calls; per-request spec amortises over nothing', R + ', Note to self', ['amortises over nothing']),
 ('Transfers: expect aggregate quality above per-item quality (0.965 from 57.9%)', R + ', Note to self', ['0.965 list-level correlation out of 57.9% item agreement']),
 ('Does not transfer: undecomposable tasks, open-ended generation, no checklist for a good essay', R + ', Note to self', ['no checklist that specifies a good essay without writing it']),
 ('Does not transfer: executor cannot answer sub-questions; 70.3% is the ceiling', R + ', Note to self (updated: that ceiling is agreement with GPT-4o itself)', ['A spec does not confer a capability the small model lacks']),
 ('Does not transfer: acting on a single verdict', R + ', Note to self', ['per-item gating or for generating preference labels']),
 ('Does not transfer: orchestrator must see each input anyway', R + ', Note to self', ['the small model is overhead']),
 ('Neighbours: StateM 1/38 cost runbook, JIT-Agent 27B, Agent Skills 10% misapplication, distillation', R + ', Note to self', ['1/38 the cost', 'trained 27B model', '10% misapplication failure mode', 'distillation moves the capability into the weights']),
 ('Database property Takeaway', 'stays in the database; shown in the headline card', ['Move the judgment out of the judge']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
