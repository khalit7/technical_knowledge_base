"""Fill the [[...]] placeholders of the built page from src/page_text.json and src/code/out/code_refs.json.
  [[ref:key]]      -> <code>file:line</code> of a pattern located by src/code/code_refs.py
  [[snip:key]]     -> a code excerpt with its real line numbers, read from the file that ran
  [[f:key|fmt]]    -> a fact from page_text.json "facts", formatted (f0..f4 decimals, i int, pct0/pct1, b2 billions, e sci, s string)
  [[name]]         -> a text block from page_text.json "text"
Exits non-zero if any placeholder is left unresolved (unless --allow-pending, which writes a visible PENDING marker).
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "src", "data"))
SNIPS = {  # key: (file, first line pattern, last line pattern)
    "tg_router": (os.path.join(DATA, "tiny_gpt.py"), "    def forward(self, x):\n        cfg, (B, T, D) = self.cfg, x.shape",
                  'return out.view(B, T, D), aux', "topic_llm_architecture/src/data/tiny_gpt.py"),
    "ep_core": (os.path.join(HERE, "ep", "ep_alltoall.py"), "        # 2. sort the T*k assignments by destination rank",
                "            out = out + s(h)", "mixture_of_experts/src/ep/ep_alltoall.py"),
}


def snip(key):
    path, a, b, shown = SNIPS[key]
    s = open(path).read()
    i = s.index(a) + (1 if a.startswith("\n") else 0)
    j = s.index(b, i) + len(b)
    start = s.count("\n", 0, i) + 1
    lines = s[i:j].split("\n")
    w = len(str(start + len(lines)))
    body = "\n".join(f"{start + n:>{w}}  {html.escape(l)}" for n, l in enumerate(lines))
    return f"# {shown}, lines {start} to {start + len(lines) - 1}\n" + body


def fmt(v, spec):
    if spec == "s":
        return html.escape(str(v))
    if v is None:
        return "n/a"
    if spec == "i":
        return f"{int(round(v)):,}"
    if spec.startswith("pct"):
        return f"{100 * v:,.{int(spec[3:])}f}%"
    if spec == "b2":
        return f"{v / 1e9:,.2f}"
    if spec == "e":
        m, e = f"{v:.1e}".split("e")
        return f"{m} &times; 10<sup>{int(e)}</sup>"
    if spec.startswith("f"):
        return f"{v:,.{int(spec[1:])}f}"
    raise ValueError(spec)


def main(path, allow):
    T = json.load(open(os.path.join(HERE, "page_text.json")))
    refs = {r["key"]: r for r in json.load(open(os.path.join(HERE, "code", "out", "code_refs.json")))["refs"]}
    s = open(path).read()
    missing = []

    def rep(m):
        k = m.group(1)
        try:
            if k.startswith("ref:"):
                r = refs[k[4:]]
                return f'<code>{r["file"].split("/")[-1]}:{r["line"]}</code>'
            if k.startswith("snip:"):
                return snip(k[5:])
            if k.startswith("f:"):
                key, spec = k[2:].split("|")
                return fmt(T["facts"][key], spec)
            return T["text"][k]
        except (KeyError, ValueError):
            missing.append(k)
            return f'<span class="mx-pend">PENDING {html.escape(k)}</span>'
    pat = re.compile(r"\[\[([a-z][A-Za-z0-9_]*(?::[A-Za-z0-9_]+)?(?:\|[a-z0-9]+)?)\]\]")
    parts = re.split(r"(<script>.*?</script>)", s, flags=re.S)  # never touch scripts (data JSON has [[...]] arrays)
    for n, seg in enumerate(parts):
        if seg.startswith("<script>"):
            continue
        for _ in range(2):                  # text blocks may contain facts and refs
            seg = pat.sub(rep, seg)
        parts[n] = seg
    s = "".join(parts)
    open(path, "w").write(s)
    if missing:
        print("unresolved placeholders:", sorted(set(missing)))
        if not allow:
            sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1], "--allow-pending" in sys.argv)
