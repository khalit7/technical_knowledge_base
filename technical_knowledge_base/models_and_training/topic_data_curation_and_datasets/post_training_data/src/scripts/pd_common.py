"""Shared helpers for the Post-training data child page (prefix pd).

Loads every post-training sample this page measures as pandas frames: the setup agent's four (via the root's
src/post/pt_common.py, so this page and the root's Post-training data lab read the same rows) and the samples
pd_get.py downloaded (HF cache or $DC_SCRATCH/data/pd/). Token counts use the root's Qwen3 tokenizer helper.

Run with the shared venv: DC_SCRATCH=... HF_HOME=$DC_SCRATCH/hf $DC_SCRATCH/venv/bin/python -I -B <script>.py
Large outputs: $DC_SCRATCH/pd/ ; small JSON the page embeds: ../data/out/ (committed).
"""
import glob
import gzip
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.normpath(os.path.join(HERE, ".."))
ROOT_POST = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "post"))
sys.path.insert(0, ROOT_POST)
import pt_common as P  # noqa: E402  (root lab helpers: records(), ntok(), near_dup_clusters(), quantiles())

L = P.L
OUT = os.path.join(PAGE, "data", "out")


def scratch(*parts):
    d = os.path.join(L.scratch(), "pd", *parts)
    os.makedirs(d, exist_ok=True)
    return d


def save_out(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def load_out(name):
    return json.load(open(os.path.join(OUT, name)))


def hub_file(repo, fn):
    """Path of a file downloaded whole into the HF cache (pd_get.py 'whole' mode)."""
    hub = os.path.join(os.environ.get("HF_HOME") or os.path.join(L.scratch(), "hf"), "hub")
    g = glob.glob(os.path.join(hub, "datasets--" + repo.replace("/", "--"), "snapshots", "*", fn))
    if not g:
        raise FileNotFoundError(repo + " " + fn)
    return sorted(g)[-1]


def pd_file(name):
    return os.path.join(L.scratch(), "data", "pd", name + ".parquet")


def frame(name):
    import pandas as pd
    whole = {
        "alpaca": ("tatsu-lab/alpaca", "data/train-00000-of-00001-a09b74b3ef9c3b56.parquet"),
        "if_pref_personas": ("allenai/tulu-3-pref-personas-instruction-following", "data/train-00000-of-00001.parquet"),
        "rlvr_ifeval": ("allenai/RLVR-IFeval", "data/train-00000-of-00001.parquet"),
        "if_multi": ("allenai/IF_multi_constraints_upto5", "data/train-00000-of-00001.parquet"),
        "code_tested": ("open-r1/verifiable-coding-problems-python_decontaminated-tested", "data/train-00000-of-00003.parquet"),
        "swe_gym": ("SWE-Gym/SWE-Gym", "data/train-00000-of-00001.parquet"),
        "swe_rebench_f": ("nebius/SWE-rebench", "data/filtered-00000-of-00001.parquet"),
        "swe_gym_sft_traj": ("SWE-Gym/OpenHands-SFT-Trajectories", "data/train.success.oss-00000-of-00001.parquet"),
        "ufb_argilla": ("argilla/ultrafeedback-binarized-preferences-cleaned", "data/train-00000-of-00001.parquet"),
    }
    jsonl = {
        "dolly": ("databricks/databricks-dolly-15k", "databricks-dolly-15k.jsonl"),
        "ifeval": ("google/IFEval", "ifeval_input_data.jsonl"),
        "hh_helpful": ("Anthropic/hh-rlhf", "helpful-base/train.jsonl.gz"),
        "hh_harmless": ("Anthropic/hh-rlhf", "harmless-base/train.jsonl.gz"),
        "ufb_raw_evol": ("openbmb/UltraFeedback", "evol_instruct.jsonl"),
    }
    if name in whole:
        return pd.read_parquet(hub_file(*whole[name]))
    if name in jsonl:
        p = hub_file(*jsonl[name])
        op = gzip.open if p.endswith(".gz") else open
        with op(p, "rt") as f:
            return pd.DataFrame([json.loads(x) for x in f if x.strip()])
    if name in P.DATASETS:
        return L.post(P.DATASETS[name][0])
    return pd.read_parquet(pd_file(name))


def msgs(x):
    return [{"role": str(m.get("role")), "content": str(m.get("content") or "")} for m in list(x)]


HH_SPLIT = "\n\nAssistant:"


def hh_parse(t):
    """Anthropic HH text ('\\n\\nHuman: ...\\n\\nAssistant: ...') into (prompt context, final assistant turn)."""
    k = t.rfind(HH_SPLIT)
    return t[:k].strip(), t[k + len(HH_SPLIT):].strip()


def quantiles(xs, qs=(0.1, 0.25, 0.5, 0.75, 0.9, 0.99)):
    return P.quantiles(xs, qs)


def ntok(texts):
    return P.ntok(texts)


# ------------------------------------------------------------------ chat template and loss mask
# open-instruct's "tulu" chat template (dataset_transformation.py:260-279 @ 72f46040), rendered as plain text; the
# {% generation %} markers are a transformers extension and only mark the assistant span, so they are dropped here.
# Tool messages (agent trajectories) are rendered like user turns with a <|tool|> header (not in the tulu template).
EOS = "<|endoftext|>"


def render_tulu(messages, add_generation_prompt=False):
    out = []
    for k, m in enumerate(messages):
        r, c = m["role"], m["content"]
        if r == "system":
            out.append("<|system|>\n" + c + "\n")
        elif r in ("user", "human"):
            out.append("<|user|>\n" + c + "\n")
        elif r == "assistant":
            out.append("<|assistant|>\n" + c + EOS + ("" if k == len(messages) - 1 else "\n"))
        else:
            out.append("<|" + r + "|>\n" + c + "\n")
    if add_generation_prompt:
        out.append("<|assistant|>\n")
    return "".join(out)


def _len(text):
    return len(P.tokenizer().encode(text, add_special_tokens=False).ids)


def mask_stats(messages, trained_roles=("assistant",)):
    """Token counts under the tulu template with open-instruct's prefix masking (finetune.py encode_sft_example,
    lines 401-444 at the Tulu 3 release commit b0899767; the same logic is mask_labels, dataset_transformation.py:1307
    @ 72f46040): every non-assistant message span, plus the '<|assistant|>' header that follows it, is masked by
    rendering prefixes and taking their token lengths. Returns (total tokens, trained tokens, per-role tokens)."""
    total = _len(render_tulu(messages))
    masked = 0
    per = {}
    seen_user = False
    start_from_zero = False
    for i, m in enumerate(messages):
        if m["role"] in ("user", "human"):
            seen_user = True
        if m["role"] in trained_roles:
            continue
        if not seen_user:
            start_from_zero = True
            continue
        s = 0 if (i == 0 or start_from_zero) else _len(render_tulu(messages[:i]))
        start_from_zero = False
        nxt = i < len(messages) - 1 and messages[i + 1]["role"] in trained_roles
        e = _len(render_tulu(messages[:i + 1], add_generation_prompt=nxt))
        masked += e - s
        per[m["role"]] = per.get(m["role"], 0) + (e - s)
    return total, total - masked, per
