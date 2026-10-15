"""Assemble the page's embedded data (parts/22_js_data.js, window.EF) and the prose facts (data/ef_facts.json) from the
small JSON files in data/. Standard library only; reads nothing outside this folder. Run by build.sh."""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, "data")


def load(name, default=None):
    p = os.path.join(D, name)
    if not os.path.exists(p):
        return default
    with open(p) as f:
        return json.load(f)


def n(x):
    return f"{x:,}"


def pct(a, b, d=1):
    return f"{100 * a / b:.{d}f}%"


def wceb_published():
    rows = []
    for line in open(os.path.join(HERE, "inputs", "wceb_rouge_micro_36be6d9c.tex")):
        m = re.match(r"^([A-Za-z0-9() .\-]+?) & ([\d.]+) & ([\d.]+) & (?:\\bf )?([\d.]+) &", line.replace("\\bf ", ""))
        if m and not m.group(1).startswith("("):
            rows.append({"name": m.group(1).strip(), "p": float(m.group(2)), "r": float(m.group(3)),
                         "f1": float(m.group(4))})
    return rows


def main():
    EF, F = {}, {}
    chain = load("ef_chain.json", {})
    EF["chain"] = chain
    EF["traf"] = load("ef_traf.json")
    col = load("ef_collect.json", {})
    EF["wceb"] = col.get("wceb")
    EF["wcebPub"] = wceb_published()
    EF["timing"] = col.get("timing")
    EF["pipe"] = col.get("pipe")
    EF["struct"] = load("ef_struct.json")
    EF["pages"] = load("ef_pages.json")
    EF["lines"] = load("ef_lines.json")
    EF["linesEx"] = load("ef_lines_example.json")
    EF["url"] = load("ef_url.json")
    EF["c4var"] = load("ef_c4var.json")
    EF["jtfix"] = load("ef_jt_fix.json")
    EF["cost"] = load("ef_cost.json")
    EF["wb"] = load("ef_workbench.json")
    jt = load("ef_jt_steps_raw.json", [])
    if jt:
        p = jt[0]
        EF["jt"] = {"host": p["host"], "snaps": p["snaps"],
                    "paras": [{"t": x["t"][:90] + ("..." if len(x["t"]) > 90 else ""), "len": x["len"], "sw": x["sw"],
                               "ld": x["ld"], "h": x["h"]} for x in p["paras"]],
                    "traf": [x[:90] for x in (p["traf"] or "").split("\n") if x.strip()],
                    "res": [x[:90] for x in (p["res"] or "").split("\n") if x.strip()]}
    lab = load("ef_labels.json", {})
    rows = []
    for r in lab.get("rows", []):
        rows.append({"g": r["g"], "l": r["l"], "f": r["f"], "note": r["note"], "host": r["host"], "d": r.get("d", -1),
                     "t": r["t"][:240] + ("..." if len(r["t"]) > 240 else ""), "fw": r["fw"]})
    EF["labels"] = {"summary": lab.get("summary"), "rows": rows}
    lid = col.get("lid")
    EF["lid"] = lid
    tox = load("ef_tox.json")
    EF["tox"] = tox
    toxlab = load("ef_tox_labels.json")
    EF["toxLabels"] = toxlab

    # ---- facts for the prose ([[KEY]] in parts/*.html)
    if lid:
        F["LID_DISAGREE"] = n(lid["disagree_en"]) + " (" + pct(lid["disagree_en"], lid["n"]) + ")"
        F["LID_AGREE_PCT"] = pct(lid["agree"], lid["n"])
        F["GL_EN_065"] = n(lid["gl_en_065"])
        F["LID_BOTH"] = n(lid["both_en_065"])
        F["CLD2_EN"] = n(lid["cld2_en_of_ft_en"])
        F["FW2_TH_FT"] = f"{lid['fw2_th_ft']:.2f}"
        F["FW2_TH_GL"] = f"{lid['fw2_th_gl']:.2f}"
        F["MIX20"] = n(lid["mix20_en"]) + " of " + n(lid["en_gl"]) + " (" + pct(lid["mix20_en"], lid["en_gl"]) + ")"
        F["MIX20_ALL"] = n(lid["mix20_all"])
        F["GL_NOT_IN_FT"] = n(lid["gl_not_in_ft"])
    jf = EF["jtfix"]
    if jf:
        F["JT_FIX_CHANGED"] = n(jf["changed"]) + " of the " + n(jf["pages"]) + " pages it parsed (" + pct(jf["changed"], jf["pages"]) + ")"
    if tox:
        fin = tox["final"]
        F["BAD_FINAL"] = n(fin["badword_docs"])
        F["BAD_FINAL_PCT"] = pct(fin["badword_docs"], fin["docs"])
        F["D04_FINAL_DOCS"] = n(fin["dolma_04_docs_touched"])
        F["D04_FINAL_CHARS"] = f"{100 * fin['dolma_04_char_share']:.1f}%"
        F["D00004_FINAL_CHARS"] = f"{100 * fin['dolma_00004_char_share']:.1f}%"
    if toxlab:
        F["BADLAB_N"] = n(toxlab["n"])
        F["BADLAB_W"] = n(toxlab["W"])
        F["BADLAB_R"] = n(toxlab["R"])
    wd = (EF["pipe"] or {}).get("wide")
    if wd:
        F["WIDE_PAGES"] = n(wd["html_pages"])
        F["WIDE_CD"] = n(wd["var|char_dup_0.1|extra"])
        F["WIDE_CD_FW"] = n(wd["var|char_dup_0.1|extra_in_fineweb"])
        F["WIDE_S3"] = n(wd["var|c4_min_sentences_3|extra"])
        F["WIDE_S3_FW"] = n(wd["var|c4_min_sentences_3|extra_in_fineweb"])
        F["WIDE_TRAF"] = n(wd["traf|kept"])
        F["WIDE_RES"] = n(wd["res|kept"])
        F["WIDE_WET"] = n(wd["wet|kept"])
    with open(os.path.join(D, "ef_facts.json"), "w") as f:
        json.dump(F, f, indent=1, ensure_ascii=False)
    js = json.dumps(EF, ensure_ascii=False, separators=(",", ":"))
    js = js.replace("—", "--").replace("{{", "{\\u007b").replace("</", "<\\/")
    with open(os.path.join(HERE, "parts", "22_js_data.js"), "w") as f:
        f.write("window.EF=" + js + ";\n")
    print(len(js), "bytes of data;", len(F), "facts")


if __name__ == "__main__":
    main()
