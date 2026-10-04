"""coverage.json: every root atlas row this page owns (Long context and Multimodal families) and every root mention
(old root page rows in ../../src/live.md, the root's Reading paragraphs in ../../src/parts/20_read_c.html and 20_read_d.html),
each with the strings that must appear on this page and the section that carries them. Run after build.sh."""
import json, re, html
ROOT = '../../src/'
page = open('../index.html').read()
# map text position -> section / tab id
secs = [(m.start(), m.group(1)) for m in re.finditer(r'<(?:section|div class="tab") id="([\w-]+)"', page)]
def where(s):
    low = page.lower()
    for m in re.finditer(re.escape(s.lower()), low):
        w = None
        for p, n in secs:
            if p <= m.start(): w = n
        if w: return w
    return None
A = json.load(open(ROOT + 'data/atlas.json'))
items = []
def add(src, claim, needles, note=''):
    found = {n: where(n) for n in needles}
    items.append({'source': src, 'claim': claim, 'needles': needles, 'where': sorted(set(v for v in found.values() if v)),
                  'missing': [n for n, v in found.items() if not v], 'note': note})
for r in A['rows']:
    if r['fam'] not in ('long', 'mm'): continue
    src = 'atlas row ' + r['id']
    add(src, 'row exists: ' + r['n'] + ' (' + r['st'] + ')', [r['n'].split(' (')[0].split(' / ')[0]])
    for e in r.get('ev', []):
        v = ('%.1f' % e['v']) if isinstance(e['v'], float) else str(e['v'])
        add(src, 'reading %s%% %s (%s, %s)' % (v, e['m'], e['d'], e['k']), [v + '%'] if v + '%' in page else [v])
    for x in r.get('iss', []) + r.get('corr', []):
        add(src, 'issue/correction: ' + (x.get('t') or x.get('f')), [], 'see manual checks')
    if r.get('cont'): add(src, 'contamination: ' + r['cont']['t'], [], 'see manual checks')
# manual: the issue, correction and contamination facts, with the strings that carry them
M = [
 ('atlas gdp_pdf', 'dataset public; items kept if two frontier models failed', ['the data are public', 'at least two frontier models failed']),
 ('atlas gdp_pdf', 'v4.2 figures 33.2 (Astra) unlabelled; AA 32.2 and Surge 34.2 not interchangeable', ['33.2%', '32.2%', '34.2%', 'do not agree']),
 ('atlas gdp_pdf', '100 tasks, 100 PDFs, 4,592 pages, 1,275 criteria; all-pass', ['4,592 pages', '1,275', 'every criterion passes']),
 ('atlas aa_lcr', 'AA-LCR v1.1, ~100K token document sets, judge', ['v1.1', '10K to 100K tokens', 'an LLM judges']),
 ('atlas ruler', 'dormant since Oct 2025, 128K max, vendors use MRCR', ['October 2025', 'vendors moved to MRCR']),
 ('atlas ruler', '13 tasks', ['13 in four categories']),
 ('atlas longbench_v2', '503 questions, 8K to 2M words, human 53.7, top 63.3 Gemini 2.5 Pro, no 2026 entries', ['503', '8K to 2M words', '53.7%', '63.3%', 'no 2026 model has been added']),
 ('atlas niah', 'no current frontier card reports it; MRCR replaced it', ['no 2026 card reports it']),
 ('atlas mrcr', '2,400 rows, 2/4/8 needles, 8 bins 4K to 1M, 100 each', ['2,400 rows', '2, 4 or 8', '100 per bin']),
 ('atlas mrcr', 'December 2025 fix: ~10% too many needles, ~5% wrong truth; not comparable', ['about 10% of rows', 'about 5%', 'not comparable']),
 ('atlas mrcr', 'vendor 96.3 vs independent 63.5', ['96.3%', '63.5%']),
 ('atlas fiction_live', 'last updated 4 Apr 2026, 97 to 100% at 192K; 16K column 97.2 GPT-5', ['4 April 2026', '100.0% at 192K']),
 ('atlas mmmu', '11.5K questions; human band 76.2 to 88.6; 85.4 val GPT-5.1; test top 65.9; test answers released 12 Feb 2026', ['11.5K', '76.2%', '88.6%', '85.4%', '65.9%', '12 February 2026']),
 ('atlas mmmu_pro', '1,730 questions, 10 options and vision-only; 86.9 Chance Vision 1.5 (87.6/86.1) above 85.4 human high', ['1,730', '86.9%', 'standard 87.6, vision 86.1', '85.4%']),
 ('atlas mathvista_chartqa_docvqa', 'MathVista 6,141; ChartQA 9.6K; DocVQA 50,000 on 12,000+; 85.2 DreamPRM vs human 60.3', ['6,141', '9.6K', '50,000 questions', '12,000+', '85.2%', '60.3%']),
 ('atlas mathvista_chartqa_docvqa', 'CharXiv: templated chart sets, drops up to 34.5%; DocVQA 96.4 above human 94.36', ['34.5%', '96.4', '94.36']),
 ('atlas video_mme', '900 videos, 2,700 questions; Video-MMMU 300 videos, 900 questions; 89.2 self-report; 79.7 leaderboard no subtitles; human 74.4', ['900 videos', '2,700', '300 lecture videos', '89.2%', '79.7%', '74.4%']),
 ('atlas video_mme', 'frame budgets: Gemini 1 fps, Astra 800, Opus 5.5 600', ['1 frame per second', '800 frames', '600']),
 ('root reading (Long context)', 'Can the model use a million tokens; NIAH solved early; RULER, LongBench v2, MRCR, Fiction.liveBench, GDP.pdf 4,592 pages, Astra 33.2%', ['million tokens', 'RULER', 'LongBench v2', 'Fiction.LiveBench', '4,592']),
 ('root reading (Long context)', 'root says Active: RULER, LongBench v2, Fiction.liveBench; atlas and this page: dormant/saturated (flagged to the orchestrator)', ['Dormant.', 'Saturated.']),
 ('root reading (Multimodal)', 'MMMU saturated, Pro took over; chart/document/visual-math sets saturate fast (short answers); video the open end', ['Short answers', 'Video-MME-v2']),
 ('root reading (checklist)', 'model cards lead with MMMU-Pro', ['MMMU-Pro']),
 ('old root live.md rows', 'GDP.pdf "Active, nowhere near saturation (Astra 33.2, Sol 28.2, Fable 5.1 26.2)": dated and harness-labelled instead; Sol and Fable figures are v4.2-launch AA figures not repeated', ['33.2%']),
 ('old root live.md rows', 'RULER "Active for context-length claims" -> dormant', ['Dormant.']),
 ('old root live.md rows', 'NIAH "saturated (marketing only)"; MRCR and Fiction.liveBench "active" -> MRCR saturating in vendor figures only, Fiction saturated', ['Saturating in vendor figures only']),
 ('old root live.md rows', 'MMMU saturating; Pro active -> saturated; saturating', ['MMMU-Pro']),
 ('old root live.md rows', 'MathVista / ChartQA / DocVQA saturating -> saturated', ['MathVista']),
 ('old root live.md rows', 'Video-MME / VideoMMMU active -> saturating', ['Video-MMMU']),
 ('old root live.md', 'AA v4.2 added GDP.pdf as long-context document reasoning across 4,592 PDF pages', ['Index v4.2 launch']),
]
for s, c, n in M: add(s, c, n)
miss = [i for i in items if i['missing']]
json.dump({'about': __doc__, 'items': items, 'missing_count': len(miss)}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print(len(items), 'items;', len(miss), 'with missing strings')
for i in miss: print(i['source'], '|', i['claim'][:80], '|', i['missing'])
