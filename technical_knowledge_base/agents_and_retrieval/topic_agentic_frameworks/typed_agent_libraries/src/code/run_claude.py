"""Claude through the subscription (claude -p, built-in tools off), ten cases, two ways:
 prompt: the JSON schema in the system prompt (Pydantic AI's prompted-output template, verbatim), raw text parsed strictly
 schema: --json-schema (Claude Code adds a StructuredOutput tool; result.structured_output)
Usage: run_claude.py MODEL MODE   (raw JSONL per run into recordings/ftyped/claude/)"""
import json, os, subprocess, sys, time
import common
from common import Triage, CASES
from textwrap import dedent

MODEL, MODE = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
TASK = os.path.join(HERE, "..", "claude", "task")
REC = os.path.join(HERE, "..", "..", "recordings", "ftyped", "claude")
OUT = os.path.join(HERE, "out", f"claude_{MODEL}_{MODE}.jsonl")
TEMPLATE = dedent("""
    Always respond with a JSON object that's compatible with this schema:

    {schema}

    Don't include any text or Markdown fencing before or after.
    """)
schema = json.dumps(Triage.model_json_schema())
NOEM = " Never use the em-dash character."
for c in CASES:
    raw = os.path.join(REC, f"{MODEL}_{MODE}_{c['id']}.jsonl")
    cmd = ["claude", "-p", common.prompt(c), "--output-format", "stream-json", "--verbose",
           "--no-session-persistence", "--setting-sources", "project", "--strict-mcp-config",
           "--model", MODEL, "--tools", ""]
    if MODE == "prompt":
        cmd += ["--append-system-prompt", common.INSTRUCTIONS + "\n\n" + TEMPLATE.format(schema=schema).strip() + NOEM]
    else:
        cmd += ["--append-system-prompt", common.INSTRUCTIONS + NOEM, "--json-schema", schema]
    t0 = time.time()
    p = subprocess.run(cmd, cwd=TASK, capture_output=True, text=True, timeout=300)
    open(raw, "w").write(p.stdout)
    recs = [json.loads(l) for l in p.stdout.splitlines() if l.strip().startswith("{")]
    res = next((r for r in recs if r.get("type") == "result"), {})
    obj, err = None, None
    if MODE == "prompt":
        obj, err = common.try_parse(res.get("result", ""))
    else:
        so = res.get("structured_output")
        try:
            obj = Triage.model_validate(so)
        except Exception as e:
            err = "schema: " + str(e)[:200]
    tools_used = [b.get("name") for r in recs if r.get("type") == "assistant"
                  for b in r["message"].get("content", []) if b.get("type") == "tool_use"]
    u = res.get("usage", {})
    rec = {"lib": "claude-cli", "mode": MODE, "model": MODEL, "case": c["id"], "error": err,
           "num_turns": res.get("num_turns"), "subtype": res.get("subtype"), "cost": res.get("total_cost_usd"),
           "in_tokens": (u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0)),
           "out_tokens": u.get("output_tokens"), "tools_used": tools_used, "seconds": round(time.time() - t0, 1),
           "text_head": (res.get("result") or "")[:200],
           "obj": obj.model_dump() if obj is not None else None, **common.score(c, obj)}
    with open(OUT, "a") as f:
        f.write(json.dumps(rec) + "\n")
    print(MODEL, MODE, c["id"], rec["valid"], err, rec["in_tokens"], flush=True)
