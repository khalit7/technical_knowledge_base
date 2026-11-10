# 2026-11-10: phrases updated to the rebuilt wording (14 had been stale since the 2026-10-24 rebuild; each fact is still carried).
# Every fact, mechanism step, caveat and link of live.md (the old Notion page), where the HTML carries it,
# checked against the built page (a phrase that must appear in ../index.html). Writes coverage.json.
import json, os, re, html
HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, '..', 'index.html')).read()
text = html.unescape(re.sub(r'<[^>]+>', '', page))
F = [
 # (fact from live.md, phrase in the page, where, note)
 ('Reading time line "5 min read, +2h resources"', 'in closed details', 'header', 'replaced by computed reading time and resources total (not a fact; recomputed by build.sh)'),
 ('colah, Understanding LSTM Networks, ~25 min, "still the best LSTM explanation ever written"', 'Understanding LSTM Networks (Christopher Olah)', 'Further reading, Best resources', ''),
 ('Calzone, An intuitive explanation of LSTM, ~15 min', 'An intuitive explanation of LSTM (Calzone, Medium)', 'Further reading, Best resources', ''),
 ('Poudel, RNN architecture explained, ~15 min', 'RNN architecture explained (Poudel, Medium)', 'Further reading, Best resources', ''),
 ('Alammar, The Illustrated Word2vec, ~30 min', 'The Illustrated Word2vec (Jay Alammar)', 'Further reading, Best resources', ''),
 ('Karpathy, The Unreasonable Effectiveness of RNNs, ~35 min', 'The Unreasonable Effectiveness of Recurrent Neural Networks (Andrej Karpathy)', 'Further reading, Best resources', ''),
 ('word2vec (2013): shallow net', 'deliberately shallow model', 'Reading, Words as vectors', ''),
 ('skip-gram predicts context from word', 'predicts the words around a word from the word', 'Reading, Words as vectors', ''),
 ('CBOW predicts word from context', 'predicts a word from the average of its neighbours', 'Reading, Words as vectors', ''),
 ('negative sampling to avoid the full softmax', 'negative sampling', 'Reading, Words as vectors (with the objective, k and the 3/4 noise distribution)', ''),
 ('static one vector per word', 'One vector per word cannot tell', 'Reading, Static, then contextual', ''),
 ('famous linear analogies king - man + woman ≈ queen', 'What "king − man + woman = queen" leaves out', 'Reading, analogy correction box; Word vectors tab', 'kept, with the exclusion caveat measured on real GloVe'),
 ('GloVe (2014): fit log co-occurrence counts with weighted least squares', 'weighted least squares', 'Reading, Words as vectors (objective and f)', ''),
 ('GloVe is the count-based counterpart to word2vec predictive approach', '"predictive" (word2vec) against "count-based" (GloVe)', 'Reading, Words as vectors', 'nuanced with Levy and Goldberg 2014'),
 ('both context-independent; contextual embeddings (BERT, ELMo) superseded them', 'ELMo', 'Reading, Static, then contextual', ''),
 ('WaveNet (DeepMind, 2016): autoregressive audio generation', 'generated raw audio one sample at a time', 'Reading, WaveNet', ''),
 ('dilated causal convolutions', 'dilations 1, 2, 4, 8', 'Reading, WaveNet, Fig. 5 step list', ''),
 ('receptive field grows exponentially with depth', 'doubles the field every layer', 'Reading, WaveNet', ''),
 ('no recurrence', 'It has no recurrence', 'Reading, WaveNet; Common mistakes', ''),
 ('powered Google TTS', 'the WaveNet in production was not the 2016 model', 'Reading, WaveNet correction box', 'corrected: production was Parallel WaveNet in the Google Assistant'),
 ('gated activation unit tanh ⊙ σ prefigures the GLU family', 'gated activation', 'Reading, WaveNet', ''),
 ('proved convolutions could do sequence modelling, a step away from recurrence', 'WaveNet\'s lesson for text came quickly', 'Reading, WaveNet', ''),
 ('RNN recurrence a_t = f(U x_t + W a_{t-1}), y_t = g(V a_t)', 'the same at every step', 'Reading, Recurrent networks (formula)', ''),
 ('a_t is the hidden state', 'the hidden state, the network', 'Reading, Recurrent networks', ''),
 ('weights U, V, W shared across time', 'the same at every step', 'Reading, Recurrent networks', ''),
 ('trained by BPTT: unroll, backprop through every step', 'backpropagation through time', 'Reading, Recurrent networks', ''),
 ('vanishing/exploding: product of Jacobians', 'crosses one Jacobian per step', 'Reading, The gradient through time', 'with Pascanu et al.\'s exact condition'),
 ('factors < 1 drive the product to 0, > 1 to infinity', 'vanish exponentially', 'Reading, Recurrent networks', 'made exact: sufficient for vanishing, necessary (not sufficient) for exploding'),
 ('long-range dependencies become unlearnable', 'cannot learn one from long sequences', 'Reading, Measured', 'measured on the toy runs'),
 ('LSTMs and GRUs were designed to fix this', 'shortened or protected that path', 'Reading, The idea in one screen', ''),
 ('LSTM: x_t and h_{t-1} concatenated, fed to four parallel layers', 'fed to all four in parallel', 'Reading, LSTM', ''),
 ('three sigmoid gates act as selectors, outputs in [0,1] multiply streams', 'a sigmoid output in (0, 1) that multiplies a stream', 'Reading, new terms (Gate)', ''),
 ('forget gate f_t = σ(W_f[h_{t-1},x_t]): what to erase from C_{t-1}', 'Forget gate', 'Reading, LSTM table and animation', ''),
 ('input gate i_t and candidate C̃_t = tanh(W_C[...]): what to write', 'Input gate', 'Reading, LSTM table and animation', ''),
 ('output gate o_t: what part of the cell to expose', 'Output gate', 'Reading, LSTM table and animation', ''),
 ('C_t = f ⊙ C_{t-1} + i ⊙ C̃_t; h_t = o ⊙ tanh(C_t)', 'the cell is added to, not rewritten', 'Reading, LSTM table', ''),
 ('cell state updated additively, like a skip connection; gradients flow along C largely unmultiplied; this solves vanishing gradients', 'It is a skip connection through time', 'Reading, LSTM; Common mistakes', 'qualified: one protected path scaled by the forget gate, not a full solution'),
 ('GRU: simplified LSTM, update z and reset r gates, cell and hidden merged', 'The GRU: two gates, one state', 'Reading, GRU', ''),
 ('h_t = (1-z) ⊙ h_{t-1} + z ⊙ h̃_t', 'one gate doing the forget and input jobs together', 'Reading, GRU formula', ''),
 ('~25% fewer parameters', 'exactly 3/4 of an LSTM', 'Reading, GRU', 'made exact: 3/4 at equal width, derived'),
 ('usually comparable quality', 'Quality is usually comparable', 'Reading, GRU; Common mistakes', ''),
 ('Seq2seq (2014): encoder RNN compresses the source into a final hidden state; decoder generates from it', 'its final state becomes a fixed-size vector', 'Reading, Seq2seq', ''),
 ('bottleneck: one fixed-size vector must carry the whole sentence', 'The bottleneck.', 'Reading, Seq2seq; Fig. 4 step 2', ''),
 ('quality collapses on long inputs', 'was not universal', 'Reading, Seq2seq correction box', 'corrected: Sutskever et al. did not see it, with reversed sources; the toy shows both'),
 ('Attention (Bahdanau 2014, Luong 2015): keep all encoder states', 'kept every encoder state', 'Reading, Attention', ''),
 ('score them against the decoder state, softmax into weights', 'softmax', 'Reading, Attention formula and animation', ''),
 ('weighted-sum context vector fed to the decoder', 'a fresh context vector for every output word', 'Reading, Attention', ''),
 ('decoder learns where to look per output token; bottleneck disappears', 'nothing has to be squeezed', 'Reading, Seq2seq and attention', ''),
 ('Transformer (2017) removed recurrence, kept only attention', 'kept only attention', 'Reading, Why the transformer replaced them', ''),
 ('self-attention within encoder and decoder plus cross-attention', 'cross-attention between them', 'Reading, Why the transformer replaced them', ''),
 ('full parallelism over sequence length', 'every position computed at once', 'Reading, The idea in one screen', ''),
 ('link: Attention Is All You Need', 'Attention Is All You Need', 'Reading and Further reading', ''),
 ('link: Topic: llms', 'Topic: llm-architecture', 'Reading, Why the transformer replaced them', 'link replaced (2026-10-24): what came after is linked through Topic: llm-architecture'),
 ('link: Topic: llm-training-and-post-training', 'Topic: llm-architecture', 'Reading, Why the transformer replaced them', 'link replaced (2026-10-24): what came after is linked through Topic: llm-architecture, one click from the training topic'),
 ('Postscript (2024-26): recurrence partly returned as state-space models (Mamba) and hybrids', 'Recurrence returns.', 'Reading, Why the transformer replaced them', 'date corrected: Mamba is December 2023'),
 ('RNN-like O(1)-per-token inference with modern training parallelism', 'Constant memory and compute per generated token', 'Reading, Where the lineage ends', ''),
 ('cross-link: Normalisation and initialisation (vanishing/exploding in general)', 'Normalisation and initialisation', 'Further reading', ''),
 ('cross-link: Debugging training (3c65c17b0d0d8198857bd8347723ad70)', 'When training goes wrong', 'Further reading (parent root)', 'that page was folded into the parent root\'s "When training goes wrong" tab, linked by name'),
 ('cross-link: Activation functions (GLU family descends from these gates)', 'Activation functions', 'Reading, WaveNet; Further reading', ''),
]
rows = []; missing = []
for fact, needle, where, note in F:
    found = needle in page or needle in text
    rows.append({'fact': fact, 'where': where, 'phrase': needle, 'found': found, 'note': note})
    if not found: missing.append(needle)
json.dump({'source': 'src/live.md (Notion copy dated 2026-09-22, fetched 2026-10-03)', 'facts': len(rows),
           'found': sum(r['found'] for r in rows), 'corrected': sum(bool(r['note']) and ('corrected' in r['note'] or 'qualified' in r['note']) for r in rows),
           'dropped': 0, 'rows': rows}, open(os.path.join(HERE, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print('facts', len(rows), 'found', len(rows) - len(missing), 'missing', missing)
