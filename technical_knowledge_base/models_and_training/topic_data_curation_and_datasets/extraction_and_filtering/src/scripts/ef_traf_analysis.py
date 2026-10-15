"""What the trafilatura 1.11 runs show (any venv): the fallback path each page took, and the effect of the
process-wide deduplication cache (deduplicate=True) and of page order.
Inputs: $DC_SCRATCH/data/ef/traf111_{nodedup,dedup,shuffled}.jsonl.gz and run0's text (extract_all 'traf').
Output: src/data/ef_traf.json
"""
import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402


def load(mode):
    return {r["id"]: r for r in E.read_jsonl_gz(E.scratch(f"traf111_{mode}.jsonl.gz"))}


def main():
    nd, dd, sh = load("nodedup"), load("dedup"), load("shuffled")
    run0 = {r["id"]: (r["traf"] if r["traf_status"] == "run0" else None) for r in E.extract_all()}
    res = {}
    paths = collections.Counter(r["path"] for r in nd.values())
    xp = collections.Counter(r["xpath"] for r in nd.values() if r["path"] == "own")
    res["paths"] = dict(paths)
    res["own_by_body_xpath"] = {str(k): v for k, v in xp.items()}
    res["wild_text_recovery"] = sum(1 for r in nd.values() if r.get("wild") and r["path"] != "none")
    res["errors"] = dict(collections.Counter(r.get("err") for r in nd.values() if r.get("err")))
    res["seconds"] = {m: round(sum(r["s"] for r in d.values()), 1) for m, d in (("nodedup", nd), ("dedup", dd),
                                                                               ("shuffled", sh))}
    res["over_1s"] = {m: sum(1 for r in d.values() if r["s"] > 1) for m, d in (("nodedup", nd), ("dedup", dd))}

    def cmp(a, b):
        c = collections.Counter()
        for i in a:
            x, y = a[i]["text"] if isinstance(a[i], dict) else a[i], b[i]["text"] if isinstance(b[i], dict) else b[i]
            x, y = x or "", y or ""
            if x == y:
                c["same"] += 1
                continue
            c["differ"] += 1
            if x and not y:
                c["emptied"] += 1
            elif y and not x:
                c["filled"] += 1
            elif len(y) < len(x):
                c["shorter"] += 1
                c["chars_lost"] += len(x) - len(y)
            else:
                c["longer"] += 1
            c["chars_a"] += len(x)
            c["chars_b"] += len(y)
        return dict(c)
    res["nodedup_vs_dedup"] = cmp(nd, dd)
    res["dedup_vs_shuffled"] = cmp(dd, sh)
    res["dedup_vs_run0"] = cmp({i: dd[i] for i in dd if run0.get(i)}, {i: run0[i] for i in dd if run0.get(i)})
    res["chars_total"] = {"nodedup": sum(len(r["text"] or "") for r in nd.values()),
                          "dedup": sum(len(r["text"] or "") for r in dd.values()),
                          "shuffled": sum(len(r["text"] or "") for r in sh.values())}
    res["pages_with_text"] = {m: sum(1 for r in d.values() if r["text"]) for m, d in (("nodedup", nd), ("dedup", dd),
                                                                                      ("shuffled", sh))}
    E.save("ef_traf.json", res)
    import json
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
