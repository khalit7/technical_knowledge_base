"""The shared multi-session conversation and the questions (written for this experiment, not a real user).

Assistant turns are fixed text (not generated) so every memory system sees exactly the same history.
"""
SESSIONS = [
    {"date": "2026-09-01", "turns": [
        ("user", "Hi, I'm Sam. I'm building a coding agent for my team's textstats library."),
        ("assistant", "Nice to meet you, Sam. What does your setup look like?"),
        ("user", "All our model calls go through a LiteLLM proxy. The tests run with python3 tests/test_core.py. I like short answers with code."),
        ("assistant", "Got it: LiteLLM in front of the models, tests with python3 tests/test_core.py, short answers with code."),
    ]},
    {"date": "2026-09-08", "turns": [
        ("user", "Last week the primary provider rate-limited us a lot, so I added a fallback to a local Qwen model."),
        ("assistant", "Sensible. A fallback keeps the agent running when the primary returns 429s."),
        ("user", "Also, my manager Priya wants a weekly cost report every Monday."),
        ("assistant", "Noted: a weekly cost report for Priya, every Monday."),
    ]},
    {"date": "2026-09-15", "turns": [
        ("user", "Big change today: we moved the test suite to pytest, so the command is now python3 -m pytest -q."),
        ("assistant", "Understood, the test command is now python3 -m pytest -q."),
        ("user", "And we dropped LiteLLM; everything goes through OpenRouter now."),
        ("assistant", "Noted: OpenRouter replaces LiteLLM as the gateway."),
    ]},
    {"date": "2026-09-22", "turns": [
        ("user", "Priya left the team this week. Dana is my manager now."),
        ("assistant", "Thanks for letting me know. Dana is your manager from now on."),
        ("user", "Dana capped our model budget at $200 a month."),
        ("assistant", "Noted: the model budget is capped at $200 a month."),
    ]},
]
ASK_DATE = "2026-09-29"
QUESTIONS = [
    {"id": "q_tests", "q": "How do I run the tests in our repo?",
     "need": [["pytest"]], "forbid": [], "kind": "current fact (changed once)"},
    {"id": "q_gateway_before", "q": "Which gateway did we use before OpenRouter, and when did we switch?",
     "need": [["litellm"], ["15", "sept", "09-15", "9/15"]], "forbid": [], "kind": "history of a changed fact"},
    {"id": "q_report", "q": "Who should get the weekly cost report?",
     "need": [["dana"]], "forbid": [], "kind": "two facts combined (report owner left)"},
    {"id": "q_budget", "q": "What is our monthly model budget?",
     "need": [["200"]], "forbid": [], "kind": "stable fact"},
    {"id": "q_old_tests", "q": "What was the test command at the start of September?",
     "need": [["test_core.py"]], "forbid": [], "kind": "past value of a changed fact"},
]


def grade(question, answer):
    """Keyword grader: every group in `need` must have one hit; no `forbid` word may appear."""
    a = answer.lower()
    ok = all(any(w in a for w in group) for group in question["need"])
    bad = [w for w in question["forbid"] if w.lower() in a]
    return ok and not bad
