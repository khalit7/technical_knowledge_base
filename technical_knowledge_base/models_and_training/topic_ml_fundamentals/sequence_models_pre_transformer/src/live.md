Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d818da4ded61ace6847ce as of 2026-09-22T00:05:58.120Z:
<page url="https://app.notion.com/p/3c65c17b0d0d818da4ded61ace6847ce">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d796ccc0a293218c57" title="Topic: ml-fundamentals"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Sequence models: the pre-transformer lineage"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +2h resources
## Best resources
- [Understanding LSTM Networks (colah)](https://colah.github.io/posts/2015-08-Understanding-LSTMs/) (\~25 min): still the best LSTM explanation ever written.
- [An intuitive explanation of LSTM (Calzone, Medium)](https://medium.com/@ottaviocalzone/an-intuitive-explanation-of-lstm-a035eb6ab42c) (\~15 min) and [RNN architecture explained (Poudel, Medium)](https://medium.com/@poudelsushmita878/recurrent-neural-network-rnn-architecture-explained-1d69560541ef) (\~15 min): short gate-by-gate and cell-by-cell walkthroughs.
- [The Illustrated Word2vec (Jay Alammar)](https://jalammar.github.io/illustrated-word2vec/) (\~30 min): embeddings intuition.
- [The Unreasonable Effectiveness of RNNs (Karpathy)](https://karpathy.github.io/2015/05/21/rnn-effectiveness/) (\~35 min): what RNNs could do, and why people were excited.
## Word embeddings
<table header-row="true">
<tr>
<td>Model</td>
<td>Mechanism</td>
<td>Notes</td>
</tr>
<tr>
<td>word2vec (2013)</td>
<td>Shallow net: skip-gram (predict context from word) or CBOW (word from context); negative sampling to avoid the full softmax</td>
<td>Static one-vector-per-word; famous linear analogies (king - man + woman ≈ queen)</td>
</tr>
<tr>
<td>GloVe (2014)</td>
<td>Fit log co-occurrence counts of a global corpus matrix with a weighted least-squares objective</td>
<td>Count-based counterpart to word2vec's predictive approach</td>
</tr>
</table>
Both give context-independent embeddings; contextual embeddings (BERT, ELMo) superseded them.
## WaveNet (DeepMind, 2016)
Autoregressive audio generation with **dilated causal convolutions**: receptive field grows exponentially with depth, no recurrence. Powered Google TTS; its gated activation unit ($`\tanh \odot \sigma`$) prefigures the GLU family, and it proved convolutions could do sequence modelling, a step on the road away from recurrence.
## Raw RNNs
- Recurrence: $`a_t = f(U x_t + W a_{t-1})`$, $`y_t = g(V a_t)`$; $`a_t`$ is the hidden state; weights $`U, V, W`$ are **shared across time**.
- Trained by **backpropagation through time (BPTT)**: unroll the graph, backprop through every step.
- **Vanishing/exploding gradients**: the gradient at step $`t`$ w.r.t. early states contains products of many Jacobians $`\prod_k \partial a_k/\partial a_{k-1}`$; repeated multiplication drives the product to 0 (factors \< 1) or infinity (factors \> 1). Long-range dependencies become unlearnable. LSTMs and GRUs were designed to fix this.
## LSTMs
Input $`x_t`$ and previous hidden state $`h_{t-1}`$ are concatenated and fed to four parallel layers; three sigmoid **gates** act as selectors (outputs in \[0,1\] multiply information streams):
<table header-row="true">
<tr>
<td>Gate</td>
<td>Formula</td>
<td>Role</td>
</tr>
<tr>
<td>Forget</td>
<td>$`f_t = \sigma(W_f[h_{t-1},x_t])`$</td>
<td>What to erase from cell state $`C_{t-1}`$</td>
</tr>
<tr>
<td>Input</td>
<td>$`i_t = \sigma(W_i[h_{t-1},x_t])`$, candidate $`\tilde C_t = \tanh(W_C[h_{t-1},x_t])`$</td>
<td>What new information to write</td>
</tr>
<tr>
<td>Output</td>
<td>$`o_t = \sigma(W_o[h_{t-1},x_t])`$</td>
<td>What part of the cell state to expose</td>
</tr>
</table>
Updates: $`C_t = f_t \odot C_{t-1} + i_t \odot \tilde C_t`$; $`h_t = o_t \odot \tanh(C_t)`$.
Key point: the cell state is updated **additively** (like a skip connection), so gradients flow along $`C`$ largely unmultiplied; this is what solves vanishing gradients.
## GRUs
Simplified LSTM: two gates (update $`z_t`$, reset $`r_t`$), cell state and hidden state merged into one.
$`h_t = (1-z_t)\odot h_{t-1} + z_t \odot \tilde h_t`$: the same additive/interpolating trick, \~25% fewer parameters, usually comparable quality.
## Seq2seq and attention
- **Seq2seq (2014)**: encoder RNN compresses the source into a final hidden state; decoder RNN generates from it. Bottleneck: one fixed-size vector must carry the whole sentence, and quality collapses on long inputs.
- **Attention (Bahdanau 2014, Luong 2015)**: keep all encoder hidden states; at each decoding step, score them against the decoder state, softmax the scores into weights, and feed the weighted-sum context vector to the decoder. The decoder learns where to look, per output token, and the fixed-vector bottleneck disappears.
## Where the lineage ends
The transformer (2017) removed the recurrence entirely and kept only attention: self-attention within encoder and decoder plus cross-attention between them, giving full parallelism over sequence length. See <mention-page url="https://app.notion.com/p/3c65c17b0d0d81999af7f16f8ed8ee9e"/>; everything after it lives in <mention-page url="https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286"/> and <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b"/>.
Postscript (2024-26): recurrence partially returned as **state-space models** (Mamba) and hybrid SSM-attention stacks, which revive RNN-like $`O(1)`$-per-token inference with modern training parallelism.
## Cross-links
- Vanishing/exploding gradients in general: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81369e1cc38ed4e11d48"/>, <mention-page url="https://app.notion.com/p/3c65c17b0d0d8198857bd8347723ad70"/>
- Gated activations (GLU family descends from these gates): <mention-page url="https://app.notion.com/p/3c65c17b0d0d819f8049c255e6f206e2"/>
</content>
</page>
