"""Build data/sl_data.json (what the page embeds) from data/raw/ (the committed run outputs) and check every derived
number the prose quotes. Run: python3 src/recompute.py  (stdlib only; build.sh runs it first)."""
import json, math, os
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(H, "data", "raw")
J = lambda n: json.load(open(os.path.join(R, n)))
f2, f50, tl = J("formats_2k.json"), J("formats_50k.json"), J("tok_lens50k.json")
p2, p50, sh, rs, ls, mg, fw = J("pack2k.json"), J("pack50k.json"), J("shuffle.json"), J("resume.json"), J("loader_speed.json"), J("megatron_demo.json"), J("fineweb_footer.json")
lens2k = J("lens2k.json")
S = {}
b2 = {s["fmt"]: s for s in f2["sizes"]}
Tq, Tg, N = f2["tokens"]["qwen3"]["tokens"], f2["tokens"]["gpt2"]["tokens"], f2["n_docs"]
assert all(v["same"] for v in f2["root_check"].values()), "root's Tool map sizes not reproduced"
assert b2["parquet.zstd"]["bytes"] == b2["parquet.zstd1"]["bytes"], "pyarrow default zstd level is no longer 1"
# bytes per token (Qwen3 unless stated)
bpt = [("UTF-8 text alone", f2["text_bytes"], Tq, "measured"), ("JSONL, uncompressed", b2["jsonl"]["bytes"], Tq, "measured"),
       ("JSONL + zstd level 3", b2["jsonl.zst"]["bytes"], Tq, "measured"), ("Parquet + zstd level 3", b2["parquet.zstd3"]["bytes"], Tq, "measured"),
       ("Token file, uint32 (Qwen3, 151,669 ids) + index", b2["bin"]["bytes"], Tq, "measured"),
       ("Token file, uint16 (GPT-2, 50,257 ids) + index", b2["bin.gpt2"]["bytes"], Tg, "measured, per GPT-2 token")]
S["bpt"] = [{"what": w, "bytes": b, "tokens": t, "bpt": b / t, "tb_per_T": b / t, "kind": k} for w, b, t, k in bpt]
# published cross-checks (derived): Nemotron-CC 6.3T tokens in 10.4 TiB jsonl.zstd; FineWeb CC-MAIN-2025-26 419.6 GB snappy parquet, 152.4B GPT-2 tokens
S["xcheck"] = {"nemotron_bpt": 10.4 * 2 ** 40 / 6.3e12, "fineweb_bpt": 419.6e9 / 152.4e9,
               "ours_zst_bpt": b2["jsonl.zst"]["bytes"] / Tq, "ours_snappy_gpt2_bpt": b2["parquet.snappy"]["bytes"] / Tg}
S["fmt2k"] = {"n": N, "text_bytes": f2["text_bytes"], "sizes": f2["sizes"], "parquet": f2["parquet"], "tar": f2["tar"], "versions": f2["versions"],
              "tokens": f2["tokens"], "ra": f2.get("random_access")}
S["fmt50k"] = {"n": f50["n_docs"], "text_bytes": f50["text_bytes"], "sizes": f50["sizes"], "t": f50["timings"], "ra": f50["random_access"], "tokens": f50["tokens"]}
S["tok"] = {k: tl[k] for k in ("n_docs", "tokens", "chars_per_token", "bytes_per_token", "threads", "rough_batch_tokens_per_s", "rough_single_thread_tokens_per_s")}
S["fw"] = fw
S["lens2k"] = lens2k
S["pack"] = {"k2": p2["by_L"], "k50": p50["by_L"], "demo": p2["demo"]}
keep = ["none", "hf_buf1_mbis1", "buf_only100", "hf_buf100_mbis1", "hf_buf1000_mbis1", "hf_buf1000", "dl4_hf_buf1000_mbis1", "mds_py1e_blk200",
        "mds_py1e_blk262144", "mds_py1br_blk200", "mds_py1br_blk262144", "mds_naive_blk262144", "global"]
S["shuf"] = {"K": sh["K"], "S": sh["S"], "batch": sh["batch"], "names": sh["names"], "nsh": sh["hf_num_shards"], "nsh_after": sh["hf_num_shards_after_shuffle"],
             "versions": sh["versions"], "orders": {k: sh["orders"][k] for k in keep}, "m": {k: sh["metrics"][k] for k in keep}}
S["resume"] = {k: {kk: vv for kk, vv in v.items() if kk != "state"} for k, v in rs.items() if k != "versions"}
S["resume_versions"] = rs["versions"]
S["loader"] = ls
S["meg"] = mg
# absorbed 2026-10-24 from Storage and data movement (its Storage lab's prefetch run, copied unchanged into data/raw):
# one 4 MiB shard per step, 100 ms compute, 16 steps; the page's model (fetch + compute, or max(fetch, compute) with prefetch)
# must land near both measured S3 totals at the measured mean fetch.
pf = J("prefetch_storage_lab.json")["runs"]
S["prefetch"] = pf
fe = sum(pf["s3|none"]["wait_ms"]) / len(pf["s3|none"]["wait_ms"])
m_none, m_pf = 16 * (100 + fe) / 1000, (fe + 16 * 100) / 1000
assert abs(m_none / pf["s3|none"]["total_s"] - 1) < 0.013 and abs(m_pf / pf["s3|prefetch2"]["total_s"] - 1) < 0.013, (m_none, m_pf)
# Llama 3 405B (arXiv 2407.21783, Table 4 and section 3.3): 16,384 GPUs at 400 TFLOPs/GPU (BF16 MFU 41%), 16M tokens per batch,
# 128K vocabulary (so 4-byte ids), 466 interruptions in a 54-day snapshot. Derived with the 6N approximation (no attention FLOPs).
g, fl, n = 16384, 400e12, 405e9
tps = g * fl / (6 * n)
S["llama"] = {"gpus": g, "tflops": 400, "params": n, "tokens_per_s": tps, "mb_per_s_uint32": tps * 4 / 1e6, "step_s": 16 * 2 ** 20 / tps,
              "per_gpu_tokens_s": tps / g, "interruptions": 466, "days": 54, "tectonic_tb_s": 2}
# checks of numbers quoted in the prose
P = S["pack"]["k2"]["2048"]
chk = {"pad_frac_2048": round(100 * P["pad"]["pad_frac"], 1) == 67.6, "concat_cut_2048": P["concat"]["docs_cut"] == 605,
       "bfd_cut_2048": P["bfd"]["docs_cut"] == 93, "cross_2048": round(100 * P["concat"]["cross_pair_frac"]) == 53,
       "wrap_docs": f2["tokens"]["qwen3"]["docs_with_id_ge_65536"] == 1942, "llama_tps": round(tps / 1e6, 1) == 2.7,
       "shuffle_none": round(sh["metrics"]["none"]["batch_distinct_mean"], 1) == 1.1,
       "shuffle_buf1000": round(sh["metrics"]["hf_buf1000_mbis1"]["batch_distinct_mean"], 1) == 9.0,
       "shuffle_global": round(sh["metrics"]["global"]["batch_distinct_mean"], 1) == 10.5,
       "hf_lost_1000": rs["hf_buffer1000"]["never_seen"] == 1000}
assert all(chk.values()), chk
S["checks"] = chk
json.dump(S, open(os.path.join(H, "data", "sl_data.json"), "w"), separators=(",", ":"), ensure_ascii=False)
print("ok", os.path.getsize(os.path.join(H, "data", "sl_data.json")), {k: round(v, 3) for k, v in S["xcheck"].items()}, round(tps), round(S["llama"]["step_s"], 2))
