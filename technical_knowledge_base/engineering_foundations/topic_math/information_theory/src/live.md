Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81c6baf3f778a62e14e5 as of 2026-09-30T16:02:43.943Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81c6baf3f778a62e14e5">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81cdb851c0835b25a538" title="Topic: math"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Information theory for ML"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="notion-file-block://3937f728-b863-4f04-a251-1af2accdf1c0/eb745496-9da2-47ae-88d1-bd7136dd1c9e?space_id=13e79c56-ebab-4528-83aa-967a204b1f04&name=information-theory-for-ml.html">Interactive: Information theory for ML</embed>
⏱ 15 min read · +4h 30m resources
Information theory measures uncertainty, and for ML it does one job above all: it says what a log-loss number *means*. The training loss of a classifier or a language model is a cross-entropy, which is the average length of a code built from the model's predictions. The part of that loss the model can still remove is a KL divergence; the part it can never remove is the data's own entropy. The same few quantities explain why perplexity cannot be compared across tokenizers while bits-per-byte can, why a model fitted by maximum likelihood spreads its probability mass while an RLHF-style KL penalty narrows it, and why contrastive losses such as CLIP's want very large batches.
Everything here is built from one idea, the **surprise** of an outcome, $`-\log p`$, and five quantities made from it:
- **Entropy** $`H(p)`$: the average surprise of a distribution, and the shortest possible average code length.
- **Cross-entropy** $`H(p, q)`$: the average surprise when outcomes come from $`p`$ but you predicted $`q`$; the training loss.
- **KL divergence** $`D_{KL}(p \| q)`$: cross-entropy minus entropy, the excess cost of predicting $`q`$ when the truth is $`p`$.
- **Mutual information** $`I(X; Y)`$: how much knowing one variable reduces the entropy of another.
- **Perplexity** and **bits-per-byte**: cross-entropy re-expressed as an effective number of choices, or as a compression rate.
## What is entropy? (flagged question)
Entropy is the expected surprise of a random variable. Define the surprise (information content) of an outcome with probability $`p`$ as $`-\log p`$: rare events are more informative, certain events ($`p = 1`$) carry none, and independent surprises add ($`-\log p_1 p_2 = -\log p_1 - \log p_2`$, the property that forces the log). Then
$$
H(X) = \mathbb{E}[-\log p(X)] = -\sum_x p(x) \log p(x).
$$
where
- $`X`$ is a discrete random variable and $`x`$ ranges over its possible outcomes;
- $`p(x)`$ is the probability of outcome $`x`$, so $`-\log p(x)`$ is its surprise;
- $`\mathbb{E}[\cdot]`$ is the expectation, the probability-weighted average over the outcomes of $`X`$;
- an outcome with $`p(x) = 0`$ contributes nothing, by the convention $`0 \log 0 = 0`$ (the limit of $`p \log p`$ as $`p \to 0`$).
The base of the log sets the unit: base 2 gives bits, base $`e`$ gives nats, and $`1 \text{ nat} = 1/\ln 2 \approx 1.443`$ bits. Training code uses natural logs, so a loss printed during training is in nats.
Three equivalent readings:
1. Expected surprise: average uncertainty about the outcome before you see it.
2. Coding interpretation (Shannon's source coding theorem): $`H(X)`$ is the minimum average number of bits per symbol any lossless code can achieve. The optimal code assigns $`\approx -\log_2 p(x)`$ bits to outcome $`x`$ (frequent outcomes get short codes). No compressor can beat entropy on average; this is the "fundamental limit". With a whole number of bits per codeword, the best prefix code (Huffman's) has an average length $`L`$ with $`H \le L < H + 1`$; arithmetic coding, which codes a whole sequence at once and so spends fractional bits per symbol, gets arbitrarily close to $`H`$.
3. Spread of the distribution: uniform over $`K`$ outcomes maximises entropy at $`\log K`$; a deterministic outcome has entropy 0. A fair coin: 1 bit. A $`p = 0.9`$ coin: $`\approx 0.47`$ bits.
**Worked example: tomorrow's weather.** Sun has probability 0.5, cloud 0.25, rain 0.25.
- Surprises in bits: $`-\log_2 0.5 = 1`$ for sun, $`-\log_2 0.25 = 2`$ for cloud and for rain.
- Entropy: $`H = 0.5 \times 1 + 0.25 \times 2 + 0.25 \times 2 = 1.5`$ bits.
- A code that meets it: sun = `0`, cloud = `10`, rain = `11`. No codeword is the start of another (a prefix code), so the stream `0100110` decodes one way only: sun, cloud, sun, rain, sun. Its average length is $`0.5 \times 1 + 0.25 \times 2 + 0.25 \times 2 = 1.5`$ bits, exactly $`H`$, because every probability is a power of one half, so every $`-\log_2 p(x)`$ is a whole number.
- The biased coin: $`H = -0.9 \log_2 0.9 - 0.1 \log_2 0.1 = 0.9 \times 0.152 + 0.1 \times 3.322 = 0.137 + 0.332 = 0.469`$ bits. The rare outcome is very surprising (3.32 bits) but rare, so the average is low.
ML sightings: entropy of a policy (exploration bonus in RL, entropy regularisation), entropy of softmax outputs (confidence / calibration diagnostics), max-entropy principle (softmax and Gaussians are max-ent distributions under constraints: the Gaussian has the largest entropy of any distribution on the real line with a given mean and variance, and the softmax, or Boltzmann, distribution the largest entropy for a given expected score), decision-tree split criteria (information gain = entropy reduction).
## Cross-entropy
$$
H(p, q) = \mathbb{E}_{x \sim p}[-\log q(x)] = -\sum_x p(x) \log q(x).
$$
where
- $`p`$ is the true (data) distribution, the one outcomes are actually drawn from;
- $`q`$ is the predicted (model) distribution, the one the code or the loss is built from;
- $`\mathbb{E}_{x \sim p}`$ averages over outcomes drawn from $`p`$, and $`-\log q(x)`$ is the surprise the model assigns to what actually happened.
Coding reading: the average message length when the data comes from $`p`$ but you built your code for $`q`$. Always $`\ge H(p)`$, with equality iff $`q = p`$. This is exactly the training objective of classifiers and language models: $`p`$ is the empirical data distribution (one-hot labels, or next-token targets), $`q`$ is the model. Minimising CE = building the code that best fits reality = maximum likelihood (per-example CE $`= -\log q(y \mid x)`$ is precisely the NLL, the negative log-likelihood).
Over a training set the expectation becomes an average:
$$
\mathcal{L}(\theta) = -\frac{1}{n} \sum_{i=1}^{n} \log q_\theta(y_i \mid x_i)
$$
where
- $`\theta`$ are the model parameters and $`n`$ the number of examples (or of predicted tokens);
- $`(x_i, y_i)`$ is the $`i`$-th input and its label, or a context and its next token;
- $`q_\theta(y_i \mid x_i)`$ is the probability the model gives the correct answer. Only that probability enters: with a one-hot target, every other term of $`-\sum_x p(x) \log q(x)`$ is multiplied by 0.
**Worked example, continued.** A forecaster predicts $`q`$ = (sun 0.25, cloud 0.5, rain 0.25), mixing up sun and cloud. The code built for $`q`$ is cloud = `0`, sun = `10`, rain = `11`. The weather still follows $`p`$, so the average length is $`H(p, q) = 0.5 \times 2 + 0.25 \times 1 + 0.25 \times 2 = 1.75`$ bits, 0.25 bits worse than the 1.5 bits of the code built for the truth.
**A classifier in nats.** If the model gives the correct class probability 0.7, that example's loss is $`-\ln 0.7 = 0.357`$ nats (0.515 bits); at 0.99 it is 0.010 nats; at 0.01 it is 4.61 nats. The loss grows without bound as the correct-class probability goes to 0, which is why a few confidently wrong predictions can dominate a batch.
## KL divergence
$$
D_{KL}(p \| q) = \sum_x p(x) \log \frac{p(x)}{q(x)} = H(p, q) - H(p).
$$
where
- $`p`$ and $`q`$ are the true and the predicted distribution, as for cross-entropy, and the sum runs over outcomes with $`p(x) > 0`$;
- $`p(x)/q(x)`$ is the likelihood ratio: how much more probable the truth makes $`x`$ than the model does;
- if $`q(x) = 0`$ for some $`x`$ with $`p(x) > 0`$, the divergence is infinite.
The overhead: extra bits paid for using code $`q`$ when the truth is $`p`$. Properties: $`\ge 0`$ (Gibbs' inequality), $`= 0`$ iff $`p = q`$, not symmetric, no triangle inequality; it is not a metric.
Why CE loss = entropy + KL matters: $`H(p, q) = H(p) + D_{KL}(p \| q)`$, and $`H(p)`$ does not depend on the model. So minimising cross-entropy w.r.t. model parameters is exactly minimising $`D_{KL}(\text{data} \| \text{model})`$; the loss floor is the data's own entropy, which is irreducible. For a classifier the floor is the conditional entropy $`H(Y \mid X)`$ of the true labels given the inputs: 0 only when every input has exactly one correct label, and above 0 when labels are ambiguous or noisy (each one-hot target has entropy 0, but the population of targets for one input need not). For language it is the entropy of text, which is why LM loss never approaches 0.
**Worked example, continued.** For the weather, $`D_{KL}(p \| q) = 0.5 \log_2 \frac{0.5}{0.25} + 0.25 \log_2 \frac{0.25}{0.5} + 0.25 \log_2 \frac{0.25}{0.25} = 0.5 - 0.25 + 0 = 0.25`$ bits, exactly the gap between 1.75 and 1.5. The reverse direction also gives 0.25 bits here, but only because $`q`$ is $`p`$ with two outcomes swapped. In general the two differ: for a fair coin $`p`$ = (0.5, 0.5) and a model $`q`$ = (0.9, 0.1), $`D_{KL}(p \| q) = 0.737`$ bits but $`D_{KL}(q \| p) = 0.531`$ bits.
Forward vs reverse KL, the asymmetry that shapes generative modelling:
- Forward $`D_{KL}(p \| q)`$ (MLE direction): expectation under the data $`p`$. Penalises $`q(x) \approx 0`$ wherever $`p(x) > 0`$, so $`q`$ must cover all modes of $`p`$: mean-seeking / mode-covering, tends to over-spread. MLE-trained LMs inherit this: they put some mass on everything the data does.
- Reverse $`D_{KL}(q \| p)`$: expectation under the model $`q`$. Penalises $`q`$ putting mass where $`p`$ has none, but $`q`$ may ignore modes: mode-seeking, tends to collapse onto one mode. Used in variational inference (ELBO minimises reverse KL to the true posterior) and in RLHF-style KL penalties $`D_{KL}(\pi \| \pi_{\text{ref}})`$, where mode-seeking shows up as reduced output diversity.
Fitting a single Gaussian $`q`$ to a two-peaked $`p`$ shows the difference. The forward-KL fit is the Gaussian with $`p`$'s own mean and variance (moment matching): it sits between the peaks, spreads over both, and puts mass in the valley where $`p`$ has almost none. The reverse-KL fit is a narrow Gaussian on one peak that ignores the other; which peak it lands on depends on where the optimisation starts, because the reverse objective has a local minimum at each.
The variational-inference identity makes the reverse direction explicit:
$$
\log p(x) = \text{ELBO}(q) + D_{KL}\big(q(z) \,\|\, p(z \mid x)\big), \qquad \text{ELBO}(q) = \mathbb{E}_{z \sim q}\left[\log p(x, z) - \log q(z)\right]
$$
where
- $`x`$ is the observed data and $`z`$ the latent variable;
- $`q(z)`$ is the approximate posterior being fitted, and $`p(z \mid x)`$ the true posterior;
- $`\log p(x)`$ does not depend on $`q`$, so raising the ELBO (evidence lower bound) by exactly the amount the reverse KL falls is the same thing as minimising that reverse KL.
The RLHF objective, $`\max_\pi \; \mathbb{E}_{y \sim \pi}[r(y)] - \beta \, D_{KL}(\pi \| \pi_{\text{ref}})`$, uses the same direction: $`\pi`$ is the policy being trained, $`\pi_{\text{ref}}`$ the frozen starting model, $`r`$ the reward, and $`\beta > 0`$ sets how far the policy may move from the reference.
## Mutual information
Two definitions first. The **joint entropy** $`H(X, Y) = -\sum_{x,y} p(x, y) \log p(x, y)`$ is the entropy of the pair. The **conditional entropy** $`H(X \mid Y) = -\sum_{x,y} p(x, y) \log p(x \mid y) = H(X, Y) - H(Y)`$ is the uncertainty left in $`X`$ once $`Y`$ is known, averaged over $`Y`$ (the second equality is the chain rule of entropy).
$$
I(X; Y) = D_{KL}\big(p(x,y) \,\|\, p(x)p(y)\big) = H(X) - H(X \mid Y) = H(X) + H(Y) - H(X, Y).
$$
where
- $`p(x, y)`$ is the joint distribution and $`p(x)`$, $`p(y)`$ its marginals, so $`p(x)p(y)`$ is what the joint would be if the variables were independent;
- $`H(X)`$, $`H(Y)`$ are the entropies of each variable alone, $`H(X, Y)`$ the joint entropy and $`H(X \mid Y)`$ the conditional entropy defined above.
How many bits knowing $`Y`$ saves you about $`X`$. Zero iff independent; symmetric; invariant to invertible reparameterisation (unlike correlation, it captures nonlinear dependence). Sightings: feature selection, the information bottleneck view of representation learning, and contrastive objectives below.
**Worked example.** Two binary signals agree 80% of the time: $`p(0,0) = p(1,1) = 0.4`$ and $`p(0,1) = p(1,0) = 0.1`$.
- Each marginal is (0.5, 0.5), so $`H(X) = H(Y) = 1`$ bit.
- $`H(X, Y) = 2 \times 0.4 \times 1.322 + 2 \times 0.1 \times 3.322 = 1.058 + 0.664 = 1.722`$ bits.
- $`I(X; Y) = 1 + 1 - 1.722 = 0.278`$ bits, and $`H(X \mid Y) = 1.722 - 1 = 0.722`$ bits: knowing $`Y`$ cuts the uncertainty about $`X`$ from 1 bit to 0.722.
Correlation can miss dependence that mutual information sees: if $`X`$ is $`-1`$, 0 or 1 with equal probability and $`Y = X^2`$, the correlation of $`X`$ and $`Y`$ is 0, yet $`Y`$ is a function of $`X`$ and $`I(X; Y) = H(Y) = 0.918`$ bits.
## Perplexity and bits-per-byte (LM eval)
- Perplexity: $`\text{PPL} = \exp(\text{CE per token in nats}) = 2^{\text{CE in bits}}`$. Interpretation: the model's effective branching factor, "as confused as a uniform choice among PPL options per token". PPL 1 is perfect prediction; lower is better. Caveat: perplexity is tokenizer-dependent (per-token CE changes if tokens change), so cross-model comparisons need the same tokenizer or a tokenizer-free unit, which is exactly what BPB is for.
- Bits-per-byte: total compressed size per byte of raw text, $`\text{BPB} = \frac{n_{\text{tokens}} \cdot \text{CE}_{\text{nats/token}}}{n_{\text{bytes}} \cdot \ln 2}`$. Tokenizer-independent, so it is the standard unit in pretraining papers and scaling-law comparisons (also the literal "LM as compressor" number: an arithmetic coder driven by the LM would achieve about this compression). Related: bits-per-character/bpc on character benchmarks like enwik8, the first 100,000,000 bytes of a March 2006 English Wikipedia dump ([Large Text Compression Benchmark](https://mattmahoney.net/dc/textdata.html)).
where
- $`\text{CE per token}`$ is the average of $`-\log q(\text{next token} \mid \text{context})`$ over the evaluated tokens, in nats (natural log) or bits (base 2);
- $`n_{\text{tokens}}`$ is how many tokens the tokenizer cut the text into, and $`n_{\text{bytes}}`$ the length of the same text in UTF-8 bytes;
- $`n_{\text{tokens}} \cdot \text{CE}_{\text{nats/token}}`$ is the total surprise of the whole text in nats, and dividing by $`\ln 2`$ converts it to bits.
Why a unit per byte works: the total surprise of a text is the length of its compressed file, whatever the tokenizer, while dividing by the number of tokens rewards a tokenizer that makes fewer, harder tokens.
**Worked example (illustrative numbers).** One 4,000-byte text. Tokenizer A cuts it into 1,000 tokens and the model scores 2.0 nats per token; tokenizer B cuts it into 1,250 tokens at 1.6 nats per token. Both total $`1{,}000 \times 2.0 = 1{,}250 \times 1.6 = 2{,}000`$ nats.
- Perplexity: A gives $`e^{2.0} = 7.39`$, B gives $`e^{1.6} = 4.95`$, so B looks much better.
- Bits-per-byte: both give $`\frac{2{,}000}{4{,}000 \times \ln 2} = 0.721`$. As compressors the two setups are identical.
A real ratio: the Pile paper, which prefers BPB "due to its invariance to different tokenization schemes", measures 0.29335 GPT-2 tokens per byte across the Pile, so a GPT-2-tokenized model at 2.0 nats per token there scores $`0.29335 \times 2.0 / \ln 2 = 0.846`$ BPB ([Gao et al., 2020](https://arxiv.org/abs/2101.00027)).
The compressor reading is literal: an LM driving an arithmetic coder is a general lossless compressor, and Chinchilla 70B, trained mainly on text, compresses ImageNet image patches to 43.4% of their raw size and LibriSpeech audio to 16.4%, against 58.5% for PNG and 30.3% for FLAC ([Delétang et al., 2023, "Language Modeling Is Compression"](https://arxiv.org/abs/2309.10668)).
## InfoNCE connection
Contrastive learning's InfoNCE loss (CPC, contrastive predictive coding; SimCLR; CLIP): given a positive pair $`(x, y^+)`$ and $`N-1`$ negatives, score with a similarity $`f`$ and apply softmax-CE to pick the positive:
$$
L_{\text{NCE}} = -\mathbb{E}\left[ \log \frac{e^{f(x, y^+)}}{\sum_{j=1}^{N} e^{f(x, y_j)}} \right].
$$
where
- $`x`$ is an anchor (an image, a context window) and $`y^+`$ its positive, the matching item (its caption, a future frame);
- $`y_1, \dots, y_N`$ are the $`N`$ candidates, the positive plus $`N - 1`$ negatives, usually the other items in the batch;
- $`f(x, y)`$ is a learned similarity score, for example a scaled cosine similarity of two embeddings;
- the expectation is over anchors and the sampled candidate sets.
It is literally an $`N`$-way classification CE, and it lower-bounds mutual information: $`I(X; Y) \ge \log N - L_{\text{NCE}}`$ ([van den Oord et al., 2018](https://arxiv.org/abs/1807.03748)). So minimising InfoNCE maximises a lower bound on the MI between the two views/modalities; the $`\log N`$ term explains why large batch sizes (many negatives) help: the bound saturates at $`\log N`$, so more negatives raise the ceiling. CLIP's symmetric loss is InfoNCE both directions (image-to-text and text-to-image) with a learned temperature.
**Worked example.** $`N = 4`$ candidates; the positive scores 2.0 and the three negatives 0.0. The softmax probability of the positive is $`e^{2} / (e^{2} + 3) = 7.389 / 10.389 = 0.711`$, so $`L_{\text{NCE}} = -\ln 0.711 = 0.341`$ nats and the bound gives $`I \ge \ln 4 - 0.341 = 1.386 - 0.341 = 1.046`$ nats (1.51 bits). Even a perfect scorer, with loss 0, certifies at most $`\ln 4 = 1.386`$ nats (2 bits): with 4 candidates, the bound cannot report more.
CLIP trains with a minibatch of 32,768 image-text pairs, so each direction is a 32,768-way classification and the ceiling is $`\ln 32{,}768 = 10.4`$ nats (15 bits). Its temperature, which divides the similarities before the softmax, is learned as a log-parameterised scalar, initialised to 0.07 and clipped so the logits are never scaled by more than 100 ([Radford et al., 2021](https://arxiv.org/abs/2103.00020)).
## Which quantity to use when
- **Training a predictor of discrete outcomes** (classes, tokens): minimise cross-entropy. It is the negative log-likelihood, and the only part of it you can change is the KL to the data.
- **Reporting an LM's quality**: perplexity only within one tokenizer and one evaluation set; bits-per-byte (or bits per character) across tokenizers.
- **Keeping a fine-tuned model close to its starting point**: a KL penalty to the reference, in the reverse direction $`D_{KL}(\pi \| \pi_{\text{ref}})`$; expect it to trade some output diversity for staying on the reference's high-probability outputs.
- **Fitting an approximate distribution**: forward KL (maximum likelihood) when missing a mode is the worse failure; reverse KL (variational inference) when putting mass where the target has none is the worse failure, or when the target can be evaluated only up to a constant and only the approximation can be sampled (the variational-inference case).
- **Measuring dependence between variables**: mutual information when it may be nonlinear; correlation only for linear relationships. For high-dimensional variables, estimate it through a bound such as InfoNCE and remember that bound cannot exceed $`\log N`$.
- **Measuring how confident a prediction is**: the entropy of the predicted distribution, 0 for a certain prediction and $`\log K`$ for a uniform one over $`K`$ outcomes.
## Common mistakes and misconceptions
- **Mixing units.** Frameworks report losses in nats; papers often quote bits. A loss of 2.0 nats is 2.885 bits, and a perplexity computed as $`2^{\text{loss}}`$ from a loss in nats is wrong.
- **Comparing perplexities across tokenizers.** A tokenizer that makes fewer, longer tokens raises the per-token loss without changing how well the text is compressed. Compare in bits-per-byte.
- **Treating KL as a distance.** It is not symmetric and has no triangle inequality; which direction you minimise changes the answer.
- **Expecting the loss to reach 0.** The floor is the data's own (conditional) entropy; for text, and for noisy labels, that is above 0.
- **Assigning probability exactly 0.** A model that gives 0 to something that happens has infinite cross-entropy and infinite forward KL; this is why implementations compute log-probabilities with a log-softmax rather than taking the log of a softmax output that can underflow to 0.
- **Reading the InfoNCE bound as the mutual information.** It is a lower bound capped at $`\log N`$; a large true MI with a small batch reads as at most $`\log N`$.
- **Reading zero correlation as independence.** Only zero mutual information means independence.
## Cheat sheet
<table header-row="true">
<tr>
<td>Quantity</td>
<td>Formula</td>
<td>One-liner</td>
</tr>
<tr>
<td>Entropy</td>
<td>$`-\sum p \log p`$</td>
<td>Expected surprise; optimal code length</td>
</tr>
<tr>
<td>Cross-entropy</td>
<td>$`-\sum p \log q`$</td>
<td>Code built for $`q`$, data from $`p`$; the training loss</td>
</tr>
<tr>
<td>KL</td>
<td>$`\sum p \log(p/q)`$</td>
<td>Extra bits; $`H(p,q) - H(p)`$; asymmetric</td>
</tr>
<tr>
<td>Mutual info</td>
<td>$`H(X) - H(X \mid Y)`$</td>
<td>Bits shared between variables</td>
</tr>
<tr>
<td>Perplexity</td>
<td>$`e^{\text{CE}}`$</td>
<td>Effective branching factor; tokenizer-dependent</td>
</tr>
<tr>
<td>BPB</td>
<td>CE per byte in bits</td>
<td>Tokenizer-free LM quality; compression rate</td>
</tr>
<tr>
<td>InfoNCE</td>
<td>$`N`$-way softmax CE over one positive</td>
<td>Lower-bounds MI: $`I \ge \log N - L`$; capped at $`\log N`$</td>
</tr>
</table>
## How it connects
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81cdb851c0835b25a538">Topic: math</mention-page>: the map of the mathematics behind ML; information theory is its measurement layer, and cross-entropy is the object it shares with probability and calculus.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d815f9a47d613409b5a0c"/>: where the cross-entropy loss comes from as a likelihood. Choosing a Bernoulli model for a binary label and taking the negative log-likelihood gives binary cross-entropy; a categorical model over classes gives softmax cross-entropy, the loss this page reads as a code length.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b"/>: the gradient of softmax cross-entropy with respect to the logits collapses to the predicted probabilities minus the one-hot target, $`p - y`$, which is why this loss trains so cleanly.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56"/>: the KL penalty to a reference policy in RLHF, the reverse-direction KL whose mode-seeking this page explains.
## Best resources
- [Visual Information Theory](https://colah.github.io/posts/2015-09-Visual-Information/) (\~40 min): Chris Olah; the best intuition-first walk through entropy, cross-entropy, KL, and mutual information via code lengths.
- [Information Theory, Inference, and Learning Algorithms](https://www.inference.org.uk/mackay/itila/) (book, \~1h 30m for ch. 1-2 and 8): MacKay, free PDF; the deep treatment, and those three chapters cover everything on this page.
- [Elements of Information Theory](https://www.wiley.com/en-us/Elements+of+Information+Theory%2C+2nd+Edition-p-9780471241959) (Cover and Thomas) (book, reference, \~2h for the chapters relevant here): the standard reference text.
- [Mathematics for Machine Learning](https://mml-book.github.io/) (book, \~20 min for the relevant fragments) has only fragments; for this topic Olah then MacKay is the route.
</content>
</page>