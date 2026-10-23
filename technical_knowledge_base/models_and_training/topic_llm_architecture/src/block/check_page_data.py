"""Block lab: check that the built page embeds exactly the data make_page_data.py writes from src/block/out/, and
that every number written in the tab's prose equals the recorded or calculated value it quotes.
Run after the build: python3 src/block/check_page_data.py   (needs node for the Config calculator numbers)
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..")
PAGE = os.path.join(SRC, "..", "index.html")
OUT = os.path.join(HERE, "out")
fails = []


def ok(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


html = open(PAGE, encoding="utf-8").read()
part = open(os.path.join(SRC, "parts", "31_js_bl_0data.js"), encoding="utf-8").read()
m = re.search(r"window\.BLD=(\{.*?\});\n", html, re.S)
ok(m is not None, "page defines window.BLD")
emb = json.loads(m.group(1))
ok(emb == json.loads(re.search(r"window\.BLD=(\{.*\});", part, re.S).group(1)), "page data equals parts/31_js_bl_0data.js")
# regenerate and compare (make_page_data is deterministic)
before = part
subprocess.run([sys.executable, os.path.join(HERE, "make_page_data.py")], check=True, capture_output=True,
               env={**os.environ, "BL_PRE": emb["pair"]["pre"], "BL_POST": emb["pair"]["post"]})
ok(open(os.path.join(SRC, "parts", "31_js_bl_0data.js"), encoding="utf-8").read() == before, "regenerated data part is identical")

# tab text only
tab = html[html.index('<div class="tab" id="t-block"'):html.index('<div class="tab" id="t-attn"') if '<div class="tab" id="t-attn"' in html else None]
txt = re.sub(r"<[^>]+>", " ", tab)


def has(s, why):
    ok(s in txt, f"prose has {s!r} ({why})")


def c(n):
    return f"{n:,}"


fl = json.load(open(os.path.join(OUT, "flops.json")))["presets"]["baseline"]
has(c(fl["counter_total"]), "FLOP counter, 256-token forward")
ok(fl["match"], "counter equals formula for baseline")
w = sum(v for k, v in fl["counter_by_op"].items() if not k.startswith("attn"))
a = fl["counter_by_op"]["attn_scores_qk"] + fl["counter_by_op"]["attn_weighted_v"]
has(c(w), "weight FLOPs"); has(c(a), "attention FLOPs")
has(c(fl["train_step_counter_T255"]), "train step counter"); has(c(fl["forward_formula_T255"]), "forward T=255")
has(f'{fl["train_over_forward"]:.1f}x', "train/forward ratio")
T = 256
per = {k: v // T for k, v in fl["formula_by_op"].items()}
has(c(per["ffn_up"] + per["ffn_down"]), "FFN per token"); has(c(sum(per.values())), "total per token at 256")
has(c(per["unembed"]), "unembed per token"); has(c(per["qkv_proj"]), "qkv per token")
has(c(per["attn_scores_qk"] + per["attn_weighted_v"]), "attention per token"); has(c(per["out_proj"]), "o per token")
ffn_share = round(100 * (per["ffn_up"] + per["ffn_down"]) / sum(per.values()))
has(f"FFN is the largest cost per token ({ffn_share}%)", "FFN share")
t = json.load(open(os.path.join(OUT, "trace_ref_baseline_s1500.json")))
has(f'{t["final"]["p_next"] * 100:.1f}%', "p(next) of traced token")
has(f'position {t["pos"]}', "traced position")
has(f'{t["final"]["check_max_abs_err_vs_model_forward"]:.1e}'.replace("e-05", "e-5"), "trace vs forward error")
att = [[max(range(len(r)), key=lambda j: r[j]), max(r)] for r in t["layers"][0]["attn"]]
for h in (0, 5, 6, 4):
    has(f"{att[h][1]:.2f}", f"block 1 head {h + 1} top weight")
b5 = [max(r) for r in t["layers"][4]["attn"]] + [max(r) for r in t["layers"][5]["attn"]]
has(f"{min(x for x in b5 if x > 0.85):.2f} to {max(b5):.2f}", "sink-like weights in blocks 5 and 6")
r54 = t["layers"][4]["attn"][3]
ok(max(range(len(r54)), key=lambda j: r54[j]) == 22 and f"{max(r54):.2f}" == "0.13", "block 5 head 4 top on position 22 with 0.13")
mi = json.load(open(os.path.join(OUT, "mistakes.json")))
has(f'{mi["baseline_loss"]:.2f}', "correct-forward loss")
ok(mi["baseline_loss"] == mi["rewritten_forward_loss"], "rewritten forward reproduces the loss")
ns = [x for x in mi["cases"] if x["bug"] == "no_scale"][0]
has(f'{ns["loss"]:.2f}', "no-scale loss in interview answer")
# Config calculator numbers (node)
js = r"""
const fs=require('fs');global.window=global;const P=process.argv[1];
eval(fs.readFileSync(P+'/33_js_cc_0data.js','utf8'));eval(fs.readFileSync(P+'/33_js_cc_1core.js','utf8'));
function cx(s,k){let lo=1,hi=1<<26;const g=c=>{const f=CC.flops(s,c);return [k=='d'?f.decode_attn:f.prefill_attn,f.weights]};while(hi-lo>1){const m=(lo+hi)>>1;const [a,w]=g(m);if(a>=w)hi=m;else lo=m}return hi}
const t=CC.normalise({model_type:'gpt2',n_embd:256,n_layer:6,n_head:8,vocab_size:4096,n_positions:256});
const l=CC.normalise(CCD.models.find(x=>x.key==='llama-3.1-8b').cfg);const f=CC.flops(l,131072),p=CC.params(l);
console.log(JSON.stringify({td:cx(t,'d'),tp:cx(t,'p'),ld:cx(l,'d'),lp:cx(l,'p'),w:f.weights,a:f.decode_attn,total:p.total,mm:p.matmul_active}));
"""
r = json.loads(subprocess.run(["node", "-e", js, os.path.join(SRC, "parts")], capture_output=True, text=True, check=True).stdout)
for k in ("td", "tp", "ld", "lp"):
    has(c(r[k]), f"crossover {k}")
has(c(r["total"]), "Llama 3.1 8B total parameters")
has(f'{r["w"] / 1e9:.1f} GFLOPs', "Llama 2N at 128k"); has(f'{r["a"] / 1e9:.1f} GFLOPs', "Llama attention at 128k")
has(f'{r["a"] / r["w"]:.1f}x the weights', "ratio at 128k")
has(f'{r["mm"] / 1e9:.2f}B matrix weights', "Llama N")
# pre/post numbers: the section moved to the Normalisation child on 2026-10-23; its check_data.py checks them
# against this folder's out/runs, gradnorm.json and trace_*.json.
print("FAILED" if fails else "ALL OK", len(fails))
sys.exit(1 if fails else 0)
