"""Recompute every number the page reproduces from the paper (arXiv 1706.03762v7, extracts in inputs/).
usage: python3 recompute.py   (stdlib only; prints each check and writes inputs/recompute.json)

1. Parameters of the base model and of every Table 3 row from its configuration.
2. Training FLOPs by the paper's footnote method: hours x GPUs x sustained TFLOPS (P100 = 9.5).
3. The learning-rate schedule (equation 3) and its peak.
4. The Table 1 crossover: self-attention n^2 d against recurrence n d^2 per layer.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = {}


def params(N=6, d=512, dff=2048, h=8, dk=None, dv=None, V=37000, bias=True, ln=True, out_bias=False):
    """Encoder-decoder parameter count with one shared embedding (section 3.4).
    Attention: W_Q, W_K are d x (h dk), W_V is d x (h dv), W_O is (h dv) x d (section 3.2.2)."""
    dk = dk or d // h; dv = dv or d // h
    att = d * h * dk * 2 + d * h * dv * 2 + ((2 * h * dk + h * dv + d) if bias else 0)
    ffn = 2 * d * dff + ((dff + d) if bias else 0)
    lnp = 2 * d if ln else 0
    enc = att + ffn + 2 * lnp
    dec = 2 * att + ffn + 3 * lnp
    return V * d + N * (enc + dec) + (V if out_bias else 0)


base = params()
OUT['base_params'] = base
print('1. base model parameters with V = 37,000 shared, tied, with biases and LayerNorm:', f'{base:,}', '(paper: 65M)')
print('   embedding', f'{37000*512:,}', ' encoder layer', f'{params(N=1, V=0) - 0:,}', '(both stacks for N=1)')
# Vocabulary that would make the base count exactly 65M
v65 = (65e6 - params(V=0)) / 512
print('   a vocabulary of', round(v65), 'would give 65.0M exactly')
OUT['vocab_for_65M'] = round(v65)

# Table 3 rows: (label, kwargs, paper params in millions or None)
T3 = [
    ('base', {}, 65),
    ('(B) d_k = 16', dict(dk=16), 58), ('(B) d_k = 32', dict(dk=32), 60),
    ('(C) N = 2', dict(N=2), 36), ('(C) N = 4', dict(N=4), 50), ('(C) N = 8', dict(N=8), 80),
    ('(C) d_model = 256, d_k = d_v = 32', dict(d=256, dk=32, dv=32), 28),
    ('(C) d_model = 1024, d_k = d_v = 128', dict(d=1024, dk=128, dv=128), 168),
    ('(C) d_ff = 1024', dict(dff=1024), 53), ('(C) d_ff = 4096', dict(dff=4096), 90),
    ('big', dict(d=1024, dff=4096, h=16), 213),
]
rows = []
for lab, kw, paper in T3:
    p = params(**kw)
    rows.append(dict(row=lab, ours=round(p / 1e6, 2), paper=paper, diff=round(p / 1e6 - paper, 2)))
    print('   %-38s ours %7.2fM  paper %4dM  diff %+.2fM' % (lab, p / 1e6, paper, p / 1e6 - paper))
OUT['table3_params'] = rows

# 2. Training FLOPs (Table 2 footnote 5)
P100 = 9.5e12
fl_base = 12 * 3600 * 8 * P100
fl_big = 3.5 * 24 * 3600 * 8 * P100
OUT['flops'] = dict(base=fl_base, big=fl_big)
print('2. base: 12 h x 8 GPUs x 9.5 TFLOPS = %.3g FLOPs (paper 3.3e18); big: 3.5 days -> %.3g (paper 2.3e19)' % (fl_base, fl_big))
print('   steps: base 100,000 x 0.4 s = %.1f h; big 300,000 x 1.0 s = %.2f days' % (100000 * 0.4 / 3600, 300000 / 86400))


# 3. Learning rate (equation 3)
def lrate(step, d=512, warm=4000):
    return d ** -0.5 * min(step ** -0.5, step * warm ** -1.5)


peak = lrate(4000)
OUT['lr'] = dict(peak=peak, at_100k=lrate(100000), at_300k=lrate(300000))
print('3. peak learning rate at step 4,000: %.3e (= (512 x 4000)^-0.5); at 100K steps %.3e; at 300K %.3e' % (peak, lrate(100000), lrate(300000)))

# 4. Table 1 crossover, per-layer multiply-adds: self-attention n^2 d, recurrent n d^2
for n in (25, 50, 512, 1000):
    print('4. n = %4d, d = 512: self-attention %.3g, recurrent %.3g, ratio %.3f' % (n, n * n * 512, n * 512 * 512, n / 512))
OUT['crossover_n'] = 512

# Table 2 cost ratios quoted in the text
print('   EN-FR big 2.3e19 against the previous best single model ConvS2S 1.5e20: %.2f (paper: less than 1/4)' % (2.3e19 / 1.5e20))
print('   EN-DE big 28.4 against best previous (ConvS2S Ensemble 26.36): +%.2f BLEU (paper: more than 2.0)' % (28.4 - 26.36))
print('   Table 3 (A): 1 head 24.9 against base 25.8: %.1f BLEU' % (24.9 - 25.8))
json.dump(OUT, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
