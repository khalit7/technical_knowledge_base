"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (this paper's Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Numbers drawn by script are checked through
the data they come from (tables.json and recompute.json are embedded in the page).
The item list below is this paper's own, written from src/live.md.
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, F = 'The paper tab', 'Transform a repository tab', 'Tables tab', 'Further reading tab'
C = [
 ('Reading line "5 min read, +35m resources"', 'dropped: replaced by the build-computed reading time and resources total (the page now owns the paper\'s detail)', ['min to read', 'of resources']),
 ('Authors: Silin Chen, Yufei Yang, Xiaodong Gu, Yuling Shi, Chengcheng Wan and Haibing Guan', R + ', headline card', ['Silin Chen, Yufei Yang, Xiaodong Gu, Yuling Shi, Chengcheng Wan, Haibing Guan']),
 ('Link arXiv 2609.27891 (35 min)', 'card and Further reading (time raised to 45 min: the tables and code reading need it)', ['https://arxiv.org/abs/2609.27891', 'https://arxiv.org/html/2609.27891v1']),
 ('"Code and data on GitHub"', R + ' (What the released code does differently) and Further reading; corrected: the code is released, the data behind the tables is not', ['https://github.com/cslsolow/Schrodinger-Repo', 'per-instance results are not released', 'Not released: the generated mappings']),
 ('SchrodingerRepo instantiates the test repository dynamically at evaluation time rather than evaluating against a static snapshot', R + ', Idea', ['treats the repository as a <b>latent variable</b>', 'a seed decides the concrete view when the agent enters the container']),
 ('Four transformation levels that preserve executable behaviour', R + ', The four levels', ['Each level removes a different kind of familiar cue while keeping the task, its tests and its behaviour']),
 ('Level: problem-statement reconstruction', R + ', The four levels', ['Level 1: problem statement reconstruction']),
 ('Level: namespace remapping', R + ', The four levels; Transform tab', ['Level 2: namespace mapping', 'Level 2: rename the namespace']),
 ('Level: intra-file layout reordering', R + ', The four levels; Transform tab', ['Level 3: intra-file layout reordering', 'Level 3: reorder definitions']),
 ('Level: functionality-preserving code rewriting', R + ', The four levels', ['Level 4: functionality-preserving rewrite']),
 ('The task is identical; the familiar cues are gone', R + ', Idea', ['The task is identical; the familiar cues are gone.']),
 ('Removing familiar repository cues consistently degrades agent performance and substantially increases interaction cost', R + ', RQ1 and RQ3 (qualified: consistent for Pass@1 on Verified, not for SWE-QA quality)', ['Pass@1 drops by 6.0', 'so "consistently" does not hold for SWE-QA quality, only for cost']),
 ('Measured on SWE-bench Verified and SWE-QA', R + ', Setup, RQ1, RQ3', ['On SWE-QA (144 questions', 'SWE-bench Verified']),
 ('Repository exploration and localisation are the dominant cost drivers', R + ', RQ2', ['81.6% (GPT-5.4-mini) and 83.6% (DeepSeek-v4-Flash) of the extra actions are localisation and exploration']),
 ('Authors read it as partial reliance on memorised repository-side cues rather than robust reasoning', R + ', RQ1 and the verdict (reading questioned)', ['the degradation reflects familiarity with canonical repository cues', '"memorised" is not separated from "meaningful"'.replace('"memorised"', '"Memorised"')]),
 ('Figure provenance: aggregator records the gap as 6 to 14 points; abstract states direction only, so carried with attribution', R + ', provenance box under the nav (corrected: the paper itself states 6.0 to 14.4 points in §I and §VIII)', ['Where the "6 to 14 points" comes from', 'So the range is the paper\'s own number']),
 ('arXiv listing shows 21 August 2026; surfaced in the 24 September 2026 trending digest, which is why it was not recorded earlier', R + ', provenance box; card', ['"Submitted on 21 Aug 2026"', '24 September 2026 trending digest', '21 August 2026']),
 ('Third sensitivity a repository-level score conceals, beside the harness rule and the item-defect rule', R + ', Why it matters', ['It is the third sensitivity a repository-level score conceals', 'a harness-sensitive number needs its harness', 'an item-defective suite needs its residual decomposed']),
 ('Answers by construction what SWE-rebench-style monthly refreshment answers by the calendar', R + ', Why it matters', ['answers that by the calendar, this answers it by construction']),
 ('Transforming an existing set preserves the time series that refreshing one destroys', R + ', Why it matters', ['the second preserves the time series that the first destroys']),
 ('Integrated on Topic: benchmarks', R + ' Why it matters and Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a', 'where this paper was integrated']),
 ('Database Takeaway: part of a repository-level coding score is knowing where to look rather than knowing what to do', R + ', headline card and Why it matters', ['knowing where to look rather than knowing what to do']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-28)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')],
           'corrected': ['"6 to 14 points" carried as the aggregator\'s, not the paper\'s: the paper states 6.0 to 14.4 points itself (§I finding 1, §VIII); the top end is Gemini-3.1-Flash-Lite on 300 leakage-selected instances (provenance box, RQ1)',
                         '"Code and data on GitHub": code (MIT) yes; mappings, variants, trajectories and per-instance results are not released (Code vs text, Further reading)',
                         '"consistently degrades agent performance": holds for Pass@1 on SWE-bench Verified; on SWE-QA DeepSeek-v4-Flash moves 0.55 points (printed 0.75) and two of its levels score higher (RQ3, card note)',
                         '"partial reliance on memorised cues": the design cannot separate memorised from meaningful names, and the difficulty control is underpowered (How much to believe)'],
           'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
