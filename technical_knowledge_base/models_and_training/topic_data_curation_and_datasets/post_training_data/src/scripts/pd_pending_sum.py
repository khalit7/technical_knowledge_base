"""Summarise the pending GPU jobs (run_pending.sh) into data/out/pending.json; absent outputs stay absent, so the
page keeps its dashed 'pending' boxes. Run through run_check.sh (needs the checkers' PYTHONPATH)."""
import json
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402

G = os.path.join(C.L.scratch(), "pd", "gen")


def rows(fn):
    p = os.path.join(G, fn)
    return [json.loads(x) for x in open(p)] if os.path.exists(p) else []


def main():
    res = {}
    a = rows("answers_qwen3_1.7b.jsonl")
    if a:
        import pt_checkers as K
        d = C.frame("openr1_math")
        ok = {e: 0 for e in K.MATH_EX}
        for r in a:
            gt = str(d.answer.iloc[int(r["id"][1:])])
            for e in K.MATH_EX:
                try:
                    ok[e] += bool(K.EX[e](r["text"], gt)[1])
                except Exception:  # noqa: BLE001
                    pass
        res["answers"] = dict(n=len(a), ok=ok, truncated=sum(r["finish"] == "length" for r in a),
                              tokens=C.quantiles([r["tokens"] or 0 for r in a]))
    j = rows("judge_qwen3_4b.jsonl")
    if j:
        recs = C.P.records("pref")
        sc = {}
        for r in j:
            m = re.findall(r"\b([AB])\s*:\s*(\d+(?:\.\d+)?)", r["text"])
            d = {}
            for k, v in m:
                d.setdefault(k, float(v))
            sc[r["id"]] = d
        ids = sorted(set(k[1:-2] for k in sc), key=int)
        n = parsed = first_wins = decided = consistent = agree_both = agree_one = ties_any = longer_pref = longer_n = 0
        delta_first = []
        ex = []
        for i in ids:
            ab, ba = sc.get(f"p{i}ab", {}), sc.get(f"p{i}ba", {})
            n += 1
            if len(ab) < 2 or len(ba) < 2:
                continue
            parsed += 1
            c1, r1 = ab["A"], ab["B"]   # chosen shown first
            r2, c2 = ba["A"], ba["B"]   # rejected shown first
            for x, y in ((ab["A"], ab["B"]), (ba["A"], ba["B"])):
                if x != y:
                    decided += 1
                    first_wins += x > y
            delta_first.append((ab["A"] - ab["B"] + ba["A"] - ba["B"]) / 2)
            s1, s2 = (c1 > r1) - (c1 < r1), (c2 > r2) - (c2 < r2)
            ties_any += (s1 == 0) or (s2 == 0)
            consistent += s1 == s2
            agree_both += s1 == 1 and s2 == 1
            agree_one += (s1 == 1) + (s2 == 1)
            rec = recs[int(i)]
            if s1 == s2 and s1 != 0 and len(rec["chosen"]) != len(rec["rejected"]):
                longer_n += 1
                pref_chosen = s1 == 1
                longer_pref += pref_chosen == (len(rec["chosen"]) > len(rec["rejected"]))
            # shown on the page: short prompts with no URL, domain or two capitalised words in a row (no private names)
            if (len(ex) < 6 and s1 != s2 and len(rec["prompt"]) < 300
                    and not re.search(r"https?:|www\.|\.com|@|\b[A-Z][a-z]+ [A-Z][a-z]+", rec["prompt"])):
                ex.append(dict(prompt=rec["prompt"][:300], ab=ab, ba=ba, gpt4=[rec["score_chosen"], rec["score_rejected"]]))
        import numpy as np
        res["judge"] = dict(pairs=n, parsed=parsed, judgements=2 * parsed, decided=decided, first_wins=first_wins,
                            mean_first_minus_second=float(np.mean(delta_first)) if delta_first else None,
                            consistent=consistent, agree_both=agree_both, agree_one_of_2n=agree_one, ties_any=ties_any,
                            longer_pref=longer_pref, longer_n=longer_n, examples=ex,
                            tokens=C.quantiles([r["tokens"] or 0 for r in j]), seconds=C.quantiles([r["seconds"] for r in j]))
    big, small = rows("delta_qwen3_4b.jsonl"), rows("delta_qwen3_0.6b.jsonl")
    if big and small:
        b = {r["id"]: r for r in big}
        both = [(b[r["id"]], r) for r in small if r["id"] in b]
        lc = np.array(C.ntok([x["text"] for x, _ in both]))
        lr = np.array(C.ntok([y["text"] for _, y in both]))
        res["delta"] = dict(n=len(both), chosen_longer=int((lc > lr).sum()), median_ratio=float(np.median(np.log2((lc + 1) / (lr + 1)))))
    C.save_out("pending.json", res)
    print(json.dumps(res)[:800])


if __name__ == "__main__":
    main()
