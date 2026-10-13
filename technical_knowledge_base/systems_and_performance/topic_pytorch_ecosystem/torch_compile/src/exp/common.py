"""Shared helpers for this page's experiments. Imports the topic's running example from ../../../src/model (never copies it)."""
import os, re, sys, json, io, logging, contextlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "model"))
import torch
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step, n_params  # noqa: F401

INP = os.path.join(HERE, "..", "inputs")


PRIVATE = re.compile("U" + "sers|" + re.escape(os.path.basename(os.path.expanduser("~"))) + "|/pri" + "vate/|scr" + "atchpad|gl" + "pat|sk" + "-ant")


def save(name, obj):
    txt = json.dumps(obj, indent=1)
    bad = PRIVATE.search(txt)
    if bad:
        raise SystemExit("private string in " + name + ": " + txt[max(0, bad.start() - 80):bad.end() + 40])
    with open(os.path.join(INP, name), "w") as f:
        f.write(txt)
    print("wrote", name)


def clean(s):
    """Drop machine paths (privacy): keep only the part after src/model/, site-packages/ or this folder."""
    s = str(s)
    s = re.sub(r"\S*?site-packages/", "", s)
    s = re.sub(r"\S*?src/model/", "model/", s)
    s = re.sub(r"\S*?torch_compile/src/exp/", "exp/", s)
    s = re.sub(r"\S*?/(Users|home|private|tmp|var)/\S+", "<path>", s)
    return s


class Capture(logging.Handler):
    """Collects the formatted messages of torch's logging artifacts (TORCH_LOGS without the env var)."""
    def __init__(self):
        super().__init__(logging.DEBUG); self.recs = []
    def emit(self, r):
        try:
            self.recs.append((getattr(r, "artifact", None) or r.name, clean(r.getMessage())))
        except Exception as e:
            self.recs.append(("err", repr(e)))


@contextlib.contextmanager
def logs(**kw):
    """torch._logging.set_logs(**kw) and capture everything the torch loggers emit."""
    h = Capture()
    torch._logging.set_logs(**kw)
    hooked = []
    for name, lg in list(logging.root.manager.loggerDict.items()):
        if name.startswith("torch") and isinstance(lg, logging.Logger) and lg.handlers:
            # torch's own handlers print to stderr: silence them while we capture
            lg.addHandler(h); hooked.append((lg, [x for x in lg.handlers if x is not h]))
            for x in hooked[-1][1]:
                lg.removeHandler(x)
    try:
        yield h
    finally:
        for lg, old in hooked:
            lg.removeHandler(h)
            for x in old:
                lg.addHandler(x)
        torch._logging.set_logs()


def quiet():
    return contextlib.redirect_stdout(io.StringIO())
