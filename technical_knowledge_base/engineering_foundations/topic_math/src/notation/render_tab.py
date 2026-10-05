"""Write ../parts/31_tab_notation.html from equations.json (and the conventions list in conventions.py).

The equations stay LaTeX inside \\[ \\] and \\( \\); build.sh turns them into MathML (Temml) at build time.
Run after build_equations.py:  python3 render_tab.py
"""
import json, os, html
from conventions import CONV, CONV_INTRO

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "parts", "31_tab_notation.html")
data = json.load(open(os.path.join(HERE, "equations.json")))
EQ = data["equations"]
BYID = {e["id"]: e for e in EQ}

esc = lambda s: html.escape(s, quote=True)


def link(text, target):
    if target.startswith("#t-"):
        return "{{" + text + "|" + target + "}}"
    if target.startswith("n:"):
        return "{{" + text + "|" + target + "}}"
    return f'<a href="{esc(target)}" target="_blank" rel="noopener noreferrer">{text}</a>'


CSS = r"""<style>
#t-notation .nd-lead{font-size:15.5px}
#t-notation .nd-pick{margin:10px 0 4px}
#t-notation .nd-grp{font-size:11.5px;font-weight:600;color:var(--mute);text-transform:uppercase;letter-spacing:.03em;margin:8px 0 3px}
#t-notation .nd-chipr{display:flex;flex-wrap:wrap;gap:5px}
#t-notation .nd-chipr button{font-size:12.5px;padding:2px 10px;border-radius:99px}
#t-notation .nd-chipr button.on{background:var(--acc);border-color:var(--acc);color:var(--bg)}
#t-notation .nd-bar{display:flex;align-items:center;gap:8px;margin:12px 0 0;font-size:13px;color:var(--mute)}
#t-notation .nd-bar .sp{flex:1}
#t-notation article.nd-eq{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:8px 0 14px;min-width:0}
#t-notation .nd-kick{font-size:11.5px;font-weight:600;color:var(--mute);text-transform:uppercase;letter-spacing:.03em}
#t-notation h3.nd-t{margin:2px 0 4px;font-size:17px}
#t-notation h4{font-size:14px;margin:16px 0 4px}
#t-notation .nd-src{font-size:12.5px;color:var(--mute)}
#t-notation .nd-m{background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:10px 0 4px;overflow-x:auto;max-width:100%}
#t-notation .nd-m math{font-size:1.18em}
#t-notation .nd-m [data-sym]{cursor:pointer;border-radius:3px;background:var(--acc2)}
#t-notation .nd-m [data-sym].nd-on{background:var(--hl);outline:1.5px solid var(--bad)}
#t-notation .nd-tr{font-size:12px;color:var(--mute);margin:2px 0 6px}
#t-notation .nd-chips{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
#t-notation .nd-chips button{font-size:13px;padding:1px 9px;border-radius:7px;min-height:30px}
#t-notation .nd-chips button.nd-on{background:var(--hl);border-color:var(--bad)}
#t-notation .nd-sd{border:1px solid var(--line);border-left:3px solid var(--bad);border-radius:0 8px 8px 0;background:var(--soft);padding:8px 12px;margin:6px 0;min-height:3.2em}
#t-notation .nd-sd .nm{font-weight:600;font-size:14.5px}
#t-notation .nd-sd dl{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:3px 10px;margin:4px 0 0;font-size:13.5px}
#t-notation .nd-sd dt{color:var(--mute)}#t-notation .nd-sd dd{margin:0;min-width:0;overflow-wrap:anywhere}
#t-notation .nd-aloud{font-style:italic;border-left:3px solid var(--acc);padding:2px 0 2px 10px;margin:6px 0}
#t-notation ol.nd-steps{padding-left:22px}
#t-notation ol.nd-steps li{margin:8px 0}
#t-notation .nd-sm{overflow-x:auto;max-width:100%}
#t-notation .nd-sm math[display="block"]{margin:.2em 0}
#t-notation .nd-say{font-size:13.5px;color:var(--mute);margin:0}
#t-notation ul.nd-traps li{font-size:14px;margin:5px 0}
#t-notation details.nd-all{margin:8px 0;border:1px solid var(--line);border-radius:8px;padding:4px 10px}
#t-notation details.nd-all summary{cursor:pointer;font-size:13.5px;color:var(--acc)}
#t-notation .nd-an{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0;background:var(--bg)}
#t-notation .nd-stage{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:8px 0;min-height:150px}
#t-notation .nd-mx{display:inline-flex;flex-direction:column;align-items:center;gap:2px}
#t-notation .nd-mx .lb{font-size:12px;font-weight:600}
#t-notation .nd-mx .shp{font-size:11.5px;color:var(--mute)}
#t-notation .nd-grid{display:grid;gap:2px;border-left:2px solid var(--mute);border-right:2px solid var(--mute);border-radius:4px;padding:2px 3px}
#t-notation .nd-grid span{font:12.5px/1.2 ui-monospace,Menlo,Consolas,monospace;text-align:right;padding:3px 4px;min-width:2.4em;border-radius:3px;background:var(--soft)}
#t-notation .nd-grid span.hi{background:var(--acc2);outline:1.5px solid var(--acc)}
#t-notation .nd-grid span.nw{background:var(--hl);outline:1.5px solid var(--bad)}
#t-notation .nd-grid span.mt{color:var(--dim);background:none}
#t-notation .nd-op{font-size:18px;color:var(--mute)}
#t-notation .nd-cap{font-size:14px;margin:6px 0;min-height:3em}
#t-notation .nd-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#t-notation .nd-ctl input[type=range]{flex:1;min-width:120px;width:auto}
#t-notation .nd-cnt{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px;color:var(--mute);margin:4px 0 8px}#t-notation .nd-cnt b{color:var(--ink)}
#t-notation .nd-cmp{font-size:13px;margin:6px 0}
#t-notation .nd-ref{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:10px;margin:10px 0}
#t-notation .nd-ref>div{border:1px solid var(--line);border-radius:8px;padding:9px 12px;min-width:0}
#t-notation .nd-ref h4{margin:0 0 4px;font-size:14px}
#t-notation .nd-ref p{margin:4px 0;font-size:13.5px}
#t-notation .nd-ref .ex{overflow-x:auto;max-width:100%}
#t-notation .nd-ref .seen{font-size:12px;color:var(--mute)}
#t-notation .nd-ref .seen button{font-size:12px;padding:0 7px;border-radius:99px;margin:2px 2px 0 0}
#t-notation .nd-filter{width:100%;max-width:360px}
@media (max-width:520px){#t-notation .nd-m math{font-size:1.02em}#t-notation .nd-grid span{min-width:2.1em;font-size:11.5px;padding:2px 3px}}
</style>
"""


def brk(tex):
    """Break a worked step at top-level \\quad / \\qquad / \\Rightarrow into stacked lines (phone width)."""
    import re as _re
    parts, depth, cur, i = [], 0, "", 0
    while i < len(tex):
        ch = tex[i]
        if ch == "{": depth += 1
        elif ch == "}": depth -= 1
        m = _re.match(r"\\(qquad|quad|Rightarrow)(?![a-zA-Z])", tex[i:]) if depth == 0 else None
        if m and "begin{" not in cur[-12:]:
            parts.append(cur.rstrip().rstrip(",").rstrip("\\ ").rstrip(","))
            cur = r"\Rightarrow " if m.group(1) == "Rightarrow" else ""
            i += len(m.group(0)); continue
        cur += ch; i += 1
    parts.append(cur)
    parts = [x.strip() for x in parts if x.strip()]
    if len(parts) == 1:
        return tex
    return r"\begin{gathered}" + r"\\ ".join(parts) + r"\end{gathered}"


def symbol_html(e):
    chips, details = [], []
    for s in e["symbols"]:
        m = esc(json.dumps(s["match"], ensure_ascii=False))
        chips.append(f'<button type="button" data-sym="{s["id"]}" data-match="{m}" aria-label="{esc(s["name"])}">\\({s["tex"]}\\)</button>')
        details.append(
            f'<div class="nd-sdi" data-sym="{s["id"]}" hidden><div class="nm">\\({s["tex"]}\\): {s["name"]}</div><dl>'
            f'<dt>Meaning</dt><dd>{s["meaning"]}</dd><dt>Shape</dt><dd>{s["shape"]}</dd><dt>Defined</dt><dd>{s["where"]}</dd></dl></div>')
    return chips, details


def card(e):
    p = e["paper"]
    if p.get("arxiv"):
        src = (f'{esc(p["cite"])} · <a href="{p["abs"]}" target="_blank" rel="noopener noreferrer">arXiv {p["arxiv"]}{p["ver"]}</a>'
               f' · <a href="{p["pdf"]}" target="_blank" rel="noopener noreferrer">{esc(p["eq"])}, PDF page {p["page"]}</a> · {esc(p["section"])}')
    else:
        src = (f'{esc(p["cite"])} · <a href="{p["pdf"]}" target="_blank" rel="noopener noreferrer">{esc(p["eq"])}, PDF page {p["page"]}</a>'
               f' · {esc(p["section"])} · {esc(p.get("note", ""))}')
    chips, details = symbol_html(e)
    o = [f'<article class="nd-eq" id="nd-eq-{e["id"]}" data-eq="{e["id"]}" aria-label="{esc(e["title"])}"'
         + ('' if e["id"] == "attn" else ' hidden') + '>',
         f'<div class="nd-kick">{esc(e["group"])}</div><h3 class="nd-t">{esc(e["title"])}</h3>',
         f'<div class="nd-src">{src}</div>',
         f'<div class="nd-m" data-eq="{e["id"]}">\\[{e["latex"]}\\]</div>',
         f'<div class="nd-tr">{esc(e["transcription"])}</div>',
         '<h4>Tap a symbol</h4><div class="nd-chips">' + "".join(chips) + '</div>',
         '<div class="nd-sd" aria-live="polite"><div class="nd-sd0 mute small">Tap any symbol in the equation (the shaded parts; a wide equation scrolls sideways) or a chip above: its name, meaning, shape with concrete sizes, and where the paper defines it.</div>'
         + "".join(details) + '</div>',
         f'<h4>Read it aloud</h4><p class="nd-aloud">{esc(e["aloud"])}</p>',
         f'<h4>With tiny numbers</h4><p class="small mute">{esc(e["steps_note"])}</p>'+(f'<p class="small">{e["note_html"]}</p>' if e.get("note_html") else '')]
    steps = '<ol class="nd-steps">' + "".join(
        f'<li><div class="nd-sm">\\[{brk(s["tex"])}\\]</div><p class="nd-say">{esc(s["say"])}</p></li>' for s in e["steps"]) + '</ol>'
    if e.get("anim"):
        o.append(ANIM)
        o.append('<details class="nd-all"><summary>All steps at once (static)</summary>' + steps + '</details>')
    else:
        o.append(steps)
    o.append('<h4>Traps</h4><ul class="nd-traps">' + "".join(f"<li>{t}</li>" for t in e["traps"]) + '</ul>')
    o.append('<div class="deepnote"><b>Go deeper:</b> ' + " · ".join(link(t, u) for t, u in e["links"]) + '</div>')
    o.append('</article>')
    return "\n".join(o)


ANIM = """<div class="nd-an" id="nd-an">
<div class="seg" id="nd-an-mode" role="group" aria-label="Which attention"><button type="button" data-m="s" class="on">Scaled, as in Eq. (1)</button><button type="button" data-m="u">Before: plain dot-product (no \\(\\sqrt{d_k}\\))</button></div>
<div class="nd-stage" id="nd-an-stage" aria-live="polite"></div>
<div class="nd-cap" id="nd-an-cap"></div>
<div class="nd-cnt" id="nd-an-cnt"></div>
<div class="nd-ctl" id="nd-an-ctl"></div>
<div class="nd-cmp" id="nd-an-cmp"></div>
</div>"""


def picker():
    groups = []
    for e in EQ:
        if e["group"] not in groups:
            groups.append(e["group"])
    o = ['<div class="nd-pick" id="nd-pick" role="group" aria-label="Choose an equation">']
    for g in groups:
        o.append(f'<div class="nd-grp">{esc(g)}</div><div class="nd-chipr">')
        for e in EQ:
            if e["group"] == g:
                o.append(f'<button type="button" data-eq="{e["id"]}"' + (' class="on"' if e["id"] == "attn" else '') + f'>{esc(e["chip"])}</button>')
        o.append('</div>')
    o.append('</div>')
    o.append('<div class="nd-bar"><button type="button" id="nd-prev" aria-label="Previous equation">&#9664; Previous</button>'
             '<span id="nd-pos"></span><span class="sp"></span><button type="button" id="nd-next" aria-label="Next equation">Next &#9654;</button></div>')
    return "\n".join(o)


def conventions():
    o = ['<section id="nd-conv"><h2>Conventions that trip people up</h2>', f'<p>{CONV_INTRO}</p>',
         '<input type="search" class="nd-filter" id="nd-filter" placeholder="Filter, e.g. log, hat, norm" aria-label="Filter conventions">',
         '<div class="nd-ref" id="nd-ref">']
    for c in CONV:
        seen = ""
        if c.get("seen"):
            seen = '<div class="seen">Seen in: ' + "".join(
                f'<button type="button" data-go="{i}">{esc(BYID[i]["chip"])}</button>' for i in c["seen"]) + '</div>'
        o.append(f'<div data-k="{esc(c["key"])}"><h4>{c["title"]}</h4><div class="ex">\\[{brk(c["ex"])}\\]</div><p>{c["text"]}</p>{seen}</div>')
    o.append('</div></section>')
    return "\n".join(o)


INTRO = """<p class="nd-lead">Fourteen equations that carry modern ML, quoted exactly as their papers print them, decoded symbol by symbol. The aim is to read the next paper's maths without getting stuck: every symbol named, every shape given with real sizes, every equation run once on tiny numbers.</p>
<div class="co key"><div class="t">How to read any equation: the five steps from the {{Reading tab ("How to read an equation in a paper")|#t-read}}, used on every card</div>
<ol class="tight" style="margin:4px 0;padding-left:20px"><li><b>Name every symbol.</b> Find the line where the paper defines it; the same letter means different things in different papers (\\(\\beta\\) is a decay rate in Adam, a KL weight in DPO, a noise level in DDPM). Here: tap a symbol.</li>
<li><b>Write the shape beside every symbol.</b> Check that every product's inner sizes match; most misreadings fail this test.</li>
<li><b>Read the operations from the inside out, in words.</b> Here: the "Read it aloud" sentence.</li>
<li><b>Plug in tiny numbers.</b> Two or three tokens, a 3 by 3 matrix: compute it once by hand. Here: "With tiny numbers".</li>
<li><b>Ask why each piece is there.</b> Why the square root, why the hat, why this subscript under the E. Here: "Traps".</li></ol></div>
<p class="small mute">Each card links the paper (arXiv id, version, equation number and PDF page) and the knowledge base pages that teach the mechanism. Every worked number is recomputed by <code>src/notation/recompute.py</code>; numbers marked illustrative are made-up inputs run through the real formula.</p>"""

FOOT = """<p class="foot">Sources: each equation was checked against the paper's PDF text (arXiv versions as linked, GPT-1 from OpenAI's PDF) and, where available, the LaTeX of the ar5iv rendering. Library behaviour: PyTorch 2.14 LayerNorm documentation; TRL at commit 14c8d70 for GRPO's standard deviation. Data: <code>src/notation/equations.json</code> (built by <code>build_equations.py</code>), numbers rechecked by <code>recompute.py</code>.</p>"""

out = ['<div class="tab" id="t-notation" role="tabpanel" hidden>', CSS, INTRO, picker()]
out += [card(e) for e in EQ]
out += [conventions(), FOOT, '</div>']
open(OUT, "w").write("\n".join(out) + "\n")
print("wrote", OUT, sum(len(x) for x in out), "bytes")
