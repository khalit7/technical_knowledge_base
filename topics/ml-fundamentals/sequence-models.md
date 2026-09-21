# Sequence models: the pre-transformer lineage

⏱ 5 min read · +2h resources

### Best resources

- [Understanding LSTM Networks (colah)](https://colah.github.io/posts/2015-08-Understanding-LSTMs/) (~25 min): still the best LSTM explanation ever written.
- [An intuitive explanation of LSTM (Calzone, Medium)](https://medium.com/@ottaviocalzone/an-intuitive-explanation-of-lstm-a035eb6ab42c) (~15 min) and [RNN architecture explained (Poudel, Medium)](https://medium.com/@poudelsushmita878/recurrent-neural-network-rnn-architecture-explained-1d69560541ef) (~15 min): the seed articles.
- [The Illustrated Word2vec (Jay Alammar)](https://jalammar.github.io/illustrated-word2vec/) (~30 min): embeddings intuition.
- [The Unreasonable Effectiveness of RNNs (Karpathy)](https://karpathy.github.io/2015/05/21/rnn-effectiveness/) (~35 min): what RNNs could do, and why people were excited.

### Word embeddings

| Model | Mechanism | Notes |
| --- | --- | --- |
| word2vec (2013) | Shallow net: skip-gram (predict context from word) or CBOW (word from context); negative sampling to avoid the full softmax | Static one-vector-per-word; famous linear analogies (king - man + woman ≈ queen) |
| GloVe (2014) | Fit log co-occurrence counts of a global corpus matrix with a weighted least-squares objective | Count-based counterpart to word2vec's predictive approach |

Both give context-independent embeddings; contextual embeddings (BERT, ELMo) superseded them.

### WaveNet (DeepMind, 2016)

Autoregressive audio generation with **dilated causal convolutions**: receptive field grows exponentially with depth, no recurrence. Powered Google TTS; its gated activation unit (`\tanh \odot \sigma`) prefigures the GLU family, and it proved convolutions could do sequence modelling, a step on the road away from recurrence.

### Raw RNNs

- Recurrence: `a_t = f(U x_t + W a_{t-1})`, `y_t = g(V a_t)`; `a_t` is the hidden state; weights `U, V, W` are **shared across time**.
- Trained by **backpropagation through time (BPTT)**: unroll the graph, backprop through every step.
- **Vanishing/exploding gradients**: the gradient at step `t` w.r.t. early states contains products of many Jacobians `\prod_k \partial a_k/\partial a_{k-1}`; repeated multiplication drives the product to 0 (factors < 1) or infinity (factors > 1). Long-range dependencies become unlearnable. LSTMs and GRUs were designed to fix this.

### LSTMs

Input `x_t` and previous hidden state `h_{t-1}` are concatenated and fed to four parallel layers; three sigmoid **gates** act as selectors (outputs in [0,1] multiply information streams):

| Gate | Formula | Role |
| --- | --- | --- |
| Forget | `f_t = \sigma(W_f[h_{t-1},x_t])` | What to erase from cell state `C_{t-1}` |
| Input | `i_t = \sigma(W_i[h_{t-1},x_t])`, candidate `\tilde C_t = \tanh(W_C[h_{t-1},x_t])` | What new information to write |
| Output | `o_t = \sigma(W_o[h_{t-1},x_t])` | What part of the cell state to expose |

Updates: `C_t = f_t \odot C_{t-1} + i_t \odot \tilde C_t`; `h_t = o_t \odot \tanh(C_t)`.

Key point: the cell state is updated **additively** (like a skip connection), so gradients flow along `C` largely unmultiplied; this is what solves vanishing gradients.

### GRUs

Simplified LSTM: two gates (update `z_t`, reset `r_t`), cell state and hidden state merged into one.

`h_t = (1-z_t)\odot h_{t-1} + z_t \odot \tilde h_t`: the same additive/interpolating trick, ~25% fewer parameters, usually comparable quality.

### Seq2seq and attention

- **Seq2seq (2014)**: encoder RNN compresses the source into a final hidden state; decoder RNN generates from it. Bottleneck: one fixed-size vector must carry the whole sentence, and quality collapses on long inputs.
- **Attention (Bahdanau 2014, Luong 2015)**: keep all encoder hidden states; at each decoding step, score them against the decoder state, softmax the scores into weights, and feed the weighted-sum context vector to the decoder. The decoder learns where to look, per output token, and the fixed-vector bottleneck disappears.

### Where the lineage ends

The transformer (2017) removed the recurrence entirely and kept only attention: self-attention within encoder and decoder plus cross-attention between them, giving full parallelism over sequence length. See [Attention Is All You Need (Transformer)](../../papers/2017-06_attention-is-all-you-need/summary.md); everything after it lives in [Topic: llms](../llms/summary.md) and [Topic: llm-training-and-post-training](../llm-training-and-post-training/summary.md).

Postscript (2024-26): recurrence partially returned as **state-space models** (Mamba) and hybrid SSM-attention stacks, which revive RNN-like `O(1)`-per-token inference with modern training parallelism.

### Cross-links

- Vanishing/exploding gradients in general: [Normalisation and initialisation](normalisation-and-initialisation.md), [Debugging training](debugging-training.md)
- Gated activations (GLU family descends from these gates): [Activation functions](activations.md)
