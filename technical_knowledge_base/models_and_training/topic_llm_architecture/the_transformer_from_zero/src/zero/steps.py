"""steps.py: run the test of every step of gpt_zero.py on the running sequence (CPU) and record shapes and printed
output for the Build-it-up tab. Writes out/steps.json. Every number on the tab comes from this file's output.
Run: LA_SCRATCH=<scratch>/la python steps.py
"""
import json, math, os, re, sys
import torch
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "src", "data")
sys.path.insert(0, HERE); sys.path.insert(0, DATA)
import gpt_zero as gz
import tiny_gpt

torch.set_num_threads(4)
SCR = os.environ["LA_SCRATCH"]
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
ids = torch.tensor([run["ids"]])                     # (1, 256)
pieces = run.get("pieces") or run.get("tokens")
OUT = []


def step(key):
    rec = {"key": key, "shapes": [], "out": []}
    OUT.append(rec)
    return rec


def sh(rec, name, t, note=""):
    rec["shapes"].append({"name": name, "shape": list(t.shape), "note": note})


def pr(rec, s):
    rec["out"].append(s)
    print(s)


def f6(x):
    return float("%.6g" % x)


torch.manual_seed(0)
cfg = gz.Config()
model = gz.GPT(cfg).eval()              # seed-0 initial weights (identical to tiny_gpt baseline at seed 0)

# STEP 1: config
r = step("config")
pr(r, f"cfg = Config()  # V={cfg.vocab} ctx={cfg.ctx} D={cfg.d} L={cfg.n_layer} H={cfg.n_head}")
pr(r, f"head size hd = D / H = {cfg.d} / {cfg.n_head} = {cfg.hd}")
pr(r, f"FFN hidden F = 4 D = {cfg.f}   (SwiGLU: 8/3 D rounded up to 32 = {gz.Config(swiglu=True).f})")
assert cfg.hd == 32 and cfg.f == 1024

# STEP 2: embedding
r = step("embed")
sh(r, "idx", ids, "token ids of the running sequence")
emb = model.emb
tokv = emb.tok(ids); sh(r, "emb.tok(idx)", tokv, "one row of the (V, D) table per token")
posv = emb.pos(torch.arange(256)); sh(r, "emb.pos(arange(T))", posv, "one row per position, broadcast over B")
x0 = emb(ids); sh(r, "x = tok + pos", x0, "the residual stream starts here")
onehot = F.one_hot(ids, cfg.vocab).float()
diff = (onehot @ emb.tok.weight - tokv).abs().max().item()
pr(r, f"lookup equals one_hot(idx) @ W: max |difference| = {diff:.1e}")
roxy = [i for i, p in enumerate(pieces) if p == " R" and pieces[i + 1] == "o"]
a, b = roxy[0], roxy[1]
same = (tokv[0, a] - tokv[0, b]).abs().max().item()
cos = F.cosine_similarity(x0[0, a], x0[0, b], dim=0).item()
pr(r, f"token \" R\" (\"Roxy\" is 4 tokens: \" R\", \"o\", \"x\", \"y\") at positions {a} and {b}: token vectors differ by {same:.1f}; after adding positions, cosine {cos:.3f}")
r["roxy"] = roxy
# why positions: attention without a mask cannot tell order. Shuffle the tokens and the outputs only shuffle.
# Trained weights (ref_baseline_s1500): its embeddings, its first block's LayerNorm and head 0 of its attention.
ckp = torch.load(os.path.join(SCR, "runs", "ref_baseline_s1500", "ckpt.pt"), map_location="cpu")
tm = gz.GPT(cfg).eval(); tm.load_state_dict(gz.load_tiny(ckp["model"]))
at0 = tm.blocks[0].attn; sl0 = slice(0, cfg.hd)
Wq, Wk, Wv = at0.q.weight[sl0].T, at0.k.weight[sl0].T, at0.v.weight[sl0].T
def unmasked(x):
    x = tm.blocks[0].n1(x)
    q, k, v = x @ Wq, x @ Wk, x @ Wv
    return (q @ k.T / math.sqrt(cfg.hd)).softmax(-1) @ v
torch.manual_seed(4)
perm = torch.randperm(256)
with torch.no_grad():
    t0 = tm.emb.tok(ids)[0]; p0 = tm.emb.pos(torch.arange(256))
    ref_nopos = unmasked(t0); ref_pos = unmasked(t0 + p0)
    d_nopos = ((unmasked(t0[perm]) - ref_nopos[perm]).abs().max() / ref_nopos.abs().max()).item()
    d_pos = ((unmasked(t0[perm] + p0) - ref_pos[perm]).abs().max() / ref_pos.abs().max()).item()
pr(r, f"trained layer-1 head 0, no mask, 256 tokens shuffled: without positions the outputs are the same rows shuffled (largest change {d_nopos:.1e} of the largest output); with positions added: {d_pos:.2f}")
r["perm"] = {"nopos": d_nopos, "pos": round(d_pos, 3)}

# STEP 3: one head by hand
r = step("one_head")
torch.manual_seed(1)
x = x0[0].detach()                                    # (256, 256)
Wq, Wk, Wv = (torch.randn(cfg.d, cfg.hd) / math.sqrt(cfg.d) for _ in range(3))
y, w = gz.one_head(x, Wq, Wk, Wv)
sh(r, "x", x, "one sequence, no batch dim yet")
sh(r, "q = x @ Wq", x @ Wq, "the same for k and v: (T, hd)")
sh(r, "scores q @ k.T", w, "row i: token i against every token")
sh(r, "y = softmax(masked) @ v", y, "one hd-vector per token")
pr(r, f"rows of w sum to 1: max |sum - 1| = {(w.sum(-1) - 1).abs().max().item():.1e}")
pr(r, f"weights above the diagonal (the future): max = {w.triu(1).abs().max().item():.1f}")
ids2 = ids.clone(); ids2[0, 200] = (ids2[0, 200] + 1) % cfg.vocab
y2, _ = gz.one_head(emb(ids2)[0].detach(), Wq, Wk, Wv)
d_before = (y2[:200] - y[:200]).abs().max().item(); d_after = (y2[200:] - y[200:]).abs().max().item()
pr(r, f"change token 200: outputs at 0..199 move by {d_before:.1f}, at 200..255 by up to {d_after:.1e}")
r["causal"] = {"before": d_before, "after": f6(d_after)}
# why the 1/sqrt(hd) scale: random unit-variance q, k
torch.manual_seed(2)
qq, kk = torch.randn(4096, cfg.hd), torch.randn(4096, cfg.hd)
dots = (qq * kk).sum(-1)
pr(r, f"q.k of random unit-variance vectors, hd={cfg.hd}: std {dots.std().item():.2f} (sqrt(hd) = {math.sqrt(cfg.hd):.2f}); divided by sqrt(hd): {(dots / math.sqrt(cfg.hd)).std().item():.2f}")
for hd in (32, 128):
    torch.manual_seed(3)
    q1, k1 = torch.randn(256, hd), torch.randn(256, hd)
    s_raw = (q1 @ k1.T).softmax(-1).max(-1).values.mean().item()
    s_sc = (q1 @ k1.T / math.sqrt(hd)).softmax(-1).max(-1).values.mean().item()
    pr(r, f"hd={hd}, 256 keys: mean largest softmax weight {s_raw:.2f} unscaled, {s_sc:.2f} scaled")
    r.setdefault("scale", []).append({"hd": hd, "raw": round(s_raw, 3), "scaled": round(s_sc, 3)})

# STEP 4: multi-head
r = step("multi_head")
att = model.blocks[0].attn
xb = model.blocks[0].n1(x0).detach()
B, T, D = xb.shape
H, hd = cfg.n_head, cfg.hd
q = att.q(xb); sh(r, "att.q(x)", q, "(B, T, D): all 8 heads in one matmul")
qh = q.view(B, T, H, hd); sh(r, ".view(B, T, H, hd)", qh, "split D = 8 x 32")
qt = qh.transpose(1, 2); sh(r, ".transpose(1, 2)", qt, "heads before T: 8 independent (T, hd) problems")
kt = att.k(xb).view(B, T, H, hd).transpose(1, 2)
s = qt @ kt.transpose(-2, -1); sh(r, "q @ k.transpose(-2, -1)", s, "8 score matrices")
yfull = att(xb, manual=True)
ysd = att(xb)
heads = []
for h in range(H):
    sl = slice(h * hd, (h + 1) * hd)
    yh, _ = gz.one_head(xb[0], att.q.weight[sl].T, att.k.weight[sl].T, att.v.weight[sl].T)
    heads.append(yh)
ycat = att.o(torch.cat(heads, -1))[None]
sh(r, "merge: .transpose(1, 2).reshape(B, T, D)", yfull, "heads side by side again")
sh(r, "att.o(y)", yfull, "output projection mixes the heads")
pr(r, f"equals 8 separate one_head() calls, concatenated: max |difference| = {(ycat - yfull).abs().max().item():.1e}")
pr(r, f"equals F.scaled_dot_product_attention(is_causal=True): max |difference| = {(ysd - yfull).abs().max().item():.1e}")
try:
    qt.transpose(1, 2).view(B, T, D)
except RuntimeError as e:
    msg = str(e).split("\n")[0]
    pr(r, "merging with .view after .transpose: RuntimeError: " + msg)
    r["view_error"] = msg
pa = sum(p.numel() for p in att.parameters())
pr(r, f"parameters: 4 x D x D = {pa:,}")

# STEP 5: FFN
r = step("ffn")
ffn = model.blocks[0].ffn
h = ffn.up(xb); sh(r, "ffn.up(x)", h, "4 x wider")
sh(r, "gelu(.)", h, "elementwise: shape unchanged")
fo = ffn(xb); sh(r, "ffn.down(.)", fo, "back to D")
one = ffn(xb[:, 157:158])
pr(r, f"position-wise: ffn(x)[157] vs ffn(x[157] alone): max |difference| = {(one[0, 0] - fo[0, 157]).abs().max().item():.1e}")
pf = sum(p.numel() for p in ffn.parameters())
sw = gz.SwiGLU(gz.Config(swiglu=True)); psw = sum(p.numel() for p in sw.parameters())
pr(r, f"parameters: 2 x D x F = {pf:,}; SwiGLU 3 x D x 704 = {psw:,} ({100 * (psw / pf - 1):.1f}% more)")

# STEP 6: block
r = step("block")
blk = model.blocks[0]
xo = blk(x0).detach()
sh(r, "block(x)", xo, "same shape in and out: blocks stack")
rel = ((xo - x0).norm() / x0.norm()).item()
pr(r, f"at initialisation |block(x) - x| / |x| = {rel:.2f}: embeddings start tiny (std 0.02) while LayerNorm hands each sublayer a unit-scale copy")
pb = sum(p.numel() for p in blk.parameters())
pr(r, f"parameters per block: {pb:,} = attention {pa:,} + FFN {pf:,} + 2 LayerNorm gains {2 * cfg.d}")
r["rel"] = round(rel, 4)

# STEP 7: the model
r = step("model")
logits, loss0, _, _ = model(ids[:, :-1], targets=ids[:, 1:])
sh(r, "model(idx[:, :-1])", logits, "one score per vocabulary entry, at every input position")
n = gz.n_params(model); nsd = sum(v.numel() for v in model.state_dict().values())
pr(r, f"parameters: {n:,} (tiny_gpt baseline: {sum(p.numel() for p in tiny_gpt.GPT(tiny_gpt.GPTConfig()).parameters()):,})")
pr(r, f"lm_head.weight is emb.tok.weight: {model.lm_head.weight is model.emb.tok.weight}; summing state_dict() instead counts it twice: {nsd:,}")
torch.manual_seed(0); ref0 = tiny_gpt.GPT(tiny_gpt.GPTConfig())
w0 = max((gz.load_tiny(ref0.state_dict())[k] - v).abs().max().item() for k, v in model.state_dict().items())
pr(r, f"seed 0 initial weights vs tiny_gpt.py seed 0: max |difference| = {w0:.1f}")
ck = torch.load(os.path.join(SCR, "runs", "ref_baseline_s1500", "ckpt.pt"), map_location="cpu")
trained = gz.GPT(cfg).eval(); trained.load_state_dict(gz.load_tiny(ck["model"]))
ref = tiny_gpt.GPT(tiny_gpt.GPTConfig()).eval(); ref.load_state_dict(ck["model"])
with torch.no_grad():
    la, *_ = ref(ids); lb, *_ = trained(ids)
pr(r, f"trained tiny GPT (ref_baseline_s1500) loaded into this file: logits differ by {(la - lb).abs().max().item():.1f}")
r["n_params"] = n; r["n_state_dict"] = nsd

# STEP 8: the loss
r = step("loss")
sh(r, "logits", logits, "predictions made at positions 0..254")
sh(r, "targets = idx[:, 1:]", ids[:, 1:], "the next token at each position")
pr(r, f"untrained loss on the running sequence: {loss0.item():.3f}; uniform guess ln V = ln {cfg.vocab} = {math.log(cfg.vocab):.3f}")
with torch.no_grad():
    _, lt, _, _ = trained(ids[:, :-1], targets=ids[:, 1:])
pr(r, f"trained (1,500 steps): {lt.item():.3f} nats per token, perplexity {math.exp(lt.item()):.1f}")
r["loss0"] = round(loss0.item(), 4); r["loss_trained"] = round(lt.item(), 4)
pr(r, f"untrained logits: std {logits.std().item():.3f}, so softmax is near uniform (largest probability {logits.softmax(-1).max().item():.5f})")

# STEP 9: sampling with a cache
r = step("sample")
with torch.no_grad():
    full, *_ = trained(ids[:, :40])
    cache = []
    _ = trained(ids[:, :30], cache=cache)
    steps_ = [trained(ids[:, t:t + 1], cache=cache)[0] for t in range(30, 40)]
    dec = torch.cat(steps_, 1)
sh(r, "cache[0]['k'] after 40 tokens", cache[0]["k"], "(B, H, tokens so far, hd), per layer")
pr(r, f"decoding tokens 30..39 one at a time with the cache vs one full forward: max |difference| = {(dec - full[:, 30:40]).abs().max().item():.1e}")
from tokenizers import Tokenizer
tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
prompt = torch.tensor([[0] + tok.encode("Roxy was a little rhinoceros.").ids])
g = trained.generate(prompt, 30)
pr(r, "greedy: Roxy was a little rhinoceros." + tok.decode(g[0, prompt.shape[1]:].tolist()))
gen = torch.Generator().manual_seed(0)
g2 = trained.generate(prompt, 30, temperature=0.8, generator=gen)
pr(r, "T 0.8, seed 0: Roxy was a little rhinoceros." + tok.decode(g2[0, prompt.shape[1]:].tolist()))

# code of each step, cut from gpt_zero.py by its markers
src = open(os.path.join(HERE, "gpt_zero.py")).read().split("\n")
marks = [(i, l) for i, l in enumerate(src) if re.search(r"# ==== STEP \d+", l)]
code = {}
for j, (i, l) in enumerate(marks):
    n_ = int(re.search(r"STEP (\d+)", l).group(1))
    end = marks[j + 1][0] if j + 1 < len(marks) else next(k for k in range(i, len(src)) if src[k].startswith("def n_params"))
    blockl = src[i:end]
    while blockl and not blockl[-1].strip():
        blockl.pop()
    code[n_] = {"start": i + 1, "lines": blockl}
for k, rec in enumerate(OUT):
    rec["code"] = code[k + 1]
json.dump({"steps": OUT, "file_lines": len(src)}, open(os.path.join(HERE, "out", "steps.json"), "w"), indent=1)
print("wrote out/steps.json")
