"""Generate the audit corpus for the breadth task: a fictional package `fleetops` with
48 modules of about 12 KB each. Every public function's docstring makes one checkable
claim (a default, a unit, an order, a bound, a missing-key behaviour, a retry count,
a scale, case handling). In 16 functions spread over 14 modules the code disagrees with
its own docstring. The answer key is written OUTSIDE the corpus directory.

usage: python3 gen_audit.py <out_repo_dir> <truth_json>
"""
import json, os, random, sys

R = random.Random(20261006)
OUT, TRUTH = sys.argv[1], sys.argv[2]

TOPICS = ["billing", "scheduler", "retries", "cache", "metrics", "routing", "invoices", "quotas",
          "sessions", "alerts", "inventory", "shipments", "drivers", "vehicles", "fuel", "maintenance",
          "dispatch", "geofence", "telemetry", "tariffs", "payroll", "audit_log", "permits", "tolls",
          "warehouses", "pallets", "customs", "returns", "ratings", "support", "contracts", "pricing",
          "forecast", "capacity", "routes_cache", "weather", "incidents", "insurance", "leases", "parking",
          "charging", "batteries", "tyres", "inspections", "training", "shifts", "rosters", "exports"]
NOUNS = ["order", "trip", "stop", "batch", "ticket", "event", "record", "quote", "lane", "slot",
         "job", "entry", "reading", "claim", "visit", "load", "leg", "invoice", "route", "window"]
VERBS = ["fetch", "load", "compute", "estimate", "resolve", "collect", "measure", "lookup", "rank",
         "filter", "count", "match", "select", "score", "summarise", "check", "sync", "build", "pick", "find"]


def ident(used):
    while True:
        noun, suf = R.choice(NOUNS), R.choice(['', 's', '_ids', '_info', '_stats', '_window', '_delay', '_rate'])
        if suf == 's':
            noun, suf = (noun[:-1] + 'ies' if noun.endswith('y') else noun + ('es' if noun.endswith(('ch', 'sh', 'x', 's')) else 's')), ''
        n = f"{R.choice(VERBS)}_{noun}{suf}"
        if n not in used:
            used.add(n)
            return n


# Each kind returns (docstring_claim, body_lines, signature_args) for correct or buggy code.
def k_default(bug):
    n = R.choice([5, 10, 15, 20, 30, 45, 60, 90, 120])
    m = R.choice([x for x in [5, 10, 15, 20, 30, 45, 60, 90, 120] if x != n]) if bug else n
    claim = R.choice([f"The default timeout is {n} seconds.", f"timeout defaults to {n} seconds when not given.",
                      f"If no timeout is passed, {n} seconds is used."])
    body = ["deadline = clock() + timeout", "while clock() < deadline:", "    item = source.poll()",
            "    if item is not None:", "        return item", "return None"]
    return claim, body, f"source, timeout={m}"


def k_unit(bug):
    claim = R.choice(["Returns the elapsed time in milliseconds.", "The result is in milliseconds.",
                      "Elapsed time is returned as milliseconds."])
    body = ["start = record.started_at", "end = record.finished_at or clock()",
            "return end - start" if bug else "return (end - start) * 1000"]
    return claim, body, "record"


def k_order(bug):
    claim = R.choice(["Results are sorted from newest to oldest.", "The newest item comes first.",
                      "Returns the items in descending order of timestamp (newest first)."])
    body = ["items = [x for x in items if x is not None]",
            "return sorted(items, key=lambda x: x.ts)" if bug else "return sorted(items, key=lambda x: x.ts, reverse=True)"]
    return claim, body, "items"


def k_bound(bug):
    claim = R.choice(["Both bounds are inclusive.", "lo and hi are both included in the range.",
                      "A value equal to lo or to hi counts as inside."])
    body = ["out = []", "for x in values:", ("    if lo <= x < hi:" if bug else "    if lo <= x <= hi:"),
            "        out.append(x)", "return out"]
    return claim, body, "values, lo, hi"


def k_missing(bug):
    claim = R.choice(["Returns None when the key is missing.", "A missing key gives None rather than an error.",
                      "If key is not present, None is returned."])
    body = ["key = normalise(key)", "return table[key]" if bug else "return table.get(key)"]
    return claim, body, "table, key"


def k_retry(bug):
    n = R.choice([2, 3, 4, 5])
    claim = R.choice([f"Tries at most {n} times in total.", f"Makes no more than {n} attempts.",
                      f"Gives up after {n} attempts."])
    body = ["last = None", f"for attempt in range({n + 1 if bug else n}):", "    try:", "        return call()",
            "    except TransientError as e:", "        last = e", "        sleep(backoff(attempt))", "raise last"]
    return claim, body, "call"


def k_scale(bug):
    claim = R.choice(["Returns a fraction between 0 and 1.", "The rate is a fraction in [0, 1], not a percentage.",
                      "Result is a ratio from 0.0 to 1.0."])
    body = ["if total == 0:", "    return 0.0", "return 100 * hits / total" if bug else "return hits / total"]
    return claim, body, "hits, total"


def k_case(bug):
    claim = R.choice(["Matching ignores case.", "The comparison is case-insensitive.",
                      "Upper and lower case are treated as equal."])
    body = ["for name in names:", ("    if name == query:" if bug else "    if name.lower() == query.lower():"),
            "        return name", "return None"]
    return claim, body, "names, query"


KINDS = [k_default, k_unit, k_order, k_bound, k_missing, k_retry, k_scale, k_case]
FILLER_DOC = ["Helper used by the public functions above.", "Internal: formats a row for logging.",
              "Kept for backwards compatibility.", "Small utility; no behaviour promised beyond the code."]


def filler(name):
    k = R.randint(0, 3)
    if k == 0:
        body = ["parts = [str(p) for p in parts if p]", "return ' / '.join(parts)"]
        args = "*parts"
    elif k == 1:
        body = ["total = 0", "for row in rows:", "    total += row.get('qty', 0) * row.get('price', 0)", "return round(total, 2)"]
        args = "rows"
    elif k == 2:
        body = ["seen = set()", "out = []", "for x in xs:", "    if x not in seen:", "        seen.add(x)",
                "        out.append(x)", "return out"]
        args = "xs"
    else:
        body = ["if not text:", "    return ''", "text = text.strip()", "return text[:limit] + ('...' if len(text) > limit else '')"]
        args = "text, limit=40"
    return f'def _{name}({args}):\n    """{R.choice(FILLER_DOC)}"""\n' + "\n".join("    " + b for b in body) + "\n"


def public(name, kind, bug, topic):
    claim, body, args = kind(bug)
    intro = R.choice([f"Part of the {topic} service.", f"Used by the {topic} worker.",
                      f"Called from the {topic} API handlers.", f"Shared {topic} helper."])
    extra = R.choice(["", "\n\n    Raises ValueError on malformed input.", "\n\n    Thread-safe.",
                      "\n\n    See the module docstring for the data model."])
    doc = f'    """{intro} {claim}{extra}\n    """'
    return f"def {name}({args}):\n{doc}\n" + "\n".join("    " + b for b in body) + "\n"


def main():
    pkg = os.path.join(OUT, "fleetops")
    os.makedirs(pkg, exist_ok=True)
    nmod = len(TOPICS)
    # 16 planted mismatches in 14 modules (two modules carry two)
    bug_mods = R.sample(range(nmod), 14)
    double = set(R.sample(bug_mods, 2))
    truth, claims = [], 0
    for mi, topic in enumerate(TOPICS):
        used = set()
        nbugs = (2 if mi in double else 1) if mi in bug_mods else 0
        npub = 30
        bug_slots = set(R.sample(range(npub), nbugs))
        chunks = [f'"""fleetops.{topic}: functions for the {topic.replace("_", " ")} part of the fleet operations service.\n\n'
                  f'Every public function documents its contract in its docstring.\n"""\n'
                  "from ._runtime import clock, sleep, backoff, normalise, TransientError\n\n"]
        for j in range(npub):
            name = ident(used)
            kind = KINDS[(j + mi) % len(KINDS)]
            bug = j in bug_slots
            chunks.append(public(name, kind, bug, topic.replace("_", " ")))
            claims += 1
            if bug:
                truth.append(dict(file=f"fleetops/{topic}.py", function=name, kind=kind.__name__[2:]))
            if R.random() < 0.55:
                chunks.append(filler(ident(used)))
        with open(os.path.join(pkg, topic + ".py"), "w") as f:
            f.write("\n\n".join(chunks))
    with open(os.path.join(pkg, "__init__.py"), "w") as f:
        f.write('"""fleetops: a fleet operations service (fictional, generated for an audit exercise)."""\n')
    with open(os.path.join(pkg, "_runtime.py"), "w") as f:
        f.write("import time\n\nclass TransientError(Exception):\n    pass\n\n"
                "def clock():\n    return time.monotonic()\n\ndef sleep(s):\n    time.sleep(s)\n\n"
                "def backoff(attempt):\n    return min(8.0, 0.5 * 2 ** attempt)\n\n"
                "def normalise(key):\n    return str(key).strip()\n")
    with open(os.path.join(OUT, "README.md"), "w") as f:
        f.write("# fleetops\n\nA fleet operations service. Each module in `fleetops/` holds the functions for one part of the service.\n"
                "Every public function states its contract (defaults, units, ordering, bounds, error behaviour) in its docstring.\n")
    json.dump(dict(modules=nmod, public_functions=claims, mismatches=truth), open(TRUTH, "w"), indent=1)
    print(nmod, "modules", claims, "claims", len(truth), "mismatches")


main()
