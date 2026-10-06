"""Count sensitive strings left in traces, by where they sit (span attribute or span event attribute) and by trace
source (Claude Code run or the hand-instrumented agent). The machine-specific strings (home directory, login name)
are computed at run time and never written to any output; only counts are.
Usage: python redaction_measure.py OUT.json BEFORE_CC.jsonl BEFORE_AGENT_SPANS(sdk json) mask.jsonl hash.jsonl allowlist.jsonl"""
import getpass, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from otlp_flat import flat

LOGIN = getpass.getuser()
HOME = os.path.expanduser("~")
CHECKS = {"email": re.compile(r"dana\.reyes@example\.com"), "account_id": re.compile(r"ACCT-4417-2290"),
          "login_name": re.compile(re.escape(LOGIN), re.I), "home_path": re.compile(re.escape(HOME))}


def count(spans):
    out = {k: {"attr": 0, "event": 0} for k in CHECKS}
    keys = {k: set() for k in CHECKS}
    for s in spans:
        for k, v in s["attrs"].items():
            for name, rx in CHECKS.items():
                n = len(rx.findall(json.dumps(v)))
                if n:
                    out[name]["attr"] += n
                    keys[name].add(k)
        for e in s.get("events", []):
            for k, v in e["attrs"].items():
                for name, rx in CHECKS.items():
                    n = len(rx.findall(json.dumps(v)))
                    if n:
                        out[name]["event"] += n
                        keys[name].add("event " + e["name"] + ": " + k)
    nbytes = sum(len(json.dumps(s["attrs"])) + len(json.dumps(s.get("events", []))) for s in spans)
    summ = {}
    for s in spans:
        for k in ("redaction.masked.count", "redaction.redacted.count", "redaction.masked.keys", "redaction.redacted.keys"):
            if k in s["attrs"]:
                summ.setdefault(k, []).append(s["attrs"][k])
    return {"hits": out, "keys": {k: sorted(v) for k, v in keys.items()}, "spans": len(spans), "attr_bytes": nbytes,
            "summary_attrs": {k: (sum(v) if all(isinstance(x, int) for x in v) else len(v)) for k, v in summ.items()}}


def sdk_spans(path):
    res = []
    for line in open(path):
        d = json.loads(line)
        res.append({"attrs": d["attributes"], "events": [{"name": e["name"], "attrs": e.get("attributes", {})} for e in d.get("events", [])],
                    "trace": d["context"]["trace_id"][2:]})
    return res


OUT = sys.argv[1]
before_cc = flat(sys.argv[2])
before_ag = sdk_spans(sys.argv[3])
result = {"before": {"claude_code": count(before_cc), "agent": count(before_ag)}}
cc_trace = before_cc[0]["trace"][4:]
for name, path in zip(("mask", "hash", "allowlist"), sys.argv[4:7]):
    sp = flat(path)
    cc = [s for s in sp if s["trace"][4:] == cc_trace]
    ag = [s for s in sp if s["trace"][4:] != cc_trace]
    result[name] = {"claude_code": count(cc), "agent": count(ag)}
json.dump(result, open(OUT, "w"), indent=1)
for k, v in result.items():
    print(k, {src: {c: v[src]["hits"][c] for c in CHECKS} for src in v}, {src: v[src]["attr_bytes"] for src in v})
