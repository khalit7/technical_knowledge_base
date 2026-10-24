"""Write the recorded numbers and sentences into the built page as static text (plain Python 3; build.sh runs it).

<span data-dz="k"></span>   <- out/page_data.json f[k]          (this page's runs, via make_data.py)
<span data-lab="k"></span>  <- out/page_data_more.json lab[k]   (the root Diffusion lab's recordings)
<tag id="X"></tag>          <- txt[X] from page_data_more.json, else from page_data.json (sentences written from the data)
the distillation table's rows <- page_data.json dist (none since 2026-10-24: the table is on latent diffusion, section 10)
Static text is what readers without script, the reading-time audit and the knowledge-ledger check all see.
Usage: python3 fill_static.py <index.html>
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "out")
dz = json.load(open(os.path.join(OUT, "page_data.json")))
more = json.load(open(os.path.join(OUT, "page_data_more.json")))
txt = dict(dz["txt"], **more["txt"])
path = sys.argv[1]
s = open(path, encoding="utf-8").read()
head, sep, tail = s.partition("<script>")   # fill the HTML only, never the data inside scripts
missing = []


def put(src, name):
    def f(m):
        k = m.group(1)
        if k not in src:
            missing.append(name + ":" + k); return m.group(0)
        return m.group(0)[:-len("</span>")] + str(src[k]) + "</span>"
    return f


head = re.sub(r'<span data-dz="([^"]+)"></span>', put(dz["f"], "dz"), head)
head = re.sub(r'<span data-lab="([^"]+)"></span>', put(more["lab"], "lab"), head)


def put_txt(m):
    tag, pre, i, rest = m.group(1), m.group(2), m.group(3), m.group(4)
    if i not in txt:
        return m.group(0)
    return f'<{tag}{pre} id="{i}"{rest}>{txt[i]}</{tag}>'


head = re.sub(r'<(p|span|div)([^>]*?) id="(dz-[\w-]+)"([^>]*)></\1>', put_txt, head)
rows = "".join('<tr><td data-h="Method">%s</td><td data-h="Idea">%s</td><td data-h="Steps">%s</td><td data-h="Result">%s</td></tr>' % tuple(r)
               for r in dz["dist"])
head, k = re.subn(r'(<table class="rd-cmp" id="dz-dist-tab">.*?<tbody>)(</tbody>)', lambda m: m.group(1) + rows + m.group(2), head, flags=re.S)
if k > 1:   # 0 since 2026-10-24: the table moved to latent diffusion section 10
    missing.append("dist table")
if missing:
    sys.exit("fill_static: missing keys " + ", ".join(missing))
open(path, "w", encoding="utf-8").write(head + sep + tail)
