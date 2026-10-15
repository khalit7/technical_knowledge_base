"""Export a jaxpr as structured data for the page's Jaxpr explorer: the printed text plus, for every
equation, its primitive, inputs (variable or literal, with abstract value), outputs, parameters
(sub-jaxprs exported recursively), effects and the user source line it came from.
"""
import os
import re

from jax._src import core
from jax._src import source_info_util as siu

from jccommon import scrub

MAXP = 220  # longest parameter string kept


def _aval(a):
    try:
        return a.str_short(short_dtypes=True)
    except Exception:  # noqa: BLE001
        return str(a)


def _atom(ctx, v):
    if isinstance(v, core.Literal):
        return {"lit": str(v.pretty_print(ctx)), "aval": _aval(v.aval)}
    return {"v": ctx.var_names[v], "aval": _aval(v.aval)}


def _src(eqn):
    fr = siu.user_frame(eqn.source_info.traceback)
    if fr is None:
        return None
    return {"file": os.path.basename(fr.file_name), "line": fr.start_line, "fn": fr.function_name}


def _jaxpr_of(p):
    if isinstance(p, core.Jaxpr):
        return p
    return None


def _export(j, ctx, depth=0):
    j = j.jaxpr if hasattr(j, "jaxpr") else j
    out = {
        "constvars": [_atom(ctx, v) for v in j.constvars],
        "consts": [{"aval": _aval(core.typeof(c)) if hasattr(c, "shape") else type(c).__name__} for c in getattr(j, "consts", [])],
        "invars": [_atom(ctx, v) for v in j.invars],
        "outvars": [_atom(ctx, v) for v in j.outvars],
        "effects": sorted(str(e) for e in j.effects),
        "eqns": [],
    }
    for e in j.eqns:
        params = {}
        for k, v in e.params.items():
            sj = _jaxpr_of(v)
            if sj is not None:
                params[k] = {"jaxpr": _export(sj, ctx, depth + 1)}
            elif isinstance(v, (tuple, list)) and v and all(_jaxpr_of(x) is not None for x in v):
                params[k] = {"jaxprs": [_export(x, ctx, depth + 1) for x in v]}
            else:
                s = scrub(str(v))
                params[k] = s if len(s) <= MAXP else s[:MAXP] + " ..."
        out["eqns"].append({
            "prim": e.primitive.name,
            "in": [_atom(ctx, v) for v in e.invars],
            "out": [_atom(ctx, v) if not isinstance(v, core.DropVar) else {"v": "_", "aval": _aval(v.aval)} for v in e.outvars],
            "params": params,
            "effects": sorted(str(x) for x in e.effects),
            "src": _src(e),
        })
    return out


def export(closed):
    ctx = core.JaxprPpContext()
    text = core.pp_jaxpr(closed, ctx, core.JaxprPpSettings()).format()
    data = _export(closed, ctx)
    data["text"] = scrub(text)
    data["n_eqns_top"] = len(closed.eqns)
    data["n_eqns_total"] = count_eqns(closed)
    return data


def count_eqns(j):
    j = j.jaxpr if hasattr(j, "jaxpr") else j
    n = 0
    for e in j.eqns:
        n += 1
        for v in e.params.values():
            if _jaxpr_of(v) is not None:
                n += count_eqns(v)
            elif isinstance(v, (tuple, list)):
                for x in v:
                    if _jaxpr_of(x) is not None:
                        n += count_eqns(x)
    return n


def prim_counts(j, acc=None):
    acc = {} if acc is None else acc
    j = j.jaxpr if hasattr(j, "jaxpr") else j
    for e in j.eqns:
        acc[e.primitive.name] = acc.get(e.primitive.name, 0) + 1
        for v in e.params.values():
            if _jaxpr_of(v) is not None:
                prim_counts(v, acc)
            elif isinstance(v, (tuple, list)):
                for x in v:
                    if _jaxpr_of(x) is not None:
                        prim_counts(x, acc)
    return acc


def strip_np_ints(s):
    return re.sub(r"np\.int64\((\-?\d+)\)", r"\1", s)
