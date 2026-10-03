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
 # header and metadata
 ('Author Konstantin Kolomeitsev (independent, Almaty, Kazakhstan)', R + ', headline card and meta line', ['Konstantin Kolomeitsev', 'Almaty, Kazakhstan']),
 ('arXiv 2502.08213, 12 Feb 2025', R + ', card and meta line; Further reading', ['https://arxiv.org/abs/2502.08213', '12 February 2025']),
 ('Added to the KB 2026-09-01 from a blog entry', R + ', meta line', ['Added to this knowledge base on 2026-09-01 from a blog entry']),
 ('Links: arXiv | code and weights (Hugging Face kkolomeitsev/llm-modules)', R + ', meta line; card; Further reading (plus the open GitHub copy)', ['https://huggingface.co/kkolomeitsev/llm-modules', 'https://github.com/k-kolomeitsev/LLM-Modules']),
 ('Topics: llm-training-and-post-training, llms', R + ', meta line; Further reading, Topics', ['Topics: llm-training-and-post-training, llms', '3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d812d9e00f6ec89965286']),
 ('Read this as a small proof of concept, not as a result: single author, tiny models, one dataset, no baseline sweep; filed for the idea, not the evidence', R + ', warning box at the top; verdict', ['Read this as a small proof of concept, not as a result.', 'Single author, tiny models, one dataset, no baseline sweep', 'worth knowing, not because the evidence is strong']),
 # problem
 ('Distillation: generate teacher outputs, train the student to imitate them', R + ', Problem', ["generate the teacher's outputs, then train the student to imitate them"]),
 ('Distillation needs a large training run; the student is one fused artifact with knowledge baked in irreversibly', R + ', Problem', ['It needs a large training run', "one fused artifact with the teacher's knowledge baked in irreversibly"]),
 ('Alternative: leave the large model frozen, let a small trainable model read its internal representations directly; two composable modules', R + ', Problem', ['leave the large model frozen and let a small trainable model read its internal representations directly', 'two composable modules rather than one distilled model']),
 # method
 ('Enhanced Cross-Attention between a frozen large model and a trainable small one', R + ', Idea and Method (equation and diagram)', ['Enhanced Cross-Attention', 'Knowledge source', 'Generation module']),
 ('Frozen: Qwen2-1.5B; its hidden representations are exposed, not its output text', R + ', Idea; diagram', ['Qwen2-1.5B', 'hidden representations', 'not its output text']),
 ('Trainable: GPT-Neo-125M receiving representations through cross-attention layers inserted into its stack', R + ', Method: corrected from the code (the layers sit in front of the stack; GPT-Neo is randomly initialised)', ['In the code it sits in front of it', 'random weights', 'never loaded from the pretrained GPT-Neo-125M']),
 ('Only the small model and connecting layers train; the large model never receives gradients, so training fits on modest hardware', R + ', Idea; Training (one L4, about 5 hours)', ['Only the small side trains', 'It never receives gradients, so training fits on modest hardware']),
 ('Modular framing: reusable knowledge source; different small heads could attach for different tasks; composability is the structural difference from distillation', R + ', Idea', ['the frozen model is a reusable knowledge source, and different small heads could in principle attach to it for different tasks', 'That composability is the structural difference from distillation']),
 # results
 ('On Bespoke-Stratos-17k after 15 epochs the combined model produces responses the author judges comparable to a distillation baseline', R + ', Results; How much to believe', ['Bespoke-Stratos-17k', '15 epochs', 'omparable in quality to models obtained by distillation']),
 ('Code and pretrained weights are released', R + ', Results; What it takes', ['Code and pretrained weights are released']),
 ('Evaluation is qualitative and example-driven rather than benchmark-based', R + ', Results and How much to believe (two prompts, one sample each)', ['Two prompts, one sample each', 'no benchmark']),
 ("Comparison is against the author's own distillation run", R + ", Results: corrected (the baseline is DeepSeek's released R1-Distill-Qwen-1.5B)", ["not against a distillation run of the author's under the same budget", "DeepSeek's released distilled model"]),
 # why it matters
 ('Family: freeze the big model, train a small adapter that reads its internals', R + ', Why it matters, with the family table', ['freeze the big model, train a small module that reads its internals']),
 ("Flamingo's Perceiver Resampler over a frozen LM", R + ', Why it matters table (made precise: a Perceiver Resampler plus gated cross-attention layers inside the frozen LM, tanh gate at 0); Connections; Further reading', ['Perceiver Resampler and gated cross-attention layers inserted between the frozen LM', 'tanh(α), α = 0 at the start']),
 ("Google's CALM composing an anchor with an augmenting model", R + ', Why it matters table; Connections; Further reading', ['an anchor LLM (PaLM2-XS or S) and an augmenting model (PaLM2-XXS)', 'https://arxiv.org/abs/2401.02412']),
 ('Attractive whenever you want capability without owning or retraining the large model', R + ', Why it matters', ['It is attractive whenever you want capability without owning or retraining the large model']),
 ('Not established: useful scale; 1.5B teacher and 125M student on 17k examples cannot tell about 70B, equal-compute distillation, or out-of-distribution representations', R + ', Why it matters', ['A 1.5B teacher and a 125M-sized student on 17k examples', 'survives at 70B', 'beats a well-tuned distillation run under equal compute', 'out of distribution']),
 ('Treat the architecture as a pointer to the literature and the results as anecdotal', R + ', Why it matters; verdict', ['Treat the architecture as a pointer to the literature above and the results as anecdotal']),
 # connections
 ("Serious versions: Flamingo's frozen-LM cross-attention, CALM, adapter/PEFT literature", R + ', Connections', ['The serious versions of this idea', 'https://arxiv.org/abs/1902.00751']),
 ('Contrast with actual distillation, under llm-training-and-post-training', R + ', Connections', ['Contrast with actual distillation']),
 ('Adjacent in this batch: Bitune and Trained Persistent Memory, also frozen-backbone-plus-adapter designs', R + ', Connections; Further reading', ['3ce5c17b0d0d8173af14ed0caa19d6db', '3ce5c17b0d0d81978137dd8f8cab1c74', 'frozen-backbone-plus-adapter designs']),
 ('Database property Takeaway (frozen Qwen2-1.5B feeding a trainable GPT-Neo-125M through inserted cross-attention; comparable to distillation after 15 epochs; read as a pointer to Flamingo and CALM)', 'stays in the database; the card carries a corrected one-line takeaway and the verdict', ['In one line:', 'How far to trust it:', 'Flamingo and CALM show it working']),
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
