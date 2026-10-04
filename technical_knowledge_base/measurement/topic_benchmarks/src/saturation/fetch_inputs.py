"""Trim the raw downloads (kept in a scratch folder, not committed) into small inputs/*.json files.

Usage: python3 fetch_inputs.py <scratch folder>
The scratch folder holds, downloaded on 2026-10-04:
  epoch/            unzipped https://epoch.ai/data/benchmark_data.zip (Epoch AI, CC BY 4.0)
  arc_v1.json ...   https://arcprize.org/media/data/leaderboard/v{1,2,3}.json (ARC Prize Foundation)
  ma_aime--aime_2025.json, ma_aime--aime_2026.json   https://matharena.ai/competition_tables/aime--aime_{2025,2026}
  evalplus.json     https://evalplus.github.io/results.json
Only the rows the saturation tab uses are kept, with their fields verbatim."""
import csv, json, re, html, sys, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(__file__).parent / 'inputs'
EPOCH = {  # file: (score column, extra columns kept)
 'gpqa_diamond.csv': ('Best score (across scorers)', ['Started at']),
 'math_level_5.csv': ('Best score (across scorers)', ['Started at']),
 'swe_bench_verified.csv': ('Best score (across scorers)', ['Started at']),
 'frontiermath.csv': ('Best score (across scorers)', ['Started at']),
 'frontiermath_tiers_1_3_v2.csv': ('Best score (across scorers)', ['Started at']),
 'frontiermath_tier_4.csv': ('Best score (across scorers)', ['Started at']),
 'frontiermath_tier_4_v2.csv': ('Best score (across scorers)', ['Started at']),
 'hle_external.csv': ('Accuracy', ['Name']),
 'mmlu_external.csv': ('EM', ['Name', 'Shots', 'Source', 'Source link']),
 'gsm8k_external.csv': ('EM', ['Name', 'Shots', 'Source', 'Source link', 'Notes']),
 'hella_swag_external.csv': ('Overall accuracy', ['Name', 'Shots', 'Source', 'Source link']),
 'os_world_external.csv': ('Score', ['Agent', 'Source', 'Source link', 'Date added']),
 'terminalbench_external.csv': ('Accuracy mean', ['Agent', 'Agent Org', 'Run date', 'Source', 'Source Link']),
}
ep = {}
for f, (col, extra) in EPOCH.items():
    rows = list(csv.DictReader(open(src / 'epoch' / f, encoding='utf-8')))
    keep = []
    for r in rows:
        try: v = float(r[col])
        except Exception: continue
        d = {'model': r.get('Model version') or '', 'v': v, 'release': r.get('Release date') or '', 'org': r.get('Organization') or ''}
        for k in extra: d[k] = (r.get(k) or '').strip()
        keep.append(d)
    ep[f] = {'score_column': col, 'rows': keep}
meta = list(csv.DictReader(open(src / 'epoch' / 'benchmark_metadata.csv')))
(out / 'epoch_rows.json').write_text(json.dumps({'source': 'Epoch AI benchmark hub, https://epoch.ai/data/benchmark_data.zip, downloaded 2026-10-04, CC BY 4.0', 'metadata': meta, 'files': ep}, ensure_ascii=False, separators=(',', ':')))
arc = {}
for v in ('v1', 'v2', 'v3'):
    d = json.load(open(src / f'arc_{v}.json'))
    arc[v] = {'generatedAt': d['generatedAt'], 'rows': [{k: e.get(k) for k in ('modelDisplayName', 'modelType', 'modelReleaseDate', 'providerDisplayName', 'score', 'costPerTask', 'cost', 'resultsUrl')} for e in d['evaluations']]}
(out / 'arc_prize.json').write_text(json.dumps({'source': 'ARC Prize Foundation leaderboard data, https://arcprize.org/media/data/leaderboard/{v1,v2,v3}.json, downloaded 2026-10-04', 'sets': arc}, ensure_ascii=False, separators=(',', ':')))
ma = {}
for c in ('aime--aime_2025', 'aime--aime_2026'):
    t = json.load(open(src / f'ma_{c}.json'))['table']
    rows = []
    for r in re.findall(r'<tr class="model-row"(.*?)</tr>', t, flags=re.S):
        name = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', re.search(r'class="model-link"[^>]*>(.*?)</a>', r, re.S).group(1)))).replace('⚠️', '').strip()
        prov = re.findall(r'<td class="left-row">([^<]*)</td>', r)
        rows.append({'model': name, 'provider': prov[0] if prov else '', 'acc': float(re.search(r'([\d.]+)%', r).group(1)), 'released_after_competition': 'contamination-warning' in r})
    ma[c] = rows
(out / 'matharena_aime.json').write_text(json.dumps({'source': 'MathArena competition tables, https://matharena.ai/competition_tables/<id>, downloaded 2026-10-04; the warning flag is MathArena\'s "Model was released after competition release."', 'tables': ma}, ensure_ascii=False, separators=(',', ':')))
evp = json.load(open(src / 'evalplus.json'))
(out / 'evalplus_humaneval.json').write_text(json.dumps({'source': 'EvalPlus leaderboard data, https://evalplus.github.io/results.json, downloaded 2026-10-04', 'rows': {k: {'humaneval': v['pass@1'].get('humaneval'), 'humaneval+': v['pass@1'].get('humaneval+'), 'link': v.get('link'), 'prompted': v.get('prompted')} for k, v in evp.items()}}, ensure_ascii=False, separators=(',', ':')))
for p in sorted(out.glob('*.json')): print(p.name, p.stat().st_size)
# display names for Epoch model versions that appear in the kept rows
used = {r['model'] for f in ep.values() for r in f['rows']}
names = {}
for r in csv.DictReader(open(src / 'epoch' / 'model_metadata.csv', encoding='utf-8')):
    if r['model_version'] in used: names[r['model_version']] = {'name': r['display_name'] or r['model_group'], 'group': r['model_group'], 'date': r['date']}
(out / 'epoch_model_names.json').write_text(json.dumps(names, ensure_ascii=False, separators=(',', ':')))
print('names', len(names), 'of', len(used))
# Terminal-Bench-Science 0.1 and Terminal-Bench 4.0 cells collected for Topic: llms (read 2026-10-01): AA runs and lab figures
bg = json.load(open(pathlib.Path(__file__).resolve().parents[4] / 'models_and_training/topic_llms/src/data/bench_grid.json'))
cells = []
for r in bg['rows']:
    for b in ('tbs', 'tb4'):
        for e in r['cells'].get(b) or []:
            cells.append({'bench': b, 'model': r['m'], 'effort': r['e'], 'release': r['release'], **{k: e.get(k) for k in ('v', 'kind', 'by', 'url', 'ver', 'date', 'cfg', 'q', 'note')}})
(out / 'aa_tbs_tb4.json').write_text(json.dumps({'source': 'technical_knowledge_base/models_and_training/topic_llms/src/data/bench_grid.json (read 2026-10-01): Artificial Analysis per-model pages and the labs\' own tables', 'cells': cells}, ensure_ascii=False, indent=0))
print('aa cells', len(cells))
