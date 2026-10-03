"""Write coverage.json: every fact, number, caveat and link of live.md (the Notion page before migration,
this paper: Trained Persistent Memory, arXiv 2603.16413) with where the HTML carries it, and verify each
item's check strings against the built index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header lines
 ('Author Hong Jeong, Inha University in Tashkent, Uzbekistan', R + ', headline card', ['Hong Jeong', 'Inha University in Tashkent, Uzbekistan']),
 ('arXiv 2603.16413, 17 Mar 2026', R + ', headline card; Further reading', ['https://arxiv.org/abs/2603.16413', '17 March 2026']),
 ('Links: arXiv abstract and HTML', 'headline card and Further reading', ['https://arxiv.org/abs/2603.16413', 'https://arxiv.org/html/2603.16413v1']),
 ('Added to the KB 2026-09-01 from a blog entry', 'Further reading, About this page', ['Added to the knowledge base on 2026-09-01 from a blog entry']),
 ('Topics: llm-training-and-post-training, agentic-harnesses (memory), rag-and-retrieval', 'Further reading, Topics', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d81d881a8fe98b4cff7bb', '3c65c17b0d0d81b89145c37dfe8a3b0b']),
 ('Self-described proof-of-concept pilot: one frozen Flan-T5-XL, small trainable adapters, one dataset; explicit about resource constraints', R + ', Problem', ['proof-of-concept pilot study', 'one frozen Flan-T5-XL backbone, small trainable adapters, one dataset']),
 # problem
 ('A frozen encoder-decoder LM is stateless: latent computed, used and discarded every pass; nothing persists between sessions', R + ', Problem; Idea animation', ['stateless', 'discarded after every forward pass']),
 ('Industry answer is text-level memory: write facts as strings, retrieve, paste back into the prompt; every agent framework ships it', R + ', Problem', ['text-level memory', 'paste them back into the prompt']),
 ('Text write and read are discrete, non-differentiable operations bolted on from outside', R + ', Problem', ['discrete, non-differentiable operations bolted on from outside']),
 ('Question: can memory live in the continuous latent space so reads and writes are differentiable and trainable end to end', R + ', Problem', ['continuous latent space', 'differentiable operations on dense vectors']),
 # method
 ('Six variants spanning three injection points and four write mechanisms', R + ', Method; method explorer', ['three injection points', 'four write mechanisms']),
 ('Backbone frozen; only small adapters train', R + ', Method, Training', ['only the small adapters train']),
 ('After adapter training, the bank keeps accumulating at inference with no gradients: conversational learning', R + ', Training (Type 2)', ['conversational learning', 'with no gradients']),
 # results
 ('Evaluated on LoCoMo with a forgetting-curve protocol at 1x and 10x capacity', R + ', Results; Tables tab Table 3', ['LoCoMo', 'forgetting curve', '1x and 10x']),
 ('Stateless baseline scores exactly zero: sanity check, not a comparison', R + ', Evaluation (predict question 1)', ['zero by construction', 'a sanity check, not a comparison']),
 ('At 10x all six adapters positive memory retention', R + ', Results', ['all six adapters score above zero at every lag']),
 ('At 1x weaker; capacity doing much of the work', R + ', Results', ['capacity is doing much of the work']),
 # why it matters
 ('Nearly all deployed agent memory is text-level and non-differentiable; retrieval is a separate system, the model has no say in what is written', R + ', Why it matters', ['the model has no say in what gets written']),
 ('Latent memory makes the write mechanism learnable; the injection point x write mechanism taxonomy is a reasonable map even if experiments cannot rank options', R + ', Why it matters', ['a reasonable map of the design space', 'cannot rank the options']),
 ('Not shown: beats competent RAG or text memory (none compared)', R + ', Why it matters; How much to believe', ['no RAG or text-memory baseline']),
 ('Not shown: transfer off Flan-T5-XL to a modern decoder-only model', R + ', Why it matters', ['decoder-only']),
 ('Not shown: latent memory interpretable and auditable, which makes text memory operationally attractive', R + ', Why it matters', ['interpretable and auditable']),
 ('A positive score against a zero baseline is a floor, not evidence of a competitive system', R + ', Why it matters; How much to believe', ['a floor, not evidence of a competitive system']),
 # connections
 ('Text-level memory in personal agents: OpenClaw MEMORY.md, Hermes memory providers and skills; retrieval generally', R + ', Connections; Further reading', ['OpenClaw', 'MEMORY.md', 'Hermes', 'https://docs.openclaw.ai/concepts/memory']),
 ('Related compression-into-latents: context distillation, KV-cache compression, Gist tokens', R + ', Connections; Further reading', ['context distillation', 'KV-cache compression', 'Gist tokens']),
 ('Adjacent in batch: Bitune and LLM Modules, frozen-backbone-plus-adapter designs', R + ', Connections; Further reading', ['3ce5c17b0d0d8173af14ed0caa19d6db', '3ce5c17b0d0d810191d0ebcffc54f608']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Proof-of-concept pilot putting memory in a frozen encoder-decoder']),
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
