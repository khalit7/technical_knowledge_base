"""Top readings per benchmark from Epoch AI's benchmark hub (https://epoch.ai/data/benchmark_data.zip, CC BY 4.0).
Reads the unzipped CSVs from the scratch folder given as argv[1]; writes inputs/epoch_frontier.json (top 5 rows per file, verbatim fields)."""
import csv, json, sys, pathlib
src = pathlib.Path(sys.argv[1]); here = pathlib.Path(__file__).parent
meta = {r['source_file']: r for r in csv.DictReader(open(src / 'benchmark_metadata.csv')) if r['source_file']}
FILES = ['mmlu_external.csv','gpqa_diamond.csv','hle_external.csv','simpleqa_verified.csv','hella_swag_external.csv','wino_grande_external.csv',
 'arc_ai2_external.csv','bbh_external.csv','gsm8k_external.csv','math_level_5.csv','otis_mock_aime_2024_2025.csv','frontiermath_tiers_1_3_v2.csv',
 'frontiermath_tier_4_v2.csv','frontiermath.csv','frontiermath_tier_4.csv','swe_bench_verified.csv','aider_polyglot_external.csv','terminalbench_external.csv','os_world_external.csv',
 'osworld_2_external.csv','arc_agi_external.csv','arc_agi_2_external.csv','simplebench_external.csv','fictionlivebench_external.csv',
 'video_mme_external.csv','metr_time_horizons_external.csv','gdpval_external.csv','gdp_pdf_external.csv','superglue_external.csv',
 'deepswe_external.csv','critpt_external.csv','scicode_external.csv','the_agent_company_external.csv','live_bench_external.csv']
OVR = {'gdp_pdf_external.csv': 'GDP.pdf score', 'video_mme_external.csv': 'Overall (no subtitles)', 'metr_time_horizons_external.csv': 'Time horizon', 'live_bench_external.csv': 'Global average', 'critpt_external.csv': 'Accuracy'}
out = {}
for f in FILES:
    rows = list(csv.DictReader(open(src / f, encoding='utf-8')))
    m = meta.get(f, {}); col = OVR.get(f) or m.get('score_column')
    if not col or col not in rows[0]:
        cand = [c for c in rows[0] if c.lower() in ('score','accuracy','mean_score','best score (across scorers)','em','accuracy mean','binary accuracy','win rate (%)','average','overall accuracy','pass@1','16k token score','percent correct','challenge score','average_score','main score')]
        col = cand[0] if cand else None
    def val(r):
        try: return float(r[col])
        except Exception: return -1
    rows.sort(key=val, reverse=True)
    out[f] = {'benchmark': m.get('benchmark'), 'score_column': col, 'scale': m.get('scale'), 'n_rows': len(rows), 'top': rows[:5]}
    print(f, col, len(rows)); [print('   ', round(val(r),4), r.get('Model version') or r.get('Name'), '|', r.get('Release date'), '|', (r.get('Source') or r.get('Source link') or '')[:60], '|', (r.get('Agent') or r.get('Notes') or '')[:50]) for r in rows[:3]]
(here / 'inputs' / 'epoch_frontier.json').write_text(json.dumps({'source': 'Epoch AI benchmark hub, https://epoch.ai/data/benchmark_data.zip, downloaded 2026-10-04, CC BY 4.0', 'files': out}, indent=1, ensure_ascii=False))
