"""Full-dataset composition from the Hugging Face datasets-server statistics endpoint (computed by Hugging Face over
every row of the train split; 'partial' says whether it covered the whole split). Saves the raw responses, trimmed
to the columns used, in src/inputs/hf_statistics/<repo>.json with the date fetched.
usage: python3 -I pd_stats_api.py
"""
import json
import os
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "inputs", "hf_statistics")
REPOS = ["allenai/tulu-3-sft-mixture", "allenai/tulu-3-sft-olmo-2-mixture", "allenai/Dolci-Instruct-SFT",
         "allenai/Dolci-Think-SFT-7B", "allenai/llama-3.1-tulu-3-8b-preference-mixture",
         "allenai/olmo-2-1124-7b-preference-mix", "allenai/Dolci-Instruct-DPO", "allenai/Dolci-Think-RL-7B",
         "allenai/RLVR-GSM-MATH-IF-Mixed-Constraints", "allenai/IF_multi_constraints_upto5", "allenai/RLVR-IFeval",
         "open-r1/OpenR1-Math-220k", "nebius/SWE-agent-trajectories", "nebius/SWE-rebench", "SWE-Gym/SWE-Gym",
         "open-r1/verifiable-coding-problems-python_decontaminated-tested",
         "open-r1/verifiable-coding-problems-python_decontaminated", "open-r1/verifiable-coding-problems-python",
         "allenai/tulu-3-pref-personas-instruction-following", "argilla/ultrafeedback-binarized-preferences-cleaned",
         "HuggingFaceH4/ultrafeedback_binarized", "Anthropic/hh-rlhf", "tatsu-lab/alpaca", "databricks/databricks-dolly-15k"]


def get(u):
    with urllib.request.urlopen(u, timeout=60) as r:
        return json.load(r)


def main():
    os.makedirs(OUT, exist_ok=True)
    for repo in REPOS:
        try:
            sp = get(f"https://datasets-server.huggingface.co/splits?dataset={repo}")
        except Exception as e:  # noqa: BLE001
            print(repo, "splits error", e)
            continue
        res = {"repo": repo, "fetched": time.strftime("%Y-%m-%d"), "splits": []}
        for s in sp.get("splits", []):
            if s["split"] not in ("train", "filtered", "default") and not s["split"].startswith("train"):
                continue
            u = f"https://datasets-server.huggingface.co/statistics?dataset={repo}&config={s['config']}&split={s['split']}"
            try:
                st = get(u)
            except Exception as e:  # noqa: BLE001
                res["splits"].append({"config": s["config"], "split": s["split"], "error": str(e)[:200]})
                continue
            cols = []
            for c in st.get("statistics", []):
                cs = c["column_statistics"]
                keep = {k: cs[k] for k in ("n_unique", "frequencies", "histogram", "mean", "median", "min", "max",
                                           "nan_count") if k in cs}
                if c["column_type"] in ("string_text",):
                    keep.pop("histogram", None)
                cols.append({"name": c["column_name"], "type": c["column_type"], "stats": keep})
            res["splits"].append({"config": s["config"], "split": s["split"], "num_examples": st.get("num_examples"),
                                  "partial": st.get("partial"), "columns": cols})
        fn = repo.replace("/", "__") + ".json"
        json.dump(res, open(os.path.join(OUT, fn), "w"), indent=0, sort_keys=True)
        print(repo, [(s.get("config"), s.get("split"), s.get("num_examples"), s.get("partial")) for s in res["splits"]])


if __name__ == "__main__":
    main()
