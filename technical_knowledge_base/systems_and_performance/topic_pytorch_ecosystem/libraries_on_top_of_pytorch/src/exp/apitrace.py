"""API-level call tracer: every call that crosses from a library (or your own script) into PyTorch's Python API.

sys.setprofile sees each Python-level call ('call') and each call of a C function from Python ('c_call').
An edge is kept when the caller's file belongs to a library we watch (or to the user's script) and the
callee lives in torch. Edges are counted separately before the first forward ("setup") and after it ("loop").
Deterministic (counts, not times)."""
import re, sys, threading

LIBS = ["transformers", "accelerate", "lightning_fabric", "lightning", "deepspeed", "torchtitan", "peft", "trl"]
_LIB_RE = re.compile(r"/(" + "|".join(LIBS) + r")/(.*)$")


class Tracer:
    def __init__(self, user_files=()):
        self.user_files = tuple(user_files)
        self.cache = {}
        self.edges = {}          # (phase, caller, callee) -> [count, caller_line]
        self.phase = "setup"
        self.seq = 0             # order in which edges are first seen

    def _who(self, fn):
        r = self.cache.get(fn)
        if r is None:
            if "/site-packages/torch/" in fn or fn.startswith("<"):
                r = ""
            else:
                m = _LIB_RE.search(fn.replace("\\", "/"))
                if m and "/torch/" not in m.group(0):
                    r = m.group(1) + "/" + m.group(2)
                elif fn.endswith(self.user_files):
                    r = "you/" + fn.replace("\\", "/").rsplit("/", 1)[-1]
                else:
                    r = ""
            self.cache[fn] = r
        return r

    @staticmethod
    def _torch_name(code):
        f = code.co_filename.replace("\\", "/")
        i = f.find("/site-packages/torch/")
        if i < 0:
            return None
        mod = f[i + len("/site-packages/"):-3].replace("/", ".")
        if mod.endswith(".__init__"):
            mod = mod[:-9]
        return mod + "." + getattr(code, "co_qualname", code.co_name)

    @staticmethod
    def _c_name(fn):
        self_ = getattr(fn, "__self__", None)
        name = getattr(fn, "__name__", "?")
        import torch
        if isinstance(self_, torch.Tensor):
            return "Tensor." + name
        mod = getattr(fn, "__module__", None) or ""
        if mod.startswith("torch"):
            return mod + "." + name
        if self_ is not None and getattr(self_, "__name__", "").startswith("torch"):
            return self_.__name__ + "." + name
        return None

    @staticmethod
    def _unwrap(frame, name):
        """A decorator's inner function (e.g. c10d's exception logger, no_grad, contract) is named after the
        function it wraps, found among the frame's closure variables."""
        if "<locals>" not in name:
            return name
        loc = frame.f_locals
        for k in ("func", "fn", "f", "orig_fn", "method", "target"):
            w = loc.get(k)
            if callable(w) and hasattr(w, "__qualname__"):
                mod = getattr(w, "__module__", None) or ""
                return (mod + "." if mod else "") + w.__qualname__ + "  [via " + name.rsplit(".", 1)[-1] + "]"
        return name

    def _prof(self, frame, event, arg):
        if event == "call":
            name = self._torch_name(frame.f_code)
            if name is None:
                return
            back = frame.f_back
            if back is None:
                return
            who = self._who(back.f_code.co_filename)
            if not who:
                return
            caller = who + ":" + getattr(back.f_code, "co_qualname", back.f_code.co_name)
            line = back.f_lineno
            name = self._unwrap(frame, name)
        elif event == "c_call":
            who = self._who(frame.f_code.co_filename)
            if not who:
                return
            name = self._c_name(arg)
            if name is None:
                return
            caller = who + ":" + getattr(frame.f_code, "co_qualname", frame.f_code.co_name)
            line = frame.f_lineno
        else:
            return
        k = (self.phase, caller, name)
        e = self.edges.get(k)
        if e is None:
            self.seq += 1
            self.edges[k] = [1, line, self.seq]
        else:
            e[0] += 1

    def __enter__(self):
        sys.setprofile(self._prof)
        threading.setprofile(self._prof)
        return self

    def __exit__(self, *a):
        sys.setprofile(None)
        threading.setprofile(None)

    def result(self):
        out = []
        for (ph, caller, callee), (n, line, first) in sorted(self.edges.items(), key=lambda kv: kv[1][2]):
            out.append([ph, caller, line, callee, n, first])
        return out
