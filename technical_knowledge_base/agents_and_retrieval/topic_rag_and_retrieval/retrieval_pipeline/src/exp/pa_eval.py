"""Score pa_gen.py's answers with the root's check (src/pipe/e2e_eval.py rule): strict = right label and, for SUPPORT
or CONTRADICT, the cited abstract is annotated evidence; lenient = right label. Plus, for the citation formats:
answers whose citation could be parsed and resolved to an abstract in the prompt, and, for the quote format, quotes
found word for word (whitespace and case normalised, at least 30 characters) in the cited abstract.
Output: out/prompt_asm.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, re
import numpy as np
import rp

L = rp.L
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
import e2e_gen as E  # noqa: E402


def norm(s):
    return re.sub(r"\s+", " ", s.lower()).strip()


def main():
    G0 = E.gold()
    corpus, _, _ = L.beir("scifact")
    A = json.load(open(rp.work("pa_answers.json")))
    ans = A["answers"]
    out = {"runs": A["runs"]}
    groups = {}
    for key, a in ans.items():
        ex, q, var = key.split("|")
        t, docs = a["text"], a["docs"]
        lab, _ = E.parse(t)
        if var == "doc-id":
            m = re.search(r"\[\s*doc\s*(\d+)\s*\]", t, re.I)
            cited = m.group(1) if m and m.group(1) in docs else None
            resolved = cited is not None or lab == "NOT ENOUGH INFO"
        else:
            m = re.search(r"\[(\d+)\]", t)
            n = int(m.group(1)) if m else None
            cited = docs[n - 1] if (n and 0 < n <= len(docs)) else None
            resolved = cited is not None or lab == "NOT ENOUGH INFO"
        g = G0[q]
        lenient = lab == g["label"]
        strict = lenient and cited in set(g["evidence"])
        rec = {"strict": strict, "lenient": lenient, "resolved": resolved, "nei": lab == "NOT ENOUGH INFO", "contradict": lab == "CONTRADICT",
               "n_in": a.get("n_in", 0)}
        if var == "number+quote":
            rest = "\n".join(t.split("\n")[1:])
            inq = re.findall(r'["\u201c]([^"\u201d]{30,})["\u201d]', rest)   # text inside quotation marks, if the model framed it
            quote = max(inq, key=len) if inq else re.sub(r"^(line 2:|quote:)\s*", "", rest.strip(), flags=re.I).strip('"').strip()
            quote = quote.rstrip(".,; ")
            rec["quote_verbatim"] = bool(cited) and len(quote) >= 30 and norm(quote) in norm(L.doc_text(corpus[cited]))
            rec["quote_given"] = len(quote) >= 30
        groups.setdefault((ex, var), []).append(rec)
    R = {}
    for (ex, var), v in sorted(groups.items()):
        d = {"n": len(v), "strict": int(sum(x["strict"] for x in v)), "lenient": int(sum(x["lenient"] for x in v)),
             "citation_resolved": int(sum(x["resolved"] for x in v)), "answered_nei": int(sum(x["nei"] for x in v)),
             "answered_contradict": int(sum(x["contradict"] for x in v)), "prompt_tokens_mean": round(float(np.mean([x["n_in"] for x in v])), 0)}
        if var == "number+quote":
            d["quote_given"] = int(sum(x["quote_given"] for x in v)); d["quote_verbatim"] = int(sum(x["quote_verbatim"] for x in v))
            d["strict_and_quote_verbatim"] = int(sum(x["strict"] and x["quote_verbatim"] for x in v))
        R.setdefault(ex, {})[var] = d
    out["results"] = R
    # how often the answer cites abstract [1], per experiment and variant
    c1 = {}
    for key, a in ans.items():
        ex, q, var = key.split("|")
        m = re.search(r"\[(\d+)\]", a["text"])
        c1[ex + "|" + var] = c1.get(ex + "|" + var, 0) + (1 if m and m.group(1) == "1" else 0)
    out["cite1_counts"] = c1
    # an example quote answer for the page
    ex = [k for k in ans if k.endswith("|number+quote")][:3]
    out["quote_examples"] = [{"key": k, "text": ans[k]["text"][:400]} for k in ex]
    print(json.dumps(R, indent=1))
    rp.save("prompt_asm.json", out)


if __name__ == "__main__":
    main()
