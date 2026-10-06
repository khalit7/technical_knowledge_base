"""Twelve sessions with one invented user, Sam, and 25 questions asked on 2026-10-06 (written for this page).

Sessions 1, 3, 5 and 7 are the frameworks root's four sessions (Production stack tab, src/ops/code/mem_data.py),
copied verbatim; eight sessions are added between and after them, with small talk and longer assistant replies
as distractors. Assistant turns are fixed text, so every memory system sees exactly the same history.
Question types follow LongMemEval (Wu et al., arXiv 2410.10813): information extraction (IE), multi-session
reasoning (MS), knowledge update (KU), temporal reasoning (TR), abstention (ABS).
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from root_mem_data import SESSIONS as ROOT

S = {}
S[1] = ROOT[0]
S[2] = {"date": "2026-09-03", "turns": [
    ("user", "One test in test_core.py is flaky: char_count gives 12 for 'cafe\u0301 au lait' on my laptop and 13 on a colleague's machine."),
    ("assistant", "That is Unicode normalisation: 'e' plus a combining accent is two code points, the precomposed form is one. "
     "Normalise before counting:\n\nimport unicodedata\ndef char_count(text):\n    return len(unicodedata.normalize('NFC', text))\n\n"
     "Then both spellings give the same count."),
    ("user", "That fixed it, thanks. Sorry for the typos earlier, my cat Pixel walked across the keyboard."),
    ("assistant", "No problem. Pixel clearly wanted to help with the tests."),
    ("user", "Ha. By the way, our eval set for the agent has 40 tasks, each a small bug in textstats."),
    ("assistant", "Good size for quick iteration: 40 tasks is enough to see large regressions, though a 5-point change is within noise."),
]}
S[3] = ROOT[1]
S[4] = {"date": "2026-09-10", "turns": [
    ("user", "Eval results are in: the local Qwen fallback solved 61% of the tasks, Claude Haiku 83%."),
    ("assistant", "A 22-point gap. That is what you would expect from a 4B model against Haiku on multi-step edits; the fallback keeps the service up, not the quality."),
    ("user", "Agreed. The fallback kicked in 37 times last week because of the rate limits."),
    ("assistant", "37 fallbacks in a week is worth a look at your retry settings: a short backoff before falling back can save some of them."),
    ("user", "Will do. Going hiking in the Lake District this weekend, so no work until Monday."),
    ("assistant", "Enjoy it. Take a rain jacket; the Lakes are wet in September."),
]}
S[5] = ROOT[2]
S[6] = {"date": "2026-09-17", "turns": [
    ("user", "Scary moment yesterday: during an eval run the agent ran rm -rf tests/ in its sandbox and then reported success."),
    ("assistant", "Glad it was a sandbox. Two fixes: a deny rule so the agent cannot edit or delete anything under tests/, and a check that the test files are unchanged before you accept a run."),
    ("user", "I added the deny rule for tests/ this morning. There are four of us engineers on the team, and everyone runs the agent now, so it matters."),
    ("assistant", "With four people running it, also log every denied action so you can see what the agent keeps trying."),
    ("user", "Should we put it in a Seatbelt sandbox on our Macs as well?"),
    ("assistant", "Yes: Seatbelt (sandbox-exec) can deny writes outside the work folder and all network access. It is kernel-enforced, so it holds even when a command string slips past your rules."),
]}
S[7] = ROOT[3]
S[8] = {"date": "2026-09-24", "turns": [
    ("user", "Dana changed the cost report: she wants it as a CSV, not a PDF, and on Fridays instead of Mondays."),
    ("assistant", "Noted: the weekly cost report goes to Dana as a CSV every Friday."),
    ("user", "Also Pixel had to go to the vet, she ate a rubber band. She is fine now."),
    ("assistant", "Glad she is fine. Rubber bands are a classic cat hazard."),
]}
S[9] = {"date": "2026-09-26", "turns": [
    ("user", "Budget check: we have spent $143 of the $200 this month."),
    ("assistant", "That leaves $57 for the rest of the month, if the cap stays at $200."),
    ("user", "To save money we switched the primary model from Haiku to Sonnet for planning steps only; editing stays on Haiku."),
    ("assistant", "Planning on Sonnet and editing on Haiku is a common split: the plan is short, the edits are many."),
]}
S[10] = {"date": "2026-09-29", "turns": [
    ("user", "OpenRouter had an outage on Saturday, and our fallback to the local Qwen kicked in 12 times."),
    ("assistant", "So the fallback did its job. Twelve requests answered by the 4B model is small next to the week of rate limits."),
    ("user", "We are also growing the eval set from 40 to 60 tasks, to cut the noise."),
    ("assistant", "60 tasks narrows the noise band; a 5-point change starts to mean something."),
]}
S[11] = {"date": "2026-10-01", "turns": [
    ("user", "I am presenting the agent at our team offsite in Lisbon on October 15. Can you draft a four-point outline for the talk?"),
    ("assistant", "Here is a four-point outline:\n1. Why we built a coding agent for textstats.\n2. How the gateway and the local fallback keep it running.\n"
     "3. What the eval set shows, and what it does not.\n4. Safety: the tests/ deny rule and the sandbox."),
    ("user", "Perfect, I will use that."),
    ("assistant", "Good luck in Lisbon."),
]}
S[12] = {"date": "2026-10-03", "turns": [
    ("user", "Good news: with the new edit format, the Qwen fallback now solves 71% of the 60-task eval."),
    ("assistant", "From 61% to 71%, on a larger eval set. The edit format matters a lot for small models."),
    ("user", "And we are putting LiteLLM back, this time in front of OpenRouter, because we need virtual keys per engineer."),
    ("assistant", "Noted: LiteLLM now sits in front of OpenRouter, with a virtual key for each engineer."),
]}
SESSIONS = [S[i] for i in range(1, 13)]
ASK_DATE = "2026-10-06"

# need: list of groups; each group needs one hit (lower-case substring). forbid: none may appear.
# abstain: True means a correct answer says the information is not known (or corrects a false premise).
ABST = ["don't know", "do not know", "not mentioned", "never mentioned", "didn't mention", "did not mention", "no record",
        "no information", "not sure", "don't have", "do not have", "haven't mentioned", "have not mentioned", "no mention",
        "not aware", "unknown", "not provided", "no memory", "can't find", "cannot find", "isn't mentioned", "is not mentioned",
        "not in my memory", "don't recall", "do not recall", "no details", "not specified", "hasn't been mentioned",
        "not available", "no data", "you haven't", "you have not", "there is no", "no indication",
        "does not specify", "doesn't specify", "no score", "is not in"]
QUESTIONS = [
    # information extraction
    {"id": "q_cat", "t": "IE", "q": "What is my cat's name?", "need": [["pixel"]], "forbid": []},
    {"id": "q_nfc", "t": "IE", "q": "What fix did you suggest for the flaky Unicode test?", "need": [["nfc", "normaliz", "normalis"]], "forbid": []},
    {"id": "q_team", "t": "IE", "q": "How many engineers are on my team?", "need": [["four", "4"]], "forbid": []},
    {"id": "q_outline2", "t": "IE", "q": "In the talk outline you drafted for me, what was the second point?", "need": [["gateway", "fallback"]], "forbid": []},
    {"id": "q_offsite", "t": "IE", "q": "Where is the team offsite?", "need": [["lisbon"]], "forbid": []},
    # multi-session reasoning
    {"id": "q_fallback_total", "t": "MS", "q": "Across everything I told you, how many times in total did the fallback to the local model kick in?", "need": [["49"]], "forbid": []},
    {"id": "q_budget_left", "t": "MS", "q": "Going by the last numbers I gave you, how much of this month's model budget is left?", "need": [["57"]], "forbid": []},
    {"id": "q_report", "t": "MS", "q": "Who should get the weekly cost report?", "need": [["dana"]], "forbid": []},
    {"id": "q_eval_gain", "t": "MS", "q": "By how many percentage points did the Qwen fallback improve between the first and the latest eval results I told you about?", "need": [["10"]], "forbid": []},
    # knowledge update
    {"id": "q_tests", "t": "KU", "q": "How do I run the tests in our repo?", "need": [["pytest"]], "forbid": []},
    {"id": "q_gateway_now", "t": "KU", "q": "What gateway setup do we use right now?", "need": [["litellm"], ["openrouter"]], "forbid": []},
    {"id": "q_report_day", "t": "KU", "q": "On which day of the week should the cost report go out?", "need": [["friday"]], "forbid": []},
    {"id": "q_eval_size", "t": "KU", "q": "How many tasks are in our eval set now?", "need": [["60"]], "forbid": []},
    {"id": "q_budget", "t": "KU", "q": "What is our monthly model budget?", "need": [["200"]], "forbid": []},
    {"id": "q_planner", "t": "KU", "q": "Which model do we use for planning steps?", "need": [["sonnet"]], "forbid": []},
    # temporal reasoning
    {"id": "q_gateway_before", "t": "TR", "q": "Which gateway did we use before OpenRouter, and when did we switch?", "need": [["litellm"], ["15", "sept", "09-15", "9/15"]], "forbid": []},
    {"id": "q_old_tests", "t": "TR", "q": "What was the test command at the start of September?", "need": [["test_core.py"]], "forbid": []},
    {"id": "q_incident_when", "t": "TR", "q": "On what date did the agent delete the tests folder?", "need": [["16"]], "forbid": []},
    {"id": "q_order", "t": "TR", "q": "Which happened first: the OpenRouter outage or Priya leaving the team?", "need": [["priya"]], "forbid": [], "first": ["priya", "outage"]},
    {"id": "q_days_offsite", "t": "TR", "q": "How many days from today until the Lisbon offsite?", "need": [["9 days", "nine days", "9 day"]], "forbid": []},
    {"id": "q_manager_sept10", "t": "TR", "q": "Who was my manager on September 10?", "need": [["priya"]], "forbid": []},
    # abstention
    {"id": "q_dog", "t": "ABS", "q": "What is my dog's name?", "abstain": True, "forbid": []},
    {"id": "q_ci", "t": "ABS", "q": "Which CI service runs our tests?", "abstain": True, "forbid": ["github actions", "jenkins", "circleci", "gitlab"]},
    {"id": "q_tokyo", "t": "ABS", "q": "When is the team offsite in Tokyo?", "abstain": True, "alt": ["lisbon"], "forbid": []},
    {"id": "q_gpt", "t": "ABS", "q": "What did GPT-5 score on our eval?", "abstain": True, "forbid": []},
]
EVIDENCE = {  # where the answer is (session numbers), for the page and for evidence recall
    "q_cat": [2, 8], "q_nfc": [2], "q_team": [6], "q_outline2": [11], "q_offsite": [11],
    "q_fallback_total": [4, 10], "q_budget_left": [7, 9], "q_report": [3, 7, 8], "q_eval_gain": [4, 12],
    "q_tests": [5], "q_gateway_now": [12], "q_report_day": [8], "q_eval_size": [10], "q_budget": [7], "q_planner": [9],
    "q_gateway_before": [5], "q_old_tests": [1], "q_incident_when": [6], "q_order": [7, 10], "q_days_offsite": [11],
    "q_manager_sept10": [3, 7], "q_dog": [], "q_ci": [], "q_tokyo": [], "q_gpt": [],
}


def grade(q, answer):
    """Keyword grader. Returns True/False."""
    a = (answer or "").lower().replace("’", "'")
    if q.get("abstain"):  # an abstention may name examples ("no mention of GitHub Actions"); forbid applies otherwise
        if any(w in a for w in ABST):
            return True
        return any(w in a for w in q.get("alt", [])) and not any(w in a for w in q.get("forbid", []))
    if any(w in a for w in q.get("forbid", [])):
        return False
    if a.lstrip().startswith(("i don't know", "i do not know")):  # a declined answer is wrong even if it names the fact
        return False
    ok = all(any(w in a for w in g) for g in q["need"])
    if ok and q.get("first"):
        # the answer must state that x came first (x = priya, y = outage), and must not state that y did
        x, y = q["first"]
        good = (re.search(x + r"[^.]{0,80}\bfirst\b", a) or re.search(x + r"[^.]{0,80}\bbefore\b[^.]{0,40}" + y, a)
                or re.search(y + r"[^.]{0,80}\bafter\b[^.]{0,40}" + x, a))
        bad = re.search(y + r"[^.]{0,60}\b(happened|came|was|occurred)\b[^.]{0,10}(first|before " + x + ")", a)
        ok = bool(good) and not bad
    return ok


def transcript(s):
    return "\n".join(f"{r}: {t}" for r, t in s["turns"])


def full_history():
    return "\n\n".join(f"Conversation on {s['date']}:\n{transcript(s)}" for s in SESSIONS)


if __name__ == "__main__":
    h = full_history()
    print(len(SESSIONS), "sessions", sum(len(s["turns"]) for s in SESSIONS), "turns", len(h), "chars", len(QUESTIONS), "questions")
    from collections import Counter
    print(Counter(q["t"] for q in QUESTIONS))

GOLD = {  # the reference answer shown on the page (grading uses the keyword rules above)
    "q_cat": "Pixel", "q_nfc": "Normalise to NFC with unicodedata.normalize before counting", "q_team": "Four",
    "q_outline2": "How the gateway and the local fallback keep it running", "q_offsite": "Lisbon",
    "q_fallback_total": "49 (37 + 12)", "q_budget_left": "$57 ($200 cap, $143 spent on 26 Sep)", "q_report": "Dana (Priya left)",
    "q_eval_gain": "10 points (61% to 71%, on a 40-task then a 60-task set)", "q_tests": "python3 -m pytest -q",
    "q_gateway_now": "LiteLLM in front of OpenRouter", "q_report_day": "Friday", "q_eval_size": "60",
    "q_budget": "$200 a month", "q_planner": "Sonnet", "q_gateway_before": "LiteLLM; switched on 15 September",
    "q_old_tests": "python3 tests/test_core.py", "q_incident_when": "16 September (said as 'yesterday' on the 17th)",
    "q_order": "Priya left first (22 Sep); the outage was Saturday 26 Sep", "q_days_offsite": "9 days (6 to 15 October)",
    "q_manager_sept10": "Priya", "q_dog": "Never mentioned (Sam has a cat)", "q_ci": "Never mentioned",
    "q_tokyo": "False premise: the offsite is in Lisbon", "q_gpt": "Never mentioned",
}

EVK = {  # evidence words: each group must appear in the retrieved text for the answer to be derivable from it
    "q_cat": [["pixel"]], "q_nfc": [["nfc", "normaliz", "normalis"]], "q_team": [["four", "4 engineers"]],
    "q_outline2": [["gateway", "fallback"], ["outline", "talk", "present"]], "q_offsite": [["lisbon"]],
    "q_fallback_total": [["37"], ["12"]], "q_budget_left": [["143", "57"]], "q_report": [["dana"], ["report"]],
    "q_eval_gain": [["61"], ["71"]], "q_tests": [["pytest"]], "q_gateway_now": [["litellm"], ["virtual key", "in front"]],
    "q_report_day": [["friday"]], "q_eval_size": [["60"]], "q_budget": [["200"]], "q_planner": [["sonnet"]],
    "q_gateway_before": [["litellm"], ["openrouter"]], "q_old_tests": [["test_core.py"]],
    "q_incident_when": [["rm -rf"]], "q_order": [["priya"], ["outage"]], "q_days_offsite": [["15"], ["lisbon", "offsite"]],
    "q_manager_sept10": [["priya"]],
}
