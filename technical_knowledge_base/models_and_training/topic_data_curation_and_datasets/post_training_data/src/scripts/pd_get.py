"""Download the post-training samples this page measures (beyond the setup agent's four), CPU and network only.

Three modes per entry:
  whole   the whole file(s), via hf_hub_download (small sets)
  cols    a few columns of every row of every file (mixture composition: the source column only)
  sample  random row groups (seed 0) until about N rows, chosen columns, saved as one parquet

Pinned to the repo's current commit (recorded). Outputs: $DC_SCRATCH/data/pd/; manifest appended to
src/inputs/pd_manifest.jsonl (repo, revision, files, row groups, rows, sha256 of the saved file).
usage: DC_SCRATCH=... HF_HOME=$DC_SCRATCH/hf python -I -B pd_get.py <name> [<name> ...]   (names below; 'all')
"""
import hashlib
import json
import os
import random
import sys
import time

import pyarrow as pa
import pyarrow.parquet as pq
from huggingface_hub import HfApi, HfFileSystem, hf_hub_download

HERE = os.path.dirname(os.path.abspath(__file__))
MAN = os.path.join(HERE, "..", "inputs", "pd_manifest.jsonl")
OUT = os.path.join(os.environ["DC_SCRATCH"], "data", "pd")
os.makedirs(OUT, exist_ok=True)
api, fs = HfApi(), HfFileSystem()

SPECS = {
    # SFT lineage
    "alpaca": dict(repo="tatsu-lab/alpaca", mode="whole", files=["data/train-00000-of-00001-a09b74b3ef9c3b56.parquet"]),
    "dolly": dict(repo="databricks/databricks-dolly-15k", mode="whole", files=["databricks-dolly-15k.jsonl"]),
    "tulu3_sft_src": dict(repo="allenai/tulu-3-sft-mixture", mode="cols", cols=["source"], prefix="data/"),
    "olmo2_sft_src": dict(repo="allenai/tulu-3-sft-olmo-2-mixture", mode="cols", cols=["source", "dataset"], prefix="data/"),
    "dolci_instruct_sft_src": dict(repo="allenai/Dolci-Instruct-SFT", mode="cols", cols=["source_dataset", "domain"], prefix="data/"),
    "dolci_think_sft_src": dict(repo="allenai/Dolci-Think-SFT-7B", mode="cols", cols=["dataset_source"], prefix="data/"),
    "dolci_instruct_sft_s": dict(repo="allenai/Dolci-Instruct-SFT", mode="sample", n=4000, prefix="data/",
                                 cols=["id", "messages", "source_dataset", "domain"]),
    "dolci_think_sft_s": dict(repo="allenai/Dolci-Think-SFT-7B", mode="sample", n=3000, prefix="data/", rg_rows=300),
    "openr1_math": dict(repo="open-r1/OpenR1-Math-220k", mode="sample", n=6000, prefix="data/",
                        cols=["problem", "solution", "answer", "problem_type", "question_type", "source", "uuid",
                              "is_reasoning_complete", "generations", "correctness_math_verify", "correctness_llama",
                              "finish_reasons", "correctness_count"]),
    # preference
    "hh_helpful": dict(repo="Anthropic/hh-rlhf", mode="whole", files=["helpful-base/train.jsonl.gz"]),
    "hh_harmless": dict(repo="Anthropic/hh-rlhf", mode="whole", files=["harmless-base/train.jsonl.gz"]),
    "ufb_raw_evol": dict(repo="openbmb/UltraFeedback", mode="whole", files=["evol_instruct.jsonl"]),
    "ufb_argilla": dict(repo="argilla/ultrafeedback-binarized-preferences-cleaned", mode="whole",
                        files=["data/train-00000-of-00001.parquet"]),
    "tulu3_pref": dict(repo="allenai/llama-3.1-tulu-3-8b-preference-mixture", mode="sample", n=5000, prefix="data/"),
    "tulu3_pref_src": dict(repo="allenai/llama-3.1-tulu-3-8b-preference-mixture", mode="cols", cols=["source"], prefix="data/"),
    "olmo2_pref": dict(repo="allenai/olmo-2-1124-7b-preference-mix", mode="sample", n=5000, prefix="data/"),
    "olmo2_pref_meta": dict(repo="allenai/olmo-2-1124-7b-preference-mix", mode="cols",
                            cols=["source", "chosen_model", "rejected_model", "chosen_rating", "rejected_rating"], prefix="data/"),
    "dolci_dpo": dict(repo="allenai/Dolci-Instruct-DPO", mode="sample", n=5000, prefix="data/", nested_text=True),
    "if_pref_personas": dict(repo="allenai/tulu-3-pref-personas-instruction-following", mode="whole",
                             files=["data/train-00000-of-00001.parquet"]),
    # verifiable reward
    "rlvr_ifeval": dict(repo="allenai/RLVR-IFeval", mode="whole", files=["data/train-00000-of-00001.parquet"]),
    "if_multi": dict(repo="allenai/IF_multi_constraints_upto5", mode="whole", files=["data/train-00000-of-00001.parquet"]),
    "ifeval": dict(repo="google/IFEval", mode="whole", files=["ifeval_input_data.jsonl"]),
    "code_tested": dict(repo="open-r1/verifiable-coding-problems-python_decontaminated-tested", mode="whole",
                        files=["data/train-00000-of-00003.parquet"]),
    "dolci_think_rl_s": dict(repo="allenai/Dolci-Think-RL-7B", mode="sample", n=4000, prefix="data/", rg_rows=200,
                             cols=["ground_truth", "dataset", "custom_id", "original_dataset", "outputs", "total_rollouts",
                                   "total_correct_rollouts", "passrate", "dataset_source", "prompt", "id",
                                   "constraint_type", "constraint"]),
    "dolci_think_rl_meta": dict(repo="allenai/Dolci-Think-RL-7B", mode="cols",
                                cols=["dataset_source", "original_dataset", "total_rollouts", "total_correct_rollouts", "passrate"],
                                prefix="data/"),
    # environments and trajectories
    "swe_gym": dict(repo="SWE-Gym/SWE-Gym", mode="whole", files=["data/train-00000-of-00001.parquet"]),
    "swe_rebench_f": dict(repo="nebius/SWE-rebench", mode="whole", files=["data/filtered-00000-of-00001.parquet"]),
    "swe_gym_sft_traj": dict(repo="SWE-Gym/OpenHands-SFT-Trajectories", mode="whole",
                             files=["data/train.success.oss-00000-of-00001.parquet"]),
    "swe_agent_traj": dict(repo="nebius/SWE-agent-trajectories", mode="sample", n=3000, prefix="data/",
                           cols=["instance_id", "model_name", "target", "trajectory", "exit_status", "generated_patch"]),
}


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def record(d):
    d["date"] = time.strftime("%Y-%m-%d")
    with open(MAN, "a") as f:
        f.write(json.dumps(d) + "\n")
    print(json.dumps(d)[:300])


def files_of(repo, rev, prefix):
    info = api.dataset_info(repo, revision=rev, files_metadata=True)
    return sorted(s.rfilename for s in info.siblings if s.rfilename.startswith(prefix) and s.rfilename.endswith(".parquet"))


def run(name):
    sp = SPECS[name]
    repo = sp["repo"]
    rev = api.dataset_info(repo).sha
    if sp["mode"] == "whole":
        outs = []
        for fn in sp["files"]:
            p = hf_hub_download(repo, fn, repo_type="dataset", revision=rev)
            outs.append(dict(file=fn, bytes=os.path.getsize(p), sha256=sha(p)))
        record(dict(name=name, repo=repo, revision=rev, mode="whole", files=outs, location="$DC_SCRATCH/hf (HF cache)"))
        return
    files = files_of(repo, rev, sp.get("prefix", ""))
    out = os.path.join(OUT, f"{name}.parquet")
    if sp["mode"] == "cols":
        tabs = []
        for fn in files:
            with fs.open(f"datasets/{repo}@{rev}/{fn}", "rb", block_size=1 << 20) as f:
                t = pq.ParquetFile(f).read(columns=sp["cols"])
            tabs.append(t.append_column("file", pa.array([fn.split("/")[-1]] * t.num_rows)))
        t = pa.concat_tables(tabs)
        pq.write_table(t, out, compression="zstd")
        record(dict(name=name, repo=repo, revision=rev, mode="cols", cols=sp["cols"], files=len(files), rows=t.num_rows,
                    out=f"data/pd/{name}.parquet", sha256=sha(out)))
        return
    # sample: random row groups, seed 0
    rng = random.Random(0)
    meta = []
    for fn in files:
        with fs.open(f"datasets/{repo}@{rev}/{fn}", "rb", block_size=1 << 20) as f:
            m = pq.ParquetFile(f).metadata
        meta += [(fn, g, m.row_group(g).num_rows) for g in range(m.num_row_groups)]
    rng.shuffle(meta)
    got, picks, tabs = 0, [], []
    for fn, g, nr in meta:
        if got >= sp["n"]:
            break
        with fs.open(f"datasets/{repo}@{rev}/{fn}", "rb", block_size=1 << 22) as f:
            t = pq.ParquetFile(f).read_row_group(g, columns=sp.get("cols"))
        take = min(t.num_rows, sp.get("rg_rows", t.num_rows), sp["n"] - got)
        if take < t.num_rows:
            idx = sorted(rng.sample(range(t.num_rows), take))
            t = t.take(pa.array(idx))
        if sp.get("nested_text"):  # keep only role/content of each message (Dolci DPO has dozens of WildChat fields)
            t = slim_messages(t)
        tabs.append(t)
        picks.append([fn.split("/")[-1], g, take])
        got += take
    t = pa.concat_tables(tabs, promote_options="permissive")
    pq.write_table(t, out, compression="zstd")
    record(dict(name=name, repo=repo, revision=rev, mode="sample seed 0 random row groups", rows=t.num_rows,
                picks=picks, out=f"data/pd/{name}.parquet", sha256=sha(out)))


def slim_messages(t):
    cols = {}
    for c in t.column_names:
        if c in ("chosen", "rejected"):
            cols[c] = pa.array([[{"role": m["role"], "content": m["content"]} for m in (x or [])]
                                for x in t.column(c).to_pylist()])
        else:
            cols[c] = t.column(c)
    return pa.table(cols)


if __name__ == "__main__":
    names = list(SPECS) if sys.argv[1:] == ["all"] else sys.argv[1:]
    for n in names:
        t0 = time.time()
        try:
            run(n)
        except Exception as e:  # noqa: BLE001
            print("FAILED", n, type(e).__name__, str(e)[:300])
        print(f"   {n}: {time.time() - t0:.0f} s", flush=True)
