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
 ('Reading time line "9 min read, +5h 35m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin', R + ', headline card', ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Łukasz Kaiser', 'Illia Polosukhin']),
 ('Lab: Google Brain / Google Research / U. Toronto', R + ', headline card', ['Google Brain, Google Research, University of Toronto']),
 ('Date: June 2017 (NeurIPS 2017)', R + ', headline card', ['NeurIPS 2017', 'June 2017']),
 ('Link arXiv:1706.03762 (~45 min)', 'card and Further reading, The paper', ['https://arxiv.org/abs/1706.03762', '(45 min)']),
 ('Link tensor2tensor code (repo, ~20 min for the README and entry path)', 'card and Further reading (now noted as deprecated in favour of Trax, from its README)', ['https://github.com/tensorflow/tensor2tensor', 'about 20 minutes for the README and entry path', 'Trax']),
 # resources
 ('The Illustrated Transformer (Jay Alammar, ~30 min): canonical visual walkthrough', 'Further reading, Best resources', ['https://jalammar.github.io/illustrated-transformer/', 'canonical visual walkthrough']),
 ('The Annotated Transformer (Harvard NLP, 2022 revision, ~1h 30m): reimplemented line by line in PyTorch', 'Further reading, Best resources', ['https://nlp.seas.harvard.edu/annotated-transformer/', 'reimplemented line by line in PyTorch', '(1h 30m)']),
 ('3Blue1Brown: Attention in transformers, visually explained (~30 min)', 'Further reading, Best resources', ['https://www.3blue1brown.com/lessons/attention', 'geometric intuition']),
 ("Karpathy: Let's build GPT from scratch (~2h)", 'Further reading, Best resources', ['https://www.youtube.com/watch?v=kCc8FmEb1nY', 'decoder-only Transformer from an empty file', '(2h)']),
 # problem
 ('2017 transduction dominated by RNN/LSTM encoder-decoders, sometimes with attention', R + ', Problem (§1, §2)', ['dominated by recurrent encoder-decoders (LSTMs and GRUs)']),
 ('Convolutional alternatives ByteNet, ConvS2S', R + ', Problem', ['ByteNet and ConvS2S']),
 ('RNNs compute h_t from h_{t-1}: no parallelism across time; caps batch utilisation; long sequences expensive', R + ', Problem; animation in Idea', ['cannot be parallelised along the sequence', 'memory limits batching across examples']),
 ('Convolutions need O(n/k) or O(log n) layers to connect distant positions', R + ', Problem', ['for contiguous kernels (ConvS2S)', 'for dilated ones (ByteNet)']),
 ('The question: can attention alone carry an entire sequence model?', R + ', Problem', ['can attention alone, with no recurrence and no convolution, carry an entire sequence model?']),
 # method
 ('Encoder-decoder built purely from attention, position-wise MLPs, residuals, layer normalisation', R + ', Method', ['built only from attention, position-wise feed-forward layers, residual connections and layer normalisation']),
 ('Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V', R + ', Method: Equation 1', ['Attention( Q , K , V ) = softmax( QK ⊤ / √ d k ) V']),
 ('1/sqrt(d_k): q.k variance d_k; unscaled logits saturate the softmax with tiny gradients', R + ', Method, plus the predict-then-reveal live demo', ['has mean 0 and variance', 'tiny gradients', 'Redraw vectors']),
 ('Dot-product over additive (Bahdanau) attention because it is a single matmul', R + ', Method: Equation 1 note', ['additive (Bahdanau) attention, because it is a single matrix multiply']),
 ('Multi-head: d_model 512, h = 8, W_i^Q, W_i^K (d_model x d_k), W_i^V (d_model x d_v), d_k = d_v = 64; concat and W^O (h d_v x d_model)', R + ', Method: multi-head', ['h = 8 times', '= 64', 'Concat(head']),
 ('Total FLOPs match single-head full-width attention', R + ', Method: multi-head', ['the total cost is about that of one full-width head']),
 ('Heads attend to different subspaces; single head averaging blurs; 1 head costs about 0.9 BLEU', R + ', Method: multi-head; Results predict; Tables tab', ['where a single head has to average them', 'one head costs 0.9 BLEU']),
 ('Post-LN: encoder N = 6, two sub-layers, LayerNorm(x + Sublayer(x)), dropout on sub-layer output', R + ', The block', ['stack of N = 6 identical layers with two sub-layers', 'LayerNorm( x + Sublayer( x ))', 'with dropout on the sub-layer output']),
 ('Decoder N = 6, three sub-layers; causal mask sets illegal connections to -inf so position i sees only <= i', R + ', The block; Run tab decoder maps', ['masked self-attention', 'set to −∞ before the softmax so position i sees only positions up to i']),
 ('Cross-attention: Q from the decoder, K, V from the encoder output', R + ', The block; Run tab', ['whose queries come from the decoder and whose keys and values come from the encoder']),
 ('FFN(x) = max(0, xW1 + b1)W2 + b2, identical at every position, d_ff = 2048 (4x)', R + ', The block: Equation 2', ['FFN( x ) = max(0,', 'inner size d ff = 2048, a 4× expansion']),
 ('Input/output embeddings and pre-softmax projection share one matrix, scaled by sqrt(d_model)', R + ', The block: Embeddings; Run tab model', ['One weight matrix is shared by the input embedding, the output embedding and the pre-softmax projection']),
 ('Sinusoidal PE(pos, 2i) = sin(pos / 10000^(2i/d_model)), cos for odd, added to embeddings', R + ', Positions, with heatmap', ['10000 2 i / d model', 'adds fixed sinusoids to the embeddings']),
 ('PE(pos+k) is a linear function of PE(pos): relative-offset attention learnable', R + ', Positions, with the dot-product-against-offset chart', ['is a linear function of']),
 ('Learned absolute embeddings performed identically in ablations', R + ', Positions (corrected to "nearly identical", 25.7 against 25.8, Table 3 row (E))', ['nearly identical results (25.7 BLEU against 25.8']),
 ('Training: WMT 2014; BPE 37K shared EN-DE; 32K word-piece EN-FR', R + ', Training', ['about 37,000 tokens', '32,000 word-piece vocabulary']),
 ('Adam beta_2 = 0.98; warmup 4000 then inverse sqrt', R + ', Training: Equation 3 with chart', ['β 2 = 0.98', '4,000 warmup steps', 'inverse square root']),
 ('Residual and embedding dropout 0.1', R + ', Training: Regularisation', ['residual dropout 0.1 on every sub-layer output and on the sums of embeddings and positional encodings']),
 ('Label smoothing 0.1 (hurts perplexity, helps BLEU)', R + ', Training: Regularisation', ['label smoothing ε ls = 0.1', 'hurts perplexity']),
 ('Base 65M parameters, 12 hours on 8 P100s; big 213M, 3.5 days', R + ', Training; headline card; Tables tab recount', ['Base model (65M parameters): 100,000 steps', 'Big model (213M): 300,000 steps at 1.0 s, 3.5 days']),
 ('Inference: beam 4, length penalty 0.6, checkpoint averaging', R + ', Training and decoding', ['beam 4 and length penalty α = 0.6', 'averages the last 5 checkpoints']),
 ('Section 4: self-attention O(n^2 d), O(1) sequential, O(1) path; recurrence O(n d^2), O(n), O(n)', R + ', Idea table and animation; Tables tab calculator', ['O( n ²· d )', 'O( n · d ²)', 'Longest path']),
 ('When n < d self-attention is cheaper per layer; constant-length paths make long-range dependencies learnable', R + ', Idea', ['When n < d , as with sentence-level word-piece and byte-pair tokens, self-attention is also cheaper per layer', 'shorter paths make long-range dependencies easier to learn']),
 # results
 ('EN-DE 28.4 BLEU (big), beating all prior single models and ensembles by over 2 BLEU', R + ', headline card and Results; Tables tab Table 2', ['28.4 BLEU', 'more than 2.0 above the best earlier result including ensembles']),
 ('Base model beat everything at a fraction of the FLOPs: 3.3e18 against about 1e19 to 1e21', R + ', Results (range given as the table states it: EN-DE 9.6e18 to 1.8e20; EN-FR up to 1.2e21 in Table 2)', ['Even the base model, 27.3, beats every earlier model and ensemble', '9.6 × 10 18 to 1.8 × 10 20']),
 ('EN-FR 41.8 BLEU (big), single-model SOTA at under 1/4 the training cost', R + ', headline card and Results (with the 41.0 in the v7 text and v1, v2 abstracts shown side by side)', ['41.8 BLEU', 'under a quarter', '41.0']),
 ('Parsing: 4-layer Transformer 91.3 F1 WSJ-only (beating BerkeleyParser), 92.7 semi-supervised, little tuning', R + ', Results; Tables tab Table 4', ['scores 91.3 F1', 'beating the BerkeleyParser (90.4)', 'it scores 92.7', 'evidence the architecture generalises beyond translation']),
 ('Ablations: too many heads hurts as well as too few; shrinking d_k hurts; bigger is better; dropout essential', R + ', Results; Tables tab Table 3 in full', ['too many heads hurts as well as too few', 'shrinking d k hurts', 'bigger models are better', 'dropout is essential at this data scale']),
 # why it matters
 ('The architecture paper of the deep learning era; removing recurrence made training parallel; compute on model and data size', R + ', Why it matters', ['This is the architecture paper of the deep learning era', 'embarrassingly parallel across sequence length']),
 ('Descendants: GPT, Claude, Llama, Gemini, DeepSeek, BERT-style encoders, ViT, CLIP, Whisper, diffusion backbones', R + ', Why it matters', ['(GPT, Claude, Llama, Gemini, DeepSeek), BERT-style encoders, ViT, CLIP, Whisper']),
 ('Changed: pre-LN instead of post-LN; RMSNorm', R + ', Why it matters; Then and now step 3 and 4', ['Pre-LN instead of post-LN', 'RMSNorm']),
 ('Changed: RoPE instead of sinusoidal, plus interpolation/YaRN', R + ', Why it matters; Then and now step 5', ['RoPE instead of sinusoidal absolute encodings', 'YaRN']),
 ('Changed: SwiGLU/GeGLU FFNs, biases dropped', R + ', Why it matters; Then and now steps 6 and 8', ['SwiGLU or GeGLU instead of ReLU', 'No biases']),
 ('Changed: decoder-only; cross-attention survives in multimodal adapters and T5, Whisper', R + ', Why it matters; Then and now step 2', ['Decoder-only, not encoder-decoder', 'multimodal adapters']),
 ('Changed: MQA/GQA and MLA, FlashAttention, PagedAttention, sliding windows, sparse/linear hybrids like Mamba', R + ', Why it matters; Then and now step 7 and table', ['MQA, GQA and MLA shrink the KV cache', 'FlashAttention makes exact attention IO-aware', 'sparse and linear hybrids such as Mamba']),
 ('Changed: label smoothing and heavy dropout dropped at pretraining scale; warmup + decay survives in cosine form', R + ', Why it matters (now sourced: PaLM without dropout, GPT-3 cosine; plus Adam beta2 0.98 to 0.95)', ['label smoothing and heavy dropout largely dropped at pretraining scale', 'cosine']),
 ('Survived: scaled dot-product attention, multi-head, residual + norm, 4x FFN expansion, weight-tied embeddings', R + ', Why it matters; Then and now "What survived" (corrected: 4x FFN survives as a parameter budget; tied embeddings only in small models, with configs)', ['What survived untouched', 'survives as a parameter budget', 'tie_word_embeddings']),
 # connections
 ('BERT (2018): encoder stack pretrained bidirectionally', 'Why it matters, Connections; Further reading', ['BERT', 'the encoder stack alone, pretrained bidirectionally', '3c65c17b0d0d81e5ad9bd09cbf18ad7c']),
 ('GPT-3 (2020) and Scaling Laws (2020): decoder scaled; parallelism made the curves reachable', 'Connections; Further reading', ['3c65c17b0d0d8193ac92c7648cfaca12', '3c65c17b0d0d81b08a1debb0c15cd252', 'made those curves reachable']),
 ('RoFormer/RoPE (2021): replaces sinusoidal PE', 'Connections; Then and now; Further reading', ['3c65c17b0d0d81cfa5e9f54459720098', 'rotary embeddings replace the sinusoidal positional encoding']),
 ('FlashAttention (2022) and vLLM/PagedAttention (2023): attack attention memory/IO costs', 'Connections; Then and now; Further reading', ['3c65c17b0d0d81e4a3e8e7a2c4771381', '3c65c17b0d0d81bf8b90ca93fee19f5f']),
 ('ViT (2020): the same encoder on image patches', 'Connections; Further reading', ['3c65c17b0d0d811fa231cfcde6c1954d', 'the same encoder applied to image patches']),
 ('Mamba (2023): main post-Transformer attempt to remove the O(n^2) core', 'Connections; Further reading', ['3c65c17b0d0d8179984fc3a1fee4c36a', 'the main post-Transformer attempt to remove the O(n²) attention core']),
 ('Topics: ml-fundamentals (sequence-model history, attention), llm-training-and-post-training (positional encodings, LR schedules), llms (ancestor of every family)', 'Connections; Further reading, Topics', ['3c65c17b0d0d81d796ccc0a293218c57', '3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d812d9e00f6ec89965286', 'sequence-model history, attention']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Replaced recurrence entirely with multi-head scaled dot-product self-attention']),
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
