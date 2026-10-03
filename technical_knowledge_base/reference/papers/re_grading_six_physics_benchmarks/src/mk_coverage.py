"""Write coverage.json: every fact, number, caveat and link of live.md (this paper's Notion page before migration,
last edited 2026-09-21) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
The item list below is this paper's own, written from src/live.md (Re-grading six physics benchmarks), not copied from another page.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, P, T, F = 'The paper tab', 'Follow the audit tab', 'Tables tab', 'Further reading tab'
C = [
 # properties (they stay in Notion; the card repeats the takeaway)
 ('Takeaway property (verbatim on the card)', R + ', headline card "In one line"', ['Domain experts re-graded six popular physics benchmarks and found wrong answer keys, ambiguous questions and grader bugs behind most reported model failures', 'rather than another leaderboard on a broken quiz']),
 ('Topics property: benchmarks, evaluation-and-llm-judges, llms', F + ', Topics', ['https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546', 'https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286']),
 ('Year property: 2026', 'crumb line', ['Papers', '· 2026 ·']),
 # header
 ('Reading time line "3 min read, +25m resources"', 'replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('arXiv 2609.13009, 14 September 2026', 'card (submitted 11 September, announced 14 September) and the note under the nav', ['https://arxiv.org/abs/2609.13009', 'announced 14 September 2026', 'submitted on Friday 11 September']),
 ("Surfaced through TLDR AI's edition of the same day", R + ', note under the nav', ["surfaced through TLDR AI's edition of 14 September"]),
 # the claim
 ('Six widely used physics benchmarks were re-graded by people who know the physics', R + ', Six benchmarks and The audit', ['Six benchmarks, in two groups', 'Physics PhD students reviewed', 'faculty member or a researcher endorsed by one']),
 ('A large share of items where frontier models were scored wrong were defective rather than hard', R + ', Results and headline card', ['238 of 250', '143 of 250']),
 ('Answer keys that were simply incorrect', R + ', case gallery and Results', ['references that are simply wrong', 'four stars, one arithmetic slip']),
 ('Questions admitting more than one defensible reading', R + ', case gallery', ['wording that admits two readings', 'Two readings, two answers']),
 ('Automated graders marked correct answers wrong because of formatting or unit handling', 'corrected in ' + R + ': equivalent expressions and conventions, not units', ['not "formatting or unit handling"', 'a correct answer written differently']),
 ('With those items corrected, frontier performance on these suites is close to saturated', R + ', Results, defect floor, verdict', ['almost any closed-ended problem of the kind used in physics problem sets', '"near-saturated" is a claim about']),
 # why most useful
 ('Why this is the most useful eval result of the window', R + ', Why it matters', ['the most useful evaluation result of its week']),
 ('Inverts the usual reading of a benchmark gap: "the model scored 62%", the remaining 38% measures something the model cannot do', R + ', Defect floor', ['This inverts the usual reading of a benchmark gap', 'the model scored 62%', 'remaining 38%']),
 ('A substantial part of that residual measures something the benchmark got wrong', R + ', Defect floor (with the interactive chart)', ['a large part of that residual measures something the benchmark got wrong']),
 ('The error is concentrated precisely in the hard tail everyone quotes', R + ', Why it matters (quantified: 87.8% of HLE-Physics questions failed on every attempt were defective)', ['the hard tail that everyone quotes', '87.8% defective']),
 ('Owners of evaluation frameworks must treat the residual as a mixture of model failure and item defect; cannot separate without expert re-grading', R + ', Defect floor', ['treat the residual as a mixture of model failure and item defect', 'cannot be separated without expert re-grading']),
 ("The authors' conclusion: not another leaderboard on the same pipeline but harder exams written by humans who can be held to the answer key", R + ', Defect floor (What the authors conclude) and Why it matters', ['Not another leaderboard built on the same pipeline', 'people who can be held to their answer keys']),
 # caveats
 ('Caveat: physics, six suites', R + ', Why it matters', ['This is physics, six suites']),
 ('Nothing establishes the same defect rate in code, maths or agentic benchmarks; failure modes not physics-specific, no obvious reason they would be rarer elsewhere', R + ', Why it matters (plus the SWE-bench audits the paper cites)', ['Nothing here establishes the same defect rate in code, mathematics or agentic benchmarks', 'no obvious reason they would be rarer elsewhere']),
 ('"Near-saturated" is about these six suites after correction, not physics reasoning in general', R + ', Why it matters and verdict', ['not about physics reasoning in general']),
 # connections
 ('Topic: benchmarks rule: a harness-sensitive number without a named harness carries no information; this is a further sensitivity: the defect rate', R + ', Connections; ' + F, ['harness-sensitive number reported without a named harness carries no information', 'without the defect rate of the items it is scored on']),
 ("Read alongside Goodfire's activation-level reward-hacking monitors", R + ', Connections', ['https://www.goodfire.com/research/reward-hacking-activation-monitors']),
 ('Read alongside the Vals AI Legal Research Bench result from the same window', R + ', Connections (Astra for Law, 54% against 38.7%)', ['Vals AI Legal Research Bench', '54% against 38.7%']),
 ('Both say the measurement apparatus, not the model, was the thing that moved', R + ', Connections', ['the measurement apparatus, not the model, was the thing that moved']),
 ('Covered in the 2026-09-21 tech news issue', R + ' note under the nav; ' + F, ['https://app.notion.com/p/3e25c17b0d0d813dba03fa81f5d8cc39']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-21)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': ['"14 September 2026": submitted 11 September 2026, announced 14 September',
                         '"graders that marked correct answers wrong because of formatting or unit handling": the grader errors are equivalent expressions (factor order, rationalised denominators, notation) and conventions (a limit, a sign); units are not mentioned',
                         '"most reported model failures": most of the failures that were checked; on four benchmarks only one model\'s rejected answers were audited and accepted answers never were',
                         '"corrected, frontier models look near-saturated": on filtered or repaired subsets (116 of 202 HLE-Physics questions, 54 of 70 CritPt challenges), with the protocol\'s biases pointing upward'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:70], m)
sys.exit(1 if miss else 0)
