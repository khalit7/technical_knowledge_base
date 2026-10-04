# A port of langchain-ai/agentevals trajectory matching (python/agentevals/trajectory/{utils,strict,unordered,subset,superset}.py,
# commit 946ad15, 13 Jul 2026), reduced to lists of tool calls {name, args}.
# Departure: agentevals' strict mode also requires the same messages (roles) in the same order; a τ²-bench gold path has no messages,
# so "strict" here compares the tool-call sequences position by position. Arg matchers are agentevals' (shallow, top-level keys).
WRITES = {'book_reservation', 'cancel_reservation', 'update_reservation_flights', 'update_reservation_passengers',
          'update_reservation_baggages', 'send_certificate'}

def args_match(mode, out, ref):
    if mode == 'exact': return out == ref
    if mode == 'subset': return all(k in ref and ref[k] == v for k, v in out.items())
    if mode == 'superset': return all(k in out and out[k] == v for k, v in ref.items())
    return True  # ignore

def is_superset(outs, refs, am):  # every ref call is matched by a distinct output call
    used = set()
    for r in refs:
        hit = False
        for j, o in enumerate(outs):
            if j in used or o['name'] != r['name']: continue
            if args_match(am, o['args'], r['args']): used.add(j); hit = True; break
        if not hit: return False
    return True

def strict(outs, refs, am):
    return len(outs) == len(refs) and all(o['name'] == r['name'] and args_match(am, o['args'], r['args']) for o, r in zip(outs, refs))

def verdict(mode, am, outs, refs, writes_only=False):
    if writes_only:
        outs = [o for o in outs if o['name'] in WRITES]; refs = [r for r in refs if r['name'] in WRITES]
    if mode == 'strict': return strict(outs, refs, am)
    if mode == 'unordered': return is_superset(outs, refs, am) and is_superset(refs, outs, am)
    if mode == 'subset': return is_superset(refs, outs, am)    # output calls are a subset of the reference
    if mode == 'superset': return is_superset(outs, refs, am)  # output calls include every reference call
    raise ValueError(mode)

MODES = ['strict', 'unordered', 'subset', 'superset']
ARGS = ['exact', 'superset', 'subset', 'ignore']
