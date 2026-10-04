# New page: the root mentions and root / paper-page facts this page owns, each checked to appear in ../index.html.
import json, re
s = open('../index.html').read(); t = re.sub(r'<[^>]+>', ' ', s); t = re.sub(r'\s+', ' ', t)
F = [
 ("Root rd-fail: 'Agents: grade the action, not the sentence' (harm or success lives in tool calls and state)", "rd-actions, rd-one", "Grade actions, not messages"),
 ("Root rd-who: agent-as-judge, the judge gets tools (runs code, replays a trajectory), more accurate on agentic work, new failure surface", "rd-judges, Agent-as-a-judge", "Instead of reading a transcript, the judge acts"),
 ("Root checklist: 'For agents: was the action graded, or only the final message?'", "rd-check, rd-mist", "Grading the final message"),
 ("Root coverage: MOLE corrected reading: 28 of 39, Spearman -0.73, best monitor 24 of 45", "rd-actions correction box", "Spearman -0.73"),
 ("Root Judge atlas: DevAI 90.44% vs 60.38%, $30.58 / 118.43 min vs $1,297.50 / 86.5 h", "rd-judges", "90.44%"),
 ("Root Judge atlas issue: Section 4.4 swaps cost and time percentages (2.36% cost, 2.28% time)", "rd-judges correction box", "swapped in the paper"),
 ("Root Judge atlas: AJ-Bench +12.85 (DeepSeek V3.2), +13.41 (GPT-5-mini low)", "rd-judges", "+12.85 points"),
 ("Root Judge atlas: MobileJudgeBench simple baseline 90.9% vs 89.3%", "rd-judges", "90.9%"),
 ("Root coverage: Inspect is the default for agentic or safety-facing evals, sandboxed", "rd-env (links Eval harnesses' Sandboxes section)", "Sandboxes for agentic evals"),
 ("Agentic page owns pass^k on real tau2 trials (linked, applied)", "rd-rel", "pass^k on real trials"),
 ("Agentic page owns RDI catalogue and Terminal-Bench verifier exploit (linked)", "rd-hack, rd-env", "Grade a real task"),
 ("Emergence World corrected: 46 hours is one agent's retry, not a detection-to-stop delay; 489 calls after flagging", "rd-actions", "489"),
 ("StateM: 95.28 raw, 94.38, 93.26, 92.36; PR closed unmerged 19 Sep 2026", "rd-hack", "19 September 2026"),
 ("HarnessDev: 34 of 64 version changes agree", "rd-hack", "34 of 64"),
 ("Prime Agent: Factorio RCON cheat saved as a skill", "rd-hack", "RCON"),
 ("MOLE observability: reasoning helps; 600-character clip hides triggers", "rd-judges, rd-actions", "600-character"),
 ("Task brief: outcome vs trajectory grading (final state, unit tests, env diffs vs step-level)", "rd-outcome, rd-steps", "FAIL_TO_PASS"),
 ("Task brief: cost and step budgets", "rd-cost", "200 steps and 10 tool errors"),
 ("Task brief: OpenTelemetry GenAI conventions, LangSmith, Braintrust traces, dated", "rd-obs", "status Development"),
 ("Task brief: process reward models", "rd-judges", "PRM800K"),
 ("Task brief: flaky environments", "rd-rel", "correlated failures"),
]
out = {'source': 'new page (no old Notion text); root index.html, src/coverage.md and Judge atlas data; paper pages', 'child_pages': 'none', 'databases': 'none', 'video': 'none', 'facts': []}
miss = 0
for old, where, needle in F:
    ok = needle in t; miss += not ok
    out['facts'].append({'old': old, 'where': where, 'found': ok})
json.dump(out, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print(len(F), 'facts,', miss, 'missing')
