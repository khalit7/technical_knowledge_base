"""Write parts/20_read_j.html (the closed code block in Reading section 11) from out/quotes.json and out/demos.txt.
Every quoted line comes from the located source (quotes.py), so file:line references are checked."""
import html, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
Q = json.load(open(os.path.join(HERE, "out", "quotes.json")))
qq = Q["quotes"]


def block(key, title, note):
    q = qq[key]
    lines = q["text"].split("\n")
    ind = min(len(l) - len(l.lstrip()) for l in lines if l.strip())
    body = html.escape("\n".join(l[ind:] for l in lines))
    loc = f'{q["file"]}, lines {q["first"]} to {q["last"]}' if q["first"] != q["last"] else f'{q["file"]}, line {q["first"]}'
    return (f'<p><b>{title}</b> <span class="small mute">({html.escape(loc)})</span> {note}</p>\n<pre>{body}</pre>\n')


out = ['<details class="dp"><summary>The code, at pinned versions <span class="mute">(transformers and the tiny GPT, 9 excerpts)</span></summary><div class="b">\n',
       f'<p>Located by pattern with <code>src/code/quotes.py</code> in transformers {Q["transformers"]} and the topic\'s '
       '<code>src/data/tiny_gpt.py</code>, so the line numbers are checked, not typed.</p>\n',
       block("tiny_ssm_doc", "The tiny GPT's SSM, in one sentence of maths.",
             "a<sub>t</sub> = exp(dt<sub>t</sub> A<sub>h</sub>) is one decay per head per step (Mamba-2's scalar A)."),
       block("tiny_ssm_dual", "Training: the dual (quadratic) form.",
             "<code>seg</code> is the log of L, the decay mask; <code>G</code> is L &#8857; C B<sup>&#8868;</sup>, an attention-like (heads, T, T) matrix."),
       block("tiny_ssm_rec", "Decoding: the same layer as a recurrence.",
             "One state of (heads, P, N) = (16, 32, 16) per layer, whatever the context."),
       block("mamba2_L", "transformers' Mamba-2 reference path builds the same mask", "within each chunk ..."),
       block("mamba2_segsum", "... with a segment sum instead of a difference of cumulative sums",
             "(why: the decay-mask mistake above)."),
       block("gdn_loop", "Gated DeltaNet, one token (Qwen3-Next).",
             "Decay the state, read what the key holds (<code>kv_mem</code>), write &beta; times the error, read with the query."),
       block("kda_loop", "Kimi Delta Attention, one token (Kimi Linear).",
             "The same delta step; the decay <code>g_i</code> has one value per key channel instead of one per head."),
       block("rwkv_wkv", "RWKV-4's WKV, one token (CPU fallback).",
             "A numerator and a denominator carried as decayed running sums, with a running maximum for safe exponentials."),
       block("mamba1_loop", "Mamba-1's sequential fallback.",
             "What runs when the CUDA scan kernel is missing: a Python loop over positions."),
       '<p><b>The two small checks quoted in section 2 and the decay-mask mistake</b> (<code>src/code/demos.py</code>, CPU, output pasted):</p>\n',
       '<pre>' + html.escape(open(os.path.join(HERE, "out", "demos.txt")).read().strip()) + '</pre>\n',
       '</div></details>\n']
dst = os.path.normpath(os.path.join(HERE, "..", "parts", "20_read_j.html"))
open(dst, "w").write("".join(out))
print("wrote", dst, sum(len(s) for s in out), "bytes")
