"""Feed every edge case (edge_cases.py, served by lab_server.py) through four Python SSE parsers.
Prints one JSON line per (parser, case): the events dispatched as [type, data, last event id]."""
import json, sys, importlib.metadata as md
import httpx
from edge_cases import CASES

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:30401"


def chunks(case):
    with httpx.stream("GET", f"{BASE}/edge/{case}") as r:
        yield from r.iter_raw()


def p_httpx_sse(case):
    from httpx_sse import EventSource
    with httpx.stream("GET", f"{BASE}/edge/{case}") as r:
        return [[e.event, e.data, e.id] for e in EventSource(r).iter_sse()]


def p_openai(case):
    from openai._streaming import SSEDecoder
    return [[e.event or "message", e.data, e.id or ""] for e in SSEDecoder().iter_bytes(chunks(case))]


def p_anthropic(case):
    from anthropic._streaming import SSEDecoder
    return [[e.event or "message", e.data, e.id or ""] for e in SSEDecoder().iter_bytes(chunks(case))]


def p_sseclient(case):
    import sseclient
    return [[e.event, e.data, e.id or ""] for e in sseclient.SSEClient(chunks(case)).events()]


PARSERS = {"httpx-sse": ("httpx-sse", p_httpx_sse), "openai SDK": ("openai", p_openai),
           "anthropic SDK": ("anthropic", p_anthropic), "sseclient-py": ("sseclient-py", p_sseclient)}

for name, (pkg, fn) in PARSERS.items():
    for case in CASES:
        try:
            out = fn(case)
            err = None
        except Exception as e:  # a parser that raises is a result too
            out, err = None, f"{type(e).__name__}: {e}"[:200]
        print(json.dumps({"parser": name, "version": md.version(pkg), "lang": "Python", "case": case,
                          "events": out, "error": err}))
