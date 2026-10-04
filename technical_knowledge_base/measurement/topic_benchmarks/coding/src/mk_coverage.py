"""Coverage of the coding facts of the old page 'Math and coding benchmarks' (ids from ../../math/src/coverage_math_and_coding.json,
owner 'owned by Coding'). Each row: where this page carries it, strings that must appear in ../index.html, and any correction."""
import json, os, re, html
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, '..', 'index.html'), encoding='utf-8').read()
text = html.unescape(re.sub(r'<[^>]+>', ' ', page)); text = re.sub(r'\s+', ' ', text)
src = json.load(open(os.path.join(H, '..', '..', 'math', 'src', 'coverage_math_and_coding.json')))
facts = {i['id']: i['fact'] for i in src['items'] if i['owner'] == 'owned by Coding'}
C = {  # id: (where, [checks], correction or None)
 'res7': ('Further reading, primary sources', ['arxiv.org/abs/2107.03374', '(90 min, 35 pages)'], None),
 'res8': ('Further reading', ['arxiv.org/abs/2310.06770', '(45 min)'], None),
 'res9': ('Further reading', ['openai.com/index/introducing-swe-bench-verified', '(12 min)'], None),
 'res10': ('Further reading', ['labs.scale.com/leaderboard/swe_bench_pro_public', '(10 min)'], None),
 'res11': ('Further reading', ['livecodebench.github.io/', '(15 min)'], None),
 'res12': ('Further reading (paper; the site is offline)', ['arxiv.org/abs/2506.11928', 'was offline on 4 October 2026'], 'livecodebenchpro.com offline on 2026-10-04; linked to the paper instead'),
 'c1': ('Reading, Functions and pass@k', ['164 hand-written Python problems'], None),
 'c2': ('Reading, Functions and pass@k', ['pass@k is the probability that at least one of k sampled programs passes'], None),
 'c3': ('Reading, pass@k section, animation and pass@k lab tab', ['consistent underestimate', 'numerically stable'], None),
 'c4': ('Reading, correction box', ['99.3%', '96.3% on base tests and 89.0% on HumanEval+'], '>99% is one lab figure; independent tops 96.3% / 89.0%'),
 'c5': ('Reading and one-screen table', ['974 crowd-sourced tasks', 'retired'], None),
 'c6': ('Reading, Weak tests; HumanEval animation', ['"by 80x"', '19.3-28.9%'], None),
 'c7': ('Reading, Weak tests (heading and text)', ['Weak tests overstate correctness'], None),
 'c8': ('Reading, Weak tests, correction box', ['139 libraries', 'not saturated but unmaintained'], '"saturating" corrected: unmaintained since April 2025, tops 62.4% / 40.5%'),
 'c9': ('Reading, Contest problems', ['LeetCode, AtCoder, and CodeForces', 'release date'], None),
 'c10': ('Reading, Contest problems; LiveCodeBench by date tab', ["released after that model's training data ended", 'date slider'], None),
 'c11': ('Reading, Contest problems', ['self-repair, code execution and test-output prediction'], None),
 'c12': ('Reading, correction box', ['"Frontier models score ~90% on recent windows" has no source'], 'board frozen at April 2025 problems, about 80% (o4-mini high)'),
 'c13': ('Reading, Contest problems', ['annotated by olympiad medalists'], None),
 'c14': ('Reading, Contest problems', ['Codeforces-scale rating'], None),
 'c15': ('Reading, correction box', ['"Frontier ratings around 2800-2900 in mid-2026" is stale', 'nuanced algorithmic reasoning'], 'ratings frozen at November 2025, top 3,298'),
 'c16': ('Reading, Codeforces paragraph', ['o3 2,724 (99.8th)'], 'precise figure 2,724 (OpenAI 2025)'),
 'c17': ('Reading, Codeforces paragraph', ['DeepSeek gives 3,471 for V4.1 Flash'], 'example vendor figure; method not stated'),
 'c18': ('Reading, Codeforces paragraph', ['ICPC World Finals', 'IOI 2024'], 'ICPC 2025 sourced; IOI as o3 on IOI 2024 problems'),
 'c19': ('Reading, SWE-bench', ['2,294 tasks', '12 popular Python repositories'], None),
 'c20': ('Reading, SWE-bench; One SWE-bench task tab', ['fail-to-pass', 'commit before the fix'], None),
 'c21': ('Reading, SWE-bench', ['changed the unit of work from a function to a repository', 'also an agent benchmark'], None),
 'c22': ('Reading, SWE-bench', ['300-task subset', 'September 2025'], None),
 'c23': ('Reading, Verified, correction box', ['1,699', 'more than two thirds were filtered out'], '"~33% had problems" corrected: more than two thirds filtered'),
 'c24': ('Reading, Verified', ['standard number of 2024 and 2025'], None),
 'c25': ('Reading, Where Verified stands; correction box', ['97.0%', 'Vals AI'], 'confirmed by an independent run (Vals AI, 1 Sep 2026)'),
 'c26': ('Reading, SWE-bench\'s flaws', ['Solution leakage', 'Weak tests', 'Memorised repositories', 'SWE-Bench Illusion'], None),
 'c27': ('Reading, SWE-bench Pro', ['1,865 problems from 41 repositories'], None),
 'c28': ('Reading, SWE-bench Pro', ['copyleft', 'requirements', '4.1 files'], None),
 'c29': ('Reading, SWE-bench Pro, correction box', ['spliced models and versions', '61.5% public and 51.5% commercial'], 'the 47% was Opus 4.6 on V1 commercial; versions spliced'),
 'c30': ('Reading, Verified paragraph', ['617 visual bugs in 17 JavaScript libraries'], None),
 'c31': ('Reading, By the calendar', ['SWE-rebench', 'SWE-bench-Live', '1,319 tasks'], None),
 'c32': ('Reading, By licensing', ['licenses', 'median of 11 files'], None),
 'c33': ('Reading, By licensing', ['native harness', '8 times per task'], '640 rollouts = 10 tasks x 8 models x 8 runs (108 + 532 in the page\'s split)'),
 'c34': ('Reading, Real-SWE correction box and grid', ['Fable 5.1 38.8%', 'GPT-6 Astra 46.25%'], 'launch readings superseded'),
 'c35': ('Reading, Real-SWE', ['Four of the ten tasks', 'missed requirement'], 'six of ten under 15% is now four'),
 'c36': ('Reading, Real-SWE correction box', ['57.4% (62 of 108)'], '71.4% is now 57.4%'),
 'c37': ('Reading, Real-SWE', ['$2.50', '$6.96'], None),
 'c38': ('Reading, Real-SWE correction box', ['about 12 to 13 points'], 'roughly 20 corrected to about 12 to 13'),
 'c39': ('Reading, By licensing; Further reading', ['does not depend on the tasks being new', '(15 min)'], None),
 'c40': ('Reading, The harness is part of the score', ['measures a model inside a scaffold'], None),
 'c41': ('Reading, harness paragraph; Common mistakes', ['bash-only', 'not comparable'], None),
 'c42': ('Reading, SWE-bench; Other benchmarks; Further reading', ['Agentic benchmarks'], None),
 'c43': ('Reading, Other benchmarks', ['225', 'C++, Go, Java, JavaScript, Python and Rust'], None),
 'c44': ('Reading, Other benchmarks', ['cheap to run', 'popular with them'], '"correlates with usefulness" not sourced; stated as practitioner use'),
 'c45': ('Reading, Other benchmarks', ['85 open-ended tasks in nine categories'], None),
 'c46': ('Reading, Other benchmarks', ['55 single-file kernel completions', '20 multi-file', '10 end-to-end'], None),
 'c47': ('Reading, Other benchmarks', ['2,260 papers and 1,852 engineering artifacts'], None),
 'c48': ('Reading, Other benchmarks and correction box', ['36.53', '28.12', '27.73', 'mean reward', 'Kimi K3 loses 45%'], 'mean reward, not %; 5.4% is Qwen3.7 Max; effort finding softened'),
 'u1': ('Reading, What to use, correction box', ['no longer works'], 'both boards frozen'),
 'u2': ('Reading, What to use', ['private</b> split', 'Terminal-Bench 4.0', 'only for continuity'], None),
}
items, ok = [], 0
for k, f in facts.items():
    w, checks, corr = C[k]
    miss = [c for c in checks if c not in page and c not in text]
    items.append({'id': k, 'fact': f, 'where': w, 'checks': checks, 'correction': corr, 'verified': not miss, 'missing': miss})
    ok += not miss
json.dump({'source': 'math/src/coverage_math_and_coding.json (coding rows of the old page "Math and coding benchmarks", live text in math/src/live_math_and_coding.md)',
           'items': len(items), 'verified': ok, 'corrected': sum(1 for i in items if i['correction']), 'list': items},
          open(os.path.join(H, 'coverage.json'), 'w'), indent=1, ensure_ascii=False)
print(len(facts), 'facts;', ok, 'verified'); [print('MISSING', i['id'], i['missing']) for i in items if i['missing']]
