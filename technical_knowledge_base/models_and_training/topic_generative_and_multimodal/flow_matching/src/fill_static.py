"""Write the recorded numbers, tables and code into ../index.html as static text (run by build.sh after assembly).

Before 2026-10-24 the page filled these by script, which a reader with scripts off, the site's search and
html_utils/ledger.py could not see. Sources: out/page_data.json (window.FMD without the sprite sheet, written by
make_page_data.py) and out/page_data_more.json (window.FMY, written by make_data_more.py).
Fills: <... data-fmf="k"></...> from FMD.f; <... data-fmy="k"></...> from FMY.f; the tbody of the paths, image
rounds, timestep, image SDE, production and SD3 tables; the code blocks. Standard library only.
"""
import html, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, "out", "page_data.json")))
Y = json.load(open(os.path.join(HERE, "out", "page_data_more.json")))
PAGE = os.path.join(HERE, "..", "index.html")
s = open(PAGE, encoding="utf-8").read()
bad = []


def pc(v):
    return f"{100 * v:.{0 if v >= 0.1 or v == 0 else 1}f}%"


def fill_attr(s, attr, facts):
    def rep(m):
        k = m.group(3)
        if k not in facts:
            bad.append(f"missing {attr} {k}")
            return m.group(0)
        return m.group(1) + facts[k] + m.group(4)
    return re.sub(r'(<(span|td|p|b)\b[^>]*\b' + attr + r'="([\w.]+)"[^>]*>)(</\2>)', rep, s)


def tbody(s, tid, rows_html, attrs=""):
    pat = r'<tbody id="' + tid + r'"([^>]*)></tbody>'
    if not re.search(pat, s):
        bad.append(f"no empty tbody {tid}")
        return s
    return re.sub(pat, lambda m: '<tbody id="' + tid + '"' + m.group(1) + attrs + '>' + rows_html + '</tbody>', s, count=1)


def pre(s, pid, text):
    pat = r'(<pre class="[^"]*" id="' + pid + r'">)(</pre>)'
    if not re.search(pat, s):
        bad.append(f"no empty pre {pid}")
        return s
    return re.sub(pat, lambda m: m.group(1) + html.escape(text, quote=False) + m.group(2), s, count=1)


s = fill_attr(s, "data-fmf", D["f"])
s = fill_attr(s, "data-fmy", Y["f"])

# paths table (section 6)
E = D["exact"]
def g(rows, n):
    r = next((q for q in rows if q[0] == n), None)
    return pc(r[1]) if r else "n/a"
rows = ""
for nm, k in [("straight (rectified flow)", "linear"), ("cosine VP (SiT's GVP)", "cos"), ("DDPM-style VP (beta 0.1 to 20)", "vp")]:
    rows += (f'<tr><td>{html.escape(nm)}</td><td class="num">{E[k]["straightness"]:.3f}</td><td class="num">{g(E[k]["euler"], 2)}</td>'
             f'<td class="num">{g(E[k]["euler"], 4)}</td><td class="num">{g(E[k]["euler"], 8)}</td>'
             f'<td class="num">{"= Euler" if k == "linear" else g(E[k]["ddim"], 4)}</td></tr>')
s = tbody(s, "fmr-paths", rows)

# image rounds (section 8)
I = D["img"]
def fe(rows, n, col):
    r = next((q for q in rows if q[0] == "euler" and q[1] == n), None)
    return f"{r[col]:.1f}" if r else "n/a"
rows = ""
for nm, key, st in [("1-RF (root)", "fm", I["fm_straight"]), ("2-RF (root)", "rf2", I["rf2_straight"])]:
    rows += (f'<tr><td>{nm}</td>' + "".join(f'<td class="num">{fe(I[key], n, 3)}</td>' for n in [1, 2, 4, 50])
             + f'<td class="num">{fe(I[key], 50, 5)}</td><td class="num">{st:.4f}</td></tr>')
m3 = I["new"]["rf3_2000"]
e3 = {r["steps"]: r for r in m3["euler"]}
rows += ('<tr><td>3-RF (here)</td>' + "".join(f'<td class="num">{e3[n]["fd"]:.1f}</td>' for n in [1, 2, 4, 50])
         + f'<td class="num">{e3[50]["div"]:.1f}</td><td class="num">{m3["straightness"]:.4f}</td></tr>')
s = tbody(s, "fmr-rounds-img", rows)

# timestep schemes (section 11, closed), both budgets; the 2,000-step body starts hidden
T = D["tsched"]
for b in ["2000", "12000"]:
    rows = ""
    for sch in T["hist"]:
        r = T["runs"][f"{b}|{sch}"]
        rows += (f'<tr><td>{html.escape(sch)}</td><td class="num">{r["err"][0]:.3f}</td><td class="num">{r["err"][5]:.3f}</td>'
                 f'<td class="num">{pc(r["e4_on"])}</td><td class="num">{r["e64_w2"]:.3f} &plusmn; {r["e64_w2_sd"]:.3f}</td></tr>')
    s = s.replace('<tbody id="fmr-ts"></tbody>', f'<tbody id="fmr-ts-{b}"{" hidden" if b == "2000" else ""}>{rows}</tbody><tbody id="fmr-ts"></tbody>', 1)
s = s.replace('<tbody id="fmr-ts"></tbody>', '', 1)

# image SDE (section 12)
sde, sdd = I["sde"], I["sde_decay"]
def cell(a, e, n):
    r = next((q for q in a if q["eps"] == e and q["steps"] == n), None)
    return f'<td class="num">{r["fd"]:.1f}</td>' if r else '<td class="num">not run</td>'
rows = '<tr><td>&epsilon; = 0 (ODE)</td>' + "".join(cell(sde, 0, n) for n in [10, 50, 250]) + '</tr>'
for e in [0.5, 1]:
    rows += f'<tr><td>constant &epsilon; = {e:g}</td>' + "".join(cell(sde, e, n) for n in [10, 50, 250]) + '</tr>'
for e in [0.5, 1, 2]:
    rows += f'<tr><td>decaying &epsilon; = {e:g} (1 &minus; t)</td>' + "".join(cell(sdd, e, n) for n in [10, 50, 250]) + '</tr>'
s = tbody(s, "fmr-sde-rows", rows)

# production (section 13, closed)
S = D["sched"]
def c(k):
    return S.get(k) or {}
def num(v):
    return f"{v:g}"
def dyn(k):
    q = c(k)
    if q.get("use_dynamic_shifting"):
        t = (f'dynamic shift, &mu; {num(q["base_shift"])} at {q["base_image_seq_len"]} to {num(q["max_shift"])} at {q["max_image_seq_len"]} tokens '
             f'(shift e<sup>&mu;</sup> = {math.exp(q["base_shift"]):.2f} to {math.exp(q["max_shift"]):.2f})')
        if q.get("shift_terminal"):
            t += f', shift_terminal {num(q["shift_terminal"])}'
        return t
    return f'fixed shift {num(q["shift"])}'
P = [
    ("Stable Diffusion 3 (paper, Mar 2024)", "straight path (rectified flow), logit-normal(0, 1) chosen from 61 formulations", "not read (gated); paper: shift 3.0 at 1024 px", "MMDiT; LADD distils it to SD3-Turbo, 4 steps"),
    ("FLUX.1 [dev], [schnell] (2024-07-31)", '"rectified flow transformer", 12B (card)', "not read (gated); FLUX pipeline defaults: dynamic shift, &mu; 0.5 to 1.15 (shift 1.65 to 3.16)", "schnell: LADD, 1 to 4 steps; dev: guidance as an input"),
    ("FLUX.2 [klein] 4B (repo 2026-01-14)", "flow matching (Model map)", f'FlowMatchEuler, {dyn("black-forest-labs/FLUX.2-klein-4B")}; rev {c("black-forest-labs/FLUX.2-klein-4B").get("sha")}', "Apache 2.0"),
    ("Qwen-Image (2025-08-02)", "flow matching (Model map)", f'FlowMatchEuler, {dyn("Qwen/Qwen-Image")}; rev {c("Qwen/Qwen-Image").get("sha")}', "MMDiT 20.43B"),
    ("Z-Image-Turbo (repo 2025-11-25)", "flow matching (Model map)", f'FlowMatchEuler, {dyn("Tongyi-MAI/Z-Image-Turbo")}; rev {c("Tongyi-MAI/Z-Image-Turbo").get("sha")}', "6.155B"),
    ("Wan 2.1 (paper Mar 2025; 1.3B shown)", '"x_t = t x_1 + (1 - t) x_0", logit-normal t', f'UniPC multistep, flow_prediction, flow_shift {num(c("Wan-AI/Wan2.1-T2V-1.3B-Diffusers")["flow_shift"])}; rev {c("Wan-AI/Wan2.1-T2V-1.3B-Diffusers").get("sha")}', "video; 1.3B and 14B"),
    ("HunyuanVideo (paper Dec 2024)", "Flow Matching, logit-normal t", f'FlowMatchEuler, {dyn("hunyuanvideo-community/HunyuanVideo")} (community diffusers repo, rev {c("hunyuanvideo-community/HunyuanVideo").get("sha")})', "video, 13B; larger shift for fewer steps"),
    ("LTX-Video (repo read 2026-10-17)", "flow matching (config)", f'FlowMatchEuler, {dyn("Lightricks/LTX-Video")}; rev {c("Lightricks/LTX-Video").get("sha")}', "video"),
    ("Movie Gen (paper Oct 2024; not released)", "Flow Matching, logit-normal(0, 1), 30B", 'linear-quadratic grid, 50 steps "emulating 250 linear steps"', "video and audio"),
]
s = tbody(s, "fmr-prod", "".join("<tr>" + "".join(f"<td>{x}</td>" for x in r) + "</tr>" for r in P))

# SD3 ranking (section 11, closed)
S3 = D["sd3"]
rows = ""
for r in S3["table1"]:
    t2 = S3["table2"].get(r[0])
    rows += (f'<tr><td>{html.escape(r[0])}</td><td class="num">{r[1]:.2f}</td><td class="num">{r[2]:.2f}</td><td class="num">{r[3]:.2f}</td>'
             f'<td class="num">{f"{t2[1]:.2f}" if t2 else ""}</td><td class="num">{f"{t2[0]:.3f}" if t2 else ""}</td></tr>')
s = tbody(s, "fmt-sd3", rows)

# code blocks
s = pre(s, "fmr-code-cfm", Y["code"]["cfm"])
s = pre(s, "fmr-code-samp", Y["code"]["samp"])
s = pre(s, "fmr-code-exact", D["code"]["exact"])
s = pre(s, "fmr-sched-out", D["sched_demo"])

left = sorted(set(re.findall(r'data-fm[fy]="([\w.]+)"></', s)))
if left:
    bad.append("unfilled: " + ", ".join(left))
open(PAGE, "w", encoding="utf-8").write(s)
if bad:
    print("fill_static: " + "; ".join(bad))
    sys.exit(1)
print("fill_static: ok")
