"""Build src/notation/equations.json: the Notation decoder's equations.

Each entry: the equation as printed in the paper (LaTeX), its source (arXiv id, version, equation number,
PDF page), every symbol (name, meaning, shape with concrete dimensions, where the paper defines it), a
read-aloud sentence, a worked example with tiny numbers computed here with numpy, and the notational traps.
The worked numbers are recomputed independently by recompute.py.

Run: python3 build_equations.py   (numpy only; writes equations.json next to this file)
Then: python3 render_tab.py        (writes ../parts/31_tab_notation.html)
"""
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def f(x, nd=3):
    """Format a number for display: integers stay integers, else nd decimals."""
    x = float(x)
    if abs(x - round(x)) < 1e-12 and abs(x) < 1e6:
        return str(int(round(x)))
    s = f"{x:.{nd}f}"
    return "0" if s in ("-0", "-0.0", "-0.00", "-0.000", "-0.0000") else s


def bmat(M, nd=3):
    M = np.atleast_2d(M)
    rows = [" & ".join(f(v, nd) for v in r) for r in M]
    return r"\begin{bmatrix}" + r" \\ ".join(rows) + r"\end{bmatrix}"


def fill(s, d):
    """Replace <<key>> in s with d[key] (already a string)."""
    for k, v in d.items():
        s = s.replace("<<" + k + ">>", v)
    assert "<<" not in s, s
    return s


def arx(aid, ver, page):
    return {
        "abs": f"https://arxiv.org/abs/{aid}{ver}",
        "pdf": f"https://arxiv.org/pdf/{aid}{ver}#page={page}",
    }


def softmax(z, axis=-1):
    z = np.asarray(z, float)
    e = np.exp(z - z.max(axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)


EQ = []

# ---------------------------------------------------------------- attention
Q = np.array([[1, 0, 1, 0], [0, 2, 0, 1], [1, 1, 1, 1]], float)
K = np.array([[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]], float)
V = np.array([[1, 0], [0, 1], [1, 1]], float)
S = Q @ K.T
Ss = S / math.sqrt(4)
W = softmax(Ss)
O = W @ V
Wu = softmax(S)
Ou = Wu @ V
att_checks = {"QKT": S.tolist(), "scaled": Ss.tolist(), "weights": W.tolist(), "out": O.tolist(),
              "weights_unscaled": Wu.tolist(), "out_unscaled": Ou.tolist()}
d = {"Q": bmat(Q), "K": bmat(K), "V": bmat(V), "KT": bmat(K.T), "S": bmat(S), "Ss": bmat(Ss),
     "W": bmat(W), "O": bmat(O)}
EQ.append({
    "id": "attn", "group": "Architecture", "chip": "Scaled dot-product attention",
    "title": "Scaled dot-product attention",
    "paper": {"cite": "Vaswani et al. 2017, Attention Is All You Need", "arxiv": "1706.03762", "ver": "v7",
              "eq": "Eq. (1)", "page": 4, "section": "§3.2.1", **arx("1706.03762", "v7", 4)},
    "latex": r"\mathrm{Attention}(Q,K,V)=\mathrm{softmax}\left(\frac{QK^{T}}{\sqrt{d_{k}}}\right)V",
    "transcription": "As printed, with the paper's capital T for the transpose. The paper prints the softmax argument in plain round brackets.",
    "symbols": [
        {"id": "Q", "tex": "Q", "match": ["Q"], "name": "queries",
         "meaning": "One row per position that is asking a question: what am I looking for?",
         "shape": r"\(n \times d_k\): here \(3 \times 4\) (3 tokens, \(d_k = 4\)); in the paper's base model \(d_k = 64\).",
         "where": "§3.2.1, p. 4: queries \"packed together into a matrix Q\"."},
        {"id": "K", "tex": "K", "match": ["K"], "name": "keys",
         "meaning": "One row per position that can be looked at: what do I contain, as a label to match against?",
         "shape": r"\(m \times d_k\): here \(3 \times 4\). Self-attention has \(m = n\); cross-attention can differ.",
         "where": "§3.2.1, p. 4."},
        {"id": "T", "tex": "{}^{T}", "match": ["T"], "name": "transpose",
         "meaning": r"Swap rows and columns, so \(QK^T\) is every query dotted with every key. Other papers write \(K^\top\) or \(K'\): same thing.",
         "shape": r"\(K^T\) is \(d_k \times m\): here \(4 \times 3\).",
         "where": "Not defined in the paper: standard notation."},
        {"id": "V", "tex": "V", "match": ["V"], "name": "values",
         "meaning": "One row per position: what that position hands over if you attend to it.",
         "shape": r"\(m \times d_v\): here \(3 \times 2\); paper base \(d_v = 64\).",
         "where": "§3.2.1, p. 4."},
        {"id": "dk", "tex": "d_k", "match": ["dk"], "name": "key dimension",
         "meaning": r"Length of each query and key vector. Dividing by \(\sqrt{d_k}\) keeps the dot products from growing with \(d_k\) (footnote 4: if the components are independent with mean 0 and variance 1, \(q \cdot k\) has variance \(d_k\)).",
         "shape": r"A number: here 4, so \(\sqrt{d_k} = 2\); paper base 64, so 8.",
         "where": "§3.2.1 and footnote 4, p. 4; values in §3.2.2, p. 5."},
        {"id": "sm", "tex": r"\mathrm{softmax}", "match": ["softmax"], "name": "softmax, row by row",
         "meaning": r"Turns each row of scores into weights that are positive and sum to 1: \(\mathrm{softmax}(z)_j = e^{z_j} / \sum_l e^{z_l}\). Applied to each row separately (one query at a time); the paper says so in words (\"apply a softmax function to obtain the weights on the values\").",
         "shape": r"\(n \times m\) in, \(n \times m\) out: here \(3 \times 3\).",
         "where": "§3.2.1, p. 4 (in words; the formula itself is not printed)."},
        {"id": "att", "tex": r"\mathrm{Attention}", "match": ["Attention"], "name": "the output",
         "meaning": "For each query, a weighted average of the value rows.",
         "shape": r"\(n \times d_v\): here \(3 \times 2\).",
         "where": "Eq. (1), p. 4."},
    ],
    "aloud": "Attention of Q, K, V equals: take every query dotted with every key, divide by the square root of the key length, turn each row into weights with a softmax, and use those weights to average the rows of V.",
    "steps_note": "Real tiny matrices: 3 tokens, dₖ = 4, dᵥ = 2. Step through them in the animation below; the numbers are recomputed in recompute.py.",
    "steps": [
        {"tex": fill(r"Q=<<Q>>,\quad K=<<K>>,\quad V=<<V>>", d), "say": "The inputs: three queries, three keys, three values."},
        {"tex": fill(r"QK^{T}=<<Q>><<KT>>\quad =<<S>>", d), "say": "Each cell is one query dotted with one key: row 1, column 1 is 1·1 + 0·0 + 1·1 + 0·0 = 2."},
        {"tex": fill(r"\frac{QK^{T}}{\sqrt{4}}=<<Ss>>", d), "say": "Divide every score by √d_k = 2."},
        {"tex": fill(r"\mathrm{softmax}(\cdot)=<<W>>", d), "say": "Softmax each row: every row now sums to 1. Row 3 had equal scores, so its weights are equal."},
        {"tex": fill(r"<<W>><<V>>\quad =<<O>>", d), "say": "Each output row is a weighted average of V's rows; shapes (3×3)(3×2) give 3×2."},
    ],
    "checks": att_checks,
    "traps": [
        r"The softmax runs along each row (over keys), never over the whole matrix and never down a column. In code: <code>softmax(scores, dim=-1)</code>.",
        r"Rows are tokens. ML papers usually stack examples or positions as rows (\(n \times d\)), so a layer is \(XW\), not \(Wx\). Check which way round a paper writes it before multiplying.",
        r"\(\sqrt{d_k}\) is the square root of the key length, not of the sequence length. Without it, scores grow with \(d_k\) and the softmax saturates (Vaswani et al. footnote 4).",
        r"The decoder's mask is not in Eq. (1): §3.2.3 says it is applied by setting illegal positions to \(-\infty\) before the softmax.",
    ],
    "links": [["Attention Is All You Need (paper page, with a live toy Transformer)", "n:3c65c17b0d0d81999af7f16f8ed8ee9e"],
              ["LLM Architecture Gallery: what changed in attention since 2017", "n:3c65c17b0d0d81be8a07f2562fa2030a"]],
    "anim": True,
    "note_html": "A smaller case is worked in the {{Reading tab, section \"How to read an equation in a paper\"|#t-read}}: one query against the tiny model's three keys, d<sub>k</sub> = 2, scores (2, 1, 0), weights (0.576, 0.284, 0.140). This one adds a second and third query so the whole matrix form, and every shape, shows.",
})

# ---------------------------------------------------------------- multi-head attention
X = np.array([[1, 0, 2, 0], [0, 1, 0, 2]], float)       # 2 tokens, d_model = 4
I4 = np.eye(4)
W1 = I4[:, :2]; W2 = I4[:, 2:]                          # head 1 sees dims 1-2, head 2 sees dims 3-4
WO = np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], float) * 0.5 + np.array(
    [[0, 0, 0.5, 0], [0, 0, 0, 0.5], [0.5, 0, 0, 0], [0, 0.5, 0, 0]])
def attn(q, k, v):
    return softmax(q @ k.T / math.sqrt(q.shape[1])) @ v
H1 = attn(X @ W1, X @ W1, X @ W1)
H2 = attn(X @ W2, X @ W2, X @ W2)
C = np.hstack([H1, H2])
MH = C @ WO
d = {"X": bmat(X), "W1": bmat(W1), "W2": bmat(W2), "XW1": bmat(X @ W1), "XW2": bmat(X @ W2),
     "H1": bmat(H1), "H2": bmat(H2), "C": bmat(C), "WO": bmat(WO), "MH": bmat(MH)}
EQ.append({
    "id": "mha", "group": "Architecture", "chip": "Multi-head attention",
    "title": "Multi-head attention",
    "paper": {"cite": "Vaswani et al. 2017, Attention Is All You Need", "arxiv": "1706.03762", "ver": "v7",
              "eq": "unnumbered display", "page": 5, "section": "§3.2.2", **arx("1706.03762", "v7", 5)},
    "latex": r"\begin{aligned}\mathrm{MultiHead}(Q,K,V)&=\mathrm{Concat}(\mathrm{head}_{1},\ldots,\mathrm{head}_{h})W^{O}\\ \text{where}\ \mathrm{head}_{i}&=\mathrm{Attention}(QW_{i}^{Q},KW_{i}^{K},VW_{i}^{V})\end{aligned}",
    "transcription": "As printed in §3.2.2 (the paper sets it as two centred lines; aligned here).",
    "symbols": [
        {"id": "WQ", "tex": "W_i^Q", "match": ["WiQ"], "name": "query projection of head i",
         "meaning": r"A learned matrix that maps each token's \(d_{\text{model}}\)-vector to that head's query. The superscript \(Q\) is a label, not a power.",
         "shape": r"\(d_{\text{model}} \times d_k\): here \(4 \times 2\); paper \(512 \times 64\).",
         "where": "§3.2.2, p. 5: \"the projections are parameter matrices\"."},
        {"id": "WK", "tex": "W_i^K", "match": ["WiK"], "name": "key projection of head i",
         "meaning": "Same idea for keys.", "shape": r"\(d_{\text{model}} \times d_k\): here \(4 \times 2\).", "where": "§3.2.2, p. 5."},
        {"id": "WV", "tex": "W_i^V", "match": ["WiV"], "name": "value projection of head i",
         "meaning": "Same idea for values.", "shape": r"\(d_{\text{model}} \times d_v\): here \(4 \times 2\).", "where": "§3.2.2, p. 5."},
        {"id": "WO", "tex": "W^O", "match": ["WO"], "name": "output projection",
         "meaning": "Mixes the concatenated heads back into one vector per token.",
         "shape": r"\(h d_v \times d_{\text{model}}\): here \(4 \times 4\); paper \(512 \times 512\).", "where": "§3.2.2, p. 5."},
        {"id": "head", "tex": r"\mathrm{head}_i", "match": ["headi", "head1"], "name": "head i",
         "meaning": "One run of scaled dot-product attention (Eq. 1) on projected inputs.",
         "shape": r"\(n \times d_v\): here \(2 \times 2\).", "where": "§3.2.2, p. 5."},
        {"id": "h", "tex": "h", "match": ["h"], "name": "number of heads",
         "meaning": r"How many heads run side by side. The paper uses \(h = 8\) and \(d_k = d_v = d_{\text{model}}/h = 64\).",
         "shape": "A number: here 2.", "where": "§3.2.2, p. 5."},
        {"id": "cat", "tex": r"\mathrm{Concat}", "match": ["Concat"], "name": "concatenate",
         "meaning": "Place the heads' outputs side by side, column-wise, for each token.",
         "shape": r"\(h\) blocks of \(n \times d_v\) become \(n \times h d_v\): here \(2 \times 4\).", "where": "§3.2.2, p. 5."},
        {"id": "Q", "tex": "Q,K,V", "match": ["Q", "K", "V"], "name": "the inputs",
         "meaning": r"In self-attention all three are the same matrix \(X\) of token vectors (§3.2.3).",
         "shape": r"\(n \times d_{\text{model}}\): here \(2 \times 4\).", "where": "§3.2.3, p. 5."},
    ],
    "aloud": "Multi-head attention runs h small attentions in parallel, each on its own learned projections of Q, K and V, glues their outputs side by side and mixes them with one more matrix W O.",
    "steps_note": "Two tokens, d_model = 4, h = 2 heads, d_k = d_v = 2. The projections are chosen so head 1 reads dimensions 1 and 2 and head 2 reads dimensions 3 and 4 (illustrative weights, real arithmetic).",
    "steps": [
        {"tex": fill(r"X=<<X>>,\quad W_1^{Q}=W_1^{K}=W_1^{V}=<<W1>>", d), "say": "Self-attention: Q = K = V = X. Head 1's projections keep the first two coordinates."},
        {"tex": fill(r"XW_1=<<XW1>>,\qquad XW_2=<<XW2>>", d), "say": "Each head sees a 2 × 2 slice: shape (2×4)(4×2) = 2×2."},
        {"tex": fill(r"\mathrm{head}_1=<<H1>>,\qquad \mathrm{head}_2=<<H2>>", d), "say": "Eq. (1) inside each head, with √d_k = √2."},
        {"tex": fill(r"\mathrm{Concat}=<<C>>", d), "say": "Side by side: 2 × (2+2) = 2 × 4."},
        {"tex": fill(r"W^{O}=<<WO>>\quad \mathrm{Concat}\,W^{O}=<<MH>>", d), "say": "W O mixes heads: each output column takes half of one head's column and half of the other's."},
    ],
    "checks": {"head1": H1.tolist(), "head2": H2.tolist(), "concat": C.tolist(), "out": MH.tolist()},
    "traps": [
        r"Superscripts \(Q, K, V, O\) on \(W\) are names, not powers; the subscript \(i\) is the head index. \(W_i^Q\) reads \"W, head i, for queries\".",
        r"\(h\) here is the number of heads; in the LayerNorm and many RNN papers \(h\) is a hidden state. Same letter, different object: always check the paper's own definition.",
        r"Splitting into heads costs no extra compute: with \(d_k = d_{\text{model}}/h\) the paper notes the total cost is similar to one full-width head (§3.2.2).",
    ],
    "links": [["Attention Is All You Need (paper page)", "n:3c65c17b0d0d81999af7f16f8ed8ee9e"],
              ["LLM Architecture Gallery: grouped-query and latent attention", "n:3c65c17b0d0d81be8a07f2562fa2030a"]],
})

# ---------------------------------------------------------------- layer norm
a = np.array([2.0, 4.0, 6.0, 8.0]); g = np.array([1.0, 0.5, 1.0, 2.0]); bb = np.array([0.0, 0.0, 1.0, 0.0])
mu = a.mean(); sig = math.sqrt(((a - mu) ** 2).mean()); z = (a - mu) / sig; hout = g * z + bb
sig_s = math.sqrt(((a - mu) ** 2).sum() / 3)
d = {"a": bmat(a[None, :]), "mu": f(mu), "sig": f(sig), "z": bmat(z[None, :], 2), "g": bmat(g[None, :]),
     "b": bmat(bb[None, :]), "h": bmat(hout[None, :]), "sigs": f(sig_s), "z1": f(z[0]), "zs1": f((a[0] - mu) / sig_s)}
EQ.append({
    "id": "ln", "group": "Architecture", "chip": "Layer normalisation",
    "title": "Layer normalisation",
    "paper": {"cite": "Ba, Kiros and Hinton 2016, Layer Normalization", "arxiv": "1607.06450", "ver": "v1",
              "eq": "Eq. (4)", "page": 3, "section": "§4 (μ and σ as in Eq. (3), p. 2)", **arx("1607.06450", "v1", 3)},
    "latex": r"\begin{gathered}\mathbf{h}^{t}=f\left[\frac{\mathbf{g}}{\sigma^{t}}\odot\left(\mathbf{a}^{t}-\mu^{t}\right)+\mathbf{b}\right]\\ \mu^{t}=\frac{1}{H}\sum_{i=1}^{H}a_{i}^{t}\qquad\sigma^{t}=\sqrt{\frac{1}{H}\sum_{i=1}^{H}\left(a_{i}^{t}-\mu^{t}\right)^{2}}\end{gathered}",
    "transcription": "As printed (the recurrent form, superscript t is the time step), with the paper's three side-by-side parts stacked here for width. Bold marks vectors.",
    "symbols": [
        {"id": "a", "tex": r"\mathbf{a}^t", "match": ["𝐚t"], "name": "summed inputs",
         "meaning": r"The vector being normalised: one layer's pre-activations for one example at time step \(t\). Bold means a vector; \(a_i^t\) (not bold, subscript \(i\)) is its \(i\)-th entry.",
         "shape": r"\(H\) numbers: here \(H = 4\).", "where": "§4, p. 3: \"a^t = W_hh h^(t-1) + W_xh x^t\"."},
        {"id": "ai", "tex": "a_i^t", "match": ["ait"], "name": "one entry of a",
         "meaning": "The i-th hidden unit's summed input.", "shape": "A number.", "where": "Eq. (3)-(4)."},
        {"id": "mu", "tex": r"\mu^t", "match": ["μt"], "name": "mean over the layer",
         "meaning": "Average of the H entries of this one example. Not a batch mean: that is batch normalisation, Eq. (2).",
         "shape": "A number per example (per time step).", "where": "Eq. (3), p. 2; Eq. (4), p. 3."},
        {"id": "sig", "tex": r"\sigma^t", "match": ["σt"], "name": "standard deviation over the layer",
         "meaning": r"Square root of the average squared distance from \(\mu^t\). Divides by \(H\), not \(H-1\): the population (biased) version.",
         "shape": "A number per example.", "where": "Eq. (3), p. 2."},
        {"id": "g", "tex": r"\mathbf{g}", "match": ["𝐠"], "name": "gain",
         "meaning": r"Learned per-unit scale (modern code calls it \(\gamma\) or weight).",
         "shape": r"\(H\) numbers: same dimension as \(\mathbf{h}^t\).", "where": "§4, p. 3: \"b and g are defined as the bias and gain parameters\"."},
        {"id": "b", "tex": r"\mathbf{b}", "match": ["𝐛"], "name": "bias",
         "meaning": r"Learned per-unit shift (modern code: \(\beta\) or bias).", "shape": r"\(H\) numbers.", "where": "§4, p. 3."},
        {"id": "odot", "tex": r"\odot", "match": ["⊙"], "name": "element-wise product",
         "meaning": "Multiply entry by entry (the Hadamard product), not a matrix product.",
         "shape": "Two vectors of length H give one of length H.", "where": "§4, p. 3: \"element-wise multiplication between two vectors\"."},
        {"id": "f", "tex": "f", "match": ["f"], "name": "nonlinearity",
         "meaning": "The activation function applied after normalising (the paper's RNN setting). In a Transformer's LayerNorm there is no f: take it as the identity.",
         "shape": "A function, applied entry by entry.", "where": "Eq. (1), p. 2."},
        {"id": "H", "tex": "H", "match": ["H"], "name": "number of hidden units",
         "meaning": "How many entries are averaged.", "shape": "A number: here 4.", "where": "Eq. (3), p. 2: \"H denotes the number of hidden units in a layer\"."},
        {"id": "h", "tex": r"\mathbf{h}^t", "match": ["𝐡t"], "name": "output",
         "meaning": "The normalised, rescaled, shifted vector.", "shape": r"\(H\) numbers.", "where": "Eq. (4), p. 3."},
    ],
    "aloud": "h at time t equals f of: g over sigma, times element by element the vector a minus its mean, plus b; where mu is the average of a's H entries and sigma the square root of their average squared deviation.",
    "steps_note": "One example, H = 4, f = identity (as in a Transformer). Gain and bias are illustrative.",
    "steps": [
        {"tex": fill(r"\mathbf{a}=<<a>>,\quad \mu=\tfrac14(2+4+6+8)=<<mu>>", d), "say": "The mean of this one example's four entries."},
        {"tex": fill(r"\sigma=\sqrt{\tfrac14\left((-3)^2+(-1)^2+1^2+3^2\right)}\quad =\sqrt{5}=<<sig>>", d), "say": "Divide by H = 4, not 3."},
        {"tex": fill(r"\frac{\mathbf{a}-\mu}{\sigma}=<<z>>", d), "say": "Now mean 0 and (population) standard deviation 1."},
        {"tex": fill(r"\mathbf{g}=<<g>>\quad \mathbf{b}=<<b>>\quad \mathbf{g}\odot\frac{\mathbf{a}-\mu}{\sigma}+\mathbf{b}\quad =<<h>>", d), "say": "Scale entry by entry, then shift."},
        {"tex": fill(r"\text{with } H-1:\ \sigma=\sqrt{20/3}=<<sigs>>\quad \text{first entry } <<zs1>> \text{ instead of } <<z1>>", d), "say": "The trap: dividing by H − 1 gives different outputs. PyTorch's LayerNorm uses the paper's 1/H (biased) version."},
    ],
    "checks": {"mu": mu, "sigma": sig, "z": z.tolist(), "h": hout.tolist(), "sigma_bessel": sig_s},
    "traps": [
        r"Bold \(\mathbf{a}\) is the vector; plain \(a_i\) is one entry; the superscript \(t\) is a time step, not a power. \(\sigma^t\) is \"sigma at time t\", not sigma to the t.",
        r"The paper's \(\sigma\) has no \(\epsilon\). Code adds one inside the square root: PyTorch's <code>LayerNorm</code> computes \((x - \mathrm{E}[x])/\sqrt{\mathrm{Var}[x] + \epsilon}\) with \(\epsilon = 10^{-5}\) by default and the biased variance (<a href=\"https://docs.pytorch.org/docs/2.14/generated/torch.nn.LayerNorm.html\" target=\"_blank\" rel=\"noopener noreferrer\">docs</a>).",
        r"The averages run over the features of one example (the layer), not over the batch. Eq. (2), batch normalisation, averages over examples with \(\mathbb{E}_{\mathbf{x}\sim P(\mathbf{x})}\).",
    ],
    "links": [["Normalisation and initialisation", "n:3c65c17b0d0d81369e1cc38ed4e11d48"]],
})

# ---------------------------------------------------------------- language-model objective (GPT-1)
z2 = np.array([2.0, 1.0, 0.0]); z3 = np.array([0.0, 1.0, 3.0])   # vocabulary (the, cat, sat)
p2 = softmax(z2); p3 = softmax(z3)
lp = math.log(p2[1]) + math.log(p3[2])
nll = -lp / 2
d = {"p2": bmat(p2[None, :]), "p3": bmat(p3[None, :]), "pc": f(p2[1]), "ps": f(p3[2]), "l1": f(math.log(p2[1])),
     "l2": f(math.log(p3[2])), "L": f(lp), "nll": f(nll), "bits": f(nll / math.log(2)), "ppl": f(math.exp(nll), 2)}
EQ.append({
    "id": "lm", "group": "Training", "chip": "Language-model objective",
    "title": "The language-modelling objective (next-token log-likelihood)",
    "paper": {"cite": "Radford et al. 2018, Improving Language Understanding by Generative Pre-Training (GPT-1)", "arxiv": None, "ver": None,
              "eq": "Eq. (1)", "page": 3, "section": "§3.1", "abs": "https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf",
              "pdf": "https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf#page=3",
              "note": "Not on arXiv; OpenAI's PDF."},
    "latex": r"L_{1}(\mathcal{U})=\sum_{i}\log P(u_{i}\mid u_{i-k},\ldots,u_{i-1};\Theta)",
    "transcription": "As printed in §3.1.",
    "symbols": [
        {"id": "L1", "tex": r"L_1", "match": ["L1"], "name": "the objective (to maximise)",
         "meaning": r"Total log-likelihood of the corpus. It is a sum of logs of probabilities, so it is negative and the paper maximises it. The loss you see in code is its negative, divided by the number of tokens.",
         "shape": "A number.", "where": "Eq. (1), p. 3: \"maximize the following likelihood\"."},
        {"id": "U", "tex": r"\mathcal{U}", "match": ["𝒰"], "name": "the corpus",
         "meaning": r"An unlabelled sequence of tokens \(\{u_1, \ldots, u_n\}\).", "shape": r"\(n\) token ids.", "where": "§3.1, p. 3."},
        {"id": "ui", "tex": "u_i", "match": ["ui"], "name": "the token to predict",
         "meaning": r"Token number \(i\); the sum index \(i\) runs over positions in the corpus.", "shape": "One token id (an integer in the vocabulary).", "where": "§3.1, p. 3."},
        {"id": "ctx", "tex": r"u_{i-k},\ldots,u_{i-1}", "match": ["ui-k", "ui-1"], "name": "the context",
         "meaning": r"The \(k\) tokens before position \(i\); \(k\) is the context window (512 in GPT-1, §4.1).", "shape": r"\(k\) token ids.", "where": "§3.1, p. 3: \"k is the size of the context window\"."},
        {"id": "P", "tex": "P", "match": ["P"], "name": "the model's probability",
         "meaning": r"Probability the network assigns to the actual next token. Eq. (2) says how: \(P(u) = \mathrm{softmax}(h_n W_e^T)\), a softmax over the vocabulary.",
         "shape": r"A number in (0, 1], read off a vector of length \(|V|\) (vocabulary size).", "where": "Eq. (2), p. 3."},
        {"id": "bar", "tex": r"\mid", "match": ["|"], "name": "given",
         "meaning": "Conditional probability: probability of the left side given the right side.", "shape": "Notation.", "where": "Standard."},
        {"id": "Theta", "tex": r";\Theta", "match": ["Θ"], "name": "parameters (after a semicolon)",
         "meaning": "The semicolon separates what we condition on (data) from the parameters that define the model. It is not conditioning in the probabilistic sense.",
         "shape": "All the network's weights (a 12-layer decoder, §4.1).", "where": "§3.1, p. 3: \"neural network with parameters Θ\"."},
        {"id": "log", "tex": r"\log", "match": ["log"], "name": "natural log",
         "meaning": "Base e, as almost everywhere in ML papers; values are in nats. Divide by ln 2 for bits.", "shape": "Function.", "where": "Not stated in the paper (convention)."},
    ],
    "aloud": "L one of U equals the sum, over every position i, of the log of the probability the model with parameters Theta gives to token u i, given the k tokens before it.",
    "steps_note": "Vocabulary (the, cat, sat); corpus \"the cat sat\"; the model's logits at each position are illustrative, the arithmetic is real. Same logits z = (2, 1, 0) as the Reading tab's running example.",
    "steps": [
        {"tex": fill(r"P(\cdot\mid\text{the})=\mathrm{softmax}(2,1,0)\quad =<<p2>>\Rightarrow P(\text{cat}\mid\text{the})=<<pc>>", d), "say": "Position 2: the right answer, cat, gets 0.245."},
        {"tex": fill(r"P(\cdot\mid\text{the cat})=\mathrm{softmax}(0,1,3)\quad =<<p3>>\Rightarrow P(\text{sat}\mid\ldots)=<<ps>>", d), "say": "Position 3: sat gets 0.844."},
        {"tex": fill(r"L_1=\log <<pc>>+\log <<ps>>\quad =<<l1>>+(<<l2>>)=<<L>>", d), "say": "Sum the logs (natural log). Position 1 has no context, so it contributes nothing here."},
        {"tex": fill(r"\text{loss}=-\frac{L_1}{2}=<<nll>>\ \text{nats/token}\quad =<<bits>>\ \text{bits/token},\quad \text{perplexity}=e^{<<nll>>}=<<ppl>>", d), "say": "What a training log prints: the negative, averaged per token."},
    ],
    "checks": {"p_cat": p2[1], "p_sat": p3[2], "L1": lp, "nll": nll, "bits": nll / math.log(2), "ppl": math.exp(nll)},
    "traps": [
        r"\(L_1\) is maximised; a \"loss\" is minimised. Papers switch between the two: check the sign and whether the text says maximise or minimise.",
        r"The sum is over tokens, so \(L_1\) grows with corpus length; training logs report the per-token mean. Comparing a summed and a mean number is a factor of the token count.",
        r"\(\log\) is natural (nats). Bits per token divide by \(\ln 2\); bits per byte also divide by bytes per token, and only that is comparable across tokenizers.",
        r"\(;\Theta\) marks parameters, \(\mid\) marks conditioning. Some papers write \(P_\Theta(u_i \mid \ldots)\) or \(p_\theta\): the same thing.",
    ],
    "links": [["Loss functions (cross-entropy and its relatives)", "n:3c65c17b0d0d8161a72bc8c572f37d55"],
              ["Pretraining (where this objective is run at scale)", "n:3c65c17b0d0d814f82cffd0d5c0dd5ba"],
              ["Reading tab: why the loss is the negative log-likelihood", "#t-read"]],
})

# ---------------------------------------------------------------- Adam
al, b1, b2, eps = 0.1, 0.9, 0.999, 1e-8
th = 1.0; m = 0.0; v = 0.0; rows = []
for t in (1, 2):
    gt = 2 * th
    m = b1 * m + (1 - b1) * gt
    v = b2 * v + (1 - b2) * gt * gt
    mh = m / (1 - b1 ** t); vh = v / (1 - b2 ** t)
    th_new = th - al * mh / (math.sqrt(vh) + eps)
    rows.append(dict(t=t, g=gt, m=m, v=v, mh=mh, vh=vh, th=th_new))
    th = th_new
r1, r2 = rows
nobc = al * r1["m"] / (math.sqrt(r1["v"]) + eps)
d = {"g1": f(r1["g"]), "m1": f(r1["m"]), "v1": f(r1["v"]), "mh1": f(r1["mh"]), "vh1": f(r1["vh"]), "th1": f(r1["th"]),
     "g2": f(r2["g"]), "m2": f(r2["m"]), "v2": f(r2["v"], 6), "mh2": f(r2["mh"], 4), "vh2": f(r2["vh"], 4), "th2": f(r2["th"], 4),
     "nobc": f(nobc), "sq2": f(math.sqrt(r2["vh"]), 4)}
EQ.append({
    "id": "adam", "group": "Training", "chip": "Adam update",
    "title": "The Adam update",
    "paper": {"cite": "Kingma and Ba 2014, Adam: A Method for Stochastic Optimization", "arxiv": "1412.6980", "ver": "v9",
              "eq": "Algorithm 1 (the loop body)", "page": 2, "section": "§2", **arx("1412.6980", "v9", 2)},
    "latex": r"\begin{aligned}g_{t}&\leftarrow\nabla_{\theta}f_{t}(\theta_{t-1})\\ m_{t}&\leftarrow\beta_{1}\cdot m_{t-1}+(1-\beta_{1})\cdot g_{t}\\ v_{t}&\leftarrow\beta_{2}\cdot v_{t-1}+(1-\beta_{2})\cdot g_{t}^{2}\\ \widehat{m}_{t}&\leftarrow m_{t}/(1-\beta_{1}^{t})\\ \widehat{v}_{t}&\leftarrow v_{t}/(1-\beta_{2}^{t})\\ \theta_{t}&\leftarrow\theta_{t-1}-\alpha\cdot\widehat{m}_{t}/(\sqrt{\widehat{v}_{t}}+\epsilon)\end{aligned}",
    "transcription": "The six update lines of Algorithm 1, as printed, without the comments in brackets.",
    "symbols": [
        {"id": "gt", "tex": "g_t", "match": ["gt"], "name": "gradient at step t",
         "meaning": r"Gradient of this step's (mini-batch) loss \(f_t\) with respect to the parameters, evaluated at the previous parameters.",
         "shape": "Same shape as the parameters (here one number; in a model, every weight).", "where": "Algorithm 1, p. 2."},
        {"id": "nabla", "tex": r"\nabla_\theta", "match": ["∇θ"], "name": "gradient with respect to θ",
         "meaning": "The vector of partial derivatives, one per parameter.", "shape": "Same shape as θ.", "where": "Standard."},
        {"id": "gt2", "tex": "g_t^2", "match": ["gt2"], "name": "element-wise square",
         "meaning": r"Each entry squared on its own, \(g_t \odot g_t\), not a dot product and not a matrix square.",
         "shape": "Same shape as θ.", "where": "Algorithm 1 caption, p. 2: \"g_t^2 indicates the elementwise square\"."},
        {"id": "mt", "tex": "m_t", "match": ["mt"], "name": "first moment (running mean of gradients)",
         "meaning": "An exponential moving average of gradients: momentum.", "shape": "Same shape as θ; starts at 0.", "where": "Algorithm 1, p. 2."},
        {"id": "vt", "tex": "v_t", "match": ["vt"], "name": "second raw moment (running mean of squared gradients)",
         "meaning": "An exponential moving average of squared gradients: a per-parameter scale.", "shape": "Same shape as θ; starts at 0.", "where": "Algorithm 1, p. 2."},
        {"id": "hat", "tex": r"\widehat{m}_t,\ \widehat{v}_t", "match": ["mˆt", "vˆt"], "name": "bias-corrected estimates (the hat)",
         "meaning": "The hat marks a corrected estimate: because m and v start at 0, early averages are too small; dividing by 1 − β^t undoes that.",
         "shape": "Same shape as θ.", "where": "Algorithm 1 and §3, p. 2-3."},
        {"id": "b1t", "tex": r"\beta_1^t", "match": ["β1t", "β2t"], "name": "β to the power t",
         "meaning": r"Here the superscript is a real power: \(0.9^t\). The caption says so (\"we denote β1 and β2 to the power t\").",
         "shape": "A number.", "where": "Algorithm 1 caption, p. 2."},
        {"id": "beta", "tex": r"\beta_1,\ \beta_2", "match": ["β1", "β2"], "name": "decay rates",
         "meaning": "How much of the old average to keep each step. Defaults 0.9 and 0.999.", "shape": "Numbers.", "where": "Algorithm 1 caption, p. 2."},
        {"id": "alpha", "tex": r"\alpha", "match": ["α"], "name": "step size (learning rate)",
         "meaning": "Default 0.001. Roughly the largest step any parameter takes.", "shape": "A number.", "where": "Algorithm 1 caption and §2.1."},
        {"id": "eps", "tex": r"\epsilon", "match": ["ϵ", "ε"], "name": "a small constant",
         "meaning": r"Keeps the division safe when \(\widehat{v}_t\) is tiny. Default \(10^{-8}\). Here \(\epsilon\) is a constant, unlike the noise \(\epsilon\) in diffusion.",
         "shape": "A number.", "where": "Algorithm 1 caption, p. 2."},
        {"id": "theta", "tex": r"\theta_t", "match": ["θt", "θt-1"], "name": "parameters after step t",
         "meaning": "The weights being trained; subscript t is the step number.", "shape": "Any shape (a vector of all weights).", "where": "Algorithm 1, p. 2."},
        {"id": "arrow", "tex": r"\leftarrow", "match": ["←"], "name": "assignment",
         "meaning": "Overwrite the left side with the right side (an algorithm step), not an equation to solve.", "shape": "Notation.", "where": "Standard pseudocode."},
    ],
    "aloud": "Get the gradient; update the running average of gradients and of squared gradients; correct both for starting at zero; then move each parameter by alpha times its corrected average gradient divided by the square root of its corrected average squared gradient plus epsilon.",
    "steps_note": "One parameter θ, loss f(θ) = θ², so g = 2θ. Start θ0 = 1, α = 0.1 (larger than the 0.001 default so the steps are visible), β1 = 0.9, β2 = 0.999, ε = 10⁻⁸.",
    "steps": [
        {"tex": fill(r"t=1:\ g_1=2\theta_0=<<g1>>\quad m_1=0.1\cdot<<g1>>=<<m1>>\quad v_1=0.001\cdot<<g1>>^2=<<v1>>", d), "say": "Both averages start at 0, so after one step they are far too small."},
        {"tex": fill(r"\widehat{m}_1=\frac{<<m1>>}{1-0.9}=<<mh1>>,\quad \widehat{v}_1=\frac{<<v1>>}{1-0.999}=<<vh1>>", d), "say": "Bias correction restores the gradient's real size."},
        {"tex": fill(r"\theta_1=1-0.1\cdot\frac{<<mh1>>}{\sqrt{<<vh1>>}+10^{-8}}=<<th1>>", d), "say": "The first step is exactly α in size, whatever the gradient's scale."},
        {"tex": fill(r"t=2:\ g_2=<<g2>>\quad m_2=<<m2>>\quad v_2=<<v2>>\quad \widehat{m}_2=<<mh2>>\quad \widehat{v}_2=<<vh2>>", d), "say": "Now 1 − β1² = 0.19 and 1 − β2² = 0.001999."},
        {"tex": fill(r"\theta_2=<<th1>>-0.1\cdot\frac{<<mh2>>}{<<sq2>>}=<<th2>>", d), "say": "Again a step close to α."},
        {"tex": fill(r"\text{without the hats at } t=1:\quad 0.1\cdot\frac{<<m1>>}{\sqrt{<<v1>>}}=<<nobc>>", d), "say": "The trap: skipping bias correction makes the first step about 3 times α here."},
    ],
    "checks": {"steps": rows, "no_bias_correction_step": nobc},
    "traps": [
        r"Two kinds of superscript in one algorithm: \(g_t^2\) is an element-wise square, \(\beta_1^t\) is a power, and \(t\) as a subscript is a step counter.",
        r"The hat means \"bias-corrected estimate\" here. In PPO \(\hat{A}_t\) and \(\hat{\mathbb{E}}_t\) the hat means \"estimated from samples\". Same mark, related but different job.",
        r"\(\epsilon\) sits outside the square root in Algorithm 1. Some libraries put it inside; the difference matters only when \(\widehat{v}\) is tiny.",
        r"\(\beta_1, \beta_2\) are Adam's decay rates; the same letter \(\beta\) is a KL strength in DPO and RLHF and a noise schedule in DDPM.",
    ],
    "links": [["Optimisers and learning-rate schedulers", "n:3c65c17b0d0d817080bbc90954681d09"],
              ["Gradient lab (step a toy model yourself)", "#t-grad"]],
})

# ---------------------------------------------------------------- LoRA
W0 = np.array([[1, 0, 0], [0, 2, 0], [0, 0, 1]], float); x = np.array([1.0, 2.0, 3.0])
B = np.array([[1.0], [0.0], [2.0]]); A = np.array([[0.5, 0.0, -0.5]])
W0x = W0 @ x; Ax = A @ x; BAx = (B @ Ax); hL = W0x + BAx; BA = B @ A
dd, kk, rr = 4096, 4096, 8
d = {"W0": bmat(W0), "x": bmat(x[:, None]), "W0x": bmat(W0x[:, None]), "B": bmat(B), "A": bmat(A), "Ax": f(Ax[0]),
     "BAx": bmat(BAx[:, None]), "h": bmat(hL[:, None]), "BA": bmat(BA), "full": f"{dd*kk:,}", "lora": f"{rr*(dd+kk):,}",
     "pct": f(100 * rr * (dd + kk) / (dd * kk), 2)}
EQ.append({
    "id": "lora", "group": "Training", "chip": "LoRA update",
    "title": "The LoRA forward pass",
    "paper": {"cite": "Hu et al. 2021, LoRA: Low-Rank Adaptation of Large Language Models", "arxiv": "2106.09685", "ver": "v2",
              "eq": "Eq. (3)", "page": 4, "section": "§4.1", **arx("2106.09685", "v2", 4)},
    "latex": r"h=W_{0}x+\Delta Wx=W_{0}x+BAx",
    "transcription": "As printed in §4.1.",
    "symbols": [
        {"id": "W0", "tex": "W_0", "match": ["W0"], "name": "the frozen pretrained weight",
         "meaning": "The original matrix; it receives no gradient updates.", "shape": r"\(d \times k\): here \(3 \times 3\); a 4096-wide projection is \(4096 \times 4096\).",
         "where": "§4.1, p. 4: \"W0 ∈ R^(d×k)\"."},
        {"id": "x", "tex": "x", "match": ["x"], "name": "the input",
         "meaning": "One input vector, written as a column: the weight multiplies it from the left.", "shape": r"\(k \times 1\): here 3 numbers.", "where": "§4.1, p. 4."},
        {"id": "dW", "tex": r"\Delta W", "match": ["Δ"], "name": "the update",
         "meaning": r"The change fine-tuning makes to \(W_0\). \(\Delta\) means \"change in\", not a separate variable.", "shape": r"\(d \times k\), but never stored: it is \(BA\).",
         "where": "§4.1, p. 4."},
        {"id": "B", "tex": "B", "match": ["B"], "name": "up-projection",
         "meaning": "Trainable; initialised to zero, so the update starts at zero.", "shape": r"\(d \times r\): here \(3 \times 1\).", "where": "§4.1, p. 4: \"B ∈ R^(d×r)\"; zero init in the next paragraph."},
        {"id": "A", "tex": "A", "match": ["A"], "name": "down-projection",
         "meaning": "Trainable; random Gaussian initialisation.", "shape": r"\(r \times k\): here \(1 \times 3\).", "where": "§4.1, p. 4."},
        {"id": "h", "tex": "h", "match": ["h"], "name": "the output",
         "meaning": "What the layer produces for input x.", "shape": r"\(d \times 1\).", "where": "§4.1, p. 4."},
    ],
    "aloud": "h equals W zero times x plus the update times x, and the update is B times A, so the extra output is B times A times x.",
    "steps_note": "d = k = 3, rank r = 1. Illustrative weights, real arithmetic.",
    "steps": [
        {"tex": fill(r"W_0x=<<W0>><<x>>=<<W0x>>", d), "say": "The frozen path."},
        {"tex": fill(r"Ax=<<A>><<x>>=<<Ax>>", d), "say": "Squeeze x down to r = 1 number."},
        {"tex": fill(r"B(Ax)=<<B>>(<<Ax>>)=<<BAx>>", d), "say": "Expand back to d = 3 numbers."},
        {"tex": fill(r"h=<<W0x>>+<<BAx>>=<<h>>", d), "say": "Add the two paths."},
        {"tex": fill(r"BA=<<BA>>\ \text{(rank 1)};\quad d=k=4096,\ r=8:\quad <<full>>\ \text{vs}\ <<lora>>\ \text{trainable}\quad (<<pct>>\%)", d), "say": "Why it is cheap: r(d + k) numbers instead of d × k."},
    ],
    "checks": {"W0x": W0x.tolist(), "Ax": float(Ax[0]), "BAx": BAx.tolist(), "h": hL.tolist(), "pct": 100 * rr * (dd + kk) / (dd * kk)},
    "traps": [
        r"Column-vector convention: LoRA writes \(W_0 x\) with \(W_0\) of shape \(d \times k\) (out by in). PyTorch's <code>nn.Linear</code> stores its weight as (out, in) too but computes \(xW^T\) on row vectors. Same numbers, transposed bookkeeping.",
        r"Eq. (3) leaves out the scaling: the paper scales \(\Delta W x\) by \(\alpha/r\) (§4.1), and implementations do too. A rank change without a matching \(\alpha\) change changes the effective learning rate.",
        r"Read \(BAx\) right to left: \(B(Ax)\) costs \(r(d+k)\) multiplications per input; forming \(BA\) first costs \(dk\) memory.",
    ],
    "links": [["LoRA (paper page, with a live low-rank toy)", "n:3c65c17b0d0d81018f15edd19fa5c28a"],
              ["Parameter-Efficient Fine-Tuning (PEFT)", "n:3c65c17b0d0d81eba08eef56b3e3b4eb"]],
})

# ---------------------------------------------------------------- Chinchilla
E_, A_, B_, al_, be_ = 1.69, 406.4, 410.7, 0.34, 0.28
def chin(N, D):
    return E_ + A_ / N ** al_ + B_ / D ** be_, A_ / N ** al_, B_ / D ** be_
Lc, tNc, tDc = chin(70e9, 1.4e12); Lg, tNg, tDg = chin(280e9, 300e9)
d = {"tNc": f(tNc, 4), "tDc": f(tDc, 4), "Lc": f(Lc), "tNg": f(tNg, 4), "tDg": f(tDg, 4), "Lg": f(Lg),
     "Cc": f(6 * 70e9 * 1.4e12 / 1e23, 2), "Cg": f(6 * 280e9 * 300e9 / 1e23, 2)}
EQ.append({
    "id": "chin", "group": "Training", "chip": "Chinchilla scaling law",
    "title": "The Chinchilla parametric loss",
    "paper": {"cite": "Hoffmann et al. 2022, Training Compute-Optimal Large Language Models", "arxiv": "2203.15556", "ver": "v1",
              "eq": "Eq. (2); fitted values in Eq. (10)", "page": 6, "section": "§3.3; Appendix D.2 (p. 25)", **arx("2203.15556", "v1", 6)},
    "latex": r"\hat{L}(N,D)\triangleq E+\frac{A}{N^{\alpha}}+\frac{B}{D^{\beta}}",
    "transcription": "As printed (≜ means \"defined as\"). Appendix D.2, Eq. (10), gives the fit: E = 1.69, A = 406.4, B = 410.7, α = 0.34, β = 0.28.",
    "symbols": [
        {"id": "Lhat", "tex": r"\hat{L}", "match": ["Lˆ"], "name": "predicted loss (the hat)",
         "meaning": "The hat marks a model's prediction of the loss, not a measured one. The loss is the final pretraining loss in nats per token on the paper's data.",
         "shape": "A number.", "where": "Eq. (2), p. 6."},
        {"id": "N", "tex": "N", "match": ["N"], "name": "parameters",
         "meaning": "Model size: number of parameters.", "shape": r"A number, e.g. \(7 \times 10^{10}\) for Chinchilla.", "where": "§3, p. 6."},
        {"id": "D", "tex": "D", "match": ["D"], "name": "training tokens",
         "meaning": "How many tokens the model is trained on.", "shape": r"A number, e.g. \(1.4 \times 10^{12}\).", "where": "§3, p. 6."},
        {"id": "E", "tex": "E", "match": ["E"], "name": "irreducible loss",
         "meaning": "The paper: \"the loss for an ideal generative process on the data distribution\", which \"should correspond to the entropy of natural text\". Not an expectation here: a constant.",
         "shape": "A number: 1.69.", "where": "§3.3, p. 6."},
        {"id": "A", "tex": "A,\\ B", "match": ["A", "B"], "name": "fitted coefficients",
         "meaning": "Constants fitted to the training runs.", "shape": "Numbers: 406.4 and 410.7.", "where": "Eq. (10), Appendix D.2, p. 25."},
        {"id": "al", "tex": r"\alpha,\ \beta", "match": ["Nα", "Dβ"], "name": "exponents",
         "meaning": r"How fast each term shrinks: \(N^{\alpha}\) is a power. Fitted \(\alpha = 0.34\), \(\beta = 0.28\).",
         "shape": "Numbers.", "where": "Eq. (10), p. 25."},
        {"id": "def", "tex": r"\triangleq", "match": ["≜"], "name": "defined as",
         "meaning": "This is a definition of the form, not a result to be checked. Same job as := elsewhere.", "shape": "Notation.", "where": "Eq. (2)."},
    ],
    "aloud": "L hat of N and D is defined as E, plus A over N to the alpha, plus B over D to the beta: an irreducible floor plus a penalty for a small model plus a penalty for too little data.",
    "steps_note": "The paper's fitted constants, plugged in at two real models: Chinchilla (70B parameters, 1.4T tokens) and Gopher (280B, 300B tokens).",
    "steps": [
        {"tex": fill(r"\text{Chinchilla: } \frac{406.4}{(7\times10^{10})^{0.34}}=<<tNc>>,\quad \frac{410.7}{(1.4\times10^{12})^{0.28}}=<<tDc>>", d), "say": "The data term is the bigger penalty here."},
        {"tex": fill(r"\hat{L}=1.69+<<tNc>>+<<tDc>>=<<Lc>>", d), "say": "Predicted loss, nats per token."},
        {"tex": fill(r"\text{Gopher: } \hat{L}=1.69+<<tNg>>+<<tDg>>=<<Lg>>", d), "say": "Four times the parameters, under a quarter of the tokens: a higher predicted loss."},
        {"tex": fill(r"C\approx 6ND:\ <<Cc>>\times10^{23}\ \text{vs}\ <<Cg>>\times10^{23}\ \text{FLOPs}", d), "say": "At similar compute, the smaller model trained longer is predicted to win: the paper's point."},
    ],
    "checks": {"chinchilla": [Lc, tNc, tDc], "gopher": [Lg, tNg, tDg]},
    "traps": [
        r"\(E\) is a constant (the loss floor), not an expectation \(\mathbb{E}\). Font and context tell them apart: \(\mathbb{E}\) is blackboard bold and is followed by brackets.",
        r"The printed constants are rounded; re-deriving the paper's other numbers from them lands slightly off (the Chinchilla paper page shows by how much, and the Besiroglu et al. 2024 replication).",
        r"\(\alpha\) and \(\beta\) here are exponents of a fit; in Adam they are a step size and decay rates. Letters are reused freely across papers.",
    ],
    "links": [["Chinchilla (paper page: refit Approach 3 yourself)", "n:3c65c17b0d0d8116b7ddffba5c599f3f"],
              ["Scaling Laws for Neural Language Models (Kaplan et al.)", "n:3c65c17b0d0d81b08a1debb0c15cd252"],
              ["Pretraining", "n:3c65c17b0d0d814f82cffd0d5c0dd5ba"]],
})

# ---------------------------------------------------------------- InfoNCE
sc = np.array([2.0, 0.5, -1.0]); fk = np.exp(sc); prob = fk[0] / fk.sum(); LN = -math.log(prob)
d = {"f1": f(fk[0]), "f2": f(fk[1]), "f3": f(fk[2]), "sum": f(fk.sum()), "p": f(prob), "L": f(LN), "logN": f(math.log(3)),
     "bound": f(math.log(3) - LN)}
EQ.append({
    "id": "nce", "group": "Representations and generation", "chip": "InfoNCE",
    "title": "The InfoNCE loss",
    "paper": {"cite": "van den Oord, Li and Vinyals 2018, Representation Learning with Contrastive Predictive Coding", "arxiv": "1807.03748", "ver": "v2",
              "eq": "Eq. (4)", "page": 3, "section": "§2.3", **arx("1807.03748", "v2", 3)},
    "latex": r"\mathcal{L}_{\text{N}}=-\mathop{\mathbb{E}}_{X}\left[\log\frac{f_{k}(x_{t+k},c_{t})}{\sum_{x_{j}\in X}f_{k}(x_{j},c_{t})}\right]",
    "transcription": "As printed in §2.3 (Eq. (3) defines f_k on the same page).",
    "symbols": [
        {"id": "LN", "tex": r"\mathcal{L}_\text{N}", "match": ["ℒN"], "name": "the loss, for sets of N",
         "meaning": "The subscript N is the number of samples in each set: one positive plus N − 1 negatives.", "shape": "A number.", "where": "Eq. (4), p. 3."},
        {"id": "EX", "tex": r"\mathbb{E}_X", "match": ["𝔼X"], "name": "average over sets X",
         "meaning": "The subscript under E says what is random: here the set X of samples. In practice, the mean over the sets in a batch.",
         "shape": "Notation.", "where": "§2.3, p. 3."},
        {"id": "X", "tex": "X", "match": ["X"], "name": "one set of candidates",
         "meaning": r"\(X = \{x_1, \ldots, x_N\}\): one sample from \(p(x_{t+k} \mid c_t)\) (the positive) and \(N-1\) from \(p(x_{t+k})\) (negatives).",
         "shape": r"\(N\) items: here 3.", "where": "§2.3, p. 3."},
        {"id": "fk", "tex": "f_k", "match": ["fk"], "name": "score function",
         "meaning": r"A positive score, \(f_k = \exp(z_{t+k}^T W_k c_t)\) (Eq. 3); the paper shows it is proportional to a density ratio, not a probability.",
         "shape": "A positive number per candidate.", "where": "Eq. (3), p. 3; Eq. (2), p. 3."},
        {"id": "xtk", "tex": "x_{t+k}", "match": ["xt+k"], "name": "the true future sample",
         "meaning": "What actually came k steps after time t: the positive.", "shape": "One input (e.g. a window of audio); scored through its encoding z.", "where": "§2.1-2.3."},
        {"id": "ct", "tex": "c_t", "match": ["ct"], "name": "context",
         "meaning": "The model's summary of everything up to time t.", "shape": "A vector (256 dimensions in the audio experiments, §3.1).", "where": "§2.2, p. 3: c_t = g_ar(z_≤t), a summary of all encodings up to t."},
        {"id": "xj", "tex": r"x_j\in X", "match": ["xj"], "name": "every candidate in the set",
         "meaning": "The sum index: j runs over all N candidates, the positive included.", "shape": "Notation.", "where": "Eq. (4)."},
    ],
    "aloud": "L N equals minus the average, over sets X, of the log of the positive's score divided by the sum of the scores of every candidate in the set.",
    "steps_note": "One set with N = 3: the positive's score z·Wc = 2.0, two negatives 0.5 and −1.0 (illustrative scores, real arithmetic).",
    "steps": [
        {"tex": fill(r"f=\left(e^{2},\ e^{0.5},\ e^{-1}\right)=(<<f1>>,\ <<f2>>,\ <<f3>>)", d), "say": "Exponentiate the scores."},
        {"tex": fill(r"\frac{<<f1>>}{<<sum>>}=<<p>>", d), "say": "The positive's share: a softmax over the set."},
        {"tex": fill(r"\mathcal{L}_3=-\log <<p>>=<<L>>", d), "say": "Cross-entropy with the positive as the label. Averaged over many sets in practice."},
        {"tex": fill(r"I(x_{t+k},c_t)\geq\log N-\mathcal{L}_N\quad =<<logN>>-<<L>>=<<bound>>\ \text{nats}", d), "say": "The paper's bound (unnumbered display, p. 4): the estimate can never exceed log N, so more negatives raise the ceiling."},
    ],
    "checks": {"f": fk.tolist(), "p_pos": prob, "loss": LN, "bound": math.log(3) - LN},
    "traps": [
        r"It is ordinary softmax cross-entropy where the classes are the candidates in the set; CLIP's loss is the same thing applied in both directions over a batch.",
        r"The subscript under \(\mathbb{E}\) names the random thing. \(\mathbb{E}_X\) here; \(\mathbb{E}_{x\sim p}\) elsewhere reads \"average over x drawn from p\".",
        r"\(N\) is the set size, not the dataset size; \(t\) and \(k\) are a time step and how far ahead, not a temperature or a key.",
    ],
    "links": [["Contrastive and self-supervised learning", "n:3c65c17b0d0d811db6a7d02d0ee7215c"],
              ["CLIP (paper page)", "n:3c65c17b0d0d8194a85dfc5f3bf3f799"]],
})

# ---------------------------------------------------------------- DDPM
betas = np.linspace(1e-4, 0.02, 1000); abar = np.cumprod(1 - betas); tt = 200
ab = float(abar[tt - 1]); sa, sb = math.sqrt(ab), math.sqrt(1 - ab)
x0 = np.array([0.5, -0.2]); ep = np.array([1.0, -0.5]); epth = np.array([0.9, -0.3])
xt = sa * x0 + sb * ep; Ls = float(((ep - epth) ** 2).sum())
d = {"ab": f(ab, 4), "sa": f(sa, 4), "sb": f(sb, 4), "xt": bmat(xt[None, :]), "x0": bmat(x0[None, :]), "ep": bmat(ep[None, :]),
     "epth": bmat(epth[None, :]), "L": f(Ls), "Lm": f(Ls / 2, 3)}
EQ.append({
    "id": "ddpm", "group": "Representations and generation", "chip": "Diffusion training loss",
    "title": "The simplified diffusion training loss",
    "paper": {"cite": "Ho, Jain and Abbeel 2020, Denoising Diffusion Probabilistic Models", "arxiv": "2006.11239", "ver": "v2",
              "eq": "Eq. (14)", "page": 5, "section": "§3.4", **arx("2006.11239", "v2", 5)},
    "latex": r"L_{\mathrm{simple}}(\theta)\coloneqq\mathbb{E}_{t,\mathbf{x}_{0},\boldsymbol{\epsilon}}\left[\left\|\boldsymbol{\epsilon}-\boldsymbol{\epsilon}_{\theta}\left(\sqrt{\bar{\alpha}_{t}}\mathbf{x}_{0}+\sqrt{1-\bar{\alpha}_{t}}\boldsymbol{\epsilon},t\right)\right\|^{2}\right]",
    "transcription": "As printed in §3.4.",
    "symbols": [
        {"id": "E", "tex": r"\mathbb{E}_{t,\mathbf{x}_0,\boldsymbol{\epsilon}}", "match": ["𝔼t,𝐱0,𝝐"], "name": "average over three random things",
         "meaning": "t uniform from 1 to T, an image x0 from the data, noise ε from a standard Gaussian. Each training step draws one of each per example.",
         "shape": "Notation.", "where": "§3.4, p. 5: \"t is uniform between 1 and T\"."},
        {"id": "x0", "tex": r"\mathbf{x}_0", "match": ["x0", "𝐱0"], "name": "a clean data sample",
         "meaning": "A real image, scaled to [−1, 1].", "shape": r"Same shape as the image: \(32 \times 32 \times 3\) for CIFAR-10; here 2 numbers.", "where": "§2 and §3.3."},
        {"id": "eps", "tex": r"\boldsymbol{\epsilon}", "match": ["𝝐"], "name": "the noise",
         "meaning": r"Gaussian noise, \(\boldsymbol{\epsilon}\sim\mathcal{N}(\mathbf{0},\mathbf{I})\). Not a small constant: in Adam the same letter is.", "shape": r"Same shape as \(\mathbf{x}_0\).", "where": "§3.2, p. 3: \"for ε ∼ N(0, I)\"."},
        {"id": "epth", "tex": r"\boldsymbol{\epsilon}_\theta", "match": ["𝝐θ"], "name": "the network's guess of the noise",
         "meaning": "A neural network (a U-Net, §4) that sees the noisy input and t and predicts which noise was added.", "shape": r"Same shape as \(\mathbf{x}_0\).", "where": "§3.2, Eq. (11), p. 4."},
        {"id": "abar", "tex": r"\bar{\alpha}_t", "match": ["α‾t"], "name": "cumulative signal kept (the bar)",
         "meaning": r"Here the bar is a product, not an average: \(\bar\alpha_t = \prod_{s=1}^t \alpha_s\) with \(\alpha_t = 1 - \beta_t\). It shrinks from about 1 to about 0 as t grows.",
         "shape": "A number per t.", "where": "§2, p. 2, just before Eq. (4)."},
        {"id": "t", "tex": "t", "match": ["t"], "name": "noise level (time step)",
         "meaning": "Which step of the forward noising process; T = 1000 in the paper.", "shape": "An integer from 1 to T.", "where": "§4, p. 5."},
        {"id": "norm", "tex": r"\|\cdot\|^2", "match": ["‖"], "name": "squared Euclidean norm",
         "meaning": "Sum of squared differences over every pixel: a mean-squared-error, up to a constant factor.", "shape": "A number.", "where": "Standard."},
        {"id": "def", "tex": r"\coloneqq", "match": ["≔", ":="], "name": "defined as",
         "meaning": "Introduces a new name for the expression on the right.", "shape": "Notation.", "where": "Standard."},
    ],
    "aloud": "L simple of theta is defined as the average, over a random step t, a data sample x zero and Gaussian noise epsilon, of the squared distance between the noise and the network's guess of the noise from the noised sample.",
    "steps_note": "A 2-pixel \"image\"; t = 200 with the paper's linear schedule (β from 10⁻⁴ to 0.02 over T = 1000, §4). The network's guess is illustrative.",
    "steps": [
        {"tex": fill(r"\bar{\alpha}_{200}=\prod_{s=1}^{200}(1-\beta_s)=<<ab>>,\quad \sqrt{\bar{\alpha}}=<<sa>>,\ \sqrt{1-\bar{\alpha}}=<<sb>>", d), "say": "From the paper's schedule, computed in recompute.py."},
        {"tex": fill(r"\mathbf{x}_0=<<x0>>,\ \boldsymbol{\epsilon}=<<ep>>:\quad \mathbf{x}_{200}=<<sa>>\,\mathbf{x}_0+<<sb>>\,\boldsymbol{\epsilon}\quad =<<xt>>", d), "say": "The noised input the network sees."},
        {"tex": fill(r"\boldsymbol{\epsilon}_\theta(\mathbf{x}_{200},200)=<<epth>>", d), "say": "Suppose this is the network's guess."},
        {"tex": fill(r"\|\boldsymbol{\epsilon}-\boldsymbol{\epsilon}_\theta\|^2=(0.1)^2+(-0.2)^2=<<L>>", d), "say": "Sum over pixels. A mean over pixels (common in code) gives 0.025: the same loss up to a constant."},
    ],
    "checks": {"abar200": ab, "sqrt_abar": sa, "sqrt_1m": sb, "xt": xt.tolist(), "loss": Ls},
    "traps": [
        r"The bar on \(\bar\alpha_t\) is a cumulative product. Elsewhere a bar often means a mean (\(\bar{x}\)) or a complex conjugate. Look for the definition.",
        r"\(\boldsymbol{\epsilon}\) is the noise, bold because it is a vector; the predicted noise carries the parameters as a subscript, \(\boldsymbol{\epsilon}_\theta\).",
        r"Three variables sit under the \(\mathbb{E}\): all three are sampled every step. Dropping one (say, a fixed t) changes what is learned.",
    ],
    "links": [["DDPM (paper page, with a live toy diffusion model)", "n:3c65c17b0d0d811481e4e36333454f7a"],
              ["Latent Diffusion / Stable Diffusion (paper page)", "n:3c65c17b0d0d81bb98adc0daf8462cb6"]],
})

# ---------------------------------------------------------------- KL-regularised RLHF (InstructGPT)
rw, prl, psft, beta, gam, lpt = 1.5, 0.02, 0.01, 0.02, 27.8, -2.0
lr_ = math.log(prl / psft); pen = beta * lr_; first = rw - pen
d = {"lr": f(lr_), "pen": f(pen, 4), "first": f(first, 4), "gt": f(gam * lpt, 1), "tot": f(first + gam * lpt, 2)}
EQ.append({
    "id": "rlhf", "group": "Post-training", "chip": "RLHF objective (KL-regularised)",
    "title": "The KL-regularised RLHF objective",
    "paper": {"cite": "Ouyang et al. 2022, Training language models to follow instructions with human feedback (InstructGPT)", "arxiv": "2203.02155", "ver": "v1",
              "eq": "Eq. (2)", "page": 9, "section": "§3.5", **arx("2203.02155", "v1", 9)},
    "latex": r"\begin{aligned}\text{objective}(\phi)=\;&\mathbb{E}_{(x,y)\sim D_{\pi_{\phi}^{\mathrm{RL}}}}\left[r_{\theta}(x,y)-\beta\log\left(\pi_{\phi}^{\mathrm{RL}}(y\mid x)/\pi^{\mathrm{SFT}}(y\mid x)\right)\right]+\\ &\gamma\,\mathbb{E}_{x\sim D_{\mathrm{pretrain}}}\left[\log(\pi_{\phi}^{\mathrm{RL}}(x))\right]\end{aligned}",
    "transcription": "As printed (the paper breaks the line after the first expectation).",
    "symbols": [
        {"id": "phi", "tex": r"\phi", "match": ["ϕ", "φ"], "name": "the policy's parameters",
         "meaning": "What is being trained: the language model's weights. The objective is a function of φ.", "shape": "All the policy's weights.", "where": "§3.5, p. 9."},
        {"id": "pirl", "tex": r"\pi_\phi^{\mathrm{RL}}", "match": ["πϕRL", "πφRL"], "name": "the policy being trained",
         "meaning": r"The language model as a policy: \(\pi(y \mid x)\) is the probability of response y to prompt x (a product of token probabilities).",
         "shape": "A probability per (prompt, response) pair.", "where": "p. 9: \"the learned RL policy\"."},
        {"id": "pisft", "tex": r"\pi^{\mathrm{SFT}}", "match": ["πSFT"], "name": "the frozen reference",
         "meaning": "The supervised fine-tuned model the policy started from; it stays fixed.", "shape": "Same as the policy.", "where": "p. 9: \"the supervised trained model\"."},
        {"id": "Ed", "tex": r"\mathbb{E}_{(x,y)\sim D_{\pi_\phi^{\mathrm{RL}}}}", "match": ["(x,y)∼DπϕRL", "(x,y)∼DπφRL"], "name": "sampled from the policy itself",
         "meaning": "Prompts x come from the dataset and responses y are generated by the current policy. The distribution depends on φ, which is why this needs RL (PPO) rather than plain backprop through the expectation.",
         "shape": "Notation.", "where": "Eq. (2), p. 9."},
        {"id": "r", "tex": r"r_\theta", "match": ["rθ"], "name": "the reward model",
         "meaning": "A separate network that scores a response. Here θ is the reward model's parameters, not the policy's.", "shape": "A number per (x, y).", "where": "§3.5, p. 8-9; trained with Eq. (1)."},
        {"id": "beta", "tex": r"\beta", "match": ["β"], "name": "KL reward coefficient",
         "meaning": "How strongly drifting from the SFT model is penalised. 0.02 in the paper.", "shape": "A number.", "where": "p. 9; value in Appendix C.4, p. 42."},
        {"id": "gamma", "tex": r"\gamma", "match": ["γ"], "name": "pretraining-mix coefficient",
         "meaning": "Weight on keeping pretraining likelihood high (\"PPO-ptx\"). 0 for plain PPO; 27.8 worked across sizes.", "shape": "A number.", "where": "p. 9; value in Appendix E.6, p. 53."},
        {"id": "Dpre", "tex": r"D_{\mathrm{pretrain}}", "match": ["Dpretrain"], "name": "pretraining distribution",
         "meaning": r"Ordinary text; \(\pi(x)\) here is the probability of that text itself.", "shape": "Notation.", "where": "p. 9."},
    ],
    "aloud": "The objective, as a function of the policy's weights phi, is the average over prompts and the policy's own responses of the reward minus beta times the log of how much more likely the policy makes the response than the SFT model did; plus gamma times the average log-likelihood of pretraining text.",
    "steps_note": "One prompt and one sampled response. Reward, probabilities and the pretraining log-likelihood are illustrative; β = 0.02 and γ = 27.8 are the paper's.",
    "steps": [
        {"tex": fill(r"\log\frac{\pi^{\mathrm{RL}}(y\mid x)}{\pi^{\mathrm{SFT}}(y\mid x)}=\log\frac{0.02}{0.01}=<<lr>>", d), "say": "The policy now makes this response twice as likely as the SFT model."},
        {"tex": fill(r"r_\theta-\beta\cdot<<lr>>=1.5-0.02\cdot<<lr>>\quad =1.5-<<pen>>=<<first>>", d), "say": "The penalised reward this sample contributes."},
        {"tex": fill(r"\gamma\log\pi^{\mathrm{RL}}(x_{\text{pretrain}})=27.8\cdot(-2.0)=<<gt>>", d), "say": "Pretraining term for one text, taking −2.0 as its log-likelihood (illustrative, per token). Large in size, but what matters is its gradient."},
    ],
    "checks": {"log_ratio": lr_, "penalised": first, "gamma_term": gam * lpt},
    "traps": [
        r"For one sample, \(\log(\pi^{\mathrm{RL}}/\pi^{\mathrm{SFT}})\) can be negative; only its average over \(y\sim\pi^{\mathrm{RL}}\), the KL divergence, is guaranteed to be at least 0.",
        r"Two parameter letters: \(\phi\) for the policy, \(\theta\) for the reward model. In DPO and GRPO the policy is \(\pi_\theta\). Never assume θ means the model being trained.",
        r"This is an objective to maximise, written without a minus sign. Code minimises its negative.",
        r"\(\pi(y\mid x)\) of a whole response is a product over tokens, so its log is a sum of token log-probabilities.",
    ],
    "links": [["InstructGPT (paper page)", "n:3c65c17b0d0d8180b958d8299996a063"],
              ["Alignment: SFT, RLHF, DPO family, RLVR", "n:3c65c17b0d0d81d5bed7e608d4061c7a"],
              ["RL for LLMs: RLHF, GRPO, RLVR", "n:3c65c17b0d0d818c9bcff7177325fe56"]],
})

# ---------------------------------------------------------------- PPO
eps_c = 0.2
cases = [(1.5, 2.0), (0.5, -1.0), (1.5, -1.0)]
crow = []
for r_, A__ in cases:
    un = r_ * A__; cl = min(max(r_, 1 - eps_c), 1 + eps_c) * A__
    crow.append({"r": r_, "A": A__, "unclipped": un, "clipped": cl, "min": min(un, cl)})
d = {}
for i, c in enumerate(crow):
    for k in ("r", "A", "unclipped", "clipped", "min"):
        d[f"{k}{i}"] = f(c[k])
EQ.append({
    "id": "ppo", "group": "Post-training", "chip": "PPO clipped objective",
    "title": "The PPO clipped surrogate objective",
    "paper": {"cite": "Schulman et al. 2017, Proximal Policy Optimization Algorithms", "arxiv": "1707.06347", "ver": "v2",
              "eq": "Eq. (7)", "page": 3, "section": "§3", **arx("1707.06347", "v2", 3)},
    "latex": r"L^{CLIP}(\theta)=\hat{\mathbb{E}}_{t}\left[\min(r_{t}(\theta)\hat{A}_{t},\mathrm{clip}(r_{t}(\theta),1-\epsilon,1+\epsilon)\hat{A}_{t})\right]",
    "transcription": "As printed in §3.",
    "symbols": [
        {"id": "Ehat", "tex": r"\hat{\mathbb{E}}_t", "match": ["𝔼ˆt"], "name": "empirical average over time steps",
         "meaning": "The hat means it is computed from samples: \"the empirical average over a finite batch of samples\". Not a true expectation.",
         "shape": "Notation.", "where": "§2.1, p. 2."},
        {"id": "rt", "tex": r"r_t(\theta)", "match": ["rt"], "name": "probability ratio",
         "meaning": r"\(r_t(\theta) = \pi_\theta(a_t \mid s_t) / \pi_{\theta_{\text{old}}}(a_t \mid s_t)\): how much more likely the new policy makes the action that was taken. Equals 1 before any update.",
         "shape": "A positive number per time step.", "where": "§3, p. 3."},
        {"id": "Ahat", "tex": r"\hat{A}_t", "match": ["Aˆt"], "name": "advantage estimate",
         "meaning": "How much better the action was than expected; the hat says it is an estimate (computed with GAE in the paper, Eq. 11).", "shape": "A number per time step.", "where": "§2.1, p. 2; Eq. (11), p. 5."},
        {"id": "eps", "tex": r"\epsilon", "match": ["ϵ", "ε"], "name": "clip range",
         "meaning": "How far the ratio may move before the objective stops rewarding the move. The paper: \"say, ε = 0.2\".", "shape": "A number.", "where": "§3, p. 3."},
        {"id": "clip", "tex": r"\mathrm{clip}", "match": ["clip"], "name": "clip",
         "meaning": r"\(\mathrm{clip}(r, 1-\epsilon, 1+\epsilon)\) pins r into the interval [0.8, 1.2].", "shape": "A function.", "where": "§3, p. 3."},
        {"id": "min", "tex": r"\min", "match": ["min"], "name": "the smaller of the two",
         "meaning": "Takes the more pessimistic value, so the clip only ever removes gains, never hides losses (\"a lower bound ... on the unclipped objective\").", "shape": "A function.", "where": "§3, p. 3."},
        {"id": "theta", "tex": r"\theta", "match": ["θ"], "name": "policy parameters",
         "meaning": "Being trained; θ_old are the parameters that generated the samples.", "shape": "All weights.", "where": "§2.1."},
    ],
    "aloud": "L clip of theta is the batch average, over time steps, of the smaller of: the ratio times the advantage, and the ratio clipped to between one minus epsilon and one plus epsilon, times the advantage.",
    "steps_note": "ε = 0.2 (the paper's example value); three time steps with illustrative ratios and advantages.",
    "steps": [
        {"tex": fill(r"r=<<r0>>,\ \hat A=<<A0>>:\quad \min(<<unclipped0>>,\ 1.2\cdot <<A0>>=<<clipped0>>)=<<min0>>", d), "say": "Good action already made much likelier: the gain is capped."},
        {"tex": fill(r"r=<<r1>>,\ \hat A=<<A1>>:\quad \min(<<unclipped1>>,\ 0.8\cdot(<<A1>>)=<<clipped1>>)=<<min1>>", d), "say": "Bad action already made much rarer: credit for pushing it further is capped too."},
        {"tex": fill(r"r=<<r2>>,\ \hat A=<<A2>>:\quad \min(<<unclipped2>>,\ 1.2\cdot(<<A2>>)=<<clipped2>>)=<<min2>>", d), "say": "Bad action made likelier: the full penalty stays. This is why it is a pessimistic bound."},
        {"tex": fill(r"L^{CLIP}=\tfrac13(<<min0>>+(<<min1>>)+(<<min2>>))", d) + r"\quad =" + f((crow[0]["min"] + crow[1]["min"] + crow[2]["min"]) / 3), "say": "The empirical average over the three steps (to be maximised)."},
    ],
    "checks": {"cases": crow, "mean": (crow[0]["min"] + crow[1]["min"] + crow[2]["min"]) / 3},
    "traps": [
        r"\(r_t\) here is a probability ratio, not a reward (rewards are \(r_t\) in most RL papers, including later in this one). Read the definition line.",
        r"The superscript CLIP is a label. \(L\) here is maximised, despite the letter usually meaning a loss.",
        r"\(\hat{\mathbb{E}}_t\) is a sample average. A hat on an expectation, an advantage or a gradient (\(\hat{g}\)) means estimated from data.",
        r"The DeepSeekMath version (GRPO's paper, Eq. 1) also divides by the response length \(|o|\), averaging over tokens: a per-token form for language models.",
    ],
    "links": [["Policy gradients and actor-critic: from REINFORCE to PPO", "n:3ee5c17b0d0d8101a262d3620e75747c"],
              ["RL for LLMs: RLHF, GRPO, RLVR", "n:3c65c17b0d0d818c9bcff7177325fe56"]],
})

# ---------------------------------------------------------------- DPO
bD = 0.1; lw, lwr, ll, llr = -10.0, -11.0, -12.0, -11.5
mw = lw - lwr; ml = ll - llr; marg = bD * (mw - ml); sg = 1 / (1 + math.exp(-marg)); Ld = -math.log(sg)
d = {"mw": f(mw), "ml": f(ml), "marg": f(marg), "sg": f(sg, 4), "L": f(Ld, 4), "l2": f(math.log(2), 4)}
EQ.append({
    "id": "dpo", "group": "Post-training", "chip": "DPO loss",
    "title": "The DPO loss",
    "paper": {"cite": "Rafailov et al. 2023, Direct Preference Optimization: Your Language Model is Secretly a Reward Model", "arxiv": "2305.18290", "ver": "v3",
              "eq": "Eq. (7)", "page": 4, "section": "§4", **arx("2305.18290", "v3", 4)},
    "latex": r"\mathcal{L}_{\text{DPO}}(\pi_{\theta};\pi_{\text{ref}})=-\mathbb{E}_{(x,y_{w},y_{l})\sim\mathcal{D}}\left[\log\sigma\left(\beta\log\frac{\pi_{\theta}(y_{w}\mid x)}{\pi_{\text{ref}}(y_{w}\mid x)}-\beta\log\frac{\pi_{\theta}(y_{l}\mid x)}{\pi_{\text{ref}}(y_{l}\mid x)}\right)\right]",
    "transcription": "As printed in §4.",
    "symbols": [
        {"id": "pith", "tex": r"\pi_\theta", "match": ["πθ"], "name": "the policy being trained",
         "meaning": "The language model; π(y | x) is the probability of a whole response.", "shape": "A probability per (x, y).", "where": "§3-4."},
        {"id": "piref", "tex": r"\pi_{\text{ref}}", "match": ["πref"], "name": "frozen reference model",
         "meaning": "Usually the SFT model; it is not updated.", "shape": "Same as the policy.", "where": "§3, Eq. (3), p. 3."},
        {"id": "yw", "tex": r"y_w,\ y_l", "match": ["yw", "yl"], "name": "preferred and dispreferred responses",
         "meaning": "w for win, l for lose: a human (or model) preferred y_w over y_l for prompt x.", "shape": "Two token sequences.", "where": "§3, p. 2-3."},
        {"id": "D", "tex": r"\mathcal{D}", "match": ["𝒟"], "name": "the preference dataset",
         "meaning": "A fixed set of (prompt, preferred, dispreferred) triples. Offline: nothing is sampled from the policy during training.", "shape": "Notation.", "where": "§3, p. 3."},
        {"id": "sig", "tex": r"\sigma", "match": ["σ"], "name": "logistic sigmoid",
         "meaning": r"\(\sigma(z) = 1/(1+e^{-z})\), the Bradley-Terry probability that y_w beats y_l. Not a standard deviation.", "shape": "A number in (0, 1).", "where": "§3, Eq. (2), p. 3."},
        {"id": "beta", "tex": r"\beta", "match": ["β"], "name": "KL strength",
         "meaning": "Same role as β in the RLHF objective: how far the policy may move from the reference. The paper uses 0.1 by default and 0.5 for TL;DR summarisation.", "shape": "A number.", "where": "Eq. (3), p. 3; values in Appendix B, p. 20."},
        {"id": "semi", "tex": r";\pi_\text{ref}", "match": [";"], "name": "semicolon",
         "meaning": "The loss is a function of π_θ, with π_ref held fixed as a setting.", "shape": "Notation.", "where": "Eq. (7)."},
    ],
    "aloud": "The DPO loss is minus the average, over preference triples, of the log-sigmoid of: beta times how much more the policy likes the winner than the reference did, minus beta times the same for the loser.",
    "steps_note": "One pair; summed token log-probabilities (illustrative), β = 0.1.",
    "steps": [
        {"tex": r"\log\pi_\theta(y_w\mid x)=-10\quad \log\pi_{\text{ref}}(y_w\mid x)=-11\quad \log\pi_\theta(y_l\mid x)=-12\quad \log\pi_{\text{ref}}(y_l\mid x)=-11.5", "say": "Whole-response log-probabilities: sums over tokens."},
        {"tex": fill(r"\log\frac{\pi_\theta(y_w)}{\pi_{\text{ref}}(y_w)}=<<mw>>,\quad \log\frac{\pi_\theta(y_l)}{\pi_{\text{ref}}(y_l)}=<<ml>>", d), "say": "The policy raised the winner and lowered the loser, relative to the reference."},
        {"tex": fill(r"\beta(<<mw>>-(<<ml>>))=<<marg>>,\quad \sigma(<<marg>>)=<<sg>>", d), "say": "The implicit reward margin and its Bradley-Terry probability."},
        {"tex": fill(r"\mathcal{L}=-\log <<sg>>=<<L>>\quad \text{at the start } (\pi_\theta=\pi_{\text{ref}}):\quad -\log\sigma(0)=\log 2=<<l2>>)", d), "say": "Below log 2 means the policy already prefers the winner more than the reference does."},
    ],
    "checks": {"margin": marg, "sigmoid": sg, "loss": Ld, "loss_at_start": math.log(2)},
    "traps": [
        r"\(\sigma\) is the sigmoid here; in LayerNorm and statistics it is a standard deviation. Context: a function applied to something in brackets.",
        r"\(\pi(y\mid x)\) is a probability of a whole response; implementations sum token log-probabilities (not average them), which is why longer responses get larger log-ratios.",
        r"\(\mathcal{D}\) is fixed data, unlike RLHF's \(D_{\pi^{\mathrm{RL}}}\), which samples from the policy. That one subscript is the online versus offline difference.",
    ],
    "links": [["DPO (paper page, with a live preference toy)", "n:3c65c17b0d0d818bb1d8cafd30e20f9e"],
              ["Alignment: SFT, RLHF, DPO family, RLVR", "n:3c65c17b0d0d81d5bed7e608d4061c7a"]],
})

# ---------------------------------------------------------------- GRPO advantage
rv = np.array([1.0, 0.0, 0.0, 1.0]); mn = rv.mean(); sp = rv.std(ddof=0); ss = rv.std(ddof=1)
Ap = (rv - mn) / sp; As = (rv - mn) / ss
d = {"mn": f(mn), "sp": f(sp), "ss": f(ss, 4), "Ap": bmat(Ap[None, :]), "As": bmat(As[None, :], 3)}
EQ.append({
    "id": "grpo", "group": "Post-training", "chip": "GRPO advantage",
    "title": "GRPO's group-relative advantage",
    "paper": {"cite": "Shao et al. 2024, DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models", "arxiv": "2402.03300", "ver": "v3",
              "eq": "inline, §4.1.2 (plugged into Eq. (3))", "page": 14, "section": "§4.1.2", **arx("2402.03300", "v3", 14)},
    "latex": r"\hat{A}_{i,t}=\widetilde{r}_{i}=\frac{r_{i}-{\rm mean}(\mathbf{r})}{ {\rm std}(\mathbf{r})}",
    "transcription": "As printed inline in §4.1.2 (outcome supervision).",
    "symbols": [
        {"id": "A", "tex": r"\hat{A}_{i,t}", "match": ["Aˆi,t"], "name": "advantage of token t in output i",
         "meaning": "Every token of output i gets the same value (outcome supervision): one score for the whole answer.", "shape": r"A number per token; here \(G = 4\) outputs.", "where": "§4.1.2, p. 14."},
        {"id": "rt", "tex": r"\widetilde{r}_i", "match": ["r~i", "r̃i"], "name": "normalised reward (the tilde)",
         "meaning": "The tilde marks a transformed version of r_i: here centred and scaled within the group.", "shape": "A number per output.", "where": "§4.1.2, p. 14."},
        {"id": "ri", "tex": "r_i", "match": ["ri"], "name": "reward of output i",
         "meaning": "The reward model's (or a checker's) score for the i-th sampled answer.", "shape": "A number.", "where": "§4.1.2, p. 14."},
        {"id": "r", "tex": r"\mathbf{r}", "match": ["r", "𝐫"], "name": "all G rewards for this question",
         "meaning": r"Bold: the vector \(\{r_1, \ldots, r_G\}\) for one question's group of outputs.", "shape": r"\(G\) numbers.", "where": "§4.1.2, p. 14."},
        {"id": "mean", "tex": r"\mathrm{mean}", "match": ["mean"], "name": "group average",
         "meaning": "Average over this question's G outputs: the baseline that replaces PPO's value network.", "shape": "A number.", "where": "§4.1.2."},
        {"id": "std", "tex": r"\mathrm{std}", "match": ["std"], "name": "group standard deviation",
         "meaning": "The paper does not say whether it divides by G or G − 1. TRL's implementation divides by G − 1 and adds 10⁻⁴ to the denominator.", "shape": "A number.", "where": "§4.1.2 (not specified further)."},
    ],
    "aloud": "The advantage of every token in output i equals output i's normalised reward: its reward minus the group's mean reward, divided by the group's standard deviation.",
    "steps_note": "G = 4 answers to one maths question, checked right (1) or wrong (0).",
    "steps": [
        {"tex": fill(r"\mathbf{r}=(1,0,0,1),\quad \mathrm{mean}(\mathbf{r})=<<mn>>", d), "say": "Half the group is right."},
        {"tex": fill(r"\mathrm{std}\ \text{dividing by } G:\ <<sp>>\ \Rightarrow\ \hat{A}=<<Ap>>", d), "say": "Right answers get +1 for every token, wrong ones −1."},
        {"tex": fill(r"\mathrm{std}\ \text{dividing by } G-1:\ <<ss>>\ \Rightarrow\ \hat{A}=<<As>>", d), "say": "The same group under the other convention: every advantage is about 13% smaller."},
        {"tex": r"\mathbf{r}=(1,1,1,1):\ \mathrm{std}=0\ \Rightarrow\ \tfrac{0}{0}", "say": "All right (or all wrong): the formula has no value; with TRL's 10⁻⁴ every advantage is 0, so the question teaches nothing."},
    ],
    "checks": {"mean": mn, "std_pop": sp, "std_sample": ss, "A_pop": Ap.tolist(), "A_sample": As.tolist()},
    "traps": [
        r"\(\mathrm{std}\) is ambiguous: divide by \(G\) or \(G-1\)? The paper does not say. With small groups the difference is visible (here 0.5 against 0.577). TRL divides by \(G-1\) (<a href=\"https://github.com/huggingface/trl/blob/14c8d7019319d187e3ac3cbee5906ec46d95b89b/trl/trainer/utils.py#L986\" target=\"_blank\" rel=\"noopener noreferrer\">nanstd</a>) and adds \(10^{-4}\) (<a href=\"https://github.com/huggingface/trl/blob/14c8d7019319d187e3ac3cbee5906ec46d95b89b/trl/trainer/grpo_trainer.py#L2702\" target=\"_blank\" rel=\"noopener noreferrer\">grpo_trainer.py</a>).",
        r"The subscript pair \(i,t\) means output i, token t; the value does not depend on t under outcome supervision.",
        r"Tilde, hat, bold: \(\widetilde{r}_i\) transformed, \(\hat{A}\) estimated, \(\mathbf{r}\) a vector. Three marks on one line, three meanings.",
    ],
    "links": [["DeepSeekMath (paper page, with a live GRPO toy)", "n:3c65c17b0d0d817f9fc5cb9a9fbcbee5"],
              ["RL for LLMs: RLHF, GRPO, RLVR", "n:3c65c17b0d0d818c9bcff7177325fe56"]],
})

# ---------------------------------------------------------------- GRPO KL estimator
pth = np.array([0.5, 0.3, 0.2]); pref = np.array([0.4, 0.4, 0.2])
rho = pref / pth; k3 = rho - np.log(rho) - 1; k1 = -np.log(rho)
Ek3 = float((pth * k3).sum()); KL = float((pth * np.log(pth / pref)).sum()); Ek1 = float((pth * k1).sum())
d = {"rho": bmat(rho[None, :], 3), "k3": bmat(k3[None, :], 4), "k1": bmat(k1[None, :], 4), "Ek3": f(Ek3, 4), "KL": f(KL, 4),
     "k30": f(k3[0], 4), "k10": f(k1[0], 4), "k11": f(k1[1], 4)}
EQ.append({
    "id": "kl3", "group": "Post-training", "chip": "GRPO's KL estimator",
    "title": "GRPO's per-token KL estimator",
    "paper": {"cite": "Shao et al. 2024, DeepSeekMath", "arxiv": "2402.03300", "ver": "v3",
              "eq": "Eq. (4)", "page": 14, "section": "§4.1.1", **arx("2402.03300", "v3", 14)},
    "latex": r"\mathbb{D}_{KL}\left[\pi_{\theta}||\pi_{ref}\right]=\frac{\pi_{ref}(o_{i,t}|q,o_{i,<t})}{\pi_{\theta}(o_{i,t}|q,o_{i,<t})}-\log\frac{\pi_{ref}(o_{i,t}|q,o_{i,<t})}{\pi_{\theta}(o_{i,t}|q,o_{i,<t})}-1",
    "transcription": "As printed (the paper writes || between the two distributions).",
    "symbols": [
        {"id": "DKL", "tex": r"\mathbb{D}_{KL}[\cdot\|\cdot]", "match": ["𝔻KL"], "name": "KL divergence (here: its estimate)",
         "meaning": r"Written like the true KL, but the right side is a single-token estimate (Schulman 2020): averaged over tokens sampled from \(\pi_\theta\), it equals the KL.",
         "shape": "A number per token.", "where": "Eq. (4), p. 14."},
        {"id": "bars", "tex": r"\|", "match": ["|"], "name": "\"from\": the order matters",
         "meaning": r"\(\mathbb{D}_{KL}[P \| Q]\) averages over P. KL is not symmetric: \([\pi_\theta \| \pi_{ref}]\) and \([\pi_{ref} \| \pi_\theta]\) are different numbers.",
         "shape": "Notation.", "where": "Standard."},
        {"id": "o", "tex": r"o_{i,t}", "match": ["oi,t"], "name": "token t of output i",
         "meaning": "The token actually sampled.", "shape": "A token id.", "where": "§4.1.1."},
        {"id": "ctx", "tex": r"q,o_{i,<t}", "match": ["oi,<t"], "name": "the question and the tokens before t",
         "meaning": r"Subscript \(<t\) means all positions before t.", "shape": "A token sequence.", "where": "§4.1.1."},
        {"id": "q", "tex": "q", "match": ["q"], "name": "the question (prompt)", "meaning": "The input the group of outputs answers.", "shape": "A token sequence.", "where": "§4.1.1, p. 13."},
        {"id": "pref", "tex": r"\pi_{ref}", "match": ["πref"], "name": "reference model",
         "meaning": "Frozen copy of the policy, reset at each outer iteration (Algorithm 1, line 3).", "shape": "A probability per token.", "where": "Algorithm 1, p. 14."},
        {"id": "pth", "tex": r"\pi_\theta", "match": ["πθ"], "name": "the policy being trained", "meaning": "Probability the current policy gives the sampled token.", "shape": "A probability per token.", "where": "§4.1.1."},
    ],
    "aloud": "The KL from the policy to the reference, for one sampled token, is estimated as the ratio of the reference's probability to the policy's, minus the log of that ratio, minus one.",
    "steps_note": "A 3-token vocabulary; policy π_θ = (0.5, 0.3, 0.2), reference π_ref = (0.4, 0.4, 0.2) at one position (illustrative).",
    "steps": [
        {"tex": fill(r"\rho=\frac{\pi_{ref}}{\pi_\theta}=<<rho>>", d), "say": "The ratio for each possible token."},
        {"tex": fill(r"\rho-\log\rho-1=<<k3>>", d), "say": "The estimate if that token is the one sampled. Never negative: x − log x − 1 ≥ 0, equal to 0 only at x = 1."},
        {"tex": fill(r"\sum_{o}\pi_\theta(o)\,(\rho-\log\rho-1)=<<Ek3>>\quad =\mathbb{D}_{KL}[\pi_\theta\|\pi_{ref}]=<<KL>>", d), "say": "Averaged over tokens drawn from π_θ it equals the true KL exactly: unbiased."},
        {"tex": fill(r"\text{the plain estimate}\quad -\log\rho=<<k1>>", d), "say": "Also unbiased, but it is negative for the second token: a single sample can say KL < 0."},
    ],
    "checks": {"rho": rho.tolist(), "k3": k3.tolist(), "E_k3": Ek3, "KL": KL, "E_k1": Ek1},
    "traps": [
        r"The left side looks like the full KL; the right side is a per-token sample. Names in papers are sometimes the target, not what is computed.",
        r"\"Guaranteed to be positive\" (the paper) is strictly \"non-negative\": it is 0 when the two models agree on the token.",
        r"The \(||\) order: this is KL from \(\pi_\theta\) to \(\pi_{ref}\) with samples from \(\pi_\theta\), the mode-seeking direction RLHF uses.",
    ],
    "links": [["DeepSeekMath (paper page)", "n:3c65c17b0d0d817f9fc5cb9a9fbcbee5"],
              ["Approximating KL divergence (Schulman 2020, the source of the estimator)", "http://joschu.net/blog/kl-approx.html"],
              ["RL for LLMs: RLHF, GRPO, RLVR", "n:3c65c17b0d0d818c9bcff7177325fe56"]],
})

# ---------------------------------------------------------------- write
ORDER = ["attn", "mha", "ln", "lm", "adam", "lora", "chin", "nce", "ddpm", "rlhf", "ppo", "dpo", "grpo", "kl3"]
EQ.sort(key=lambda e: ORDER.index(e["id"]))


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, str):
        return o.replace('\\"', '"')
    if isinstance(o, (np.floating,)):
        return float(o)
    return o


with open(os.path.join(HERE, "equations.json"), "w") as fh:
    json.dump({"generated_by": "build_equations.py", "equations": clean(EQ)}, fh, ensure_ascii=False, indent=1)
print(len(EQ), "equations written")
