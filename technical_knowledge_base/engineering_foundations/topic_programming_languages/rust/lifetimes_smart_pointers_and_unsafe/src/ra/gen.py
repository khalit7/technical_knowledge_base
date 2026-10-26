#!/usr/bin/env python3
"""Generate the Reading parts of "Rust: lifetimes, smart pointers, threads and unsafe" from tpl/, code/ and out/.
(Adapted from the Rust page's src/ra/gen.py: the lab and drill data are gone; the Send and Sync table is added.)

Template directives (all replaced by HTML):
  [[code:PATH]] or [[code:PATH:A-B]]   source file under code/ (lines A..B), highlighted
  [[out:NAME]]                          recorded output out/NAME.txt (long ones folded after 22 lines)
  [[pr:NAME|QUESTION]]                  predict, then reveal: the output hidden in a <details>
  [[g:NAME|REGEX]]                      the first regex group found in out/NAME.txt (inline value)
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


DIRECT = re.compile(r"\[\[(code|out|pr|g):(.+?)\]\]", re.S)


def render(text):
    return DIRECT.sub(lambda m: {"code": code, "out": out, "pr": pr, "g": grab}[m.group(1)](m.group(2)), text)


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


def main():
    for t in sorted(TPL.glob("*.html")):
        (PARTS / t.name).write_text(render(t.read_text()).replace("[[sendsync]]", sendsync()))
        print("wrote", t.name)


main()
