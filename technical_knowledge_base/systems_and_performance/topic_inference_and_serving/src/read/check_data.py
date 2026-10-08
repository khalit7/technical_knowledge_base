"""Checks for the Reading tab: the page embeds exactly out/rd_data.json; the measured numbers equal the Engine bench's
facts; every number written in the prose agrees with the data it comes from. Run: python3 -I check_data.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, "out", "rd_data.json")))
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
fails = []
m = re.search(r"window\.RDD=(\{.*?\});\n", page)
if not m or json.loads(m.group(1)) != D: fails.append("embedded RDD differs from out/rd_data.json")
bench = json.load(open(os.path.join(HERE, "..", "bench", "data.json")))["facts"]
for k, v in D["meas"].items():
    if bench.get(k) != v: fails.append(f"meas {k}: {v} != bench {bench.get(k)}")
plan = json.load(open(os.path.join(HERE, "..", "plan", "out", "plan_ref.json")))[0]["out"]
read = "".join(open(os.path.join(HERE, "..", "parts", f), encoding="utf-8").read() for f in sorted(os.listdir(os.path.join(HERE, "..", "parts"))) if f.startswith("20_read"))
txt = re.sub(r"<[^>]+>", " ", read)
L, M, C = D["life"], D["meas"], D["cost"]
kv = {r["k"]: r for r in D["kv"]}
B = {b["B"]: b for b in D["batch"]}
f0 = lambda x: f"{round(x):,}"
expect = [  # (text that must appear in the Reading prose, why)
    (f'{L["weights_gb"]} GB', "FP8 weights of Llama 3.1 70B"),
    (f'{L["t_dec_ms"]} ms', "single-user decode step"),
    (f'{L["t_pre_ms"]} ms', "prefill of 2,000 tokens"),
    (f'{L["ridge"]:.0f} operations', "H200 ridge"),
    (f'{L["pre_int"]:,.0f} operations per byte', "prefill intensity"),
    (f'{f0(B[141]["tot"])}', "throughput at 141 users"),
    (f'{f0(L["kv_req_mb"])} MiB', "KV per 2,300-token conversation"),
    (f'{L["seqs_fit"]} conversations', "conversations that fit"),
    (f'{kv["l70"]["per_tok"]["2"]:,} bytes', "KV bytes per token 70B"),
    (f'{kv["q06"]["per_tok"]["2"]:,} bytes', "KV bytes per token 0.6B (measured)"),
    (f'{M["pp512_06q4"]} tokens per second', "pp512"),
    (f'generates at {M["tg_06q4"]}', "tg128"),
    (f'{M["pfxOff"]} ms to {M["pfxOn"]} ms', "prefix cache"),
    (f'{M["vllmPreempt"]} preemptions', "vLLM preemptions"),
    (f'{M["vllmTok8"]} to {M["vllmTok16"]}', "vLLM throughput 8 to 16 users"),
    (f'{M["vllmKvTok"]}-token cache', "vLLM KV tokens"),
    (f'{D["stream"]["tpot_ms"]} ms', "measured mean TPOT"),
    (f'{D["stream"]["itl_med_ms"]} ms', "measured median ITL"),
    (f'{D["stream"]["itl_max_ms"]:.0f} ms', "measured longest gap"),
    (f'{D["stream"]["prompt"]}-token prompt', "measured stream prompt"),
    (f'{M["verify4"]} times', "verify 4 tokens cost"),
    (f'${C["cost_h"]:.2f}', "fleet cost per hour"),
    (f'${C["api_h"]:.2f}', "API cost per hour"),
    (f'${C["usd_blend"]:.2f} per million', "blended self-host price"),
    (f'{C["gpus"]} H200s', "GPUs"),
    (f'{C["lam_slo"]} requests per second', "rate per GPU within SLO"),
    (f'TTFT p99 {C["ttft_p99_s"]:.2f} s', "TTFT at operating point"),
    (f'TPOT {C["tpot_ms"]} ms', "TPOT at operating point"),
    (f'{D["spec"]["a0.7_k4"]:.2f} at a = 0.7', "expected tokens per pass"),
    (f'from 10 GPUs to {C["relax_gpus"]} (${C["relax_cost_h"]:.2f}', "fleet at 100 ms TPOT"),
]
for s, why in expect:
    if s not in txt and s not in read: fails.append(f"prose lacks '{s}' ({why})")
# derived checks done by hand in the prose
chk = [(round(B[64]["tot"] / B[1]["tot"]), 42, "64 users give 42 times"), (round(B[141]["tot"] / B[1]["tot"]), 64, "64 times the work"),
       (round(L["t_dec_ms"] / (L["t_pre_ms"] / 2000), -2), 100, "a hundred times cheaper per token"),
       (round((L["t_pre_ms"] + 299 * L["t_dec_ms"]) / 1000, 2), round(L["e2e_s"], 2), "E2E"),
       (round(299 * L["t_dec_ms"] / L["t_pre_ms"]), 15, "15 times as long as the prefill"),
       (round(131072 * kv["l70"]["per_tok"]["2"] / 2**30), 40, "128K tokens are 40 GiB"),
       (round(2000 * kv["l70"]["per_tok"]["2"] / 2**20), 625, "625 MiB per 2,000 tokens"),
       (round(100 * 4096 * kv["l70"]["per_tok"]["2"] / 2**30), 125, "100 users at 4K: 125 GiB"),
       (plan["gpus"], C["gpus"], "planner GPUs")]
for got, want, why in chk:
    if got != want: fails.append(f"{why}: {got} != {want}")
print("\n".join(fails) if fails else f"OK: embed, {len(D['meas'])} measured facts, {len(expect)} prose numbers, {len(chk)} derived checks")
sys.exit(1 if fails else 0)
