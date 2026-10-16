"""Build data/pd_data.json (embedded in the page as window.PD) and data/facts.json (numbers quoted in prose, written
@@key@@ in the parts) from the recorded runs in data/out/ and the Hugging Face statistics in inputs/hf_statistics/.
Example rows are read from the samples (needs DC_SCRATCH, HF_HOME). A fact whose run is missing is left out, so the
build reports it as UNFILLED.
usage: DC_SCRATCH=... HF_HOME=... $DC_SCRATCH/venv/bin/python -I -B build_data.py
"""
import glob
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "scripts"))
import pd_common as C  # noqa: E402

OUT = os.path.join(HERE, "data", "out")
F = {}
D = {}


def load(n):
    p = os.path.join(OUT, n)
    return json.load(open(p)) if os.path.exists(p) else None


def hfstat(repo):
    p = os.path.join(HERE, "inputs", "hf_statistics", repo.replace("/", "__") + ".json")
    return json.load(open(p)) if os.path.exists(p) else None


def freq(repo, col, split=None):
    s = hfstat(repo)
    for sp in s["splits"]:
        if split and sp["split"] != split:
            continue
        for c in sp.get("columns", []):
            if c["name"] == col and "frequencies" in c["stats"]:
                return c["stats"]["frequencies"]
    return {}


def nrows(repo, config="default"):
    s = hfstat(repo)
    for sp in s["splits"]:
        if sp["config"] == config:
            return sp["num_examples"]


def n0(x):
    return f"{int(round(x)):,}"


def pct(a, b, d=1):
    return f"{100 * a / b:.{d}f}%"


def trim(t, n):
    t = t or ""
    return t if len(t) <= n else t[:n].rstrip() + " [...]"


# ------------------------------------------------------------------ self-instruct
def selfinst():
    s = load("selfinst.json")
    a, d, sd = s["alpaca"], s["dolly"], s["seed_seeds"]
    F.update(si_alp_above=n0(a["above"]), si_alp_exact=n0(a["exactly"]), si_dolly_above=n0(d["above"]),
             si_dolly_n=n0(d["n"]), si_dolly_pct=pct(d["above"], d["n"]), si_dolly_seq=n0(d["rejected_sequential"]),
             si_seed_above=n0(sd["above"]))
    # stream for the animation: real Dolly instructions in file order around near-duplicate pairs, plus seeds
    dolly = C.frame("dolly")
    ins = list(dolly.instruction)
    sys.path.insert(0, os.path.join(HERE, "scripts"))
    import pd_selfinst as S
    seeds = [json.loads(x)["instruction"] for x in open(os.path.join(HERE, "inputs", "seed_tasks.jsonl"))]
    rng = random.Random(3)
    pairs = [e for e in d["examples"] if e["f"] < 1]
    stream = []
    for e in pairs[:7]:
        stream += [e["a"], e["b"]]
    others = [x for x in ins if 20 < len(x) < 160]
    stream += rng.sample(others, 12)
    rng.shuffle(stream)
    # make each near-dup pair appear in order a before b
    D["si"] = dict(seeds=seeds, stream=[trim(x, 200) for x in stream], hist={k: s[k]["hist"] for k in ("alpaca", "dolly", "seed_seeds")})
    # a short pair of distinct questions over the threshold
    T = [S.toks(x) for x in ins]
    short = None
    by = {}
    for i, t in enumerate(T):
        if 4 <= len(t) <= 6:
            by.setdefault(tuple(t[:2]), []).append(i)
    for k, ix in by.items():
        for i in ix:
            for j in ix:
                if i < j and T[i] != T[j] and S.rouge_l(T[i], T[j]) > 0.7 and T[i][-1] != T[j][-1]:
                    short = (ins[i], ins[j], S.rouge_l(T[i], T[j]))
                    break
            if short:
                break
        if short:
            break
    F["si_dolly_short_example"] = (f"\"{short[0].strip()}\" and \"{short[1].strip()}\" score {short[2]:.2f} (two Dolly "
                                   f"instructions)") if short else "short questions sharing a template score above 0.7"


# ------------------------------------------------------------------ mixtures and lineage
SKILLS = ["Math", "Code", "Chat", "Instruction following", "Safety", "Multilingual", "Science and NLP tasks",
          "Reasoning and puzzles", "Tool use", "Identity"]
TULU_MAP = {"personahub_math": "Math", "numinamath": "Math", "open_math_2": "Math", "personas-math-grade": "Math",
            "interm_algebra": "Math", "evol_codealpaca": "Code", "personahub_code": "Code", "wildchat": "Chat",
            "no_robots": "Chat", "oasst1": "Chat", "flan_v2": "Science and NLP tasks", "sciriff": "Science and NLP tasks",
            "table_gpt": "Science and NLP tasks", "wildguardmix": "Safety", "wildjailbreak": "Safety", "coconot": "Safety",
            "aya": "Multilingual", "ifdata": "Instruction following", "hard_coded": "Identity"}
DOLCI_MAP = {"Verifiable Reasoning": "Reasoning and puzzles", "Wildchat": "Chat", "Dolci Instruct Tool Use": "Tool use",
             "Dolci Instruct Python Algorithms": "Code", "Logic Puzzles": "Reasoning and puzzles",
             "Tulu 3 Persona MATH": "Math", "Dolci Instruct Precise IF": "Instruction following",
             "Evol CodeAlpaca": "Code", "Aya": "Multilingual", "Dolci Instruct OpenThoughts3+ Science": "Science and NLP tasks",
             "FLAN": "Science and NLP tasks", "OpenMathInstruct 2": "Math", "Tulu 3 Persona GSM": "Math",
             "WildJailbreak": "Safety", "WildGuardMix": "Safety", "Tulu 3 Persona Python": "Code",
             "Tulu 3 Persona Algebra": "Math", "CoCoNot": "Safety", "OpenAssistant": "Chat", "TableGPT": "Science and NLP tasks",
             "SciRiff": "Science and NLP tasks", "Hardcoded Data": "Identity"}


def skill_of(src, mp):
    if src in mp:
        return mp[src]
    for k, v in mp.items():
        if k in src:
            return v
    raise KeyError(src)


def mixtures():
    out = []
    for key, label, repo, col, mp in [("tulu3", "Tulu 3 SFT", "allenai/tulu-3-sft-mixture", "source", TULU_MAP),
                                      ("olmo2", "OLMo 2 SFT", "allenai/tulu-3-sft-olmo-2-mixture", "source", TULU_MAP),
                                      ("dolci", "OLMo 3 Instruct SFT (Dolci)", "allenai/Dolci-Instruct-SFT", "source_dataset", DOLCI_MAP)]:
        fr = freq(repo, col)
        if key == "olmo2":
            fr = dict(fr)
            for k, v in freq(repo, "dataset").items():
                fr["hard_coded"] = fr.get("hard_coded", 0) + v
        sk = {s: 0 for s in SKILLS}
        srcs = {s: [] for s in SKILLS}
        for s, v in fr.items():
            k = skill_of(s, mp)
            sk[k] += v
            srcs[k].append([s.split("/")[-1], v])
        out.append(dict(key=key, label=label, repo=repo, total=nrows(repo), skills=[[s, sk[s]] for s in SKILLS],
                        sources={s: sorted(v, key=lambda x: -x[1]) for s, v in srcs.items() if v}))
    D["mix"] = out
    F["mx_tulu3_n"] = n0(nrows("allenai/tulu-3-sft-mixture"))
    F["mx_dolci_n"] = n0(nrows("allenai/Dolci-Instruct-SFT"))
    F["mx_dolci_tool"] = n0(freq("allenai/Dolci-Instruct-SFT", "source_dataset")["Dolci Instruct Tool Use"])


LIN = ["alpaca", "dolly", "tulu3", "dolci_instruct", "dolci_think", "openr1", "swe_traj"]


def lineage():
    s = load("sft.json")
    rows = []
    for k in LIN:
        v = s["sets"][k]
        m = s["meta"][k]
        rows.append(dict(key=k, label=m["label"], repo=m["repo"], year=m["year"], author=m["author"], n=v["n"],
                         turns=v["turns"]["0.5"], p_tok=v["prompt_tok"]["0.5"], r_tok=v["resp_tok"]["0.5"],
                         r_tok90=v["resp_tok"]["0.9"], trained=round(v["mask"]["share"], 4), exact=v["exact_dup_prompts"],
                         near=v["near"]["rows_in_clusters"], near_n=v["near"]["n"], en=v["english"],
                         fw=v["first_words"][:8], fwd=v["first_word_distinct"], lang=v["lang"][:5]))
    D["lin"] = rows
    sh = {r["key"]: r["trained"] for r in rows}
    F["mask_min_pct"] = f"{100 * min(sh.values()):.0f}%"
    F["mask_max_pct"] = f"{100 * max(sh.values()):.0f}%"


# ------------------------------------------------------------------ generators (section 3)
def generators():
    o2 = freq("allenai/olmo-2-1124-7b-preference-mix", "chosen_model")
    dc = freq("allenai/Dolci-Instruct-DPO", "chosen_model")
    dr = freq("allenai/Dolci-Instruct-DPO", "rejected_model")

    def top(fr, k=10):
        it = sorted(fr.items(), key=lambda x: -x[1])
        return [[a, b] for a, b in it[:k]] + ([["other (" + str(len(it) - k) + " models)", sum(b for _, b in it[k:])]] if len(it) > k else [])
    D["gen"] = dict(olmo2=dict(total=nrows("allenai/olmo-2-1124-7b-preference-mix"), chosen=top(o2)),
                    dolci=dict(total=nrows("allenai/Dolci-Instruct-DPO"), chosen=top(dc), rejected=top(dr, 6)))
    g = sum(v for k, v in o2.items() if k.startswith("gpt-"))
    F["gen_olmo2_gpt"] = f"{n0(g)} of {n0(nrows('allenai/olmo-2-1124-7b-preference-mix'))} ({pct(g, nrows('allenai/olmo-2-1124-7b-preference-mix'))})"


# ------------------------------------------------------------------ traces and checkers (sections 4, 7)
def checks():
    c = load("check.json")
    n = c["n"]
    a = c["answer"]["ok"]
    F.update(ck_n=n0(n), ck_problems=n0(c["problems"]), ck_mv_pct=pct(a["math_verify"], n, 0),
             ck_tulu_pct=pct(a["tulu_math"], n, 0), ck_last_pct=pct(a["last_number"], n, 0),
             ck_rec_mv=f"{n0(c['answer']['ok']['rec_mv'])} ({pct(c['answer']['ok']['rec_mv'], n)})",
             ck_ll_n=n0(c["llama"]["n"]), ck_ll_true=n0(c["llama"]["true"]), ck_ll_true_pct=pct(c["llama"]["true"], c["llama"]["n"], 0))
    dis = c["mv_versions_disagree"]
    nd = sum(dis.values())
    F.update(ck_versions_dis=n0(nd), ck_versions_agree_pct=pct(n - nd, n), ck_versions_newyes=n0(dis.get("True|False", 0)),
             ck_versions_newno=n0(dis.get("False|True", 0)))
    vals = [a[e] for e in c["ex"]]
    F["ck_min_pct"] = pct(min(vals), n, 0)
    F["ck_max_pct"] = pct(max(vals), n, 0)
    F["ck_mv_tulu_dis"] = n0(n - c["answer"]["agree"]["math_verify"]["tulu_math"])
    F["ck_view_dis"] = n0(c["cat_counts"]["thinking_vs_answer"])
    t = c["trace"]
    F["tr_think_share"] = f"{100 * t['think_share']['0.5']:.0f}%"
    D["trace"] = t
    D["check"] = {k: c[k] for k in ("n", "problems", "ex", "full", "answer", "qtype_n", "llama", "cat_counts",
                                    "mv_versions_disagree", "any_ok")}
    ex = []
    for e in c["examples"]:
        e = dict(e)
        e["tail"] = trim(e["tail"][-700:], 700)
        e["problem"] = trim(e["problem"], 400)
        e["think_tail"] = e["think_tail"][-220:]
        ex.append(e)
    D["check"]["examples"] = ex
    # judge labels (hand-read; src/notes/judge_labels.md)
    D["judge"] = [["Multiple choice: letter against value", 14], ["Equivalent form or answer set", 11],
                  ["Rounding", 1], ["Garbled label", 2], ["Judge wrong or unclear", 2]]


def rl():
    r = load("rlcheck.json")
    m, f = r["math"], r["if"]
    F.update(rl_math_rows=n0(m["rows"]), rl_math_roll=n0(m["rollouts"]), rl_math_rec=n0(m["recorded"]),
             rl_math_mv=n0(m["ours"]["math_verify"]), rl_math_tulu=n0(m["ours"]["tulu_math"]),
             rl_math_eq_mv=n0(m["rows_equal"]["math_verify"]) + " of " + n0(m["rows"]) + " (and for all "
             + n0(m["rows_equal"]["tulu_math"]) + " with Tulu 3's MATH verifier, the one Ai2 used: an independent reproduction of their counts)",
             rl_if_roll=n0(f["rollouts"]), rl_if_all=n0(f["ours_all"]), rl_if_partial=f"{f['ours_partial']:,.1f}",
             rl_if_rec=n0(f["recorded"]))
    # pass-rate cut over every row (HF statistics)
    s = hfstat("allenai/Dolci-Think-RL-7B")
    for c in s["splits"][0]["columns"]:
        if c["name"] == "total_correct_rollouts":
            h = c["stats"]["histogram"]
            tot = sum(h["hist"])
            F.update(rl_pr_rows=n0(tot), rl_pr_zero=n0(h["hist"][0]), rl_pr_zero_pct=pct(h["hist"][0], tot))
            D["rl_hist"] = dict(edges=h["bin_edges"], hist=h["hist"])
        if c["name"] == "passrate":
            F["rl_pr_max"] = f"{c['stats']['max']:.3f}"
    D["rl"] = r


# ------------------------------------------------------------------ environments (section 8)
def env():
    e = load("env.json")
    g, r, nb = e["swe_gym"], e["swe_rebench"], e["nebius"]
    F.update(env_gym_n=n0(g["n"]), env_reb_n=n0(r["n"]), env_gym_add=n0(g["added"]["0.5"]), env_reb_add=n0(r["added"]["0.5"]),
             env_gym_f2p1_pct=pct(g["f2p_one"], g["n"], 0), env_reb_f2p1_pct=pct(r["f2p_one"], r["n"], 0),
             env_resolved=n0(nb["resolved"]) + " of " + n0(nb["n"]), env_resolved_pct=pct(nb["resolved"], nb["n"]),
             env_turns_res=f"{nb['turns_resolved']['0.5']:g}", env_turns_fail=f"{nb['turns_failed']['0.5']:g}",
             env_tok=n0(nb["tok"]["0.5"]), env_trained_pct=pct(nb["role_tok"]["ai"], sum(nb["role_tok"].values()), 0),
             env_cmds=", ".join(f"{c} ({n0(k)})" for c, k in nb["cmds"][:6]),
             env_reb_mit=n0(r["licenses"].get("MIT License", 0)))
    ex = nb.get("example")
    if ex:
        ex = dict(ex)
        ex["steps"] = [dict(s, text=trim(s["text"], 700)) for s in ex["steps"]]
    D["env"] = dict(gym={k: g[k] for k in ("n", "repos", "files", "added", "removed", "f2p", "p2p", "one_file", "f2p_one", "years", "problem_tok", "top_repos")},
                    reb={k: r[k] for k in ("n", "repos", "files", "added", "removed", "f2p", "p2p", "one_file", "f2p_one", "years", "problem_tok", "licenses", "llm_scores")},
                    gym_example=dict(g["example"], patch=trim(g["example"]["patch"], 1200), problem=trim(g["example"]["problem"], 600)),
                    nebius={k: nb[k] for k in nb if k != "example"}, traj=ex, swegym_traj=e["swegym_traj"])


# ------------------------------------------------------------------ preference (section 6)
PREF_ORDER = ["hh_helpful", "hh_harmless", "ufb_h4", "ufb_argilla", "tulu3_pref", "olmo2_pref", "dolci_dpo", "if_personas"]


def pref():
    p = load("pref.json")
    if not p:
        return
    sets = p["sets"]
    sh = {k: sets[k]["chosen_longer_share"] for k in PREF_ORDER if k in sets}
    hi, lo = max(sh, key=sh.get), min(sh, key=sh.get)
    F["pf_max_longer"] = f"{100 * sh[hi]:.0f}% ({p['label'][hi]})"
    F["pf_min_longer"] = f"{100 * sh[lo]:.0f}% ({p['label'][lo]})"
    short = {"hh_helpful": "HH-RLHF helpful", "hh_harmless": "HH-RLHF harmless", "ufb_h4": "UltraFeedback (H4)",
             "ufb_argilla": "UltraFeedback (Argilla)", "tulu3_pref": "Tulu 3 8B", "olmo2_pref": "OLMo 2 7B",
             "dolci_dpo": "Dolci-Instruct-DPO", "if_personas": "Tulu 3 persona IF"}
    below = [short[k] for k, v in sh.items() if v < 0.5]
    F["pf_max_longer"] = f"{100 * sh[hi]:.0f}% ({short[hi]})"
    F["pf_min_longer"] = f"{100 * sh[lo]:.0f}% ({short[lo]})"
    F["pf_len_summary"] = (f"{len(sh) - len(below)} of {len(sh)} sets lean towards the longer answer, most strongly "
                           f"{short[hi]} ({100 * sh[hi]:.0f}%); the exceptions are {' and '.join(below)}, where the "
                           "chosen answer is more often the shorter one (plausibly because a safe refusal is short, and a "
                           "constraint such as a word limit rewards brevity; not tested here). Human labels lean too: HH-RLHF helpful is at "
                           f"{100 * sh['hh_helpful']:.0f}%.")
    d = sets.get("dolci_dpo", {}).get("by_source", {})
    if "delta_learning" in d and "llm_judged" in d:
        a, b = d["delta_learning"], d["llm_judged"]
        F["pf_dolci_delta"] = (f"More often. In the 5,000-pair sample, delta pairs have the chosen answer longer in "
                               f"{100 * a['chosen_longer'] / max(1, a['diff']):.0f}% of {n0(a['n'])} pairs, GPT-judged pairs in "
                               f"{100 * b['chosen_longer'] / max(1, b['diff']):.0f}% of {n0(b['n'])} (Qwen3 tokens; measured). "
                               "Removing the judge does not remove the length signal: the larger model simply writes more, "
                               "so length enters through the generator. OLMo 3 also caps the length difference at 100 tokens "
                               "for its Instruct chat and multi-turn DPO subsets (OLMo 3 paper), which limits this.")
    u = p["ufb_raw"]
    rs = u["rule_stats"]
    F.update(ub_prompts=n0(u["prompts"]), ub_same_chosen=n0(rs["same_chosen_h4_argilla"][0]), ub_same_n=n0(rs["same_chosen_h4_argilla"][1]),
             ub_same_pct=pct(*rs["same_chosen_h4_argilla"]), ub_h4_ties=n0(rs["h4"]["ties"]), ub_h4_n=n0(rs["h4"]["n"]),
             ub_spear=f"{u['rating_vs_length']['spearman_mean']:+.2f}", ub_spear_n=n0(u["rating_vs_length"]["n"]),
             ub_top_longest_pct=pct(u["rating_vs_length"]["top_is_longest"], u["rating_vs_length"]["n"], 0))
    D["pref"] = dict(label=p["label"], order=[k for k in PREF_ORDER if k in sets],
                     sets={k: {x: v[x] for x in v if x in ("n", "identical", "diff", "chosen_longer", "chosen_longer_share", "log2_ratio",
                                                            "chosen_tok", "rejected_tok", "ratio_hist", "by_gap", "ratings", "cm", "rm",
                                                            "source", "same_model", "by_source")} for k, v in sets.items()},
                     examples={k: [dict(e, prompt=trim(e["prompt"][-400:], 400), chosen=trim(e["chosen"], 520),
                                        rejected=trim(e["rejected"], 520)) for e in v[:12]]
                               for k, v in p.get("examples", {}).items()}, rules=p["rules"],
                     ub=dict(prompts=u["prompts"], rule_stats=rs, rvl=u["rating_vs_length"],
                             examples=[dict(e, comps=[dict(c, text=trim(c["text"], 500)) for c in e["comps"]]) for e in u["examples"]]))


# ------------------------------------------------------------------ code (section 7)
def code():
    c = load("code.json")
    if not c or c.get("n", 0) < 100:
        return
    F.update(code_all=n0(nrows("open-r1/verifiable-coding-problems-python")),
             code_decon=n0(nrows("open-r1/verifiable-coding-problems-python_decontaminated")),
             code_tested=n0(nrows("open-r1/verifiable-coding-problems-python_decontaminated-tested")),
             mut_n=n0(c["n"]), mut_max_tests=n0(c["max_tests"]),
             mut_survive_pct=pct(c["survived"], c["mutants"], 0),
             mut_read=(f"Of {n0(c['mutants'])} mutants of {n0(c['gold_pass'])} gold solutions, {n0(c['survived'])} "
                       f"({pct(c['survived'], c['mutants'], 0)}) passed every test, in {n0(c['problems_with_survivor'])} problems. "
                       "Read by hand (20 survivors, src/notes/code_survivors.md): 10 change the output on some valid input "
                       "(one prints a-b as a+b and passes both of its tests), 7 touch a boundary that valid inputs may never "
                       "reach, 3 are equivalent. So roughly one mutant in ten is a wrong program the reward would pay for. "
                       f"Single-test problems are the weakest: {c['by_ntests'].get('1', [0, 0])[1]} of "
                       f"{c['by_ntests'].get('1', [0, 0])[0]} had a survivor, against {c['by_ntests'].get('21+', [0, 0])[1]} of "
                       f"{c['by_ntests'].get('21+', [0, 0])[0]} with more than 20 tests."))
    D["code"] = c


# ------------------------------------------------------------------ quality (section 9)
def quality():
    q = load("quality.json")
    if not q:
        return
    src = q["if_multi_sources"]
    tulu = sum(v for k, v in src.items() if k.startswith("ai2-adapt-dev/") or k.startswith("personahub") or k.startswith("personas"))
    F.update(if_multi_n=n0(q["if_multi_n"]), if_from_tulu=n0(tulu), if_persona=n0(src.get("personahub", 0)),
             if_code=n0(src.get("ai2-adapt-dev/evol_codealpaca_heval_decontaminated", 0)),
             if_aya=n0(src.get("ai2-adapt-dev/tulu_v3.9_aya_100k", 0)),
             if_in_sample=n0(q["if_multi_in_sft_sample"]["prefix_match"]))
    saf = src.get("ai2-adapt-dev/tulu_v3.9_wildjailbreak_decontaminated_50k", 0) + src.get(
        "ai2-adapt-dev/tulu_v3.9_synthetic_finalresp_wildguardmixtrain_decontaminated_50k", 0)
    F["if_safety"] = n0(saf)
    F["if_safety_pct"] = pct(saf, q["if_multi_n"], 0)
    D["quality"] = dict(sets=q["sets"], overlap=q["overlap"], contam=q.get("contam", {}), ifeval=q.get("ifeval"))
    cp = load("contam_pairs.json")
    labels = json.load(open(os.path.join(HERE, "notes", "contam_labels.json")))
    if cp:
        tab = {}
        for p_ in cp["pairs"]:
            L = labels.get(f"{p_['corpus']}#{p_['doc'].split('#')[1]}|{p_['bench']}#{p_['idx']}", "unread")
            t = tab.setdefault(p_["corpus"], {"copy": 0, "variant": 0, "same question (common trivia)": 0, "false alarm": 0, "rows_copy": set()})
            t[L] = t.get(L, 0) + 1
            if L == "copy":
                t["rows_copy"].add(p_["doc"])
        for k, t in tab.items():
            t["rows_copy"] = len(t["rows_copy"])
        D["contam_lab"] = tab
        ex = [dict(p_, label=labels.get(f"{p_['corpus']}#{p_['doc'].split('#')[1]}|{p_['bench']}#{p_['idx']}"),
                   excerpt=trim(p_["excerpt"], 420), item=trim(p_["item"], 300)) for p_ in cp["pairs"]]
        seen, pick = set(), []
        for e in ex:
            k = (e["corpus"], e["bench"], e["label"])
            if e["label"] in ("copy", "false alarm") and k not in seen and e["idx"] not in {x["idx"] for x in pick}:
                seen.add(k)
                pick.append(e)
        D["contam_ex"] = [e for e in pick if e["label"] == "copy"][:5] + [e for e in pick if e["label"] == "false alarm"][:2]
        ifm = tab.get("pd_if_multi", {})
        F["contam_summary"] = (f"Read pair by pair (labels in src/notes/contam_read.md): {n0(sum(v.get('copy', 0) for v in tab.values()))} "
                               f"of {n0(len(cp['pairs']))} flagged pairs are real copies, and {n0(ifm.get('copy', 0))} of them are in "
                               f"IF_multi_constraints_upto5 ({n0(ifm.get('rows_copy', 0))} rows): MMLU high-school mathematics, ARC and "
                               "HellaSwag items inside FLAN-style task templates, with constraints appended. The base prompts come "
                               "from the same pool as Tulu 3's RLVR set, where the Decontamination page found the 70 MMLU copies. "
                               "The other flags are boilerplate (MMLU option lists like \"1,2,3,4\", number lists in code problems).")
    ie = q.get("ifeval")
    if ie:
        tot = sum(v["flagged"] for v in ie.values())
        F["ifeval_summary"] = ("; ".join(f"{ {'rlvr_ifeval': 'Tulu 3 RLVR-IFeval', 'if_multi': 'IF_multi', 'if_pref_personas': 'persona IF preferences'}[k]}: "
                                         f"{v['flagged']} of {v['items']} IFEval prompts flagged ({n0(v['rows'])} rows scanned)" for k, v in ie.items())
                               + f". All {tot} read: every one shares only constraint wording (\"First repeat the request word for word "
                               "without change\", \"wrapped in double angular brackets\"), none contains the IFEval request. An "
                               "n-gram rule on instruction-following data has to strip the constraint text first, or it flags the template.")


# ------------------------------------------------------------------ the four kinds, one real row each (section 0)
def kinds():
    sft = sorted([r for r in C.P.records("sft") if r["source"].startswith("personahub_math")],
                 key=lambda r: len(r["prompt"]) + len(r["response"]))
    s = sft[0]
    pr = [r for r in C.P.records("pref") if "\\" not in r["prompt"] and "$" not in r["prompt"] and len(r["prompt"]) < 160 and len(r["chosen"]) < 400 and len(r["rejected"]) < 400]
    p = pr[5]
    rv = [r for r in C.P.records("rlvr") if r["dataset"] == "gsm8k" and len(r["question"]) < 300]
    v = rv[7]
    e = load("env.json")["swe_gym"]["example"]
    D["kinds"] = [
        dict(k="SFT", c="var(--c1)", src="Tulu 3 SFT (personahub_math)", row="user: " + trim(s["prompt"], 220) + "\nassistant: " + trim(s["response"], 260),
             chk="Wrong if the response is wrong or carries teacher artefacts. Check: answer checker on math, filters, read a sample."),
        dict(k="Preference", c="var(--c2)", src="UltraFeedback binarized", row="prompt: " + trim(p["prompt"], 160) + "\nchosen (" + f"{p['score_chosen']:g}" + "): " + trim(p["chosen"], 160) + "\nrejected (" + f"{p['score_rejected']:g}" + "): " + trim(p["rejected"], 160),
             chk="Wrong if the label follows length, position or a tie. Check: margins, length shares, swap test."),
        dict(k="Verifiable reward", c="var(--c3)", src="Tulu 3 RLVR (GSM8K)", row="prompt: " + trim(v["question"], 260) + "\nground_truth: " + v["ground_truth"] + "\nchecker: gsm8k (last number)",
             chk="Wrong if the checker rejects right answers or the label is malformed. Check: run it on reference solutions and on model answers."),
        dict(k="Environment", c="var(--c4)", src="SWE-Gym", row=f"repo: {e['repo']} @ {e['base_commit'][:10]}\nissue: " + trim(e["problem"], 200) + "\nFAIL_TO_PASS: " + ", ".join(e["f2p"][:2]) + f"\nPASS_TO_PASS: {e['p2p_n']} tests",
             chk="Wrong if the tests do not pin down the fix, or the task leaks its evaluation. Check: test counts, mutants, dates."),
    ]


# ------------------------------------------------------------------ one row, tokens and mask (section 5)
def tokrow():
    # a synthetic (Persona Hub) row, so no real user's text is shown
    rows = sorted([r for r in C.P.records("sft") if r["source"].startswith("personahub_math") and r["turns"] == 1],
                  key=lambda r: len(r["prompt"]) + len(r["response"]))
    r = rows[0]
    msgs = r["messages"]
    text = C.render_tulu(msgs)
    tok = C.P.tokenizer()
    enc = tok.encode(text, add_special_tokens=False)
    # trained spans: assistant contents (with their end token), by prefix rendering as in mask_stats
    trained = [False] * len(enc.ids)
    for i, m in enumerate(msgs):
        if m["role"] != "assistant":
            continue
        s = len(tok.encode(C.render_tulu(msgs[:i], add_generation_prompt=True), add_special_tokens=False).ids)
        e = len(tok.encode(C.render_tulu(msgs[:i + 1]), add_special_tokens=False).ids)
        for j in range(s, min(e, len(trained))):
            trained[j] = True
    pieces = []
    for j, (a, b) in enumerate(enc.offsets):
        pieces.append([text[a:b], int(trained[j])])
    D["tok"] = dict(source=r["source"], id=r["id"], pieces=pieces, n=len(pieces), trained=sum(trained))


# ------------------------------------------------------------------ Dataset atlas
ATLAS = [
    # key, name, kind, year, repo, licence (card), measured-in, note
    ("alpaca", "Alpaca", "SFT", 2023, "tatsu-lab/alpaca", "CC BY-NC 4.0", "lin", "text-davinci-003, Self-Instruct style; 175 seeds"),
    ("dolly", "Dolly 15k", "SFT", 2023, "databricks/databricks-dolly-15k", "CC BY-SA 3.0", "lin", "written by Databricks employees"),
    ("tulu3", "Tulu 3 SFT mixture", "SFT", 2024, "allenai/tulu-3-sft-mixture", "ODC-BY (subsets carry their own terms)", "lin", "19 sources; sample is 1,000 rows from each of 5 subsets"),
    ("olmo2", "OLMo 2 SFT mixture", "SFT", 2024, "allenai/tulu-3-sft-olmo-2-mixture", "ODC-BY", "mix", "Tulu 3's mixture for OLMo 2"),
    ("dolci_instruct", "Dolci-Instruct-SFT (OLMo 3)", "SFT", 2025, "allenai/Dolci-Instruct-SFT", "ODC-BY", "lin", "22 sources incl. tool use"),
    ("dolci_think", "Dolci-Think-SFT-7B (OLMo 3)", "SFT", 2025, "allenai/Dolci-Think-SFT-7B", "see card", "lin", "reasoning traces; HF statistics cover part of the set"),
    ("openr1", "OpenR1-Math-220k (default)", "SFT", 2025, "open-r1/OpenR1-Math-220k", "Apache-2.0", "lin", "DeepSeek-R1 traces on NuminaMath 1.5"),
    ("hh_helpful", "HH-RLHF helpful-base", "Preference", 2022, "Anthropic/hh-rlhf", "MIT", "pref", "human comparisons of a 52B model's answers"),
    ("hh_harmless", "HH-RLHF harmless-base", "Preference", 2022, "Anthropic/hh-rlhf", "MIT", "pref", "red-teaming comparisons; offensive content"),
    ("ufb_h4", "UltraFeedback binarized (H4)", "Preference", 2023, "HuggingFaceH4/ultrafeedback_binarized", "MIT", "pref", "overall_score binarization"),
    ("ufb_argilla", "UltraFeedback cleaned (Argilla)", "Preference", 2023, "argilla/ultrafeedback-binarized-preferences-cleaned", "MIT", "pref", "mean of aspect ratings, ties and TruthfulQA removed"),
    ("tulu3_pref", "Tulu 3 8B preference mixture", "Preference", 2024, "allenai/llama-3.1-tulu-3-8b-preference-mixture", "ODC-BY (per-generator terms)", "pref", "on- and off-policy, GPT-4o judge"),
    ("olmo2_pref", "OLMo 2 7B preference mix", "Preference", 2025, "allenai/olmo-2-1124-7b-preference-mix", "ODC-BY", "pref", "20-model pool, GPT-4o judge"),
    ("dolci_dpo", "Dolci-Instruct-DPO (OLMo 3)", "Preference", 2025, "allenai/Dolci-Instruct-DPO", "ODC-BY", "pref", "delta learning plus GPT-judged pairs"),
    ("if_personas", "Tulu 3 persona IF preferences", "Preference", 2024, "allenai/tulu-3-pref-personas-instruction-following", "see card", "pref", "GPT-4o chosen and rejected"),
    ("rlvr", "Tulu 3 RLVR (GSM8K, MATH, IF)", "Verifiable reward", 2024, "allenai/RLVR-GSM-MATH-IF-Mixed-Constraints", "ODC-BY", "root", "measured in the root's lab"),
    ("if_multi", "IF_multi_constraints_upto5", "Verifiable reward", 2025, "allenai/IF_multi_constraints_upto5", "ODC-BY", "quality", "up to five constraints per prompt"),
    ("dolci_rl", "Dolci-Think-RL-7B (OLMo 3)", "Verifiable reward", 2025, "allenai/Dolci-Think-RL-7B", "see card", "rl", "math, code, IF, chat; 8 rollouts and pass rates stored"),
    ("code", "verifiable-coding-problems-python (tested)", "Verifiable reward", 2025, "open-r1/verifiable-coding-problems-python_decontaminated-tested", "see card", "code", "APPS and CodeContests with stdin tests"),
    ("swe_gym", "SWE-Gym", "Environment", 2024, "SWE-Gym/SWE-Gym", "MIT", "env", "2,438 tasks, 11 repositories"),
    ("swe_rebench", "SWE-rebench (filtered)", "Environment", 2025, "nebius/SWE-rebench", "CC-BY-4.0", "env", "automatically mined tasks"),
    ("swe_traj", "SWE-Gym OpenHands trajectories", "Environment", 2024, "SWE-Gym/OpenHands-SFT-Trajectories", "MIT", "lin", "491 successful trajectories"),
    ("nebius", "SWE-agent trajectories (nebius)", "Environment", 2024, "nebius/SWE-agent-trajectories", "CC-BY-4.0", "env", "80,036 trajectories, success flag"),
]


def atlas():
    man = {}
    for x in open(os.path.join(HERE, "inputs", "pd_manifest.jsonl")):
        m = json.loads(x)
        man[m["repo"]] = m["revision"][:8]
    root_rev = {"allenai/tulu-3-sft-mixture": "b14afda6", "HuggingFaceH4/ultrafeedback_binarized": "3949bf5f",
                "allenai/RLVR-GSM-MATH-IF-Mixed-Constraints": "7dbd180f"}
    out = []
    for key, name, kind, year, repo, lic, where, note in ATLAS:
        st = hfstat(repo)
        full = None
        if st:
            sp = [s for s in st["splits"] if s.get("num_examples") and not s.get("partial")]
            full = sp[0]["num_examples"] if sp else None
            if repo == "Anthropic/hh-rlhf":
                full = None
        out.append(dict(key=key, name=name, kind=kind, year=year, repo=repo, rev=man.get(repo) or root_rev.get(repo, ""),
                        lic=lic, where=where, note=note, full=full))
    for o in out:
        if o["key"] == "swe_traj":
            o["full"] = 491
        if o["key"] == "dolci_think":
            o["note"] += "; the paper's Table 17 gives 2,268,468 rows (7B)"
    D["atlas"] = out
    # sample rows per SFT/pref set (short, synthetic or public; WildChat rows not shown)
    rows = {}
    rng = random.Random(4)

    def pick(lst, k=2, lim=900):
        lst = [x for x in lst if len(x[0]) + len(x[1]) < lim]
        return [dict(p=trim(a, 400), r=trim(b, 500)) for a, b in rng.sample(lst, min(k, len(lst)))]
    a = C.frame("alpaca")
    rows["alpaca"] = pick([(r.instruction + ("\n" + r.input if r.input else ""), r.output) for r in a.itertuples()])
    d = C.frame("dolly")
    rows["dolly"] = pick([(r.instruction, r.response) for r in d.itertuples() if not r.context])
    rows["tulu3"] = pick([(r["prompt"], r["response"]) for r in C.P.records("sft") if r["source"].startswith("personahub")])
    di = C.frame("dolci_instruct_sft_s")
    ok = []
    for m, sname in zip(di.messages, di.source_dataset):
        if sname in ("Wildchat", "WildJailbreak", "WildGuardMix"):
            continue
        mm = C.msgs(m)
        u = [x["content"] for x in mm if x["role"] == "user"]
        s_ = [x["content"] for x in mm if x["role"] == "assistant"]
        if u and s_:
            ok.append((f"[{sname}] " + u[0], s_[-1]))
    rows["dolci_instruct"] = pick(ok, 3, 1400)
    o = C.frame("openr1_math")
    rows["openr1"] = [dict(p=trim(r.problem, 400), r="[thinking, " + n0(len(list(r.generations)[0])) + " characters] ... " + trim(list(r.generations)[0].split("</think>")[-1].strip()[-450:], 460))
                      for r in o.sample(2, random_state=4).itertuples()]
    D["atlas_rows"] = rows


def main():
    if "--pending-only" in sys.argv:
        # The raw samples live outside the repo and may be gone (the 2026-10-15 reboot wiped them): keep every recorded
        # value of the last full build and refresh only the GPU run's part (data/out/pending.json) and its facts.
        D.update(json.load(open(os.path.join(HERE, "data", "pd_data.json"))))
        F.update(json.load(open(os.path.join(HERE, "data", "facts.json"))))
        finish()
        return
    for f in (selfinst, mixtures, lineage, generators, checks, rl, env, pref, code, quality, kinds, tokrow, atlas):
        f()
    F.setdefault("code_all", n0(nrows("open-r1/verifiable-coding-problems-python")))
    finish()


def finish():
    F.setdefault("code_decon", n0(nrows("open-r1/verifiable-coding-problems-python_decontaminated")))
    F.setdefault("code_tested", n0(nrows("open-r1/verifiable-coding-problems-python_decontaminated-tested")))
    D["pending"] = load("pending.json") or {}
    J = D["pending"].get("judge")
    if J:
        F["jd_summary"] = (f"A small open judge is mostly inconsistent rather than biased by position: shown the same pair twice, "
                           f"Qwen3-4B gives the same verdict in only {pct(J['consistent'], J['parsed'], 0)} of {n0(J['parsed'])} pairs; "
                           f"it scores the first-shown answer higher in {pct(J['first_wins'], J['decided'], 0)} of untied judgements (a "
                           f"mild position bias); it agrees with GPT-4's chosen answer in both orders for {pct(J['agree_both'], J['parsed'], 0)}; "
                           f"and when its verdict is consistent it prefers the longer answer in {pct(J['longer_pref'], J['longer_n'], 0)} of "
                           f"{n0(J['longer_n'])} pairs. Judging each pair in both orders and keeping only consistent verdicts is the cheap "
                           "fix; it doubles the cost and here drops a third of the pairs.")
    # house style: no em dashes anywhere, including quoted dataset text (shown as a spaced hyphen; said on the page)
    def clean(x):
        if isinstance(x, str):
            return x.replace("\u2014", " - ").replace("\u2015", " - ")
        if isinstance(x, list):
            return [clean(v) for v in x]
        if isinstance(x, dict):
            return {k: clean(v) for k, v in x.items()}
        return x
    D.update(clean(dict(D)))
    os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
    with open(os.path.join(HERE, "data", "pd_data.json"), "w") as f:
        json.dump(D, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    with open(os.path.join(HERE, "data", "facts.json"), "w") as f:
        json.dump(F, f, ensure_ascii=False, indent=0, sort_keys=True)
    print("facts", len(F), "data bytes", os.path.getsize(os.path.join(HERE, "data", "pd_data.json")))


if __name__ == "__main__":
    main()
