# Information theory for ML

⏱ 10 min read · +4h 30m resources

Updated 2026-08-24.

## Best resources

- [Visual Information Theory](https://colah.github.io/posts/2015-09-Visual-Information/) (~40 min): Chris Olah; the best intuition-first walk through entropy, cross-entropy, KL, and mutual information via code lengths.
- [Information Theory, Inference, and Learning Algorithms](https://www.inference.org.uk/mackay/itila/) (book, ~1h 30m for ch. 1-2 and 8): MacKay, free PDF; the deep treatment, and those three chapters cover everything below.
- Elements of Information Theory (Cover and Thomas) (book, reference, ~2h for the chapters relevant here): the standard reference text.
- [Mathematics for Machine Learning](https://mml-book.github.io/) (book, ~20 min for the relevant fragments) has only fragments; for this topic Olah then MacKay is the route.

## What is entropy? (flagged question)

Entropy is the expected surprise of a random variable. Define the surprise (information content) of an outcome with probability $p$ as $-\log p$: rare events are more informative, certain events ($p = 1$) carry none, and independent surprises add ($-\log p_1 p_2 = -\log p_1 - \log p_2$, the property that forces the log). Then

$$
H(X) = \mathbb{E}[-\log p(X)] = -\sum_x p(x) \log p(x).
$$

In base 2 the unit is bits, in base $e$ nats ($1 \text{ nat} = 1/\ln 2 \approx 1.443$ bits).

Three equivalent readings:

1. Expected surprise: average uncertainty about the outcome before you see it.
2. Coding interpretation (Shannon's source coding theorem): $H(X)$ is the minimum average number of bits per symbol any lossless code can achieve. The optimal code assigns $\approx -\log_2 p(x)$ bits to outcome $x$ (frequent outcomes get short codes). No compressor can beat entropy on average; this is the "fundamental limit".
3. Spread of the distribution: uniform over $K$ outcomes maximises entropy at $\log K$; a deterministic outcome has entropy 0. A fair coin: 1 bit. A $p = 0.9$ coin: $\approx 0.47$ bits.

ML sightings: entropy of a policy (exploration bonus in RL, entropy regularisation), entropy of softmax outputs (confidence / calibration diagnostics), max-entropy principle (softmax and Gaussians are max-ent distributions under constraints), decision-tree split criteria (information gain = entropy reduction).

## Cross-entropy

$$
H(p, q) = \mathbb{E}_{x \sim p}[-\log q(x)] = -\sum_x p(x) \log q(x).
$$

Coding reading: the average message length when the data comes from $p$ but you built your code for $q$. Always $\ge H(p)$, with equality iff $q = p$. This is exactly the training objective of classifiers and language models: $p$ is the empirical data distribution (one-hot labels, or next-token targets), $q$ is the model. Minimising CE = building the code that best fits reality = maximum likelihood (per-example CE $= -\log q(y \mid x)$ is precisely the NLL).

## KL divergence

$$
D_{KL}(p \| q) = \sum_x p(x) \log \frac{p(x)}{q(x)} = H(p, q) - H(p).
$$

The overhead: extra bits paid for using code $q$ when the truth is $p$. Properties: $\ge 0$ (Gibbs' inequality), $= 0$ iff $p = q$, not symmetric, no triangle inequality; it is not a metric.

Why CE loss = entropy + KL matters: $H(p, q) = H(p) + D_{KL}(p \| q)$, and $H(p)$ does not depend on the model. So minimising cross-entropy w.r.t. model parameters is exactly minimising $D_{KL}(\text{data} \| \text{model})$; the loss floor is the data's own entropy (irreducible; for one-hot labels it is 0, for language it is the entropy of text, which is why LM loss never approaches 0).

Forward vs reverse KL, the asymmetry that shapes generative modelling:

- Forward $D_{KL}(p \| q)$ (MLE direction): expectation under the data $p$. Penalises $q(x) \approx 0$ wherever $p(x) > 0$, so $q$ must cover all modes of $p$: mean-seeking / mode-covering, tends to over-spread. MLE-trained LMs inherit this: they put some mass on everything the data does.
- Reverse $D_{KL}(q \| p)$: expectation under the model $q$. Penalises $q$ putting mass where $p$ has none, but $q$ may ignore modes: mode-seeking, tends to collapse onto one mode. Used in variational inference (ELBO minimises reverse KL to the true posterior) and in RLHF-style KL penalties $D_{KL}(\pi \| \pi_{\text{ref}})$, where mode-seeking shows up as reduced output diversity.

## Mutual information

$$
I(X; Y) = D_{KL}\big(p(x,y) \,\|\, p(x)p(y)\big) = H(X) - H(X \mid Y) = H(X) + H(Y) - H(X, Y).
$$

How many bits knowing $Y$ saves you about $X$. Zero iff independent; symmetric; invariant to invertible reparameterisation (unlike correlation, it captures nonlinear dependence). Sightings: feature selection, the information bottleneck view of representation learning, and contrastive objectives below.

## Perplexity and bits-per-byte (LM eval)

- Perplexity: $\text{PPL} = \exp(\text{CE per token in nats}) = 2^{\text{CE in bits}}$. Interpretation: the model's effective branching factor, "as confused as a uniform choice among PPL options per token". PPL 1 is perfect prediction; lower is better. Caveat: perplexity is tokenizer-dependent (per-token CE changes if tokens change), so cross-model comparisons need the same tokenizer or a tokenizer-free unit, which is exactly what BPB is for.
- Bits-per-byte: total compressed size per byte of raw text, $\text{BPB} = \frac{n_{\text{tokens}} \cdot \text{CE}_{\text{nats/token}}}{n_{\text{bytes}} \cdot \ln 2}$. Tokenizer-independent, so it is the standard unit in pretraining papers and scaling-law comparisons (also the literal "LM as compressor" number: an arithmetic coder driven by the LM would achieve about this compression). Related: bits-per-character/bpc on character benchmarks like enwik8.

## InfoNCE connection

Contrastive learning's InfoNCE loss (CPC, SimCLR, CLIP): given a positive pair $(x, y^+)$ and $N-1$ negatives, score with a similarity $f$ and apply softmax-CE to pick the positive:

$$
L_{\text{NCE}} = -\mathbb{E}\left[ \log \frac{e^{f(x, y^+)}}{\sum_{j=1}^{N} e^{f(x, y_j)}} \right].
$$

It is literally an $N$-way classification CE, and it lower-bounds mutual information: $I(X; Y) \ge \log N - L_{\text{NCE}}$. So minimising InfoNCE maximises a lower bound on the MI between the two views/modalities; the $\log N$ term explains why large batch sizes (many negatives) help: the bound saturates at $\log N$, so more negatives raise the ceiling. CLIP's symmetric loss is InfoNCE both directions (image-to-text and text-to-image) with a learned temperature.

## Cheat sheet

| Quantity | Formula | One-liner |
|---|---|---|
| Entropy | $-\sum p \log p$ | Expected surprise; optimal code length |
| Cross-entropy | $-\sum p \log q$ | Code built for $q$, data from $p$; the training loss |
| KL | $\sum p \log(p/q)$ | Extra bits; $H(p,q) - H(p)$; asymmetric |
| Mutual info | $H(X) - H(X \mid Y)$ | Bits shared between variables |
| Perplexity | $e^{\text{CE}}$ | Effective branching factor; tokenizer-dependent |
| BPB | CE per byte in bits | Tokenizer-free LM quality; compression rate |
