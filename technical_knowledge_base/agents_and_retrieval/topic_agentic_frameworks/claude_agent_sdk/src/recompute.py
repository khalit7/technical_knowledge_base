"""Every number the page quotes from the recordings, recomputed from recordings/*.json into data/numbers.json.
Prices are Anthropic list prices per million tokens (platform.claude.com/docs/en/about-claude/pricing, read
2026-10-05, in the shared FACTS file): input, 5-minute cache write, 1-hour cache write, cache read, output."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
PRICE = {"claude-haiku-4-5-20251001": (1.0, 1.25, 2.0, 0.10, 5.0),
         "claude-sonnet-5-5": (2.0, 2.5, 4.0, 0.20, 10.0)}
LABELS = ["s1_wire", "s2_deny", "s3_bare", "s4_session", "s5_subagent", "s6_structured", "s8_ts", "s9_rewind"]

def calls(events, parent=None):
    """API calls of the main thread: assistant messages deduplicated by message label (one per content block)."""
    seen, out = set(), []
    for e in events:
        if e["k"] == "asst" and e.get("parent") == parent and e["msg"] not in seen:
            seen.add(e["msg"]); u = e.get("usage") or {}
            out.append({"msg": e["msg"], "model": e["model"], "in": u.get("input_tokens", 0),
                        "cw": u.get("cache_creation_input_tokens", 0), "cr": u.get("cache_read_input_tokens", 0)})
    return out

def reproduce(res, ttl_main):
    """Price modelUsage at list prices. The main model's cache writes use the TTL split seen in result.usage;
    other models (subagents) are tried at both TTLs."""
    total = {}
    for ttl_other in ("5m", "1h"):
        s = 0.0
        for m, v in res["model_usage"].items():
            pi, p5, p1, pr, po = PRICE[m]
            main = m == res["main_model"]
            ttl = ttl_main if main else ttl_other
            s += (v["inputTokens"] * pi + v["outputTokens"] * po + v["cacheReadInputTokens"] * pr
                  + v["cacheCreationInputTokens"] * (p1 if ttl == "1h" else p5)) / 1e6
        total[ttl_other] = round(s, 7)
    return total

N = {}
for L in LABELS:
    r = json.load(open(os.path.join(REC, L + ".json")))
    ev = r["events"]
    results = [e for e in ev if e["k"] == "result"]
    init = next(e for e in ev if e["k"] == "init")["init"]
    c = calls(ev)
    d = {"label": L, "model": init["model"], "cli": init["claude_code_version"], "tools": init["tools"],
         "permissionMode": init["permissionMode"], "calls": c, "n_calls": len(c),
         "first_call_in": (c[0]["in"] + c[0]["cw"] + c[0]["cr"]) if c else None,
         "tests_after": (r.get("meta") or {}).get("tests_after"), "wall_s": (r.get("meta") or {}).get("wall_s"),
         "tests_unchanged": (r.get("meta") or {}).get("tests_unchanged"), "argv": r.get("argv"),
         "results": []}
    for res in results:
        u = res["usage"] or {}
        res2 = {"phase": res.get("phase"), "subtype": res["subtype"], "num_turns": res["num_turns"],
                "cost": res["total_cost_usd"], "duration_ms": res["duration_ms"], "session": res["session"],
                "usage_in": u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0),
                "usage_out": u.get("output_tokens"), "cache_1h": u.get("cache_1h"), "cache_5m": u.get("cache_5m"),
                "model_usage": res["model_usage"], "denials": len(res["permission_denials"]),
                "denied_tools": [p["tool"] for p in res["permission_denials"]],
                "structured_output": res.get("structured_output")}
        res["main_model"] = init["model"]
        ttl = "1h" if (u.get("cache_1h") or 0) > 0 or not (u.get("cache_5m") or 0) else "5m"
        rep = reproduce(res, ttl)
        res2["reproduced"] = rep
        res2["residual_5m"] = round(res["total_cost_usd"] - rep["5m"], 7)
        res2["residual_1h"] = round(res["total_cost_usd"] - rep["1h"], 7)
        mu_in = sum(v["inputTokens"] + v["cacheReadInputTokens"] + v["cacheCreationInputTokens"] for v in res["model_usage"].values())
        res2["model_usage_in"] = mu_in
        d["results"].append(res2)
    # callbacks
    cbs = [e for e in ev if e["k"] == "cb"]
    d["hooks"] = sum(1 for e in cbs if e.get("kind") == "hook")
    d["hooks_pre"] = sum(1 for e in cbs if e.get("kind") == "hook" and e.get("event") == "PreToolUse")
    d["permission_calls"] = [{"tool": e["tool"], "decision": e["decision"]} for e in cbs if e.get("kind") == "permission"]
    d["tool_calls"] = [b["name"] for e in ev if e["k"] == "asst" for b in e["blocks"] if b["k"] == "call" and not e.get("parent")]
    d["sub_tool_calls"] = [b["name"] for e in ev if e["k"] == "asst" for b in e["blocks"] if b["k"] == "call" and e.get("parent")]
    d["denied_events"] = [{"tool": e["tool"], "subagent": e["subagent"]} for e in ev if e["k"] == "denied"]
    d["other_cb"] = [e for e in cbs if e.get("kind") not in ("hook", "permission")]
    N[L] = d

# per-phase (own) cost in the session run: totals are cumulative across turns and across resumed processes
s4 = N["s4_session"]["results"]
for i, r in enumerate(s4):
    r["own_cost"] = round(r["cost"] - (s4[i - 1]["cost"] if i else 0), 7)
N["s4_session"]["note"] = "total_cost_usd and modelUsage are cumulative across turns and across resume/fork; usage is per turn"
N["connectors"] = json.load(open(os.path.join(REC, "s7_connectors.json")))
N["session_files"] = json.load(open(os.path.join(REC, "session_files.json")))
os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
json.dump(N, open(os.path.join(HERE, "data", "numbers.json"), "w"), indent=1)
for L in LABELS:
    d = N[L]
    print(L, d["model"], d["cli"], "calls", d["n_calls"], "first", d["first_call_in"], "tests", d["tests_after"],
          [(r["phase"], r["subtype"], r["cost"], r["residual_1h"], r["residual_5m"], r["usage_in"], r["model_usage_in"], r["denials"]) for r in d["results"]])
