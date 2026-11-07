#!/usr/bin/env python3
"""Generate the Reading parts of "Rust: lifetimes, smart pointers, threads and unsafe" from tpl/, code/ and out/.
(Adapted from the Rust page's src/ra/gen.py: the lab and drill data are gone; the Send and Sync table is added.)

Template directives (all replaced by HTML):
  [[code:PATH]] or [[code:PATH:A-B]]   source file under code/ (lines A..B), highlighted
  [[out:NAME]]                          recorded output out/NAME.txt (long ones folded after 22 lines)
  [[pr:NAME|QUESTION]]                  predict, then reveal: the output hidden in a <details>
  [[g:NAME|REGEX]]                      the first regex group found in out/NAME.txt (inline value)
  [[x:PATH]]                            a value of the stage data (LSP_DATA), by dotted path
  [[sendsync]]                          the Send and Sync table, every cell checked against the two recordings
Run: python3 src/ra/gen.py  (then sh src/build.sh)
"""
import html, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

PARTS = HERE.parent / "parts"
OUT, CODE, TPL = HERE / "out", HERE / "code", HERE / "tpl"

KW = set("""as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod
move mut pub ref return self Self static struct super trait true type unsafe use where while def import from print
lambda None True False try except return yield class""".split())
TOK = re.compile(r'(?P<c>//[^\n]*|#(?![\[!])[^\n]*)|(?P<a>#!?\[[^\]\n]*\])|(?P<s>"(?:\\.|[^"\\\n])*"|b\'(?:\\.|[^\'\\\n])\'|\'(?:\\.|[^\'\\\n])\'(?!\w))|(?P<l>\'[a-z_]\w*)|(?P<w>[A-Za-z_]\w*!?)|(?P<o>[\s\S])', re.M)


def esc(s):
    return html.escape(s, quote=False).replace("{", "&#123;").replace("}", "&#125;")


def hl(src, py=False):
    out = []
    for m in TOK.finditer(src):
        k, t = m.lastgroup, m.group()
        if k == "c":
            if t.startswith("#") and not py:
                out.append(esc(t)); continue
            if t.startswith("//") and py:
                out.append(esc(t)); continue
            out.append('<span class="ra-cm">' + esc(t) + "</span>")
        elif k == "a":
            out.append('<span class="ra-at">' + esc(t) + "</span>")
        elif k == "s":
            out.append('<span class="ra-st">' + esc(t) + "</span>")
        elif k == "l":
            out.append('<span class="ra-lt">' + esc(t) + "</span>")
        elif k == "w" and t in KW:
            out.append('<span class="ra-kw">' + t + "</span>")
        elif k == "w" and t.endswith("!"):
            out.append('<span class="ra-mac">' + esc(t) + "</span>")
        else:
            out.append(esc(t))
    return "".join(out)


def read_out(name):
    p = OUT / (name + ".txt")
    if not p.exists():
        sys.exit("missing output " + name)
    return p.read_text()


def src(path):
    return (CODE / path).read_text().rstrip("\n")


def code(spec):
    parts = spec.split(":")
    path, rng = parts[0], parts[1] if len(parts) > 1 else None
    lines = src(path).split("\n")
    first = 1
    if rng:
        a, b = map(int, rng.split("-"))
        lines, first = lines[a - 1:b], a
    body = hl("\n".join(lines), py=path.endswith(".py"))
    fn = Path(path).name + (f" (lines {first} to {first + len(lines) - 1})" if rng else "")
    return f'<div class="ra-src"><div class="ra-fn">{esc(fn)}</div><pre class="ra-code">{body}</pre></div>'


def out(name, fold=22):
    t = read_out(name).rstrip("\n")
    lines = t.split("\n")
    cmd = ""
    if lines[0].startswith("$ "):
        cmd, lines = lines[0], lines[1:]
    bad = any(l.startswith("[exit code") for l in lines)
    cls = ' ra-bad' if bad else ''
    cmd_html = f'<span class="ra-cmd">{esc(cmd)}</span>\n' if cmd else ""
    if len(lines) > fold:
        a, b = lines[:fold - 4], lines[fold - 4:]
        return (f'<pre class="ra-out{cls}" data-ra-out="{name}">\n{cmd_html}{esc(chr(10).join(a))}</pre>'
                f'<details class="ra-more"><summary>show the remaining {len(b)} lines</summary>'
                f'<pre class="ra-out{cls}" data-ra-rest="{name}">\n{esc(chr(10).join(b))}</pre></details>')
    return f'<pre class="ra-out{cls}" data-ra-out="{name}">\n{cmd_html}{esc(chr(10).join(lines))}</pre>'


def pr(arg):
    name, q = arg.split("|", 1)
    return f'<details class="ra-pr"><summary><b>Predict, then reveal:</b> {q}</summary>{out(name)}</details>'


def grab(arg):
    name, rx = arg.split("|", 1)
    m = re.search(rx, read_out(name), re.M)
    if not m:
        sys.exit(f"no match for {rx} in {name}")
    return esc(m.group(1))


DIRECT = re.compile(r"\[\[(code|out|pr|g|x):(.+?)\]\]", re.S)
SD = {}


def xval(path):
    """[[x:a.b.c]]: a value of the stage data (LSP_DATA), so the step lists print exactly what the stages draw."""
    v = SD
    for k in path.split("."):
        v = v[int(k)] if isinstance(v, list) else v[k]
    return esc(str(v))


def render(text):
    return DIRECT.sub(lambda m: {"code": code, "out": out, "pr": pr, "g": grab, "x": xval}[m.group(1)](m.group(2)), text)


# (type, Send, Sync, why). "yes" cells must be asserted in code/lang/sendsync.rs (which compiles and runs);
# "no" cells must each be refused in out/l_sendsync_err.txt.
SS = [
    ("i32, String, Vec<u8>, Box<i32>", "yes", "yes", "own their data; nothing shared behind them"),
    ("&i32", "yes", "yes", "a shared reference is Send because i32 is Sync"),
    ("Rc<i32>", "no", "no", "two clones in two threads would update the plain counter at once"),
    ("Arc<i32>", "yes", "yes", "the counter is updated atomically"),
    ("Cell<i32>, RefCell<i32>", "yes", "no", "may move to one thread; sharing would let two threads mutate unsynchronised"),
    ("Arc<RefCell<i32>>", "no", "no", "Arc is only as shareable as its contents"),
    ("Mutex<i32>, RwLock<i32>", "yes", "yes", "the lock orders every access"),
    ("Mutex<Cell<i32>>", "yes", "yes", "a Mutex makes a non-Sync value Sync (it needs only Send)"),
    ("Arc<Mutex<Vec<u8>>>", "yes", "yes", "the shared-mutable-state pattern"),
    ("AtomicU64", "yes", "yes", "hardware atomic operations"),
    ("MutexGuard<i32>", "no", "yes", "some platforms require the locking thread to unlock"),
    ("*const i32", "no", "no", "raw pointers opt out; unsafe code must vouch with unsafe impl"),
]


def sendsync():
    ok = src("lang/sendsync.rs")
    err = read_out("l_sendsync_err")
    rows = []
    for ty, se, sy, why in SS:
        for t in [x.strip() for x in ty.split(", ")] if not ty.startswith("i32") else ["i32", "String", "Vec<u8>", "Box<i32>"]:
            for tr, v in (("send", se), ("sync", sy)):
                if v == "yes" and f"{tr}::<{t}>()" not in ok.replace("'static, ", ""):
                    sys.exit(f"Send/Sync table: {tr} {t} marked yes but not asserted in sendsync.rs")
                if v == "no":
                    word = "sent" if tr == "send" else "shared"
                    name = t.split("<")[0] if t.startswith("Arc<RefCell") else t
                    pat = (f"`RefCell<i32>` cannot be shared" if t.startswith("Arc<RefCell") else f"`{t}` cannot be {word}")
                    if t.startswith("MutexGuard"):
                        pat = "MutexGuard<'static, i32>` cannot be sent"
                    if pat not in err:
                        sys.exit(f"Send/Sync table: {tr} {t} marked no but not refused in l_sendsync_err")
    c = lambda v: f'<td class="lsp-{v}">{v}</td>'
    body = "".join(f"<tr><td><code>{esc(ty)}</code></td>{c(se)}{c(sy)}<td>{esc(why)}</td></tr>" for ty, se, sy, why in SS)
    return ('<div class="tw"><table class="lsp-ss"><thead><tr><th>Type</th><th>Send</th><th>Sync</th><th>Why</th></tr></thead>'
            f"<tbody>{body}</tbody></table></div>")


def lineno(path, rx, start=1):
    """1-based number of the first line of code/PATH (from line START) matching RX."""
    for i, l in enumerate(src(path).split("\n")[start - 1:], start):
        if re.search(rx, l):
            return i
    sys.exit(f"no line matching {rx} in {path}")


def g1(name, rx, conv=str):
    m = re.search(rx, read_out(name), re.M)
    if not m:
        sys.exit(f"stage data: no match for {rx} in {name}")
    return conv(m.group(1))


def stage_data():
    """LSP_DATA for the four 3D stages: every value read from code/ (line numbers, loop counts) or out/ (printed results)."""
    E, OK = "lang/life_err2.rs", "lang/life.rs"
    err = read_out("l_life_err2")
    pts = {k: int(re.search(r"^\s*(\d+) \|.*\n\s*\|.*" + rx, err, re.M).group(1)) for k, rx in
           (("decl", "binding `b` declared here"), ("borrow", "borrowed value does not live long enough"),
            ("drop", "`b` dropped here while still borrowed"), ("use", "borrow later used here"))}
    nE = len(src(E).split("\n"))
    life = {
        "err": {"a": lineno(E, r"let a ="), "b": lineno(E, r"let b ="), "call": lineno(E, r"w = longest"),
                "bend": lineno(E, r"^\s*\}", lineno(E, r"let b =")), "use": lineno(E, r'println!\("\{w\}"\)'), "end": nE,
                "code": g1("l_life_err2", r"^(error\[E\d+\]: .*)$"), "pts": pts},
        "ok": {"a": lineno(OK, r"let a ="), "b": lineno(OK, r"let b ="), "call": lineno(OK, r"w = longest"),
               "use": lineno(OK, r"println!\(\"longest"), "bend": lineno(OK, r"^\s*\}", lineno(OK, r"let b =")),
               "end": len(src(OK).split("\n")), "out": g1("l_life", r"^(longest: .*)$")},
    }
    assert life["err"]["b"] == pts["decl"] and life["err"]["call"] == pts["borrow"] and life["err"]["bend"] == pts["drop"] and life["err"]["use"] == pts["use"], (life, pts)
    smart = {"eval": g1("l_smart", r"^(2 \+ 3 \* 4 = \S+)$"), "inside": g1("l_smart", r"strong_count inside = (\d+)", int),
             "after": g1("l_smart", r"strong_count after = (\d+)", int), "hits": g1("l_smart", r"hits = (\d+)", int),
             "name": g1("l_smart", r"name = (.*)$"), "log": g1("l_smart", r"^log = (.*)$"),
             "box": g1("l_smart", r"size_of Box<Expr> = (\d+)", int), "rc": g1("l_smart", r"Rc<Doc> = (\d+)", int),
             "expr": g1("l_smart", r"Expr = (\d+)$", int), "panic_at": g1("l_smart", r"panicked at (smart\.rs:\d+:\d+)"),
             "panic": g1("l_smart", r"^(RefCell already borrowed)$"),
             "lines": {"new": lineno("lang/smart.rs", r"Rc::new\(Doc"), "clone_a": lineno("lang/smart.rs", r"let a = Rc::clone"),
                       "clone_b": lineno("lang/smart.rs", r"let b = Rc::clone"), "set": lineno("lang/smart.rs", r"cache_hits\.set"),
                       "b_end": lineno("lang/smart.rs", r"^\s*\}", lineno("lang/smart.rs", r"let b = Rc::clone")),
                       "log": lineno("lang/smart.rs", r"let log = "), "first": lineno("lang/smart.rs", r"let first = "),
                       "second": lineno("lang/smart.rs", r"let second = ")}}
    assert smart["panic_at"] == f"smart.rs:{smart['lines']['second']}:22", smart
    T = src("lang/threads.rs")
    nthr = int(re.search(r"for _ in 0\.\.(\d+) \{\s*\n\s*let c = Arc::clone", T).group(1))
    per = int(re.search(r"for _ in 0\.\.([\d_]+) \{ \*c\.lock", T).group(1).replace("_", ""))
    thr = {"spawned": g1("l_threads", r"^spawned: (.*)$"), "scoped": g1("l_threads", r"^scoped sum: (\d+)$", int),
           "mutex": g1("l_threads", r"^mutex counter: (\d+)", int), "atomic": g1("l_threads", r"^atomic counter: (\d+)$", int),
           "channel": g1("l_threads", r"^channel: (.*)$"), "n": nthr, "per": per,
           "docs": re.findall(r'"([^"]*)"', re.search(r"let docs = vec!\[(.*?)\]", T).group(1)),
           "workers": int(re.search(r"for id in 0\.\.(\d+)", T).group(1)),
           "rc_err": g1("l_rc_thread_err", r"^error\[E0277\]: (.*)$")}
    assert thr["mutex"] == thr["atomic"] == nthr * per, thr
    U = src("ub/src/main.rs")
    ub = {"vals": [int(x) for x in re.findall(r"(\d+)(?:u32)?", re.search(r"let v = vec!\[(.*?)\]", U).group(1))],
          "elt": 4 if "u32" in re.search(r"let v = vec!\[(.*?)\]", U).group(1) else None,
          "past": int(re.search(r"\*p\.add\((\d+)\)", U).group(1)),
          "w": [int(x) for x in re.findall(r"(\d+)(?:u32)?", re.search(r"let w = vec!\[(.*?)\]", U).group(1))],
          "run_past": g1("l_ub_run", r"read past the end: (\d+)", int), "run_free": g1("l_ub_run", r"read after free: (\d+)", int),
          "miri": g1("l_ub_miri", r"error: Undefined Behavior: (.*)$"), "miri_at": g1("l_ub_miri", r"--> (src/main\.rs:\d+:\d+)"),
          "size": g1("l_ub_miri", r"allocation of size (\d+) bytes", int), "off": g1("l_ub_miri", r"\+0x([0-9a-f]+)", lambda h: int(h, 16)),
          "acc": g1("l_ub_miri", r"attempting to access (\d+) bytes", int)}
    assert ub["size"] == ub["elt"] * len(ub["vals"]) and ub["off"] == ub["past"] * ub["elt"], ub
    UO = src("lang/unsafe_ok.rs")
    uok = {"vals": [int(x) for x in re.findall(r"(\d+)(?:u32)?", re.search(r"let v = vec!\[(.*?)\]", UO).group(1))],
           "idx": int(re.search(r"\*p\.add\((\d+)\)", UO).group(1)), "second": g1("l_unsafe_ok", r"second = (\d+)", int),
           "a": [int(x) for x in re.findall(r"\d+", re.search(r"let mut a = \[(.*?)\]", UO).group(1))],
           "mid": int(re.search(r"split_at_mut\((\d+)\)", UO).group(1)), "after": g1("l_unsafe_ok", r"^(\[.*\])$")}
    assert uok["vals"][uok["idx"]] == uok["second"], uok
    return {"life": life, "smart": smart, "thr": thr, "ub": ub, "uok": uok}


def main():
    SD.update(stage_data())
    for t in sorted(TPL.glob("*.html")):
        (PARTS / t.name).write_text(render(t.read_text()).replace("[[sendsync]]", sendsync()))
        print("wrote", t.name)
    (PARTS / "22_js_lsp_data.js").write_text("// Generated by src/ra/gen.py from ra/code and ra/out: the values the four 3D stages draw. Never edit by hand.\n"
                                              "window.LSP_DATA=" + json.dumps(SD, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("wrote 22_js_lsp_data.js")


main()
