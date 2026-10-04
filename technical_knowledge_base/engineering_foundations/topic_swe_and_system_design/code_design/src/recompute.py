"""Recompute every derived number the page shows, from the measured inputs, independently of the page's JavaScript.
check_page.mjs compares its output with what the page renders. Run: python3 recompute.py"""
import json, pathlib
I = pathlib.Path(__file__).parent / "inputs"
b = json.loads((I / "bench_models.json").read_text())["ns_per_object"]
rs = json.loads((I / "refactor_steps.json").read_text())["steps"]
llm = json.loads((I / "llmcall.json").read_text())
crash = json.loads((I / "probe_crash.json").read_text())
steps = [s for s in rs if s["step"] != "bigbang"]
bang = next(s for s in rs if s["step"] == "bigbang")
out = {
    "pdRatio": f'{b["pydantic BaseModel(...)"] / b["dataclass(slots=True)"]:.1f}',
    "cc": [s["cc_handler"] for s in steps], "lines": [s["handler_lines"] for s in steps],
    "passed": [s["passed"] for s in steps], "total": [s["total"] for s in steps],
    "bang": {"cc": bang["cc_handler"], "lines": bang["handler_lines"], "passed": bang["passed"], "total": bang["total"]},
    "before_none": sum(1 for s in llm["scenarios"] if s["before"]["result"] == "returns None"),
    "before_retry_sleep": sum(2 ** a for a in range(3)),            # 1 + 2 + 4: before.py sleeps after every attempt
    "before_max_slept": max(s["before"]["slept_s"] for s in llm["scenarios"]),
    "crash_retry_until_step9": sorted({v["retry"] for k, v in crash.items() if k != "step10"}),
    "crash_retry_step10": crash["step10"]["retry"],
}
assert out["before_retry_sleep"] == out["before_max_slept"]
print(json.dumps(out))
