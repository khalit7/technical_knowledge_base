"""Environments and trajectories, measured: what a SWE-style task row holds, and what an agent trajectory looks like
as training data.

Tasks: SWE-Gym (all 2,438) and SWE-rebench 'filtered' (all 6,542): repositories, size of the gold patch (files,
lines), number of FAIL_TO_PASS and PASS_TO_PASS tests, creation dates, SWE-rebench's LLM-assigned scores and licences.
Trajectories: nebius/SWE-agent-trajectories (3,000-row sample of 80,036; SWE-agent with fine-tuned Llama models;
'target' = the patch resolved the issue; 'mask' per message), SWE-Gym OpenHands SFT trajectories (all 491
successful ones). Per trajectory: turns, Qwen3 tokens by role, share of tokens that get loss, first command of each
action, exit status.
Output: data/out/env.json.  Run: nice -n 15, OMP_NUM_THREADS<=4.
"""
import json
import os
import re
import sys
from collections import Counter

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402


def lst(x):
    if x is None:
        return []
    if isinstance(x, str):
        try:
            return list(json.loads(x))
        except json.JSONDecodeError:
            return [x]
    return list(x)


def patch_stats(p):
    files = len(re.findall(r"^diff --git ", p or "", re.M))
    add = len(re.findall(r"^\+(?!\+\+)", p or "", re.M))
    rem = len(re.findall(r"^-(?!--)", p or "", re.M))
    return files, add, rem


def tasks(name):
    d = C.frame(name)
    fs, ad, rm = zip(*[patch_stats(p) for p in d.patch])
    f2p = [len(lst(x)) for x in d.FAIL_TO_PASS]
    p2p = [len(lst(x)) for x in d.PASS_TO_PASS]
    yrs = Counter(str(x)[:4] for x in d.created_at)
    o = dict(n=len(d), repos=d.repo.nunique(), top_repos=d.repo.value_counts().head(12).to_dict(),
             files=C.quantiles(list(fs)), added=C.quantiles(list(ad)), removed=C.quantiles(list(rm)),
             f2p=C.quantiles(f2p), p2p=C.quantiles(p2p), years=sorted(yrs.items()),
             problem_tok=C.quantiles(C.ntok(list(d.problem_statement))),
             one_file=int(sum(f == 1 for f in fs)), f2p_one=int(sum(x == 1 for x in f2p)))
    if "meta" in d.columns:
        sc = {}
        for k in ("difficulty_score", "issue_text_score", "test_score"):
            v = [m.get("llm_score", {}).get(k) if isinstance(m, dict) else None for m in d.meta]
            sc[k] = Counter(str(x) for x in v).most_common()
        o["llm_scores"] = sc
        o["licenses"] = d.license_name.value_counts().head(8).to_dict()
    ex = d.iloc[int(np.argsort(np.array(ad) + np.array(rm))[len(d) // 3])]
    o["example"] = dict(instance_id=ex.instance_id, repo=ex.repo, created_at=str(ex.created_at)[:10],
                        problem=ex.problem_statement[:900], patch=ex.patch[:1600], test_patch=ex.test_patch[:900],
                        f2p=lst(ex.FAIL_TO_PASS)[:5], p2p_n=len(lst(ex.PASS_TO_PASS)), base_commit=ex.base_commit)
    return o


CMD = re.compile(r"```(?:bash|sh)?\s*\n\s*([A-Za-z_][\w\-./]*)")


def nebius():
    d = C.frame("swe_agent_traj")
    rows = []
    texts = []
    for r in d.itertuples(index=False):
        t = list(r.trajectory)
        msgs = []
        for m in t:
            txt = m["system_prompt"] if m["role"] == "system" else m["text"]
            msgs.append((m["role"], str(m["mask"]) == "True", "" if txt in (None, "None") else txt))
        rows.append((r, msgs))
        texts += [x[2] for x in msgs]
    toks = C.ntok(texts)
    k = 0
    out = []
    for r, msgs in rows:
        by = Counter()
        trained = 0
        for role, mask, txt in msgs:
            by[role] += toks[k]
            trained += toks[k] if mask else 0
            k += 1
        tot = sum(by.values())
        cmds = [m.group(1) for role, mask, txt in msgs if role == "ai" for m in [CMD.search(txt)] if m]
        out.append(dict(model=r.model_name, target=str(r.target) == "True", exit=r.exit_status,
                        turns=sum(1 for x in msgs if x[0] == "ai"), tok=tot, trained=trained, by=dict(by), cmds=cmds,
                        patch_lines=len(r.generated_patch.splitlines()) if isinstance(r.generated_patch, str) else 0))
    res = dict(n=len(out), resolved=sum(o["target"] for o in out),
               by_model={m: [sum(1 for o in out if o["model"] == m), sum(1 for o in out if o["model"] == m and o["target"])]
                         for m in sorted(set(o["model"] for o in out))},
               exit=Counter(o["exit"] for o in out).most_common(),
               turns=C.quantiles([o["turns"] for o in out]), tok=C.quantiles([o["tok"] for o in out]),
               trained_share=sum(o["trained"] for o in out) / sum(o["tok"] for o in out),
               role_tok={k_: int(sum(o["by"].get(k_, 0) for o in out)) for k_ in ("system", "user", "ai")},
               turns_resolved=C.quantiles([o["turns"] for o in out if o["target"]]),
               turns_failed=C.quantiles([o["turns"] for o in out if not o["target"]]),
               cmds=Counter(c for o in out for c in o["cmds"]).most_common(15),
               first_cmd=Counter(o["cmds"][0] for o in out if o["cmds"]).most_common(8))
    # one short resolved trajectory for the step-through (turn texts trimmed)
    best = None
    for (r, msgs), o in zip(rows, out):
        if o["target"] and 6 <= o["turns"] <= 12 and (best is None or o["tok"] < best[1]["tok"]):
            best = ((r, msgs), o)
    if best:
        (r, msgs), o = best
        res["example"] = dict(instance_id=r.instance_id, model=r.model_name, exit=r.exit_status,
                              steps=[dict(role=role, trained=mask, text=txt[:900], chars=len(txt)) for role, mask, txt in msgs])
    return res


def swegym_traj():
    d = C.frame("swe_gym_sft_traj")
    convs = [C.msgs(m) for m in d.messages]
    tot = trn = 0
    turns, toks = [], []
    roles = Counter()
    for c in convs:
        T, t, per = C.mask_stats(c)
        tot += T
        trn += t
        toks.append(T)
        turns.append(sum(m["role"] == "assistant" for m in c))
        roles.update(m["role"] for m in c)
    fn = Counter(m2 for c in convs for m in c if m["role"] == "assistant"
                 for m2 in re.findall(r"<function=([\w\-]+)>", m["content"]))
    return dict(n=len(convs), trained_share=trn / tot, tok=C.quantiles(toks), turns=C.quantiles(turns),
                roles=dict(roles), functions=fn.most_common(10))


def main():
    res = dict(swe_gym=tasks("swe_gym"), swe_rebench=tasks("swe_rebench_f"))
    print("tasks done", flush=True)
    res["nebius"] = nebius()
    print("nebius done", res["nebius"]["resolved"], flush=True)
    res["swegym_traj"] = swegym_traj()
    C.save_out("env.json", res)


if __name__ == "__main__":
    main()
