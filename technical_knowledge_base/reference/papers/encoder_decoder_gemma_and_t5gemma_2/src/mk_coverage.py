"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The papers tab'
C = [
 # header
 ('Reading time line "9 min read, +2h 35m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors of Encoder-Decoder Gemma: Zhang, Moiseev, Ainslie, Suganthan, Ma, Bhupatiraju, Lebron, Firat, Joulin, Dong (Google)', R + ', headline card', ['Biao Zhang, Fedor Moiseev, Joshua Ainslie, Paul Suganthan, Min Ma, Surya Bhupatiraju, Fede Lebron, Orhan Firat, Armand Joulin, Zhe Dong (Google)']),
 ('Authors of T5Gemma 2: Zhang, Suganthan, Liu, Philippov et al. (Google DeepMind)', R + ', headline card; Further reading lists all 20', ['Biao Zhang, Paul Suganthan, Gaël Liu, Ilya Philippov et al. (Google DeepMind', 'Ilya Philippov, Sahil Dua']),
 ('Date: April 2025 (ICML 2025) and December 2025', R + ', headline card', ['ICML 2025', 'April 2025', 'December 2025']),
 ('Links: arXiv 2504.06225 (45 min), arXiv 2512.14856 (45 min)', 'card and Further reading', ['https://arxiv.org/abs/2504.06225', 'https://arxiv.org/abs/2512.14856', '(45 min)']),
 ('Link: Google developers blog (10 min)', 'Further reading, Best resources; What it takes to use this', ['https://developers.googleblog.com/en/t5gemma/', '(10 min)']),
 ('Weights on Hugging Face: t5gemma-2-270m-270m, 1b-1b (model cards, about 10 min)', 'Further reading, Weights and code (plus 4b-4b and the first generation); card link', ['https://huggingface.co/google/t5gemma-2-270m-270m', 'https://huggingface.co/google/t5gemma-2-1b-1b', 'google/t5gemma-2-4b-4b']),
 ('Filed as one page because the second paper is the same recipe extended', R + ', headline card', ['Filed as one page rather than two because the second paper is the same recipe extended']),
 # resources
 ('Resource: Encoder-Decoder Gemma, read Sections 3, 5 and 6; discussion has the ablations that matter', 'Further reading, The papers', ['Read Sections 3, 5 and 6; the discussion section is where the ablations that matter live']),
 ('Resource: T5Gemma 2, shorter, for long context or multimodality; Tables 4 and 5 are the whole argument', 'Further reading, The papers', ['Tables 4 and 5 are the whole argument']),
 ('Resource: Encoder-Decoder or Decoder-Only? (2510.26622), the same group\'s scaling study', 'Further reading, Best resources', ['https://arxiv.org/abs/2510.26622', 'the same group\'s scaling study']),
 ('Resource: blog is the fast version for the shape of the result', 'Further reading, Best resources', ['the fast version if you only want the shape of the result']),
 # problem
 ('Decoder-only won, but the argument was never settled on the merits', R + ', Problem', ['never settled on the merits']),
 ('Encoder-decoder splits parameters by function: bidirectional encoder, decoder with cross-attention', R + ', Problem', ['splits parameters by function', 'reads the input with bidirectional attention', 'cross-attention over the encoder']),
 ('Bidirectional attention over input: no autoregressive constraint on something you only read', R + ', Problem', ['no autoregressive constraint on something you only read']),
 ('Independent sizing of the two halves: large encoder, small decoder', R + ', Problem; Why it matters', ['independent sizing of the two halves']),
 ('Summarisation named: deep understanding of input; generation invents nothing', R + ', Problem (quoted from §3.1)', ['summarisation', 'doesn\'t need to generate any new information']),
 ('Blocker was cost; nobody would pretrain from scratch with strong decoder-only checkpoints at every size', R + ', Problem', ['The blocker was cost', 'strong decoder-only checkpoints already existed at every size']),
 ('The question: can you adapt a decoder-only checkpoint into an encoder-decoder, cheaply, and end up ahead?', R + ', Problem', ['an existing decoder-only checkpoint into an encoder-decoder, cheaply, and end up ahead']),
 # method
 ('Architecture kept close to the source so initialisation is mostly a copy', R + ', Idea', ['so initialisation is mostly a copy']),
 ('Encoder identical to the decoder-only model, self-attention causal to bidirectional', R + ', Idea; adaptation animation', ['with self-attention switched from causal to bidirectional']),
 ('Decoder block keeps FFN and self-attention, adds cross-attention with same heads and head dim, attending to full encoder output', R + ', Idea', ['adds a cross-attention with the same heads and head size, attending to the whole encoder output']),
 ('Encoder fully initialised from the checkpoint (no new weights); decoder FFN and self-attn from corresponding layers', R + ', Idea; animation', ['The encoder is fully initialised from the checkpoint, since it introduces no new weights']),
 ('Cross-attention is the only new thing: balanced from self-attention weights', R + ', Idea; animation balanced mode', ['Cross-attention is the only genuinely new part', 'initialised from the self-attention weights']),
 ('Unbalanced (9B-2B): random cross-attention, warmup K steps with everything else frozen', R + ', Idea; animation unbalanced mode', ['trains alone for a', 'with everything else frozen']),
 ('Warmup: 1,000 steps right, zero costs 0.7, 5,000 costs 2.3', R + ', Idea and Ablations (with the preliminary setup stated)', ['= 1,000 steps', 'none costs 0.7 points and 5,000 steps cost 2.3', '61.8 with none', '60.2 with 5K']),
 ('Objectives: PrefixLM (split in half) with KD from Gemma 2, and UL2', R + ', Objectives and setup', ['split each sequence in half and predict the second half from the first', 'knowledge distillation', 'Gemma 2 teacher']),
 ('UL2: mixture of denoisers varying mean span and corruption rate, mode token; short-span, long-span, prefix LM', R + ', Objectives and setup', ['a mixture of denoisers that varies the mean span length and the corruption rate', 'mode token', 'short-span denoising, long-span denoising and prefix LM together']),
 ('Adaptation on up to 2T tokens of the Gemma 2 mixture', R + ', Objectives and setup', ['up to <b>2T tokens</b>', 'Gemma 2 pretraining mixture']),
 # T5Gemma 2 method
 ('T5Gemma 2 repeats on Gemma 3, drops distillation (UL2 and UL2+KD within 0.4 points; data-loading overhead)', R + ', T5Gemma 2', ['repeats the adaptation on Gemma 3', 'within 0.4 points, not worth the data-loading overhead']),
 ('Frozen SigLIP vision encoder, 256 tokens fed to the encoder; vision inherits bidirectional visibility', R + ', T5Gemma 2; animation T5Gemma 2 mode', ['frozen 400M SigLIP', '256 tokens', 'vision inherits bidirectional visibility for free']),
 ('Positional interpolation; pretrained at 16K, evaluated to 128K', R + ', T5Gemma 2', ['positional interpolation', 'pretrained at most <b>16K</b> long, evaluated to <b>128K</b>']),
 ('Tied word embeddings (encoder input, decoder input, softmax): nothing measurable, -10.5% parameters', R + ', T5Gemma 2 (with the 47.8 to 47.7 numbers and the recount)', ['Tied word embeddings', 'across encoder input, decoder input and decoder softmax', '10.5%']),
 ('Merged attention: encoder output concatenated onto decoder self-attention input, one module shared, -6.5% for about 0.3 points', R + ', T5Gemma 2, Equations 1 to 5, and the predict-then-reveal live demo', ['Merged attention', 'concatenated onto the decoder\'s input', '6.5%', '0.3']),
 ('Rejected: cross-attention only on global layers, one every six, cost 1.3 points', R + ', T5Gemma 2 (with the recount showing the ablation was one in two)', ['one cross-attention sub-layer every six decoder layers', '1.3 points']),
 # results
 ('UL2 better contextual representations; wins SuperGLUE at most scales', R + ', Results', ['UL2 gives better representations and wins SuperGLUE at most scales']),
 ('PrefixLM+KD better generative models; wins PT and IT, up to 3.6 at 9B-2B', R + ', Results', ['PrefixLM with distillation gives better generative models', 'by up to <b>3.6</b> points at 9B-2B']),
 ('No free combination: merging worse; two-stage switching mixed', R + ', Results; Tables tab Figure 5', ['There is no free combination', 'merging the two checkpoints gave similar or much worse models']),
 ('Gain after IT, not before: comparable or slightly better at PT', R + ', Results', ['The gain arrives after instruction tuning, not before']),
 ('9B-9B beats Gemma 2 9B by 1.4 PT and 4.9 IT; 2B-2B by 1.8 and 7.1', R + ', Results table; headline card', ['+1.4', '+4.9', '+1.8', '+7.1']),
 ('9B-2B similar latency to Gemma 2 2B, clearly better quality, beats 2B-2B by more than 3', R + ', Results with predict question, latency animation and decoded Figure 4; headline card', ['The asymmetric result is the one to remember', '1.05×']),
 ('GSM8K latency curve: sits where a 2B sits, scores where a larger model scores', R + ', Results: decoded Figure 4 points (73.8 at 962 ms against 58.0 at 915 ms and 84.3 at 2578 ms)', ['73.8 against 58.0', 'GSM8K against latency (Figure 4)']),
 ('Encoder-decoder wins SuperGLUE at every scale under both objectives; attributed to bidirectional attention', R + ', Results', ['Encoder-decoder wins SuperGLUE everywhere', 'all 24 comparisons']),
 ('Ablation: causal encoder costs 4.1 and 4.7', R + ', Ablations; toy tab', ['<b>4.1 and 4.7 points</b>']),
 ('Ablation: Gemma 2 2B with 6T more tokens reaches 48.57 against 49.7', R + ', Ablations predict-then-reveal', ['6 trillion tokens', '48.57']),
 ('Ablation: adaptation beats scratch on 8T at every scale above roughly 100M (corrected: scratch wins most scores at 113M and SuperGLUE at 409M)', R + ', Ablations and Tables tab Table 4, corrected', ['too generous', '8T tokens', 'Table 4']),
 ('T5Gemma 2 RULER 32K 81.7 vs 66.8 at 4B; 128K 57.6 vs 51.7', R + ', T5Gemma 2 results; headline card', ['<b>81.7</b>', '<b>66.8</b>', '57.6 against 51.7']),
 ('270M-270M RULER 32K 57.3 vs 21.3, pretrained only at 16K', R + ', T5Gemma 2 results', ['<b>57.3</b>', '21.3', 'pretrained only at 16K']),
 ('Text-only Gemma 3 270M and 1B adapt into usable multimodal models', R + ', T5Gemma 2 results', ['Text-only models become multimodal']),
 ('1B-1B trails Gemma 3 4B on multimodal by 8.7 at a quarter the size (corrected: about half, 2.12B against 4.30B)', R + ', T5Gemma 2 results, corrected', ['<b>8.7</b>', '2.12B parameters against 4.30B']),
 # why it matters
 ('First serious modern test of the question T5 answered; T5 measured enc-dec above dec-only in 2019 and the field ignored it', R + ', Why it matters', ['first serious modern test of the architecture question T5 originally answered', 'in 2019']),
 ('Answer holds; advantage concentrates in fine-tuned and long-context settings, not raw pretraining', R + ', Why it matters', ['the advantage concentrates in fine-tuned and long-context settings']),
 ('Adaptation makes the question cheap to ask; recipe not Gemma-specific; could pair families', R + ', Why it matters', ['Adaptation makes the architecture question cheap to ask', 'models from different families could be paired']),
 ('Asymmetric sizing underexploited: long input short output: extractive and RAG QA, classification, routing, reranking; decoder-only cannot', R + ', Why it matters; What it takes to use this', ['Asymmetric sizing is the underexploited idea', 'classification, routing, reranking', 'structurally cannot']),
 ('9B-2B proof of concept; paper lists more unbalanced setups and MoE combinations as future work', R + ', Why it matters', ['proof of concept', 'dense with MoE pairings']),
 ('Long context: advantage grows with context length (corrected: shrinks from 32K to 128K); explanation architectural: encoder parameters for reading, cross-attention to high-level representation', R + ', T5Gemma 2 results predict and Why it matters, corrected', ['high-level representation', 'the lead shrinks with length']),
 ('Same intuition as the latent-context compression line', R + ', Why it matters; Connections', ['latent-context compression line']),
 ('EmbeddingGemma is built on T5Gemma 2 checkpoints', R + ', T5Gemma 2 results and Why it matters (its own paper: a T5Gemma-adapted Gemma 3 encoder)', ['EmbeddingGemma']),
 # connections
 ('T5: original claim; source of UL2\'s ancestor; tied embeddings a return to T5', 'Connections; Further reading', ['3d45c17b0d0d81ec8ebfec02e953a7fd', 'the span corruption that UL2 extends', 'tied embeddings T5Gemma 2 returns to']),
 ('Ettin: compute-matched encoder vs decoder from the representation side', 'Connections; Further reading', ['3c65c17b0d0d81139cffea35080afe2b', 'from the representation-learning side']),
 ('Bitune: bidirectional pass inside a decoder-only model', 'Connections; Further reading', ['3ce5c17b0d0d8173af14ed0caa19d6db', 'bidirectional pass inside a decoder-only model']),
 ('LCLM: compressing context into latents for a decoder', 'Connections; Further reading', ['3d45c17b0d0d81eb90a8d70a5ce84d19', 'compressing the context into latents for a decoder']),
 ('GPT-3: why the field went the other way; capability neither paper tests', 'Connections; Further reading; How much to believe', ['3c65c17b0d0d8193ac92c7648cfaca12', 'the capability neither T5Gemma paper tests']),
 ('Topics: llms, llm-training-and-post-training, rag-and-retrieval', 'Connections; Further reading', ['3c65c17b0d0d812d9e00f6ec89965286', '3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d81b89145c37dfe8a3b0b']),
 ('Database property Takeaway', 'stays in the database; also shown verbatim in the headline card', ['Adapts pretrained decoder-only checkpoints into encoder-decoder models by copying weights across']),
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
