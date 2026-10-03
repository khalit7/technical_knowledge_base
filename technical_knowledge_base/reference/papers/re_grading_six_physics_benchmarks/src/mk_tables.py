"""Write tables.json: the paper's Tables 1 to 4 transcribed with their printed precision, plus the audit counts
stated in the text of Appendix B (which no table collects). Source of every value: inputs/paper.txt and
inputs/table_*.txt (arXiv HTML v1). recompute.py checks them against each other.
usage: python3 mk_tables.py"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = [
    {"k": "fable", "n": "Fable 5", "set": "High (Max for pre-audit CritPt); Claude Code with tools on the expert-authored three"},
    {"k": "gpt", "n": "GPT-5.6-Sol", "set": "High (Max on CritPt, both columns); Codex with tools on the expert-authored three"},
    {"k": "gem", "n": "Gemini 3.1 Pro", "set": "High, no tools anywhere"},
]
# Table 1: pre-audit -> validated/repaired, % (mean@4 and pass@4); CritPt pre-audit is Artificial Analysis's mean@5 on 70.
T1 = [
    {"b": "PHYBench", "g": "public", "n0": 100, "n1": 87,
     "mean": {"fable": [39.50, 87.64], "gpt": [26.50, 90.23], "gem": [46.50, 89.94]},
     "pass": {"fable": [47.00, 91.95], "gpt": [34.00, 95.40], "gem": [50.00, 94.25]}},
    {"b": "PRISM-Physics", "g": "public", "n0": 100, "n1": 74,
     "mean": {"fable": [7.50, 84.80], "gpt": [13.00, 94.59], "gem": [11.25, 87.84]},
     "pass": {"fable": [20.00, 90.54], "gpt": [24.00, 95.95], "gem": [24.00, 94.59]}},
    {"b": "UGPhysics", "g": "public", "n0": 100, "n1": 82,
     "mean": {"fable": [78.25, 87.80], "gpt": [83.00, 92.07], "gem": [86.50, 90.85]},
     "pass": {"fable": [82.00, 92.68], "gpt": [85.00, 93.90], "gem": [88.00, 93.90]}},
    {"b": "HLE-Physics", "g": "expert", "n0": 202, "n1": 116,
     "mean": {"fable": [47.03, 75.65], "gpt": [47.28, 78.66], "gem": [40.97, 64.87]},
     "pass": {"fable": [53.47, 83.62], "gpt": [55.94, 91.38], "gem": [48.51, 74.14]}},
    {"b": "CMT-Benchmark", "g": "expert", "n0": 50, "n1": 49,
     "mean": {"fable": [53.50, 85.20], "gpt": [61.00, 87.24], "gem": [50.50, 78.06]},
     "pass": {"fable": [60.00, 93.88], "gpt": [72.00, 97.96], "gem": [58.00, 87.76]}},
    {"b": "CritPt", "g": "expert", "n0": 70, "n1": 54, "pre_k": 5,
     "mean": {"fable": [28.57, 78.24], "gpt": [32.29, 87.50], "gem": [17.71, 54.63]},
     "pass": {"fable": [None, 90.74], "gpt": [None, 94.44], "gem": [None, 68.52]}},
]
# Table 2: attribution in the four pooled audit sets (GPT-5.6-Sol High audit runs), with printed percentages.
T2 = [
    {"b": "HLE-Physics", "rej": 98, "Q": 86, "G": 4, "M": 8, "pct": [87.76, 4.08, 8.16]},
    {"b": "PHYBench", "rej": 56, "Q": 13, "G": 40, "M": 3, "pct": [23.21, 71.43, 5.36]},
    {"b": "PRISM-Physics", "rej": 74, "Q": 26, "G": 48, "M": 0, "pct": [35.14, 64.86, 0.00]},
    {"b": "UGPhysics", "rej": 22, "Q": 18, "G": 3, "M": 1, "pct": [81.82, 13.64, 4.55]},
]
T2_POOLED = {"rej": 250, "Q": 143, "G": 95, "M": 12, "pct": [57.20, 38.00, 4.80]}
# Audit funnel per benchmark, from the text of Appendix B (B.1.1 to B.2.3, B.3) and Appendix C.
FUNNEL = {
    "HLE-Physics": {"total": 230, "dropped": 28, "drop_why": "multimodal", "pool": 202, "audit_run": "up to 5 attempts (tools on the fifth), stop at the first accepted answer",
                    "acc": 104, "rej": 98, "Q": 86, "G": 4, "M": 8, "repaired": 0, "excluded": 86, "kept": 116, "who": "rejections only"},
    "PHYBench": {"total": 500, "dropped": 400, "drop_why": "no public reference solution", "pool": 100, "audit_run": "up to 5 attempts without tools, stop at the first EED score of 100",
                 "acc": 44, "rej": 56, "Q": 13, "G": 40, "M": 3, "repaired": 0, "excluded": 13, "kept": 87, "who": "rejections only"},
    "PRISM-Physics": {"total": 1401, "dropped": 568, "drop_why": "549 image-dependent, 19 formatting or loading issues", "pool": 833, "sample": 100, "audit_run": "one attempt",
                      "acc": 26, "rej": 74, "Q": 26, "G": 48, "M": 0, "repaired": 0, "excluded": 26, "kept": 74, "who": "rejections only"},
    "UGPhysics": {"total": 5520, "dropped": 0, "drop_why": "", "pool": 5520, "sample": 100, "audit_run": "one attempt",
                  "acc": 78, "rej": 22, "Q": 18, "G": 3, "M": 1, "repaired": 0, "excluded": 18, "kept": 82, "who": "rejections only"},
    "CMT-Benchmark": {"total": 50, "dropped": 0, "drop_why": "", "pool": 50, "audit_run": "every question reviewed",
                      "acc": None, "rej": None, "Q": 30, "G": None, "M": 2, "repaired": 29, "excluded": 1, "kept": 49, "who": "every question"},
    "CritPt": {"total": 71, "dropped": 1, "drop_why": "Artificial Analysis evaluates 70", "pool": 70, "audited": 56, "audit_run": "every question of a 56-challenge subset reviewed",
               "acc": None, "rej": None, "Q": 21, "G": None, "M": 5, "repaired": 19, "excluded": 2, "kept": 54, "who": "every question of the subset"},
}
# Tables 3 and 4 (Appendix F.2): review coverage and the disagreeing label pairs before conflict resolution.
T3 = [
    {"b": "HLE-Physics", "single": 14, "double": 84, "agree": 60, "dis": 24},
    {"b": "PHYBench", "single": 9, "double": 47, "agree": 37, "dis": 10},
    {"b": "PRISM-Physics", "single": 23, "double": 51, "agree": 32, "dis": 19},
    {"b": "UGPhysics", "single": 8, "double": 14, "agree": 11, "dis": 3},
]
T3_TOTAL = {"single": 54, "double": 196, "agree": 140, "dis": 56}
T4 = {"cols": ["HLE-Physics", "PHYBench", "PRISM-Physics", "UGPhysics"],
      "rows": [{"p": "Benchmark error / grader error", "v": [11, 4, 17, 2], "tot": 34},
               {"p": "Benchmark error / model error", "v": [13, 4, 1, 1], "tot": 19},
               {"p": "Grader error / model error", "v": [0, 2, 1, 0], "tot": 3}],
      "tot": [24, 10, 19, 3, 56]}

json.dump({"models": MODELS, "t1": T1, "t2": T2, "t2_pooled": T2_POOLED, "funnel": FUNNEL, "t3": T3, "t3_total": T3_TOTAL, "t4": T4},
          open(os.path.join(HERE, 'tables.json'), 'w'), indent=1)
print('tables.json written')
