"""Debate against voting on knights-and-knaves puzzles (Haiku 4.5 through claude -p, tools off).

usage: python3 run_debate.py <puzzles.json> <run> <phase> [n_puzzles] [workers]
  phase r1:    5 independent samples per puzzle (s1..s5)
  phase r2:    debate round 2: solvers 1..3 each see the other two round-1 answers and revise (d1..d3)
  phase judge: one judge call reads round-1 answers 1..3 and picks (j)
Resumable: a call whose raw file exists is skipped.
"""
import concurrent.futures as cf, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cc import FM, RAW, claude

SOLVER = ("You solve logic puzzles. On this island knights always tell the truth and knaves always lie; every "
          "person is one or the other. Reason step by step, briefly, then end with one line 'ANSWER: <letters>' "
          "giving K (knight) or N (knave) for each person in the order they are listed, for example 'ANSWER: KNNKNKK'.")
JUDGE = ("You judge solutions to logic puzzles. On this island knights always tell the truth and knaves always lie. "
         "You are given a puzzle and three proposed solutions. Check them, then end with one line 'ANSWER: <letters>' "
         "giving the solution you judge correct (K or N for each person in the order listed); you may give your own "
         "if all three are wrong.")


def parse(text):
    m = re.findall(r"ANSWER:\s*\**\s*([KNkn\s,]+)", text or "", re.I)
    if not m:
        return None
    return re.sub(r"[^KN]", "", m[-1].upper()) or None


def raw_text(run, label):
    p = os.path.join(RAW, run, label + ".jsonl")
    if not os.path.exists(p):
        return None
    for line in open(p):
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get("type") == "result":
            return r.get("result", "")
    return None


def main():
    pz = json.load(open(sys.argv[1]))["puzzles"]
    run, phase = sys.argv[2], sys.argv[3]
    n = int(sys.argv[4]) if len(sys.argv) > 4 else len(pz)
    workers = int(sys.argv[5]) if len(sys.argv) > 5 else 4
    pz = pz[:n]
    empty = os.path.join(FM, "work", "empty")
    os.makedirs(empty, exist_ok=True)
    jobs = []
    for p in pz:
        head = f"Puzzle {p['id']}. The people, in order: {', '.join(p['people'])}.\n\n{p['text']}"
        if phase == "r1":
            for k in range(1, 6):
                jobs.append((f"{p['id']}_s{k}", head, SOLVER))
        elif phase == "r2":
            r1 = [raw_text(run, f"{p['id']}_s{k}") for k in (1, 2, 3)]
            if any(t is None for t in r1):
                continue
            for k in range(3):
                others = [j for j in range(3) if j != k]
                msg = (head + "\n\nYour earlier solution:\n" + r1[k] + "\n\n" +
                       "".join(f"Solution from another solver ({'BC'[i]}):\n{r1[j]}\n\n" for i, j in enumerate(others)) +
                       "Using these solutions as additional information, check the reasoning critically and give your "
                       "updated solution.")
                jobs.append((f"{p['id']}_d{k + 1}", msg, SOLVER))
        elif phase == "judge":
            r1 = [raw_text(run, f"{p['id']}_s{k}") for k in (1, 2, 3)]
            if any(t is None for t in r1):
                continue
            msg = head + "\n\n" + "".join(f"Proposed solution {k + 1}:\n{r1[k]}\n\n" for k in range(3))
            jobs.append((f"{p['id']}_j", msg, JUDGE))
    jobs = [j for j in jobs if raw_text(run, j[0]) is None]
    print(len(jobs), "calls to make", flush=True)

    def one(j):
        label, prompt, system = j
        r = claude(run, label, prompt, empty, model="haiku", tools="", system=system, timeout=600)
        return label, parse((r["result"] or {}).get("result", ""))

    with cf.ThreadPoolExecutor(workers) as ex:
        for label, a in ex.map(one, jobs):
            print(label, a, flush=True)


main()
